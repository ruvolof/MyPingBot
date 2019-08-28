const monitor = require('./Monitor.js');
const mp = require('./MessageProcessor.js');
const config = require('./config.js');
const Telegraf = require('telegraf');
const bot = new Telegraf(config.TOKEN);

bot.on('message', (ctx) => mp.processMessage(ctx));
bot.launch();
monitor.startMonitor(bot.telegram);
