var dns = require('dns');
var net = require('net');
var fs = require('fs');
var nba = require('./NodeBotAPI.js');
var monitor = require('./Monitor.js');
var config = require('./config');
var ping = require('./node_modules/ping');
var admin = require('./Admin.js');

var adminmode = false;
var EDIT_TIMEOUT = 2000;
var NEWM_TIMEOUT = 5000;

exports.processMessage = function (update_id, msg) {
    console.log('Processing message '+update_id+', message id '+msg.message_id+ ', from '+msg.from.username+' '+msg.from.id);
    var s;

    // Checking for special commands from administrator
    if (config.admin.indexOf(msg.from.id) != -1) {
        if (/^\/maintenance\s*$/.test(msg.text)) {
            config.maintenance = !config.maintenance;
            if (config.maintenance) {
                s = "Maintenance mode: ON";
            }
            else {
                s = "Maintenance mode: OFF";
            }
            nba.sendMessage(msg.from.id, s.toString('utf8'));
            return;
        }
        else if (/^\/adminmode\s*$/.test(msg.text)) {
            adminmode = !adminmode;
            if (adminmode) {
                s = "Admin mode: ON";
            }
            else {
                s = "Admin mode: OFF";
            }
            nba.sendMessage(msg.from.id, s.toString('utf8'));
            return;
        }
    }

    if (adminmode && config.admin.indexOf(msg.from.id) != -1) {
        admin.processAdminMessage(msg);
        return;
    }

    if (config.maintenance) {
        if (config.admin.indexOf(msg.from.id) == -1 && config.testers.indexOf(msg.from.id) == -1 && config.developers.indexOf(msg.from.id) == -1) {
            s = 'Currently under maintenance. Bot will reply only to developers and testers.';
            nba.sendMessage(msg.from.id, s.toString('utf8'));
            return;
        }
    }

    if (!servers_list.hasOwnProperty(msg.from.id)) {
        console.log("New user found: " + msg.from.username + " " + msg.from.id);
        servers_list[msg.from.id] = {
            username: msg.from.username,
            hosts: {},
            favorites: {},
            last_access: Date.now(),
            announcements: true
        }
    }
    else {
        if (msg.isEdit) {
            if ((Date.now() - servers_list[msg.from.id].last_access) < EDIT_TIMEOUT) {
                s = "You're allowed to edit a message once every " + (EDIT_TIMEOUT / 1000) + " seconds. Too fast, retry.";
                nba.sendMessage(msg.from.id, s.toString('utf8'));
                return;
            }
            else {
                servers_list[msg.from.id].last_access = Date.now();
            }
        }
        else {
            if ((Date.now() - servers_list[msg.from.id].last_access) < NEWM_TIMEOUT) {
                s = "You're allowed to send a message once every " + (NEWM_TIMEOUT / 1000) + " seconds. Too fast, retry.";
                nba.sendMessage(msg.from.id, s.toString('utf8'));
                return;
            }
            else {
                servers_list[msg.from.id].last_access = Date.now();
            }
        }
    }

    // help
    if (/^\/help\s*$/.test(msg.text)) {
        help(msg.from.id);
    }

    // start
    else if (/^\/start\s*$/.test(msg.text)) {
        start(msg.from.id);
    }

    // ping monitored
    else if (/^\/pingservers\s*$/.test(msg.text)) {
        pingServers(msg.from.id);
    }

    // ping HOST
    else if (/^\/ping\s*/.test(msg.text)) {
        pingHost(msg.from.id, msg.text);
    }

    // addfavorite HOST
    else if (/^\/addfavorite\s*/.test(msg.text)) {
        addFavorite(msg.from.id, msg.text);
    }

    // monitor HOST
    else if (/^\/monitor\s*/.test(msg.text)) {
        monitorHost(msg.from.id, msg.text);
    }

    // unmonitor HOST
    else if (/^\/remove\s*/.test(msg.text)) {
        remove(msg.from.id, msg.text);
    }

    // Retrieve list of monitored server
    else if (/^\/listservers\s*$/.test(msg.text))   {
        listServers(msg.from.id);
    }

    // host HOST
    else if (/^\/host\s*/.test(msg.text)) {
        getHost(msg.from.id, msg.text);
    }

    // checkport HOST PORT
    else if (/^\/checkport\s*/.test(msg.text)) {
        checkPort(msg.from.id, msg.text);
    }

    // change announcements preference
    else if (/^\/announcements\s*$/.test(msg.text)) {
        setAnnouncements(msg.from.id);
    }
    
    // reset stats
    else if (/^\/resetstats\s*$/.test(msg.text)) {
        resetStats(msg.from.id);
    }

    // print stats
    else if (/^\/stats\s*$/.test(msg.text)) {
        sendStats(msg.from.id);
    }

    else {
        s = "Type /help for a list of available commands.";
        nba.sendMessage(msg.from.id, s.toString('utf8'));
    }
};

