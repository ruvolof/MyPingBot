var nba = require('./NodeBotAPI.js');
var monitor = require('./Monitor.js');

console.log('MyPingBot manager started.');

// Connect to the bot and start the main loop to get messages from API
var check_login = function(botData) {
    if (!botData) {
        console.log('Unable to connect to Bot API.');
    } else {
        console.log('Successfully connected to bot ' + botData.username + ' with id ' + botData.id + '.');
        // Loading server list and start monitor, this same function will start the updates loop
        monitor.startMonitor(true);
    }
};

nba.getMe(check_login);
