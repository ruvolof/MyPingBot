var nba = require('./NodeBotAPI.js');
var monitor = require('./Monitor.js');
var ping = require('./node_modules/ping');

exports.processMessage = function (update_id, msg) {
  console.log('Processing message '+update_id+', message id '+msg.message_id+ ', from '+msg.from.username+' '+msg.from.id);

  if (/^\/ping/.test(msg.text)) {
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
  } else if (/^\/monitor/.test(msg.text)) {
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
}
