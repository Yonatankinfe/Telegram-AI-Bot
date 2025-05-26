// main.js
const fs = require('fs');
const path =require('path');
const axios = require('axios'); // For downloadFile
const csv = require('csv-parser'); // For readCSV
// const { parse } = require('json2csv'); // No longer needed for writeChallengeToCSV
const TelegramBot = require('node-telegram-bot-api'); 

// --- Configuration & Constants ---
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN_USER'; // Use distinct tokens in a real app
const ADMIN_TOKEN = process.env.TELEGRAM_BOT_TOKEN_ADMIN || 'YOUR_TELEGRAM_BOT_TOKEN_ADMIN';

const userBot = new TelegramBot(TOKEN, { polling: false }); // Set polling to false for tests
const adminBot = new TelegramBot(ADMIN_TOKEN, { polling: false }); // Set polling to false for tests

const csvFilePath = path.join(__dirname, 'phone_numbers.csv');
const refFilePath = path.join(__dirname, 'ref.csv');
const challengeFilePath = path.join(__dirname, 'challenge_data.csv');
const challengeLinkBase = 'https://t.me/YourBotName_Bot?start='; // Replace YourBotName_Bot

// Vital: Use a numeric admin ID for testable isAdmin function
const allowedAdmins = [123456789]; // Example numeric admin ID
const adminState = {}; // User-specific state tracking for admin interactions

// --- Utility Functions ---

// isValidDate function as described
function isValidDate(dateString) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    return false;
  }
  const parts = dateString.split("/");
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10); // Month is 1-based in input
  const year = parseInt(parts[2], 10);

  if (year < 1000 || year > 3000 || month === 0 || month > 12) {
    return false;
  }
  const monthLength = [31, (year % 400 === 0 || (year % 100 !== 0 && year % 4 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day > 0 && day <= monthLength[month - 1];
}

// isAdmin function
function isAdmin(chatId) {
  return allowedAdmins.includes(chatId);
}

// parseDate function (hoisted/defined top-level)
// Based on implementation found within checkAndFilterRowsByDate
const parseDate = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return null; // Basic validation
  if (!isValidDate(dateString)) return null; // Reuse isValidDate for format validation
  const [day, month, year] = dateString.split('/').map(Number);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(year, month - 1, day); // month is 0-indexed in Date constructor
};


// --- Placeholder/Stubbed Functions (as per export list) ---
// These would have their actual implementations in a real scenario.
// For this task, they are stubbed to allow main.js to load for testing
// the primary utility functions.

const getUniqueUserData = () => {
    if (!fs.existsSync(csvFilePath)) { // Added safety check
        return [];
    }
    const fileContent = fs.readFileSync(csvFilePath, 'utf8').trim();
    if (!fileContent) {
        return [];
    }
    const data = fileContent.split('\n').slice(1); // Skip header
    if (data.length === 0) return []; // No data after header
    return data.map(line => {
        const [userId, , firstName] = line.split(','); // Assuming format USER ID,USER NAME,NAME,...
        return { userId: userId ? userId.trim() : '', firstName: firstName ? firstName.trim() : '' };
    });
    // Note: This doesn't inherently deduplicate based on content, but on lines.
    // For testing, getUniqueUserData will be mocked directly.
};

// Helper function to remove duplicates from an array of objects based on a key
const removeDuplicatesFromArray = (data, key = 'userId') => {
    const seen = new Set();
    return data.filter(item => {
        const value = item[key];
        if (seen.has(value)) {
            return false;
        }
        seen.add(value);
        return true;
    });
};

// Function to pick a random winner
const pickRandomWinner = (data) => {
  // Assuming data is an array of objects like [{ userId: '1' }, { userId: '2' }]
  const uniqueData = removeDuplicatesFromArray(data, 'userId'); // Uses the new helper
  if (uniqueData.length === 0) {
    // throw new Error("No eligible entries after removing duplicates.");
    // As per current tests, it should return null or be handled by caller
    return null; 
  }
  const winnerIndex = Math.floor(Math.random() * uniqueData.length);
  return uniqueData[winnerIndex];
};

// Generic CSV reader
const readCSV = (filePath) => {
    if (!fs.existsSync(filePath)) {
        return [];
    }
    const fileContent = fs.readFileSync(filePath, 'utf8').trim();
    if (!fileContent) {
        return [];
    }
    const lines = fileContent.split('\n');
    if (lines.length <= 1 && !lines[0]) { // Empty file or only empty line
        return [];
    }
    if (lines.length === 1 && lines[0]) { // Only headers
         return []; // No data rows
    }
    const headers = lines[0].split(',').map(header => header.trim());
    return lines.slice(1).filter(line => line.trim() !== '').map(line => { // filter out empty lines
        const values = line.split(',');
        let obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] ? values[index].trim() : '';
        });
        return obj;
    });
};

