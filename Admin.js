var fs = require('fs');
var nba = require('./NodeBotAPI.js');

exports.processAdminMessage = function(msg) {
    var s;

    if (/^\/help\s*$/.test(msg.text)) {
        adminHelp(msg.from.id);
    }
    else if (/^\/stats\s*$/.test(msg.text)) {
        getStats(msg.from.id);
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