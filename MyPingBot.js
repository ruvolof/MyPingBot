const monitor = require('./Monitor.js');
const messageProcessor = require('./MessageProcessor.js');
const config = require('./config.js');
const utils = require('./Utils.js');

const Telegraf = require('telegraf');
const bot = new Telegraf(config.TOKEN);

if (config.maintenance) {
  utils.log('Bot started in mantainance mode.');
}

bot.on('message', (ctx) => messageProcessor.processMessage(ctx));
bot.launch();
monitor.startMonitor(bot.telegram, true);
