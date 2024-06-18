require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { handleIncomingMessage, handleStartCommand, handleCheckSubscriptionCommand, handleAddSubscriptionCommand } = require('./handlers');
const { inlineKeyboard } = require('./inlineKeyboard');

// Initialize Telegram Bot
const bot = new TelegramBot("6813317549:AAHzK5R0CxbczrOMKD75umxXCtxS0rDfhWc", { polling: true });

// Event handlers
bot.on('message', (msg) => handleIncomingMessage(bot, msg));
bot.onText(/\/start@samplebotaibot/, (msg) => handleStartCommand(bot, msg, inlineKeyboard));
bot.onText(/\/checksub@samplebotaibot/, (msg) => handleCheckSubscriptionCommand(bot, msg, inlineKeyboard));
bot.onText(/\/add (\d+) (\d+)/, (msg, match) => handleAddSubscriptionCommand(bot, msg, match, inlineKeyboard));

console.log("CheggMasterBot is running...");
