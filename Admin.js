const fs = require('fs');
const monitor = require('./Monitor.js');

var broadcast_msg;

exports.processAdminMessage = function(msg) {
  var s;

  if (/^\/help\s*$/.test(msg.message.text)) {
    adminHelp(msg);
  } 
  else if (/^\/stats\s*$/.test(msg.message.text)) {
    getStats(msg);
  } 
  else if (/^\/broadcast\s*/.test(msg.message.text)) {
    setBroadcastMessage(msg);
  } 
  else if (/^\/confirmBroadcast\s*$/.test(msg.message.text)) {
    sendBroadcast(msg);
  } 
  else if (/^\/dumpStatus\s*$/.test(msg.message.text)) {
    dumpStatus();
  } 
  else if (/^\/manualCheck\s*/.test(msg.message.text)) {
    manualCheck(msg);
  } 
  else if (/^\/listUsers\s*/.test(msg.message.text)) {
    listUsers(msg);
  } 
  else if (/^\/listServers\s*[0-9a-zA-Z]*/.test(msg.message.text)) {
    listServersByUsers(msg);
  } 
  else if (/^\/removeUser\s*[0-9a-zA-Z]*/.test(msg.message.text)) {
    removeUser(msg);
  }
  else if (/^\/removeHostFromUsername\s*.*/.test(msg.message.text)) {
    removeHostFromUserMonitor(msg);
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
  let args = msg.message.text.split(' ');
  let response_text;
  if (args.length > 1) {
    broadcast_msg = args.slice(1).join(' ');
    response_text = "This message will be sent to all users:\n\n";
    response_text += "\"" + broadcast_msg + "\"";
    response_text += "\n\nClick /confirmBroadcast to confirm.";
  } else {
    response_text = "No message found. Usage: /broadcast whatever you want.";
  }

  msg.reply(s.toString('utf8'));
}

function sendBroadcast(msg) {
  let users = Object.keys(servers_list);
  let count = 0;
  let response_text;
  if (broadcast_msg != "") {
    users.forEach(function(user) {
      if (servers_list[user].announcements) {
        count++;
        msg.telegram.sendMessage(user, broadcast_msg.toString('utf8'));
      }
    });
    response_text = "The message has been sent to " + count + " users.";
    broadcast_msg = "";
  } else {
    response_text = "No message has been set. Use /broadcast to set it.";
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

function getTelegramIdByUsername(username) {
  const keys = Object.keys(servers_list);
  for (let key of keys) {
    if (servers_list[key].username === username) {
      return key;
    }
  }
  return null;
}

function listServersByUsers(msg) {
  const args = msg.message.text.split(' ');
  if (args.length === 2) {
    const username = args[1];
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

function removeUser(msg) {
  const args = msg.message.text.split(' ');
  if (args.length === 2) {
    const username = args[1];
    const user_id = getTelegramIdByUsername(username);
    if (user_id != null) {
      delete servers_list[user_id];
      msg.reply('User ' + username + ' removed.');
    }
    else {
      msg.reply('User ' + username + ' not found.');
    }
  }
  else {
    msg.reply('Specify an username. /listUsers');
  }
}

function removeHostFromUserMonitor(msg) {
  const args = msg.message.text.split(' ');
  if (args.length === 3) {
    const username = args[1];
    const host = args[2];
    const user = getUserObjectByUsername(username);
    if (user == null) {
      msg.reply('Unable to find user ' + username + '.');
    }
    else if (user.hosts.hasOwnProperty(host)) {
      delete user.hosts[host];
      msg.reply('Host ' + host + ' removed from ' + username + '.');
    }
    else {
      msg.reply('Unable to find host ' + host + '.');
    }
  }
  else {
    msg.reply('Usage: removeHostFromUsername USERNAME HOST');
  }
}
