var fs = require('fs');
var dns = require('dns');
var nba = require('./NodeBotAPI.js');
var ping = require('./node_modules/ping');
var jsonfile = require('./node_modules/jsonfile');

var MAX_MON = 10;
var SERVERSFILE_NAME = 'servers.json';
var SERVERSFILE_PATH = __dirname+ '/' + SERVERSFILE_NAME;

servers_list = {};

function hasReachedMax(user_id) {
    var count = Object.keys(servers_list[user_id].hosts).length;
    return count >= MAX_MON;
}

exports.addToServersList = function (host, chat_id) {
    var s;
    // Checking if the user is already monitoring the host.
    if (servers_list[chat_id].hosts.hasOwnProperty(host)) {
        s = "You're already monitoring " + host + ".";
        nba.sendMessage(chat_id, s.toString('utf8'));
    }
    // Checking if the user is monitoring more than MAX_MON hosts.
    else if (hasReachedMax(chat_id)) {
        s = "You're already monitoring " + MAX_MON + " hosts. Maximum reached.";
        nba.sendMessage(chat_id, s.toString('utf8'));
    }
    else {
        dns.lookup(host, function(err) {
            if (err) {
                s = "Couldn't resolve hostname " + host + ". Skipping.";
                nba.sendMessage(chat_id, s.toString('utf8'));
            }
            else {
                servers_list[chat_id].hosts[host] = {alive: true};
                jsonfile.writeFile(SERVERSFILE_PATH, servers_list, {spaces: 4}, function (err) {
                    if (err) {
                        console.error(err.message);
                        s = "Your host has been added, but an error may have occurred while storing your preference.";
                        nba.sendMessage(chat_id, s.toString('utf8'));
                    }
                    else {
                        s = "Host added correctly. You'll get a notification if it goes down.";
                        nba.sendMessage(chat_id, s.toString('utf8'));
                    }
                })
            }
        });
    }
};

exports.addToFavoriteServersList = function (host, chat_id) {
    var s;
    // Checking if the user is already monitoring the host.
    if (servers_list[chat_id].favorites.hasOwnProperty(host)) {
        s = host + " is already in your favorites.";
        nba.sendMessage(chat_id, s.toString('utf8'));
    }
    else if (servers_list[chat_id].hosts.hasOwnProperty(host)) {
        s = "You are currently monitoring " + host + ". No reason to add to favorites.";
        nba.sendMessage(chat_id, s.toString('utf8'));
    }
    else {
        dns.lookup(host, function(err) {
            if (err) {
                s = "Couldn't resolve hostname " + host + ". Skipping.";
                nba.sendMessage(chat_id, s.toString('utf8'));
            }
            else {
                servers_list[chat_id].favorites[host] = 1;
                jsonfile.writeFile(SERVERSFILE_PATH, servers_list, {spaces: 4}, function (err) {
                    if (err) {
                        console.error(err.message);
                        s = "Your host has been added, but an error may have occurred while storing your preference.";
                        nba.sendMessage(chat_id, s.toString('utf8'));
                    }
                    else {
                        s = "Host added correctly.";
                        nba.sendMessage(chat_id, s.toString('utf8'));
                    }
                })
            }
        });
    }
};

exports.removeFromServersList = function (host, chat_id) {
    var s;
    if (servers_list[chat_id].hosts.hasOwnProperty(host)) {
        delete servers_list[chat_id].hosts[host];
        jsonfile.writeFile(SERVERSFILE_PATH, servers_list, {spaces: 4}, function (err) {
            if (err) {
                console.log(err.message);
                s = "Host correctly removed. But an error occurred while storing this preference. It might get monitored again upon reboot.";
                nba.sendMessage(chat_id, s.toString('utf8'));
            }
            else {
                s = "Host correctly removed.";
                nba.sendMessage(chat_id, s.toString('utf8'));
            }
        })
    }
    else if (servers_list[chat_id].favorites.hasOwnProperty(host)) {
        delete servers_list[chat_id].favorites[host];
        jsonfile.writeFile(SERVERSFILE_PATH, servers_list, {spaces: 4}, function (err) {
            if (err) {
                console.log(err.message);
                s = "Host correctly removed. But an error occurred while storing this preference. You might find it again in your favorites list.";
                nba.sendMessage(chat_id, s.toString('utf8'));
            }
            else {
                s = "Host correctly removed.";
                nba.sendMessage(chat_id, s.toString('utf8'));
            }
        })
    }
    else {
        s = "You're not either monitoring " + host + " or have it in your favorites list. Can't remove it.";
        nba.sendMessage(chat_id, s.toString('utf8'));
    }
};

function loadServersList() {
    console.log('Loading servers list.');
    servers_list = {};

    try {
        servers_list = jsonfile.readFileSync(SERVERSFILE_PATH);
        console.log(SERVERSFILE_NAME + " loaded correctly.");
    }
    catch (err) {
        console.error(err.message);
    }

}

function delayedCheck(user, host) {
    var s;
    ping.promise.probe(host)
        .then (function (res) {
            if (!res.alive) {
                if (servers_list[user].hosts[host].alive == true) {
                    s = "Host " + host + " is dead.";
                    console.log(s + " Sending notification to " + servers_list[user].username + ": " + user);
                    nba.sendMessage(user, s.toString('utf8'));
                }
                servers_list[user].hosts[host].alive = false;
            }
            else {
                if (servers_list[user].hosts[host].alive == false) {
                    s = "Host " + host + " is back online.";
                    nba.sendMessage(user, s.toString('utf8'));
                }
                servers_list[user].hosts[host].alive = true;
            }
        });
}

function checkServers() {
    var s;
    var users = Object.keys(servers_list);
    users.forEach(function (user) {
        hosts = Object.keys(servers_list[user].hosts);
        hosts.forEach(function(host) {
            ping.promise.probe(host)
                .then (function (res) {
                    if (res.alive) {
                        if (servers_list[user].hosts[host].alive == false) {
                            s = "Host " + host + " is back online.";
                            nba.sendMessage(user, s.toString('utf8'));
                        }
                        servers_list[user].hosts[host].alive = true;
                    } else {
                        // Delaying checks to avoid false positive
                        setTimeout(function () {
                            delayedCheck(user, host);
                        }, 15000);
                    }
                });
        });
    });
}

exports.startMonitor = function () {
    loadServersList();
    checkServers();
    setInterval(checkServers, 300000);
};
