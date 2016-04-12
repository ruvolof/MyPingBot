var fs = require('fs');
var dns = require('dns');
var nba = require('./NodeBotAPI.js');
var ping = require('./node_modules/ping');

var MAX_MON = 10;
var SERVERSFILE = __dirname + '/servers.csv';
var servers_list = {};

function countHostsPerUser(user_id) {
  var i = 0;
  Object.keys(servers_list).forEach(function (entry) {
    if (servers_list[entry].chat_id == user_id) {
      i++;
    }
  });
  return i;
}

exports.addToServersList = function (host, username, chat_id) {
  // Checking if the user is already monitoring the host.
  if (servers_list.hasOwnProperty(host) && servers_list[host].chat_id == chat_id) {
    var s = "You're already monitoring " + host + ".";
    nba.sendMessage(chat_id, s.toString('utf8'));
  }
  // Checking if the user is monitoring more than MAX_MON hosts.
  else if (countHostsPerUser(chat_id) >= MAX_MON) {
    var s = "You're already monitoring " + MAX_MON + " or more hosts. Maximum reached.";
    nba.sendMessage(chat_id, s.toString('utf8'));
  }
  else {
    dns.lookup(host, function(err, address, family) {
      if (err) {
        var s = "Couldn't resolve hostname " + host + ". Skipping.";
        nba.sendMessage(chat_id, s.toString('utf8'));
      }
      else {
        var s = host + ',' + username + ',' + chat_id + '\n';
        fs.appendFile(SERVERSFILE, s, function (err) {
          if (err) {
            var s = 'An error occurred while adding your host. Please, report a bug on GitHub.';
            nba.sendMessage(chat_id, s.toString('utf8'));
          }
          else {
            var s = 'Host correctly added. You\'ll get a notification if it goes down.';
            nba.sendMessage(chat_id, s.toString('utf8'));
            loadServersList();
          }
        });
      }
    });
  }
}

function loadServersList() {
  console.log('Loading servers list.');
  servers_list = {};

  fs.stat(SERVERSFILE, function (err, stat) {
    if (err == null) {
      var server_file = require('readline').createInterface({
        input: fs.createReadStream(SERVERSFILE),
        terminal: false
      });

      server_file.on('line', function (line) {
        var s = line.split(',');
        servers_list[s[0]] = {
          username: s[1],
          chat_id: s[2],
          alive: true
        };
        console.log(s[0] + ' imported.');
      });
    }
    else {
      console.log(SERVERSFILE + ' not found. Skipping.');
    }
  })

}

function delayedCheck(host) {
    ping.promise.probe(host)
        .then (function (res) {
            if (!res.alive) {
                if (servers_list[host].alive == true) {
                    var s = "Host " + host + " is dead.";
                    console.log(s + " Sending notification to " + servers_list[host].username + ": " + servers_list[host].chat_id);
                    nba.sendMessage(servers_list[host].chat_id, s.toString('utf8'));
                }
                servers_list[host].alive = false;
            }
            else {
                if (servers_list[host].alive == false) {
                    var s = "Host " + host + " is back online.";
                    nba.sendMessage(servers_list[host].chat_id, s.toString('utf8'));
                }
                servers_list[host].alive = true;
            }
        });
}

function checkServers() {
  var hosts = Object.keys(servers_list);
  hosts.forEach(function(host) {
    ping.promise.probe(host)
        .then (function (res) {
          if (res.alive) {
            if (servers_list[host].alive == false) {
              var s = "Host " + host + " is back online.";
              nba.sendMessage(servers_list[host].chat_id, s.toString('utf8'));
            }
            servers_list[host].alive = true;
          } else {
            // Delaying checks to avoid false positive
            setTimeout(function () {
                delayedCheck(host);
            }, 15000);
          }
        });
  });
}

exports.startMonitor = function () {
  loadServersList();
  checkServers();
  setInterval(checkServers, 300000);
};