function help(id) {
    fs.readFile(__dirname + '/help_message.txt', function (err, data) {
        if (err) {
            console.log(err);
        }
        else {
            nba.sendMessage(id, data.toString('utf8'));
        }
    });
}

function start(id) {
    fs.readFile(__dirname + '/start_message.txt', function (err, data) {
        if (err) {
            console.log(err);
        }
        else {
            nba.sendMessage(id, data.toString('utf8'));
        }
    });
}

function pingServers(id) {
    var hosts = Object.keys(servers_list[id].hosts).concat(Object.keys(servers_list[id].favorites));
    var host_total = hosts.length;
    var host_count = 0;
    var alive = [];
    var dead = [];
    var s;

    hosts.forEach(function (host) {
        ping.promise.probe(host)
            .then (function (res) {
                host_count++;
                if (res.alive) {
                    //servers_list[msg.from.id].hosts[host].alive = true;
                    alive.push(host + " (" + res.time + " ms)");
                } else {
                    //servers_list[msg.from.id].hosts[host].alive = false;
                    dead.push(host);
                }

                if (host_count == host_total) {
                    if (alive.length == 0) {
                        s = "Dead servers:\n" + dead.join("\n");
                    }
                    else if (dead.length == 0) {
                        s = "Alive servers:\n" + alive.join("\n");
                    }
                    else {
                        s = "Alive servers:\n" + alive.join("\n") + "\n\nDead servers:\n" + dead.join("\n");
                    }
                    nba.sendMessage(id, s.toString('utf8'));
                }
            });
    })
}

function pingHost(id, text) {
    var host;
    var s;
    var re_args = /^\/ping\s+([\.:\/a-z0-9]+)$/g;
    var m = re_args.exec(text);

    if (m != null && m.length == 2) {
        host = m[1];
        ping.promise.probe(host)
            .then (function (res) {
                if (res.alive) {
                    nba.sendMessage(id, res.output.toString('utf8'));
                }
                else {
                    s = "Host " + host + " is dead.";
                    nba.sendMessage(id, s.toString('utf8'));
                }
            });
    }
    else {
        s = "/ping needs a parameter.";
        nba.sendMessage(id, s.toString('utf8'));
    }
}

function addFavorite(id, text) {
    var re_args = /^\/addfavorite\s+([\.:\/a-z0-9]+)$/g;
    var m = re_args.exec(text);
    var host;
    var s;

    if (m != null && m.length == 2) {
        host = m[1];

        if (m[1] == "localhost" || m[1] == "127.0.0.1") {
            s = "Won't add localhost to favorites. Skipping.";
            nba.sendMessage(id, s.toString('utf8'));
            return;
        }

        monitor.addToFavoriteServersList(host, id);
    }
    else {
        s = "/addfavorite needs an host.";
        nba.sendMessage(id, s.toString('utf8'));
    }
}

function monitorHost(id, text) {
    var re_args = /^\/monitor\s+([\.:\/a-z0-9]+)$/g;
    var m = re_args.exec(text);
    var host;
    var s;

    if (m != null && m.length == 2) {
        host = m[1];

        if (m[1] == "localhost" || m[1] == "127.0.0.1") {
            s = "Won't monitor localhost. Skipping.";
            nba.sendMessage(id, s.toString('utf8'));
            return;
        }

        monitor.addToServersList(host, id);
    }
    else {
        s = "/monitor needs a parameter.";
        nba.sendMessage(id, s.toString('utf8'));
    }
}

function remove(id, text) {
    var re_args = /^\/remove\s+([\.:\/a-z0-9]+)$/g;
    var m = re_args.exec(text);
    var host;
    var s;

    if (m != null && m.length == 2) {
        host = m[1];
        monitor.removeFromServersList(host, id);
    }
    else {
        s = "/remove needs a parameter.";
        nba.sendMessage(id, s.toString('utf8'));
    }
}

function listServers(id) {
    var hosts = Object.keys(servers_list[id].hosts);
    var favorites = Object.keys(servers_list[id].favorites);
    var s;
    if (hosts.length == 0 && favorites.length == 0) {
        s = "You didn't set up any host."
    }
    else if (hosts.length != 0 && favorites.length == 0) {
        s = "Monitored servers:\n" + hosts.join("\n");
    }
    else if (hosts.length == 0 && favorites.length != 0) {
        s = "Favorites:\n" + favorites.join("\n");
    }
    else {
        s = "Monitored servers:\n" + hosts.join("\n") + "\n\nFavorites:\n" + favorites.join("\n");
    }

    nba.sendMessage(id, s.toString('utf8'));
}

