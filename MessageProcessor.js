var dns = require('dns');
var nba = require('./NodeBotAPI.js');
var monitor = require('./Monitor.js');
var ping = require('./node_modules/ping');
var config = require('./config');

exports.processMessage = function (update_id, msg) {
  console.log('Processing message '+update_id+', message id '+msg.message_id+ ', from '+msg.from.username+' '+msg.from.id);

  if (config.maintenance) {
    if (config.testers.indexOf(msg.from.id) == -1) {
      var s = 'Currently under maintenance. Bot will reply only to developers and testers.';
      nba.sendMessage(msg.from.id, s.toString('utf8'));
      return;
    }
  }
  // ping HOST
  if (/^\/ping\s/.test(msg.text)) {
    var re_args = /^\/ping\s+([\.:\/a-z0-9]+)$/g;
    var m = re_args.exec(msg.text);

    if (m != null && m.length > 1) {
      var host = m[1];
      ping.promise.probe(host)
          .then (function (res) {
            if (res.alive) {
              nba.sendMessage(msg.from.id, res.output.toString('utf8'));
            }
            else {
              var s = "Host " + host + " is dead.";
              nba.sendMessage(msg.from.id, s.toString('utf8'));
            }
          });
    }
    else {
      var s = "/ping needs a parameter.";
      nba.sendMessage(msg.from.id, s.toString('utf8'));
    }
  }

  // monitor HOST
  else if (/^\/monitor\s/.test(msg.text)) {
    var re_args = /^\/monitor\s+([\.:\/a-z0-9]+)$/g;
    var m = re_args.exec(msg.text);

    if (m != null && m.length > 1) {
      var host = m[1];
      var username = msg.from.username;
      var chat_id = msg.from.id;

      monitor.addToServersList(host, username, chat_id);
    }
    else {
      var s = "/monitor needs a parameter.";
      nba.sendMessage(msg.from.id, s.toString('utf8'));
    }
  }

  // host HOST
  else if (/^\/host\s/.test(msg.text)) {
    var re_args = /^\/host\s+([\.:\/a-z0-9]+)$/ig;
    var m = re_args.exec(msg.text);

    if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(m[1])) {
      var host = m[1];
      dns.reverse(host, function (err, hostnames) {
        if (err) {
          var s = "Unable to reverse resolve " + host + ".";
          console.log(s);
          nba.sendMessage(msg.from.id, s.toString('utf8'));
        }
        else {
          var s = '';
          hostnames.forEach(function(hostname) {
            s += host + " resolved to " + hostname + "\n";
          });
          nba.sendMessage(msg.from.id, s.toString('utf8'));
        }
      })
    } else {
      var host = m[1];
      var options = {
        all: true
      };
      dns.lookup(host, options, function (err, addresses) {
        if (err) {
          var s = "Couldn't resolve hostname " + host + ". Skipping.";
          nba.sendMessage(msg.from.id, s.toString('utf8'));
        }
        else {
          var s = '';
          addresses.forEach(function (address) {
            s += host + " has IPv" + address.family + " address " + address.address + "\n";
          });
          nba.sendMessage(msg.from.id, s.toString('utf8'));
        }
      });
    }
  }
}
