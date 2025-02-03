# Telegram-AI-Bot
🤖🔗 Secure Telegram bot framework with OpenAI integration, user management, and conversation logging.# TelegramAI-Bridge

🤖🔗 Secure Telegram bot framework with OpenAI integration, user management, and conversation logging.

---

## Description  
A production-ready Telegram bot that bridges users with OpenAI's API while maintaining conversation logs and user analytics. Features secure API key management and CSV-based user tracking.

```javascript
// Key Features
- User authentication flow for API keys
- Persistent user data storage in CSV
- OpenAI GPT-3.5/4 integration
- Error handling and key validation
- Conversation logging
- Memory-efficient session management
```

---

## README.md

# 📂 TelegramAI-Bridge

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![License](https://img.shields.io/badge/License-MIT-blue)
![Dependencies](https://img.shields.io/badge/dependencies-telegram%20|%20openai%20|%20csv--writer-orange)

Enterprise-grade Telegram bot solution for secure AI interactions.

## 🚀 Overview
![Architecture Diagram](https://via.placeholder.com/800x400.png?text=Bot+Architecture)

1. **User Authentication** - Secure API key exchange
2. **Request Processing** - OpenAI API integration
3. **Data Management**:
   - CSV user tracking
   - In-memory key storage (volatile)
   - Conversation logging

## 🛠️ Installation
```bash
git clone https://github.com/yourusername/TelegramAI-Bridge.git
cd TelegramAI-Bridge
npm install
```

## 📋 Requirements
```text
node-telegram-bot-api@0.61.0
openai@4.24.1
csv-writer@1.6.0
dotenv@16.3.1
```

## ⚙️ Configuration
1. Create `.env` file:
```ini
TELEGRAM_TOKEN=your_bot_token
OPENAI_MODEL=gpt-3.5-turbo
LOG_PATH=./conversations
```

2. Replace in code:
```javascript
const TOKEN = process.env.TELEGRAM_TOKEN;
const MODEL = process.env.OPENAI_MODEL;
```

## 🖥️ Usage
```bash
node bot.js
```

### Commands
- `/start` - Initiate bot and register user
- `/reset` - Clear current API key
- `/model [model_name]` - Switch AI model (if available)

## 🔒 Security Features
```javascript
// Ephemeral key storage
const apiKeys = new Map(); 

// Key validation flow
try {
  const openai = new OpenAI({ apiKey });
  // Validate key
} catch (error) {
  apiKeys.delete(userId);
}
```

## 📊 Data Management
Sample CSV output (`users.csv`):
```csv
User ID,Username,Name
12345,johndoe,John Doe
67890,,Alice
```

## 💡 Advanced Configuration

### Enable Conversation Logging
```javascript
const logWriter = createObjectCsvWriter({
  path: `${LOG_PATH}/${userId}.csv`,
  header: [
    { id: 'timestamp', title: 'Time' },
    { id: 'query', title: 'Question' },
    { id: 'response', title: 'Answer' }
  ]
});
```

### Add Rate Limiting
```javascript
const rateLimiter = new Map();

bot.on('message', (msg) => {
  const userId = msg.from.id;
  if (rateLimiter.has(userId) && Date.now() - rateLimiter.get(userId) < 1000) {
    bot.sendMessage(chatId, 'Too many requests. Please wait 1 second.');
    return;
  }
  rateLimiter.set(userId, Date.now());
});
```

## 🚨 Troubleshooting

### Common Issues
1. **Invalid API Key**  
   Bot automatically clears invalid keys and prompts for new one

2. **Missing Dependencies**  
   ```bash
   npm install --save node-telegram-bot-api openai csv-writer
   ```

3. **CSV Write Permissions**  
   ```bash
   chmod +w ./users.csv
   ```

## 🌟 Roadmap
- [ ] PostgreSQL/MongoDB integration
- [ ] Encrypted API key storage
- [ ] Custom prompt engineering
- [ ] Usage analytics dashboard
- [ ] Multi-language support

## 🤝 Contributing
1. Clone repository
2. Create feature branch
3. Add tests in `test/` directory
4. Submit PR with detailed documentation

## 📜 License
MIT License - See [LICENSE](LICENSE) for details

> **Warning**  
> This bot requires users to provide their own OpenAI API keys. Never store keys in unsecured environments.
```
