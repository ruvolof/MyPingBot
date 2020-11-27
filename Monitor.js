const fs = require('fs');
const dns = require('dns');
const ping = require('./node_modules/ping');
const jsonfile = require('./node_modules/jsonfile');
const utils = require('./Utils.js');

const SERVERSFILE_NAME = 'servers.json';
const SERVERSFILE_PATH = __dirname + '/' + SERVERSFILE_NAME;

const MAX_MON = 10;
const CHECK_INTERVAL = 300000;
const SAVE_INTERVAL = CHECK_INTERVAL * 4;
const FAIL_BEFORE_NOTIFICATION = 2;

var tg = null;
servers_list = {};

function hasReachedMax(user_id) {
  var count = Object.keys(servers_list[user_id].hosts).length;
  return count >= MAX_MON;
}

exports.addToServersList = function(host, msg) {
  var chat_id = msg.from.id;
  var s;
  // Checking if the user is already monitoring the host.
  if (servers_list[chat_id].hosts.hasOwnProperty(host)) {
    s = "You're already monitoring " + host + ".";
    msg.reply(toString('utf8'));
  }
  // Checking if the user is monitoring more than MAX_MON hosts.
  else if (hasReachedMax(chat_id)) {
    s = "You're already monitoring " + MAX_MON + " hosts. Maximum reached.";
    msg.reply(s.toString('utf8'));
  } else {
    dns.lookup(host, function(err) {
      if (err) {
        s = "Couldn't resolve hostname " + host + ". Skipping.";
        msg.reply(s.toString('utf8'));
      } else {
        servers_list[chat_id].hosts[host] = {
          alive: true,
          consecutive_fails: 0,
          total_pings: 0,
          failed_pings: 0,
          ping_timestamps: [],
          last_stats_reset: Date.now()
        };
        jsonfile.writeFile(SERVERSFILE_PATH,
          servers_list, {
            spaces: 4
          },
          function(err) {
            if (err) {
              console.error(err.message);
              s = "Your host has been added, but an error may have" +
                " occurred while storing your preference.";
              msg.reply(s.toString('utf8'));
            } else {
              s = "Host added correctly. You'll get a notification" +
                " if it goes down.";
              msg.reply(s.toString('utf8'));
            }
          })
      }
    });
  }
};

exports.addToFavoriteServersList = function(host, msg) {
  var chat_id = msg.from.id;
  var s;
  // Checking if the user is already monitoring the host.
  if (servers_list[chat_id].favorites.hasOwnProperty(host)) {
    s = host + " is already in your favorites.";
    msg.reply(s.toString('utf8'));
  } else if (servers_list[chat_id].hosts.hasOwnProperty(host)) {
    s = "You are currently monitoring " + host +
      ". No reason to add to favorites.";
    msg.reply(s.toString('utf8'));
  } else {
    dns.lookup(host, function(err) {
      if (err) {
        s = "Couldn't resolve hostname " + host + ". Skipping.";
        msg.reply(s.toString('utf8'));
      } else {
        servers_list[chat_id].favorites[host] = 1;
        jsonfile.writeFile(SERVERSFILE_PATH, servers_list, {
          spaces: 4
        }, function(err) {
          if (err) {
            console.error(err.message);
            s = "Your host has been added, but an error may have occurred" +
              " while storing your preference.";
            msg.reply(s.toString('utf8'));
          } else {
            s = "Host added correctly.";
            msg.reply(s.toString('utf8'));
          }
        })
      }
    });
  }
};

exports.removeFromServersList = function(host, msg) {
  var chat_id = msg.from.id;
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
  } else if (servers_list[chat_id].favorites.hasOwnProperty(host)) {
    delete servers_list[chat_id].favorites[host];
    s = "Host correctly removed.";
    modified = true;
  } else {
    s = "You're not either monitoring " + host +
      " or have it in your favorites list. Can't remove it.";
    msg.reply(s.toString('utf8'));
  }

  if (modified) {
    jsonfile.writeFile(SERVERSFILE_PATH, servers_list, {
      spaces: 4
    }, function(err) {
      if (err) {
        console.log(err.message);
        s += " But an error occurred while saving the operation." +
          " It might get back on your list upon reboot.";
        msg.reply(s.toString('utf8'));
      } else {
        msg.reply(s.toString('utf8'));
      }
    })
  }
};

function loadServersList() {
  utils.log('Loading servers list');
  servers_list = {};

  try {
    servers_list = jsonfile.readFileSync(SERVERSFILE_PATH);
    utils.log(`${SERVERSFILE_NAME} loaded correctly.`);
  } catch (err) {
    console.error(err.message);
  }

}

function checkServers() {
  var s;
  var users = Object.keys(servers_list);
  users.forEach(function(user) {
    hosts = Object.keys(servers_list[user].hosts);
    hosts.forEach(function(host) {
      ping.promise.probe(host)
        .then(function(res) {
          servers_list[user].hosts[host].total_pings++;
          // TODO(cleanup): remove when hosts have been updated
          if (!servers_list[user].hosts[host].hasOwnProperty('ping_timestamps')) {
            servers_list[user].hosts[host].ping_timestamps = [];
          }
          // END cleanup
          servers_list[user].hosts[host].ping_timestamps.push(+ new Date());
          if (res.alive) {
            if (servers_list[user].hosts[host].alive == false) {
              s = "Host " + host + " is back online.";
              tg.sendMessage(user, s.toString('utf8'));
            }
            servers_list[user].hosts[host].consecutive_fails = 0;
            servers_list[user].hosts[host].alive = true;
          } else {
            servers_list[user].hosts[host].failed_pings++;
            servers_list[user].hosts[host].consecutive_fails++;
            if (servers_list[user].hosts[host].consecutive_fails 
                >= FAIL_BEFORE_NOTIFICATION) {
              if (servers_list[user].hosts[host].alive == true) {
                s = `Host ${host} is dead.`;
                utils.log(`${s} Sending notification to ` +
                          `${servers_list[user].username}: ${user}`);
                tg.sendMessage(user, s.toString('utf8'));
              }
              servers_list[user].hosts[host].alive = false;
            }
          }
        });
    });
  });
}

function saveStatus() {
  jsonfile.writeFile(SERVERSFILE_PATH, servers_list, {
    spaces: 4
  }, function(err) {
    if (err) {
      console.error(err.message);
    }
  })
}

exports.manualCheck = function() {
  checkServers();
};

exports.startMonitor = function(telegram, autosave) {
  tg = telegram;
  loadServersList();
  utils.log('Starting monitor.')
  checkServers();
  setInterval(checkServers, CHECK_INTERVAL);
  if (autosave) {
    setInterval(saveStatus, SAVE_INTERVAL);
  }
};