function getHost(id, text) {
    var re_args = /^\/host\s+([\.:\/a-z0-9]+)$/ig;
    var m = re_args.exec(text);
    var host;
    var s;

    if (m != null && m.length == 2) {
        if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(m[1])) {
            host = m[1];
            dns.reverse(host, function (err, hostnames) {
                if (err) {
                    s = "Unable to reverse resolve " + host + ".";
                    console.log(s);
                    nba.sendMessage(id, s.toString('utf8'));
                }
                else {
                    s = '';
                    hostnames.forEach(function (hostname) {
                        s += host + " resolved to " + hostname + "\n";
                    });
                    nba.sendMessage(id, s.toString('utf8'));
                }
            })
        } else {
            host = m[1];
            var options = {
                all: true
            };
            dns.lookup(host, options, function (err, addresses) {
                if (err) {
                    s = "Couldn't resolve hostname " + host + ". Skipping.";
                    nba.sendMessage(id, s.toString('utf8'));
                }
                else {
                    s = '';
                    addresses.forEach(function (address) {
                        s += host + " has IPv" + address.family + " address " + address.address + "\n";
                    });
                    nba.sendMessage(id, s.toString('utf8'));
                }
            });
        }
    }
    else {
        s = "/host needs a parameter.";
        nba.sendMessage(id, s.toString('utf8'));
    }
}

function checkPort(id, text) {
    var re_args = /^\/checkport\s+([\.:\/a-z0-9]+)\s+([0-9]+)$/ig;
    var m = re_args.exec(text);
    var s;
    var c;

    if (m != null && m.length == 3) {
        if (m[2] < 1 || m[2] > 65535) {
            s = m[2] + " isn't a valid port number.";
            nba.sendMessage(id, s.toString('utf8'));
            return;
        }

        if (m[1] == "localhost" || m[1] == "127.0.0.1") {
            s = "Skipping scan of localhost.";
            nba.sendMessage(id, s.toString('utf8'));
            return;
        }

        c = new net.Socket();
        c.setTimeout(5000);
        c.connect({
            port: m[2],
            host: m[1]
        });

        c.on('connect', function () {
            s = "Port " + m[2] + " on " + m[1] + " is OPEN.";
            nba.sendMessage(id, s.toString('utf8'));
            c.end();
        });

        c.on('error', function (err) {
            if (err.code == "ENOTFOUND") {
                s = "Unable to resolve " + err.host + ".";
            }
            else {
                s = "Port " + err.port + " on " + err.address + " is CLOSED.";
            }
            nba.sendMessage(id, s.toString('utf8'));
            c.destroy();
        });

        c.on('timeout', function () {
            s = "A timeout occurred, this might be because the port is closed.";
            nba.sendMessage(id, s.toString('utf8'));
        })
    }
    else {
        s = "/checkport needs two parameters: hostaname and port.";
        nba.sendMessage(id, s.toString('utf8'));
    }
}

function setAnnouncements(id) {
    var s;
    servers_list[id].announcements = !servers_list[id].announcements;
    if (servers_list[id].announcements) {
        s = "Announcements: ON";
    }
    else {
        s = "Announcements: OFF";
    }
    nba.sendMessage(id, s.toString('utf8'));
}

function resetStats(id) {
    var s;
    var hosts = Object.keys(servers_list[id].hosts);
    hosts.forEach(function (host) {
        var h = servers_list[id].hosts[host];
        h.last_stats_reset = Date.now();
        h.total_pings = 0;
        h.failed_pings = 0;
    });

    s = "All stats have been reset.";
    nba.sendMessage(id, s.toString('utf8'));
}

function sendStats(id) {
    var s = '';
    var hosts = Object.keys(servers_list[id].hosts);
    hosts.forEach(function (host) {
        var h = servers_list[id].hosts[host];
        if (h.total_pings > 0) {
            var d = new Date(h.last_stats_reset);
            s += host + ' (since ' + d.getMonth() + '/' + d.getDate() + '/' + d.getFullYear() + ')\n';
            s += '\tPing sent: ' + h.total_pings + '\n';
            s += '\tPing received: ' + (h.total_pings - h.failed_pings) + '\n';
            s += '\tAvailability: ' + (((h.total_pings - h.failed_pings) / h.total_pings) * 100).toFixed(2) + ' %\n\n';
        }
        else {
            s += host + ': No data available.\n\n';
        }
    })

    nba.sendMessage(id, s.toString('utf8'));
}