var nba = require('./NodeBotAPI.js');
var ping = require('./node_modules/ping');

var servers_list = {};

exports.loadServersList = function () {
  console.log('Loading servers list...');

  var server_file = require('readline').createInterface({
    input: require('fs').createReadStream(__dirname + '/servers.csv'),
    terminal: false
  });

  server_file.on('line', function (line) {
    var s = line.split(',');
    servers_list[s[0]] = {
      username: s[1],
      chat_id: s[2],
      alive: true
    }
    console.log(s[0]);
  });
}

function checkServers() {
  console.log('Checking servers.');
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
  setInterval(checkServers, 300000);
}
