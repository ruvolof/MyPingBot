var fs = require('fs');
var monitor = require('./Monitor.js');

var bmsg;

exports.processAdminMessage = function(msg) {
  var s;

  if (/^\/help\s*$/.test(msg.message.text)) {
    adminHelp(msg);
  } else if (/^\/stats\s*$/.test(msg.message.text)) {
    getStats(msg);
  } else if (/^\/broadcast\s*/.test(msg.message.text)) {
    setBroadcastMessage(msg);
  } else if (/^\/confirmBroadcast\s*$/.test(msg.message.text)) {
    sendBroadcast(msg);
  } else if (/^\/dumpStatus\s*$/.test(msg.message.text)) {
    dumpStatus();
  } else if (/^\/manualCheck\s*/.test(msg.message.text)) {
    manualCheck(msg);
  } else if (/^\/listUsers\s*/.test(msg.message.text)) {
    listUsers(msg);
  } else if (/^\/listServers\s*[0-9a-zA-Z]*/.test(msg.message.text)) {
    listServersByUsers(msg);
  }
  else {
    s = "Unavailable command. Type /help or exit admin mode.";
    msg.reply(s.toString('utf8'));
  }
};

function adminHelp(msg) {
  fs.readFile(__dirname + '/admin_help_message.txt', function(err, data) {
    if (err) {
      console.log(err);
    } else {
      msg.reply(data.toString('utf8'));
    }
  });
}

function getStats(msg) {
  var users;
  var hosts = 0;
  var bookmarks = 0;
  var s;

  users = Object.keys(servers_list);
  users.forEach(function(user) {
    hosts += Object.keys(servers_list[user].hosts).length;
    bookmarks += Object.keys(servers_list[user].favorites).length;
  });

  s = "Stats:\n\n";
  s += "User count: " + users.length + "\n";
  s += "Monitor count: " + hosts + "\n";
  s += "Bookmark count: " + bookmarks + "\n";

  msg.reply(s.toString('utf8'));
}

function setBroadcastMessage(msg) {
  var s;
  var command = msg.message.text;
  var text = command.indexOf(' ') != -1 ? command.substr(command.indexOf(' ') + 1) : "";

  if (text != "") {
    bmsg = text;
    s = "This message will be sent to all users:\n\n";
    s += "\"" + bmsg + "\"";
    s += "\n\nClick /confirmBroadcast to confirm.";
  } else {
    s = "No message found. Usage: /broadcast whatever you want.";
  }

  msg.reply(s.toString('utf8'));
}

function sendBroadcast(msg) {
  var users = Object.keys(servers_list);
  var count = 0;
  var s;
  if (bmsg != "") {
    users.forEach(function(user) {
      if (servers_list[user].announcements) {
        count++;
        msg.telegram.sendMessage(user, bmsg.toString('utf8'));
      }
    });
    s = "The message has been sent to " + count + " users.";
    bmsg = "";
  } else {
    s = "No message has been set. Use /broadcast to set it.";
  }
  msg.reply(s.toString('utf8'));
}

function dumpStatus() {
  console.dir(servers_list, {
    depth: null
  });
}

function manualCheck() {
  monitor.manualCheck();
}

function listUsers(msg) {
  const usernames = [];
  const keys = Object.keys(servers_list);
  for (let key of keys) {
    usernames.push(
      servers_list[key].username + 
      ': ' + new Date(servers_list[key].last_access).toLocaleString());
  }
  usernames.sort();
  msg.reply('Usernames:\n' + usernames.join('\n'))
}

function getUserObjectByUsername(username) {
  const keys = Object.keys(servers_list);
  for (let key of keys) {
    if (servers_list[key].username === username) {
      return servers_list[key];
    }
  }
  return null;
}

function listServersByUsers(msg) {
  const args = msg.message.text.split(' ');
  if (args.length === 2) {
    const username = msg.message.text.split(' ')[1];
    const user = getUserObjectByUsername(username);
    if (user != null) {
      msg.reply(username + ' currently monitors:\n'
                + Object.keys(user.hosts).join('\n'));
    }
    else {
      msg.reply('Username not found. /listUsers');
    }
  }
  else {
    msg.reply('Specify an username. /listUsers');
  }
}