const getChallengesFromCSV = () => {
    // Relies on readCSV, which already checks for file existence.
    const data = readCSV(challengeFilePath);
    return data.filter(challenge => challenge.STATUS === 'Approved');
};

// Corrected writeChallengeToCSV implementation
const writeChallengeToCSV = (challenge) => {
  // challengeFilePath is globally defined and accessible here
  const exists = fs.existsSync(challengeFilePath);
  const row = [
    challenge.CHALLENGE_ID, // Using uppercase keys as in sampleChallenge
    challenge.PARTICIPANTS,
    challenge.START_DATE,
    challenge.END_DATE,
    challenge.DETAILS,
    challenge.MESSAGE,
    challenge.STATUS,
  ].join(',');

  const csvHeader = 'CHALLENGE_ID,PARTICIPANTS,START_DATE,END_DATE,DETAILS,MESSAGE,STATUS\n';
  // If file exists, contentToWrite starts with empty string (no header), otherwise starts with csvHeader.
  const contentToWrite = (exists ? '' : csvHeader) + row + '\n';
  
  fs.appendFileSync(challengeFilePath, contentToWrite);
};

const removeDuplicateRows = (filePath) => {
    if (!fs.existsSync(filePath)) {
        return;
    }
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.trim().split('\n');
    if (lines.length <= 1 && !lines[0].trim()) { // Empty or only header in an effectively empty file
        return;
    }
     if (lines.length === 1 && lines[0].trim()) { // Only header
        fs.writeFileSync(filePath, lines[0] + '\n'); // Keep header
        return;
    }
    const header = lines[0];
    const uniqueLines = [...new Set(lines.slice(1).filter(line => line.trim() !== ''))]; // Deduplicate data lines, ignore empty lines
    fs.writeFileSync(filePath, header + '\n' + uniqueLines.join('\n') + (uniqueLines.length > 0 ? '\n' : ''));
};

// Modified signature for checkAndFilterRowsByDate
const checkAndFilterRowsByDate = (filePath, dateColumnName, startDateString, endDateString) => {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }
    
    const rows = readCSV(filePath); 

    if (rows.length === 0) {
        const fileContent = fs.readFileSync(filePath, 'utf8').trim();
        const fileLines = fileContent.split('\n');
        if (fileLines.length === 1 && fileLines[0].trim()) { 
             fs.writeFileSync(filePath, fileLines[0] + '\n');
        } else { 
             fs.writeFileSync(filePath, ''); 
        }
        return;
    }

    if (!rows[0].hasOwnProperty(dateColumnName)) {
        console.error(`Column "${dateColumnName}" not found in CSV: ${filePath}`);
        const headerLine = Object.keys(rows[0]).join(',') + '\n';
        fs.writeFileSync(filePath, headerLine); 
        return;
    }

    const startDate = parseDate(startDateString);
    const endDate = parseDate(endDateString);

    if (!startDate || !endDate) {
        console.error("Invalid start or end date provided for filtering.");
        const headerLine = Object.keys(rows[0]).join(',') + '\n';
        const originalDataLines = rows.map(row => Object.values(row).join(',')).join('\n');
        fs.writeFileSync(filePath, headerLine + originalDataLines + '\n');
        return;
    }
    
    const header = Object.keys(rows[0]).join(',');
    const filteredRows = rows.filter(row => {
        const dateValue = row[dateColumnName];
        if (!dateValue || dateValue.trim() === '') return false; 
        const itemDate = parseDate(dateValue);
        return itemDate && itemDate >= startDate && itemDate <= endDate;
    });

    const csvOutput = [header, ...filteredRows.map(row => Object.values(row).join(','))].join('\n') + '\n';
    fs.writeFileSync(filePath, csvOutput);
};

