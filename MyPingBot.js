const monitor = require('./Monitor.js');
const messageProcessor = require('./MessageProcessor.js');
const config = require('./config.js');

const Telegraf = require('telegraf');
const bot = new Telegraf(config.TOKEN);

bot.on('message', (ctx) => messageProcessor.processMessage(ctx));
bot.launch();
monitor.startMonitor(bot.telegram, true);
