var dns = require('dns');
var net = require('net');
var fs = require('fs');
var nba = require('./NodeBotAPI.js');
monitor = require('./Monitor.js');
var ping = require('./node_modules/ping');
var config = require('./config');

servers_list = monitor.servers_list;

exports.processMessage = function (update_id, msg) {
    console.log('Processing message '+update_id+', message id '+msg.message_id+ ', from '+msg.from.username+' '+msg.from.id);

    var s, re_args, m, host, username, chat_id, hosts;

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
    else if (/^\/unmonitor\s*/.test(msg.text)) {
        re_args = /^\/unmonitor\s+([\.:\/a-z0-9]+)$/g;
        m = re_args.exec(msg.text);

        if (m != null && m.length == 2) {
            host = m[1];
            username = msg.from.username;
            chat_id = msg.from.id;

            monitor.removeFromServersList(host, username, chat_id);
        }
        else {
            s = "/unmonitor needs a parameter.";
            nba.sendMessage(msg.from.id, s.toString('utf8'));
        }
    }

    // Retrieve list of monitored server
    else if (/^\/listmonitor\s*$/.test(msg.text))   {
        hosts = Object.keys(servers_list[msg.from.id].hosts);
        if (hosts.length == 0) {
            s = "You're not monitoring any server."
        }
        else {
            s = hosts.join("\n");
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
};
