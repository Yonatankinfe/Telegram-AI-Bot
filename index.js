

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