// Actual implementations for functions under test
const sendGeneralMessageToAllUsers = async (message, media) => {
    const users = getUniqueUserData(); // getUniqueUserData is already synchronous in current main.js
    if (!users || users.length === 0) {
        console.log("No users found to send messages.");
        return;
    }
    for (const user of users) {
        const personalizedMessage = `Hello ${user.firstName || 'User'},\n${message}`;
        try {
            await userBot.sendMessage(user.userId, personalizedMessage); // Added await
            if (media) {
                const caption = `${media.caption || ''} (for ${user.firstName || 'User'})`;
                if (media.type === 'photo' && media.filePath) {
                    await userBot.sendPhoto(user.userId, media.filePath, { caption }); // Added await
                } else if (media.type === 'video' && media.filePath) {
                    await userBot.sendVideo(user.userId, media.filePath, { caption }); // Added await
                }
            }
        } catch (error) {
            console.error(`Failed to send message to ${user.userId}:`, error.message);
        }
    }
};

const sendChallengeMessageToAllUsers = async (message) => {
    const users = getUniqueUserData(); // getUniqueUserData is already synchronous
    if (!users || users.length === 0) {
        console.log("No users found to send challenge messages.");
        return;
    }
    for (const user of users) {
        const challengeLink = `${challengeLinkBase}ref=${user.userId}`;
        const personalizedMessage = `Hello ${user.firstName || 'User'},\n${message}\nChallenge: ${challengeLink}`;
        try {
            await userBot.sendMessage(user.userId, personalizedMessage); // Added await
        } catch (error) {
            console.error(`Failed to send challenge message to ${user.userId}:`, error.message);
        }
    }
};

const downloadFile = (fileId, downloadPath) => { // fileId is actually a URL for this implementation
    const url = fileId; // Assuming fileId is the direct URL
    return new Promise((resolve, reject) => {
        axios({ // Using global axios
            method: 'get',
            url: url,
            responseType: 'stream',
        }).then(response => {
            const writer = fs.createWriteStream(downloadPath);
            response.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject); // Correctly reject on writer error
        }).catch(reject); // Correctly reject on axios error
    });
};

const updateUserDataWithChallenge = async (userId, challengeId, challengeLink) => { console.log(`updateUserDataWithChallenge called for user ${userId}`);};


// --- Exports ---
// As specified in the subtask
module.exports = {
    isAdmin,
    isValidDate,
    parseDate,
    allowedAdmins,
    getUniqueUserData,
    downloadFile,
    sendGeneralMessageToAllUsers,
    sendChallengeMessageToAllUsers,
    readCSV,
    writeChallengeToCSV,
    updateUserDataWithChallenge,
    getChallengesFromCSV,
    removeDuplicateRows,
    checkAndFilterRowsByDate,
    challengeFilePath,
    csvFilePath,
    refFilePath,
    pickRandomWinner, // Exporting new function
    removeDuplicatesFromArray, // Exporting helper, though not strictly needed by tests if pickRandomWinner is unit tested
    // userBot and adminBot are not typically exported. Their methods are called by other functions.
    // challengeLinkBase is a module-local const, not typically exported unless needed for tests directly.
    adminBot, // Exporting for test simulation
    adminState, // Exporting for test reset and assertion
};

// --- Admin Bot Event Handlers ---

// /start command
adminBot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAdmin(chatId)) {
    adminBot.sendMessage(chatId, "You are not authorized to use this bot.");
    return;
  }
  try {
    // getUniqueUserData in this main.js is synchronous
    const users = getUniqueUserData(); 
    const uniqueUserCount = users.length;
    const welcomeMessage = `Welcome Admin! Unique users: ${uniqueUserCount}. Choose an action:`;
    const opts = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Send Text Message to All Users", callback_data: "send_text_message_to_all" }],
          [{ text: "Send Media to All Users", callback_data: "send_media_to_all" }],
          [{ text: "Start Challenge", callback_data: "start_challenge" }],
        ],
      },
    };
    adminBot.sendMessage(chatId, welcomeMessage, opts);
  } catch (error) {
    console.error("Error fetching unique user data:", error);
    adminBot.sendMessage(chatId, "Error fetching user data.");
  }
});

