var dns = require('dns');
var net = require('net');
var fs = require('fs');
var nba = require('./NodeBotAPI.js');
var monitor = require('./Monitor.js');
var config = require('./config');
var ping = require('./node_modules/ping');

exports.processMessage = function (update_id, msg) {
    console.log('Processing message '+update_id+', message id '+msg.message_id+ ', from '+msg.from.username+' '+msg.from.id);

    var s, re_args, m, host, username, chat_id, hosts, favorites;

    if (config.maintenance) {
        if (config.testers.indexOf(msg.from.id) == -1) {
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
            last_access: Date.now()
        }
    }
    else {
        if ((Date.now() - servers_list[msg.from.id].last_access) < 5000) {
            s = "You're allowed to send a message every 5 seconds. Too fast, retry.";
            nba.sendMessage(msg.from.id, s.toString('utf8'));
            return;
        }
        else {
            servers_list[msg.from.id].last_access = Date.now();
        }
    }

    // help
    if (/^\/help\s*$/.test(msg.text)) {
        fs.readFile(__dirname + '/help_message.txt', function (err, data) {
            if (err) {
                console.log(err);
            }
            else {
                nba.sendMessage(msg.from.id, data.toString('utf8'));
            }
        });
    }

    // ping monitored
    else if (/^\/pingservers\s*/.test(msg.text)) {
        hosts = Object.keys(servers_list[msg.from.id].hosts).concat(Object.keys(servers_list[msg.from.id].favorites));
        var host_total = hosts.length;
        var host_count = 0;
        var alive = [];
        var dead = [];

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
                        nba.sendMessage(msg.from.id, s.toString('utf8'));
                    }
                });
        })
    }

    // ping HOST
    else if (/^\/ping\s*/.test(msg.text)) {
        re_args = /^\/ping\s+([\.:\/a-z0-9]+)$/g;
        m = re_args.exec(msg.text);

        if (m != null && m.length == 2) {
            host = m[1];
            ping.promise.probe(host)
                .then (function (res) {
                    if (res.alive) {
                        nba.sendMessage(msg.from.id, res.output.toString('utf8'));
                    }
                    else {
                        s = "Host " + host + " is dead.";
                        nba.sendMessage(msg.from.id, s.toString('utf8'));
                    }
                });
        }
        else {
            s = "/ping needs a parameter.";
            nba.sendMessage(msg.from.id, s.toString('utf8'));
        }
    }

    // addfavorite HOST
    else if (/^\/addfavorite\s*/.test(msg.text)) {
        re_args = /^\/addfavorite\s+([\.:\/a-z0-9]+)$/g;
        m = re_args.exec(msg.text);

        if (m != null && m.length == 2) {
            host = m[1];
            username = msg.from.username;
            chat_id = msg.from.id;

            if (m[1] == "localhost" || m[1] == "127.0.0.1") {
                s = "Won'tadd localhost to favorites. Skipping.";
                nba.sendMessage(msg.from.id, s.toString('utf8'));
                return;
            }

            monitor.addToFavoriteServersList(host, username, chat_id);
        }
        else {
            s = "/addfavorite needs an host.";
            nba.sendMessage(msg.from.id, s.toString('utf8'));
        }
    }

    // monitor HOST
    else if (/^\/monitor\s*/.test(msg.text)) {
        re_args = /^\/monitor\s+([\.:\/a-z0-9]+)$/g;
        m = re_args.exec(msg.text);

        if (m != null && m.length == 2) {
            host = m[1];
            username = msg.from.username;
            chat_id = msg.from.id;

            if (m[1] == "localhost" || m[1] == "127.0.0.1") {
                s = "Won't monitor localhost. Skipping.";
                nba.sendMessage(msg.from.id, s.toString('utf8'));
                return;
            }

            monitor.addToServersList(host, username, chat_id);
        }
        else {
            s = "/monitor needs a parameter.";
            nba.sendMessage(msg.from.id, s.toString('utf8'));
        }
    }

    // unmonitor HOST
    else if (/^\/remove\s*/.test(msg.text)) {
        re_args = /^\/remove\s+([\.:\/a-z0-9]+)$/g;
        m = re_args.exec(msg.text);

        if (m != null && m.length == 2) {
            host = m[1];
            username = msg.from.username;
            chat_id = msg.from.id;

            monitor.removeFromServersList(host, username, chat_id);
        }
        else {
            s = "/remove needs a parameter.";
            nba.sendMessage(msg.from.id, s.toString('utf8'));
        }
    }

    // Retrieve list of monitored server
    else if (/^\/listservers\s*$/.test(msg.text))   {
        hosts = Object.keys(servers_list[msg.from.id].hosts);
        favorites = Object.keys(servers_list[msg.from.id].favorites);
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

        nba.sendMessage(msg.from.id, s.toString('utf8'));
    }

    // host HOST
    else if (/^\/host\s*/.test(msg.text)) {
        re_args = /^\/host\s+([\.:\/a-z0-9]+)$/ig;
        m = re_args.exec(msg.text);

        if (m != null && m.length == 2) {
            if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(m[1])) {
                host = m[1];
                dns.reverse(host, function (err, hostnames) {
                    if (err) {
                        s = "Unable to reverse resolve " + host + ".";
                        console.log(s);
                        nba.sendMessage(msg.from.id, s.toString('utf8'));
                    }
                    else {
                        s = '';
                        hostnames.forEach(function (hostname) {
                            s += host + " resolved to " + hostname + "\n";
                        });
                        nba.sendMessage(msg.from.id, s.toString('utf8'));
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
                        nba.sendMessage(msg.from.id, s.toString('utf8'));
                    }
                    else {
                        s = '';
                        addresses.forEach(function (address) {
                            s += host + " has IPv" + address.family + " address " + address.address + "\n";
                        });
                        nba.sendMessage(msg.from.id, s.toString('utf8'));
                    }
                });
            }
        }
        else {
            s = "/host needs a parameter.";
            nba.sendMessage(msg.from.id, s.toString('utf8'));
        }
    }

    // checkport HOST PORT
    else if (/^\/checkport\s*/.test(msg.text)) {
        re_args = /^\/checkport\s+([\.:\/a-z0-9]+)\s+([0-9]+)$/ig;
        m = re_args.exec(msg.text);

        if (m != null && m.length == 3) {
            if (m[2] < 1 || m[2] > 65535) {
                s = m[2] + " isn't a valid port number.";
                nba.sendMessage(msg.from.id, s.toString('utf8'));
                return;
            }

            if (m[1] == "localhost" || m[1] == "127.0.0.1") {
                s = "Skipping scan of localhost.";
                nba.sendMessage(msg.from.id, s.toString('utf8'));
                return;
            }

            var c = new net.Socket();
            c.setTimeout(5000);
            c.connect({
                port: m[2],
                host: m[1]
            });

            c.on('connect', function () {
                s = "Port " + m[2] + " on " + m[1] + " is OPEN.";
                nba.sendMessage(msg.from.id, s.toString('utf8'));
                c.end();
            });

            c.on('error', function (err) {
                if (err.code == "ENOTFOUND") {
                    s = "Unable to resolve " + err.host + ".";
                }
                else {
                    s = "Port " + err.port + " on " + err.address + " is CLOSED.";
                }
                nba.sendMessage(msg.from.id, s.toString('utf8'));
                c.destroy();
            });

            c.on('timeout', function () {
                s = "A timeout occurred, this might be because the port is closed.";
                nba.sendMessage(msg.from.id, s.toString('utf8'));
            })
        }
        else {
            s = "/checkport needs two parameters: hostaname and port.";
            nba.sendMessage(msg.from.id, s.toString('utf8'));
        }
    }

    else {
        s = "Type /help for a list of available commands.";
        nba.sendMessage(msg.from.id, s.toString('utf8'));
    }
};
