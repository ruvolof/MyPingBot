var fs = require('fs');
var nba = require('./NodeBotAPI.js');
var monitor = require('./Monitor.js');

var bmsg;

exports.processAdminMessage = function(msg) {
    var s;

    if (/^\/help\s*$/.test(msg.text)) {
        adminHelp(msg.from.id);
    }
    else if (/^\/stats\s*$/.test(msg.text)) {
        getStats(msg.from.id);
    }
    else if (/^\/broadcast\s*/.test(msg.text)) {
        setBroadcastMessage(msg.from.id, msg.text);
    }
    else if (/^\/confirmBroadcast\s*$/.test(msg.text)) {
        sendBroadcast(msg.from.id);
    }
    else if(/^\/dumpStatus\s*$/.test(msg.text)) {
        dumpStatus();
    }
    else if (/^\/manualCheck\s*/.test(msg.text)) {
        manualCheck();
    }
    else {
        s = "Unavailable command. Type /help or exit admin mode.";
        nba.sendMessage(msg.from.id, s.toString('utf8'));
    }
};

function adminHelp(id) {
    fs.readFile(__dirname + '/admin_help_message.txt', function (err, data) {
        if (err) {
            console.log(err);
        }
        else {
            nba.sendMessage(id, data.toString('utf8'));
        }
    });
}

function getStats(id) {
    var users;
    var hosts = 0;
    var bookmarks = 0;
    var s;

    users = Object.keys(servers_list);
    users.forEach(function (user) {
        hosts += Object.keys(servers_list[user].hosts).length;
        bookmarks += Object.keys(servers_list[user].favorites).length;
    });

    s = "Stats:\n\n";
    s += "User count: " + users.length + "\n";
    s += "Monitor count: " + hosts + "\n";
    s += "Bookmark count: " + bookmarks + "\n";

    nba.sendMessage(id, s.toString('utf8'));
}

function setBroadcastMessage(id, cmd) {
    var s;
    var text = cmd.indexOf(' ') != -1 ? cmd.substr(cmd.indexOf(' ') + 1) : "";

    if (text != "") {
        bmsg = text;
        s = "This message will be sent to all users:\n\n";
        s += "\"" + bmsg + "\"";
        s += "\n\nClick /confirmBroadcast to confirm.";
    }
    else {
        s = "No message found. Usage: /broadcast whatever you want.";
    }

    nba.sendMessage(id, s.toString('utf8'));
}

function sendBroadcast(id) {
    var users = Object.keys(servers_list);
    var count = 0;
    var s;
    if (bmsg != "") {
        users.forEach(function (user) {
            if (servers_list[user].announcements) {
                count++;
                nba.sendMessage(user, bmsg.toString('utf8'));
            }
        });
        s = "The message has been sent to " + count + " users.";
        bmsg = "";
    }
    else {
        s = "No message has been set. Use /broadcast to set it.";
    }
    nba.sendMessage(id, s.toString('utf8'));
}

function dumpStatus() {
    console.log(servers_list);
    var users = Object.keys(servers_list);
    users.forEach(function (user) {
        var hosts = Object.keys(servers_list[user].hosts);
        hosts.forEach(function (host) {
            console.log(servers_list[user].hosts[host]);
        })
    })
}

function manualCheck() {
    monitor.manualCheck();
}