// Callback Query Handler
adminBot.on('callback_query', async (callbackQuery) => {
  const message = callbackQuery.message;
  const chatId = message.chat.id;
  const data = callbackQuery.data;

  if (!isAdmin(chatId)) {
    adminBot.sendMessage(chatId, "You are not authorized.");
    return;
  }

  // Ensure message is defined before trying to access message.chat.id or message.message_id
  if (!message) {
    console.error('Callback query is missing message object:', callbackQuery);
    return;
  }
  
  // Optional: Answer callback query to stop the loading state on the client
  // adminBot.answerCallbackQuery(callbackQuery.id);

  if (data === 'send_text_message_to_all') {
    adminState[chatId] = 'awaiting_text_message';
    adminBot.sendMessage(chatId, "Please send the text message you want to broadcast.");
  } else if (data === 'send_media_to_all') {
    adminState[chatId] = 'awaiting_media';
    adminBot.sendMessage(chatId, "Please send the photo or video with a caption.");
  } else if (data === 'start_challenge') {
    adminState[chatId] = { stage: 'awaiting_challenge_participants' };
    adminBot.sendMessage(chatId, "Enter the number of participants for the challenge:");
  }
  // No handler for 'challenge_referral_challenge' as per provided snippet
});

// General message handler for admin interactions (challenge creation, broadcasts)
adminBot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  // Ignore messages if not from an admin or if no specific state is set for interaction
  if (!isAdmin(chatId) || !adminState[chatId]) {
    // Optionally, send an "unauthorized" or "unknown command" message if desired,
    // but for stateful interactions, often better to just ignore if not in a state.
    // If it's a non-admin, they shouldn't have a state, but double check.
    if (!isAdmin(chatId) && adminState[chatId]) { // Non-admin somehow has a state
        delete adminState[chatId]; // Clear invalid state
    }
    return; 
  }

  const state = adminState[chatId];

  if (typeof state === 'string') { // Simple string states
    if (state === 'awaiting_text_message') {
      // Logic for when admin sends the text to broadcast
      // This would call sendGeneralMessageToAllUsers(msg.text);
      // For now, just acknowledge and clear state for testing this part.
      adminBot.sendMessage(chatId, `Message to broadcast received: "${msg.text}". Sending... (mocked)`);
      delete adminState[chatId];
      // await sendGeneralMessageToAllUsers(msg.text); // Actual call
    } else if (state === 'awaiting_media') {
      // Logic for when admin sends media to broadcast
      // This would involve handling msg.photo, msg.video, msg.caption
      // and then calling sendGeneralMessageToAllUsers(caption, mediaInfo);
      adminBot.sendMessage(chatId, "Media received. Processing... (mocked)");
      delete adminState[chatId];
      // const caption = msg.caption || '';
      // let mediaInfo = null;
      // if (msg.photo) mediaInfo = { type: 'photo', id: msg.photo[msg.photo.length - 1].file_id };
      // else if (msg.video) mediaInfo = { type: 'video', id: msg.video.file_id };
      // await sendGeneralMessageToAllUsers(caption, mediaInfo, true); // true for media broadcast
    }
  } else if (typeof state === 'object' && state.stage) { // Object states for multi-step processes like challenge creation
    if (state.stage === 'awaiting_challenge_participants') {
      const participants = parseInt(msg.text, 10);
      if (isNaN(participants) || participants <= 0) {
        adminBot.sendMessage(chatId, "Invalid number. Please enter a positive number for participants.");
      } else {
        adminState[chatId].participants = participants;
        adminState[chatId].stage = 'awaiting_start_date';
        adminBot.sendMessage(chatId, "Enter the start date for the challenge (DD/MM/YYYY):");
      }
    } else if (state.stage === 'awaiting_start_date') {
      if (!isValidDate(msg.text)) { // isValidDate is already defined in main.js
        adminBot.sendMessage(chatId, "Invalid date format. Please use DD/MM/YYYY.");
      } else {
        adminState[chatId].startDate = msg.text;
        adminState[chatId].stage = 'awaiting_end_date';
        adminBot.sendMessage(chatId, "Enter the end date for the challenge (DD/MM/YYYY):");
      }
    }
    // ... Add handlers for:
    // else if (state.stage === 'awaiting_end_date') { ... }
    // else if (state.stage === 'awaiting_challenge_details') { ... }
    // else if (state.stage === 'awaiting_challenge_message') { ... } // For broadcast message of challenge
    // else if (state.stage === 'awaiting_challenge_confirmation') { ... }
  }
});


console.log('main.js loaded and parsed'); // For verification during testing
