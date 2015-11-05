var fs = require('fs');
var dns = require('dns');
var nba = require('./NodeBotAPI.js');
var ping = require('./node_modules/ping');

var SERVERSFILE = __dirname + '/servers.csv';
var servers_list = {};

exports.addToServersList = function (host, username, chat_id) {
  if (servers_list.hasOwnProperty(host) && servers_list[host].chat_id == chat_id) {
    var s = "You're already monitoring " + host + ".";
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
        }
        console.log(s[0] + ' imported.');
      });
    }
    else {
      console.log(SERVERSFILE + ' not found. Skipping.');
    }
  })

}

function checkServers() {
  var hosts = Object.keys(servers_list);
  hosts.forEach(function(host) {
    ping.promise.probe(host)
        .then (function (res) {
          if (res.alive) {
            servers_list[host].alive = true;
          } else {
            if (servers_list[host].alive == true) {
              servers_list[host].alive = false;
              var s = "Host " + host + " is dead.";
              console.log(s + " Sending notification to " + servers_list[host].username + ": " + servers_list[host].chat_id);
              nba.sendMessage(servers_list[host].chat_id, s.toString('utf8'));
            }
          }
        });
  });
}

exports.startMonitor = function () {
  loadServersList();
  checkServers();
  setInterval(checkServers, 300000);
}
