var nba = require('./NodeBotAPI.js');

exports.processMessage = function (update_id, msg) {
  console.log('Processing message '+update_id+', message id '+msg.message_id+ ', from '+msg.from.username+' '+msg.from.id);
};
