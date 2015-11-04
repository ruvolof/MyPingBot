var nba = require('./NodeBotAPI.js');

console.log('MyPingBot manager started.');

var check_login = function(botData) {
  if (!botData) {
    console.log('Unable to connect to Bot API.');
  } else {
    console.log('Successfully connected to bot ' + botData.username + ' with id ' + botData.id + '.');
    nba.startUpdatesLoop();
  }
}

nba.getMe(check_login);
