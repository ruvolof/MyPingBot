var fs = require('fs');
var dns = require('dns');
var nba = require('./NodeBotAPI.js');
var ping = require('./node_modules/ping');
var jsonfile = require('./node_modules/jsonfile');

var SERVERSFILE_NAME = 'servers.json';
var SERVERSFILE_PATH = __dirname+ '/' + SERVERSFILE_NAME;

var MAX_MON = 10;
var CHECK_INTERVAL = 300000;
var SAVE_INTERVAL = CHECK_INTERVAL * 4;
var FAIL_BEFORE_NOTIFICATION = 2;

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
                servers_list[chat_id].hosts[host] = {
                    alive: true,
                    consecutive_fails: 0,
                    total_pings: 0,
                    failed_pings: 0
                };
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
    var modified = false;
    if (host == "ALL" || host == "all") {
        servers_list[chat_id].hosts.clear();
        servers_list[chat_id].favorites.clear();
        s = "All hosts correctly removed.";
        modified = true;
    }
    if (servers_list[chat_id].hosts.hasOwnProperty(host)) {
        delete servers_list[chat_id].hosts[host];
        s = "Host correctly removed.";
        modified = true;
    }
    else if (servers_list[chat_id].favorites.hasOwnProperty(host)) {
        delete servers_list[chat_id].favorites[host];
        s = "Host correctly removed.";
        modified = true;
    }
    else {
        s = "You're not either monitoring " + host + " or have it in your favorites list. Can't remove it.";
        nba.sendMessage(chat_id, s.toString('utf8'));
    }

    if (modified) {
        jsonfile.writeFile(SERVERSFILE_PATH, servers_list, {spaces: 4}, function (err) {
            if (err) {
                console.log(err.message);
                s += " But an error occurred while saving the operation. It might get back on your list upon reboot.";
                nba.sendMessage(chat_id, s.toString('utf8'));
            }
            else {
                nba.sendMessage(chat_id, s.toString('utf8'));
            }
        })
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

/*
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
*/

function checkServers() {
    var s;
    var users = Object.keys(servers_list);
    users.forEach(function (user) {
        hosts = Object.keys(servers_list[user].hosts);
        hosts.forEach(function(host) {
            ping.promise.probe(host)
                .then (function (res) {
                    servers_list[user].hosts[host].total_pings++;
                    if (res.alive) {
                        if (servers_list[user].hosts[host].alive == false) {
                            s = "Host " + host + " is back online.";
                            nba.sendMessage(user, s.toString('utf8'));
                        }
                        servers_list[user].hosts[host].consecutive_fails = 0;
                        servers_list[user].hosts[host].alive = true;
                    }
                    else {
                        servers_list[user].hosts[host].failed_pings++;
                        servers_list[user].hosts[host].consecutive_fails++;
                        if (servers_list[user].hosts[host].consecutive_fails >= FAIL_BEFORE_NOTIFICATION) {
                            if (servers_list[user].hosts[host].alive == true) {
                                s = "Host " + host + " is dead.";
                                console.log(s + " Sending notification to " + servers_list[user].username + ": " + user);
                                nba.sendMessage(user, s.toString('utf8'));
                            }
                            servers_list[user].hosts[host].alive = false;
                        }

                        /*
                        // Delaying checks to avoid false positive
                        setTimeout(function () {
                            delayedCheck(user, host);
                        }, 15000);
                        */
                    }
                });
        });
    });
}

function saveStatus() {
    jsonfile.writeFile(SERVERSFILE_PATH, servers_list, {spaces: 4}, function (err) {
        if (err) {
            console.error(err.message);
        }
    })
}

exports.manualCheck = function () {
    checkServers();
}

exports.startMonitor = function (autosave) {
    loadServersList();
    nba.startUpdatesLoop();
    checkServers();
    setInterval(checkServers, CHECK_INTERVAL);

    if (autosave) {
        setInterval(saveStatus, SAVE_INTERVAL);
    }
};
