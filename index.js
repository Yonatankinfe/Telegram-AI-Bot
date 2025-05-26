// This is a simple Telegram bot that interacts with OpenAI's API or any other API.
// It allows users to ask questions and stores their data in a CSV file.
// The bot will ask for an OpenAI API key if the user doesn't have one stored.
// It also handles user data and API key management.
// The bot is built using the node-telegram-bot-api and openai packages
// and uses CSV for storing user data.
const TelegramBot = require('node-telegram-bot-api');
const { createObjectCsvWriter } = require('csv-writer').object;
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Replace with your Telegram Bot Token
const TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN';
const bot = new TelegramBot(TOKEN, { polling: true });

// CSV Writer for user data
const csvWriter = createObjectCsvWriter({
  path: 'users.csv',
  header: [
    { id: 'id', title: 'User ID' },
    { id: 'username', title: 'Username' },
    { id: 'name', title: 'Name' },
  ],
  append: true,
});

// Store API keys in memory (for production, use a proper database)
const apiKeys = new Map();
const awaitingApiKey = new Set();

// Handle /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from;

  // Save user data to CSV
  csvWriter.writeRecords([{
    id: user.id,
    username: user.username || 'N/A',
    name: `${user.first_name} ${user.last_name || ''}`.trim()
  }]);

  bot.sendMessage(chatId, 'Hello! Ask me anything or what can I help you with?');
});

// Handle regular messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  // Skip /start command
  if (text.startsWith('/start')) return;

  // Check if user has API key
  if (!apiKeys.has(userId)) {
    if (!awaitingApiKey.has(userId)) {
      // Request API key
      bot.sendMessage(chatId, 'Please provide your OpenAI API key:');
      awaitingApiKey.add(userId);
    } else {
      // Store API key
      apiKeys.set(userId, text);
      awaitingApiKey.delete(userId);
      bot.sendMessage(chatId, 'API key saved! Now you can ask me questions.');
    }
    return;
  }

  // Process question with OpenAI API
  try {
    const openai = new OpenAI({ apiKey: apiKeys.get(userId) });
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: text }],
    });

    bot.sendMessage(chatId, response.choices[0].message.content);
  } catch (error) {
    console.error('OpenAI Error:', error);
    bot.sendMessage(chatId, 'Error processing your request. Please check your API key.');
    apiKeys.delete(userId); // Remove invalid API key
  }
});

console.log('Bot is running...');

// Placeholder definitions for functions to be tested
const allowedAdmins = [123456789, 987654321]; // Example admin IDs

function isValidDate(dateString) {
  // Basic format check
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    return false;
  }
  const parts = dateString.split("/");
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  if (year < 1000 || year > 3000 || month === 0 || month > 12) {
    return false;
  }
  const monthLength = [31, (year % 400 === 0 || (year % 100 !== 0 && year % 4 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day > 0 && day <= monthLength[month - 1];
}

function isAdmin(chatId) {
  return allowedAdmins.includes(chatId);
}

function parseDate(dateString) {
  if (!isValidDate(dateString)) {
    return null; // Or throw an error, depending on desired behavior
  }
  const parts = dateString.split("/");
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10); // Month is 1-based in input
  const year = parseInt(parts[2], 10);
  return new Date(year, month - 1, day); // Month is 0-based in Date constructor
}

module.exports = {
  // bot, // Exporting bot might not be ideal for unit tests if it starts polling
  // csvWriter, // Export if needed for specific tests
  // apiKeys, // Export if needed
  // awaitingApiKey, // Export if needed
  isValidDate,
  isAdmin,
  parseDate,
  allowedAdmins, // Exporting for test verification or direct use if necessary
};
