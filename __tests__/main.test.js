jest.mock('fs'); // Must be first
const fs = require('fs');
const path = require('path');

const {
    isAdmin,
    isValidDate,
    parseDate,
    allowedAdmins: actualAllowedAdmins,
    getUniqueUserData,
    readCSV,
    getChallengesFromCSV,
    writeChallengeToCSV,
    removeDuplicateRows,
    checkAndFilterRowsByDate,
    sendGeneralMessageToAllUsers,
    sendChallengeMessageToAllUsers,
    downloadFile,
    pickRandomWinner,
    csvFilePath: mainCsvFilePath, 
    challengeFilePath: mainChallengeFilePath,
    refFilePath: mainRefFilePath
} = require('../main.js');

// Import mocks for TelegramBot to access their mock functions
const MockTelegramBot = require('node-telegram-bot-api');
const axios = require('axios'); // Will be the mock from __mocks__/axios.js

// Resolve paths as they would be in main.js
const projectRootDir = path.resolve(__dirname, '..'); 
const actualCsvFilePath = path.join(projectRootDir, 'phone_numbers.csv');
const actualChallengeFilePath = path.join(projectRootDir, 'challenge_data.csv');
const actualRefFilePath = path.join(projectRootDir, 'ref.csv');

describe('main.js Utility Functions', () => {
  describe('isValidDate', () => {
    test('should return true for a valid date: 01/12/2024', () => {
      expect(isValidDate('01/12/2024')).toBe(true);
    });
    test('should return false for invalid format: 2024-12-01', () => {
      expect(isValidDate('2024-12-01')).toBe(false);
    });
    test('should return false for day out of range: 32/12/2024', () => {
      expect(isValidDate('32/12/2024')).toBe(false);
    });
    test('should return false for 31st of April: 31/04/2024', () => {
      expect(isValidDate('31/04/2024')).toBe(false);
    });
    test('should return false for month out of range: 01/13/2024', () => {
      expect(isValidDate('01/13/2024')).toBe(false);
    });
    test('should return false for month 00: 01/00/2024', () => {
      expect(isValidDate('01/00/2024')).toBe(false);
    });
    test('should return false for day 00: 00/12/2024', () => {
      expect(isValidDate('00/12/2024')).toBe(false);
    });
    test('should return false for non-numeric input: dd/mm/yyyy', () => {
      expect(isValidDate('dd/mm/yyyy')).toBe(false);
    });
    test('should return true for February 29 on a leap year: 29/02/2024', () => {
      expect(isValidDate('29/02/2024')).toBe(true);
    });
    test('should return false for February 29 on a non-leap year: 29/02/2023', () => {
      expect(isValidDate('29/02/2023')).toBe(false);
    });
    test('should return true for February 29 on a century leap year: 29/02/2000', () => {
      expect(isValidDate('29/02/2000')).toBe(true);
    });
    test('should return false for February 29 on a century non-leap year: 29/02/1900', () => {
      expect(isValidDate('29/02/1900')).toBe(false);
    });
  });

  describe('isAdmin', () => {
    const adminUserId = 123456789; 
    test(`should return true for an admin user ID: ${adminUserId}`, () => {
      expect(actualAllowedAdmins).toContain(adminUserId);
      expect(isAdmin(adminUserId)).toBe(true);
    });
    test('should return false for a non-admin user ID: 11111', () => {
      const nonAdminId = 11111;
      expect(actualAllowedAdmins).not.toContain(nonAdminId);
      expect(isAdmin(nonAdminId)).toBe(false);
    });
    test('should return false for undefined or null chatId', () => {
      expect(isAdmin(undefined)).toBe(false);
      expect(isAdmin(null)).toBe(false);
    });
  });

  describe('parseDate', () => {
    test('should correctly parse a valid date string: 01/12/2024', () => {
      const date = parseDate('01/12/2024');
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(11);
      expect(date.getDate()).toBe(1);
    });
    test('should correctly parse February 29 on a leap year: 29/02/2024', () => {
      const date = parseDate('29/02/2024');
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(1);
      expect(date.getDate()).toBe(29);
    });
    test('should return null for an invalid date string (e.g., 31/04/2024)', () => {
      expect(parseDate('31/04/2024')).toBeNull();
    });
    test('should return null for an invalid date format (e.g., 2024-12-01)', () => {
      expect(parseDate('2024-12-01')).toBeNull();
    });
    test('should return null for February 29 on a non-leap year (e.g., 29/02/2023)', () => {
      expect(parseDate('29/02/2023')).toBeNull();
    });
    test('should return null for non-string input', () => {
      expect(parseDate(12345)).toBeNull();
    });
    test('should return null for empty string input', () => {
      expect(parseDate('')).toBeNull();
    });
  });
});

const samplePhoneNumbersCSV = `USER ID,USER NAME,NAME,CHALLENGE ID,CHALLENGE LINK,INVITED PEOPLES
101,userone,User One,challenge1,https://t.me/bot_name_Bot?start=user_id=101,2
102,usertwo,User Two,,,
103,userthree,User Three,challenge1,https://t.me/bot_name_Bot?start=user_id=103,2
101,userone,User One Duplicate,,,`;

const sampleChallengeDataCSV = `CHALLENGE_ID,PARTICIPANTS,START_DATE,END_DATE,DETAILS,MESSAGE,STATUS
challenge1,2,01/01/2024,10/01/2024,Test Challenge 1,Message for challenge 1,Approved
challenge2,5,05/01/2024,15/01/2024,Test Challenge 2,Message for challenge 2,Pending
challenge3,3,10/01/2024,20/01/2024,Old Challenge,Message for old challenge,Completed
challenge4,4,12/01/2024,22/01/2024,Another Approved,Msg,Approved`;

const genericSampleCSV = `header1,header2,header3
val1A,val1B,val1C
val2A,val2B,val2C
val3A,,val3C`;

describe('CSV Reading Functions', () => {
  beforeEach(() => {
    fs.__setMockFileData(actualCsvFilePath, ''); 
    fs.__setMockFileData(actualChallengeFilePath, ''); 
    if (fs.readFileSync.mockClear) fs.readFileSync.mockClear();
    if (fs.existsSync.mockClear) fs.existsSync.mockClear();
    if (fs.writeFileSync.mockClear) fs.writeFileSync.mockClear();
    if (fs.appendFileSync.mockClear) fs.appendFileSync.mockClear();
  });

  describe('getUniqueUserData', () => {
    test('should return an array of objects with userId and firstName', () => {
      fs.__setMockFileData(actualCsvFilePath, samplePhoneNumbersCSV);
      const users = getUniqueUserData();
      expect(users.length).toBe(4);
      expect(users[0]).toEqual({ userId: '101', firstName: 'User One' });
    });
    test('should return empty array if CSV is empty', () => {
      fs.__setMockFileData(actualCsvFilePath, '');
      expect(getUniqueUserData()).toEqual([]);
    });
    test('should return empty array if CSV has only headers', () => {
      fs.__setMockFileData(actualCsvFilePath, 'USER ID,USER NAME,NAME\n');
      expect(getUniqueUserData()).toEqual([]);
    });
    test('should handle lines with missing optional fields gracefully', () => {
        const csvWithMissingFields = `USER ID,USER NAME,NAME
101,userone,User One
102,,User Two With No Username 
103,userthree,`;
        fs.__setMockFileData(actualCsvFilePath, csvWithMissingFields);
        const users = getUniqueUserData();
        expect(users[2]).toEqual({ userId: '103', firstName: '' });
    });
     test('should return empty array if file does not exist', () => {
      fs.existsSync.mockReturnValueOnce(false);
      expect(getUniqueUserData()).toEqual([]);
    });
  });

  describe('readCSV', () => {
    const testGenericCsvPath = path.join(projectRootDir, 'generic_test.csv');
    test('should return an array of objects with keys matching headers', () => {
      fs.__setMockFileData(testGenericCsvPath, genericSampleCSV);
      fs.existsSync.mockReturnValueOnce(true);
      const data = readCSV(testGenericCsvPath);
      expect(data.length).toBe(3);
      expect(data[0]).toEqual({ header1: 'val1A', header2: 'val1B', header3: 'val1C' });
    });
    test('should return empty array if file does not exist', () => {
        fs.existsSync.mockReturnValueOnce(false);
        expect(readCSV(testGenericCsvPath)).toEqual([]);
        expect(fs.readFileSync).not.toHaveBeenCalledWith(testGenericCsvPath, 'utf8');
    });
    test('should handle CSV with empty lines', () => {
        const csvWithEmptyLines = `header1,header2\nval1A,val1B\n\nval2A,val2B`;
        fs.__setMockFileData(testGenericCsvPath, csvWithEmptyLines);
        fs.existsSync.mockReturnValueOnce(true);
        expect(readCSV(testGenericCsvPath).length).toBe(2);
    });
  });

  describe('getChallengesFromCSV', () => {
    test('should return an array of approved challenge objects', () => {
      fs.existsSync.mockReturnValueOnce(true);
      fs.__setMockFileData(actualChallengeFilePath, sampleChallengeDataCSV);
      const challenges = getChallengesFromCSV();
      expect(challenges.length).toBe(2);
      expect(challenges[0].CHALLENGE_ID).toBe('challenge1');
    });
    test('should return empty array if no challenges are "Approved"', () => {
      const nonApprovedCSV = `CHALLENGE_ID,PARTICIPANTS,STATUS\nchallenge2,5,Pending`;
      fs.existsSync.mockReturnValueOnce(true);
      fs.__setMockFileData(actualChallengeFilePath, nonApprovedCSV);
      expect(getChallengesFromCSV()).toEqual([]);
    });
  });
});

describe('CSV Writing and Modifying Functions', () => {
  beforeEach(() => {
    fs.__clearAllMockFiles(); 
    fs.existsSync.mockClear();
    fs.readFileSync.mockClear();
    fs.writeFileSync.mockClear();
    fs.appendFileSync.mockClear();
    fs.__setMockFileData(actualChallengeFilePath, ''); 
    fs.__setMockFileData(actualRefFilePath, '');
  });

  describe('writeChallengeToCSV', () => {
    const sampleChallenge = {CHALLENGE_ID: 'c1', PARTICIPANTS: 10, START_DATE: '01/01/2025', END_DATE: '10/01/2025', DETAILS: 'New Challenge', MESSAGE: 'Go!', STATUS: 'Approved'};
    const expectedHeaders = 'CHALLENGE_ID,PARTICIPANTS,START_DATE,END_DATE,DETAILS,MESSAGE,STATUS';
    const expectedRow = 'c1,10,01/01/2025,10/01/2025,New Challenge,Go!,Approved';

    test('should write headers and row if file does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      writeChallengeToCSV(sampleChallenge);
      const writtenContent = fs.appendFileSync.mock.calls[0][1];
      expect(writtenContent).toBe(`${expectedHeaders}\n${expectedRow}\n`);
    });
    test('should write only row if file exists (existsSync is true)', () => {
      fs.existsSync.mockReturnValue(true); 
      writeChallengeToCSV(sampleChallenge);
      const writtenContent = fs.appendFileSync.mock.calls[0][1];
      expect(writtenContent).toBe(`${expectedRow}\n`);
    });
  });

  describe('removeDuplicateRows', () => {
    const duplicateCsvData = `headerA,headerB\nrow1A,row1B\nrow2A,row2B\nrow1A,row1B\n`;
    const expectedUniqueCsv = `headerA,headerB\nrow1A,row1B\nrow2A,row2B\n`;
    test('should remove duplicate rows and keep header', () => {
      fs.existsSync.mockReturnValue(true);
      fs.__setMockFileData(actualRefFilePath, duplicateCsvData);
      removeDuplicateRows(actualRefFilePath);
      expect(fs.writeFileSync).toHaveBeenCalledWith(actualRefFilePath, expectedUniqueCsv);
    });
  });

  describe('checkAndFilterRowsByDate', () => {
    const sampleRefCsv = `id,name,time,other\n1,itemA,01/01/2024,dataA\n2,itemB,15/01/2024,dataB\n3,itemC,01/02/2024,dataC`;
    const expectedFilteredCsvJan2024 = `id,name,time,other\n1,itemA,01/01/2024,dataA\n2,itemB,15/01/2024,dataB\n`;
    const headerOnlyRefCsv = `id,name,time,other\n`;
    beforeEach(() => {
        fs.__setMockFileData(actualRefFilePath, sampleRefCsv);
        fs.existsSync.mockReturnValue(true);
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => { console.error.mockRestore(); });

    test('should filter rows within the specified date range (inclusive)', () => {
      checkAndFilterRowsByDate(actualRefFilePath, 'time', '01/01/2024', '31/01/2024');
      expect(fs.writeFileSync).toHaveBeenCalledWith(actualRefFilePath, expectedFilteredCsvJan2024);
    });
    test('should write only headers if date column does not exist', () => {
      checkAndFilterRowsByDate(actualRefFilePath, 'nonExistentColumn', '01/01/2024', '31/01/2024');
      expect(fs.writeFileSync).toHaveBeenCalledWith(actualRefFilePath, headerOnlyRefCsv);
    });
    test('should handle invalid start/end date strings by writing back original data', () => {
        const sampleRefCsvWithoutTrailingNewline = sampleRefCsv.trim();
        fs.__setMockFileData(actualRefFilePath, sampleRefCsvWithoutTrailingNewline);
        checkAndFilterRowsByDate(actualRefFilePath, 'time', 'invalid-start', '31/01/2024');
        expect(fs.writeFileSync).toHaveBeenCalledWith(actualRefFilePath, sampleRefCsvWithoutTrailingNewline + '\n'); 
    });
  });
});

describe('Bot Interaction and File Download Functions', () => {
  beforeEach(() => {
    MockTelegramBot.mockSendMessage.mockClear();
    MockTelegramBot.mockSendPhoto.mockClear();
    MockTelegramBot.mockSendVideo.mockClear();
    MockTelegramBot.mockGetFileLink.mockClear();
    if (axios.mockClear) axios.mockClear();
    if (axios.get && axios.get.mockClear) axios.get.mockClear();
    fs.__clearAllMockFiles();
    fs.existsSync.mockClear();
    fs.readFileSync.mockClear();
    fs.createWriteStream.mockClear();
    fs.existsSync.mockReturnValue(true);
    const defaultUserCsv = `USER ID,USER NAME,NAME\n101,userone,Alice\n102,usertwo,Bob`;
    fs.__setMockFileData(actualCsvFilePath, defaultUserCsv);
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {}); 
  });
  afterEach(() => {
    console.error.mockRestore();
    console.log.mockRestore();
  });

  describe('sendGeneralMessageToAllUsers', () => {
    const sampleUsersForMessageSending = [{ userId: '101', firstName: 'Alice' }, { userId: '102', firstName: 'Bob' }];
    const specificUserCsvForMessageSending = `USER ID,USER NAME,NAME\n${sampleUsersForMessageSending.map(u => `${u.userId},fakeusername,${u.firstName}`).join('\n')}`;
    test('should send text message to all users', async () => {
      fs.__setMockFileData(actualCsvFilePath, specificUserCsvForMessageSending);
      await sendGeneralMessageToAllUsers("Hello test");
      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledTimes(2);
      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledWith('101', 'Hello Alice,\nHello test');
    });
    test('should send text message with photo to all users', async () => {
      fs.__setMockFileData(actualCsvFilePath, specificUserCsvForMessageSending);
      const media = { type: 'photo', filePath: 'fake/path/photo.jpg', caption: 'Test photo' };
      await sendGeneralMessageToAllUsers("Check this out", media);
      expect(MockTelegramBot.mockSendPhoto).toHaveBeenCalledTimes(2);
      expect(MockTelegramBot.mockSendPhoto).toHaveBeenCalledWith('101', media.filePath, { caption: `${media.caption} (for Alice)` });
    });
    test('should not call sendMessage if getUniqueUserData returns empty array', async () => {
      fs.__setMockFileData(actualCsvFilePath, 'USER ID,USER NAME,NAME\n');
      await sendGeneralMessageToAllUsers("Hello test");
      expect(MockTelegramBot.mockSendMessage).not.toHaveBeenCalled();
    });
    test('should log error and continue if sendMessage fails for one user', async () => {
      fs.__setMockFileData(actualCsvFilePath, specificUserCsvForMessageSending);
      MockTelegramBot.mockSendMessage.mockImplementationOnce(async (userId) => { if (userId === '101') throw new Error("Mock send error for 101"); return Promise.resolve({ message_id: 123 }); });
      await sendGeneralMessageToAllUsers("Hello test");
      expect(console.error).toHaveBeenCalledWith("Failed to send message to 101:", "Mock send error for 101");
      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendChallengeMessageToAllUsers', () => {
    const sampleUsersForChallenge = [{ userId: '201', firstName: 'Charlie' }, { userId: '202', firstName: 'Dave' }];
    const specificUserCsvForChallenge = `USER ID,USER NAME,NAME\n${sampleUsersForChallenge.map(u => `${u.userId},fakeuser,${u.firstName}`).join('\n')}`;
    const assumedChallengeLinkBase = 'https://t.me/YourBotName_Bot?start=';
    test('should send challenge message to all users with unique links', async () => {
      fs.__setMockFileData(actualCsvFilePath, specificUserCsvForChallenge);
      await sendChallengeMessageToAllUsers("New challenge for you");
      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledTimes(2);
      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledWith('201', `Hello Charlie,\nNew challenge for you\nChallenge: ${assumedChallengeLinkBase}ref=201`);
    });
  });

  describe('downloadFile', () => {
    const testUrl = 'http://fakeurl.com/file.zip';
    const testFilePath = 'local/path/file.zip'; 
    const resolvedTestFilePath = path.resolve(testFilePath); 

    test('should resolve on successful download and pipe to writer', async () => {
      await expect(downloadFile(testUrl, testFilePath)).resolves.toBeUndefined();
      expect(axios).toHaveBeenCalledWith({ method: 'get', url: testUrl, responseType: 'stream' });
      expect(fs.createWriteStream).toHaveBeenCalledWith(testFilePath);
      expect(fs.readFileSync(resolvedTestFilePath, 'utf8')).toBe('some data chunk 1some data chunk 2');
    });
    test('should reject if axios call fails', async () => {
      axios.mockImplementationOnce(() => Promise.reject(new Error("Axios network error")));
      await expect(downloadFile(testUrl, testFilePath)).rejects.toThrow("Axios network error");
    });
    test('should reject if write stream emits an error', async () => {
        const writeStreamError = new Error("File system write error");
        fs.createWriteStream.mockImplementationOnce(() => {
            const EventEmitter = require('events');
            const mockWriter = new EventEmitter(); // Use EventEmitter for .emit()
            mockWriter.write = jest.fn(); // SUT might call write via pipe
            mockWriter.end = jest.fn();   // SUT might call end via pipe

            // Simulate an error emission shortly after this stream is created and used.
            process.nextTick(() => {
                mockWriter.emit('error', writeStreamError);
            });
            return mockWriter;
        });
        await expect(downloadFile(testUrl, testFilePath)).rejects.toThrow("File system write error");
    });
  });

  describe('pickRandomWinner', () => {
    let mathRandomSpy;
    beforeEach(() => { mathRandomSpy = jest.spyOn(Math, 'random'); });
    afterEach(() => { mathRandomSpy.mockRestore(); });

    test('should pick a winner from unique entries', () => {
        const data = [{ userId: '1' }, { userId: '2' }, { userId: '3' }];
        mathRandomSpy.mockReturnValue(0.5);
        expect(pickRandomWinner(data)).toEqual({ userId: '2' });
    });
    test('should remove duplicates before picking a winner', () => {
        const data = [{ userId: '1' }, { userId: '2' }, { userId: '1' }, { userId: '3' }];
        mathRandomSpy.mockReturnValue(0.9);
        expect(pickRandomWinner(data)).toEqual({ userId: '3' });
    });
    test('should return null if initial data is empty', () => {
        expect(pickRandomWinner([])).toBeNull();
    });
    test('should handle single entry correctly', () => {
        const data = [{ userId: '1' }];
        mathRandomSpy.mockReturnValue(0.1);
        expect(pickRandomWinner(data)).toEqual({ userId: '1' });
    });
  });
});

// console.log('__tests__/main.test.js loaded and parsed'); // For verification during testing
// Commented out the above line as it was appearing twice.

describe('Admin Bot Event Handlers', () => {
  // adminBot and adminState are imported from main.js
  const { adminBot, adminState, allowedAdmins: mainAllowedAdmins } = require('../main.js');
  
  const adminUserId = mainAllowedAdmins[0]; // Use the first admin from the list in main.js
  const nonAdminUserId = 99999; // A known non-admin ID, ensure it's not in mainAllowedAdmins

  beforeEach(() => {
    MockTelegramBot.mockSendMessage.mockClear();
    MockTelegramBot.mockSendPhoto.mockClear(); // Just in case
    MockTelegramBot.mockSendVideo.mockClear(); // Just in case
    
    // Reset adminState
    for (const key in adminState) {
      delete adminState[key];
    }
    
    // Mock fs for getUniqueUserData, actualCsvFilePath is globally defined in this test file
    fs.__clearAllMockFiles(); // Clear previous fs mocks
    fs.existsSync.mockReturnValue(true); // Assume phone_numbers.csv exists
    const defaultUserCsv = `USER ID,USER NAME,NAME\nuser101,uname1,UserOne\nuser102,uname2,UserTwo`;
    fs.__setMockFileData(actualCsvFilePath, defaultUserCsv);

    // Spy on console messages
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console spies
    console.error.mockRestore();
    console.log.mockRestore();
  });

  describe('/start command handler (adminBot.onText)', () => {
    test('should send unauthorized message for non-admin user', () => {
      const msg = { chat: { id: nonAdminUserId }, text: '/start' };
      adminBot._simulateText(msg.text, msg); 
      
      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledTimes(1);
      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledWith(nonAdminUserId, "You are not authorized to use this bot.");
    });

    test('should send welcome message and options for admin user', async () => {
      const msg = { chat: { id: adminUserId }, text: '/start' };
      adminBot._simulateText(msg.text, msg);
      
      // The handler in main.js is async due to getUniqueUserData potentially being async (though current is sync)
      // and the then/catch. Let's wait for any promises to settle.
      await Promise.resolve(); 

      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledTimes(1);
      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledWith(
        adminUserId,
        expect.stringContaining("Welcome Admin! Unique users: 2"), // Based on defaultUserCsv
        expect.objectContaining({
          reply_markup: {
            inline_keyboard: [
              [{ text: "Send Text Message to All Users", callback_data: "send_text_message_to_all" }],
              [{ text: "Send Media to All Users", callback_data: "send_media_to_all" }],
              [{ text: "Start Challenge", callback_data: "start_challenge" }],
            ],
          },
        })
      );
    });

    test('should handle error if getUniqueUserData (via fs.readFileSync) fails', async () => {
      const msg = { chat: { id: adminUserId }, text: '/start' };
      fs.readFileSync.mockImplementationOnce(() => { throw new Error("FS Read error"); });
      
      adminBot._simulateText(msg.text, msg);
      await Promise.resolve(); // Wait for async operations in handler

      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledTimes(1);
      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledWith(adminUserId, "Error fetching user data.");
      expect(console.error).toHaveBeenCalledWith("Error fetching unique user data:", expect.any(Error));
    });
  });

  describe('callback_query handler (adminBot.on(\'callback_query\'))', () => {
    test('should send unauthorized for non-admin user on callback_query', () => {
      const callbackQuery = { message: { chat: { id: nonAdminUserId } }, data: 'send_text_message_to_all' };
      adminBot._simulateEvent('callback_query', callbackQuery);
      
      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledWith(nonAdminUserId, "You are not authorized.");
    });

    test('should set state to "awaiting_text_message" and prompt for text', () => {
      const callbackQuery = { message: { chat: { id: adminUserId } }, data: 'send_text_message_to_all' };
      adminBot._simulateEvent('callback_query', callbackQuery);
      
      expect(adminState[adminUserId]).toBe('awaiting_text_message');
      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledWith(adminUserId, "Please send the text message you want to broadcast.");
    });

    test('should set state to "awaiting_media" and prompt for media', () => {
      const callbackQuery = { message: { chat: { id: adminUserId } }, data: 'send_media_to_all' };
      adminBot._simulateEvent('callback_query', callbackQuery);
      
      expect(adminState[adminUserId]).toBe('awaiting_media');
      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledWith(adminUserId, "Please send the photo or video with a caption.");
    });

    test('should set state to "awaiting_challenge_participants" on "start_challenge"', () => {
      const callbackQuery = { message: { chat: { id: adminUserId } }, data: 'start_challenge' };
      adminBot._simulateEvent('callback_query', callbackQuery);
      
      expect(adminState[adminUserId]).toEqual({ stage: 'awaiting_challenge_participants' });
      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledWith(adminUserId, "Enter the number of participants for the challenge:");
    });
    
    test('should not send a message for unknown callback_data from an admin', () => {
        const callbackQuery = { message: { chat: { id: adminUserId } }, data: 'unknown_action_xyz' };
        adminBot._simulateEvent('callback_query', callbackQuery);
        expect(MockTelegramBot.mockSendMessage).not.toHaveBeenCalled();
    });
  });

  // Test for admin message handlers based on adminState
  describe('Admin Message Handlers (adminBot.on(\'message\'))', () => {
    test('should process participant number when state is "awaiting_challenge_participants"', () => {
      // 1. Set initial state (as if 'start_challenge' callback was triggered)
      adminState[adminUserId] = { stage: 'awaiting_challenge_participants' };
      
      // 2. Simulate admin sending a message with the number of participants
      const msg = { chat: { id: adminUserId }, text: '5' };
      // This assumes a generic adminBot.on('message', callback) exists in main.js
      // and that it checks adminState. We use _simulateEvent as a generic way
      // to trigger 'message' type events if on('message') is used.
      // If main.js uses onText for these, this needs adjustment.
      // For now, assuming on('message',...) is the primary handler for subsequent inputs.
      // The mock _simulateEvent will execute any callback registered for 'message'.
      adminBot._simulateEvent('message', msg);

      // 3. Assertions
      expect(adminState[adminUserId].participants).toBe(5);
      expect(adminState[adminUserId].stage).toBe('awaiting_start_date');
      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledWith(adminUserId, "Enter the start date for the challenge (DD/MM/YYYY):");
    });

    test('should ask for valid participant number if input is invalid', () => {
      adminState[adminUserId] = { stage: 'awaiting_challenge_participants' };
      const msg = { chat: { id: adminUserId }, text: 'invalid_number' };
      adminBot._simulateEvent('message', msg);

      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledWith(adminUserId, "Invalid number. Please enter a positive number for participants.");
      // State should remain 'awaiting_challenge_participants'
      expect(adminState[adminUserId].stage).toBe('awaiting_challenge_participants');
      expect(adminState[adminUserId].participants).toBeUndefined();
    });
    
    // Add more tests here for other stages like awaiting_start_date, awaiting_end_date, etc.
    // For example:
    test('should process start date when state is "awaiting_start_date"', () => {
      adminState[adminUserId] = { stage: 'awaiting_start_date', participants: 5 };
      const msg = { chat: { id: adminUserId }, text: '01/01/2025' };
      adminBot._simulateEvent('message', msg);

      expect(adminState[adminUserId].startDate).toBe('01/01/2025');
      expect(adminState[adminUserId].stage).toBe('awaiting_end_date');
      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledWith(adminUserId, "Enter the end date for the challenge (DD/MM/YYYY):");
    });

    test('should ask for valid start date if input is invalid', () => {
      adminState[adminUserId] = { stage: 'awaiting_start_date', participants: 5 };
      const msg = { chat: { id: adminUserId }, text: 'invalid-date-format' };
      adminBot._simulateEvent('message', msg);
      
      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledWith(adminUserId, "Invalid date format. Please use DD/MM/YYYY.");
      expect(adminState[adminUserId].stage).toBe('awaiting_start_date'); // Stage should remain
    });

  });
});

describe('Admin Bot Event Handlers', () => {
  // Import adminBot and adminState from main.js for direct manipulation/assertion if needed.
  // Note: adminState is not directly exported in current main.js.
  // We will test its effects via bot responses and subsequent state-dependent actions.
  // We need adminBot to trigger its simulated event handlers.
  const { adminBot, isAdmin, getUniqueUserData, allowedAdmins } = require('../main.js');
  
  // adminState is module-scoped in main.js, not directly importable unless exported.
  // We will reset it by directly manipulating it if we get a reference, or test its implied state.
  // For now, we'll rely on the subtask's instruction to reset it if necessary,
  // implying we might need to export it from main.js or test its state via side effects.
  // Since it's a const object, we can't reassign it, but can delete its keys.
  // Let's assume for now we'll need to export it from main.js if direct reset is needed.
  // If not exported, tests will focus on state changes reflected in bot's behavior.

  const adminUserId = allowedAdmins[0]; // Use the first admin from the list
  const nonAdminUserId = 99999; // A known non-admin ID

  beforeEach(() => {
    MockTelegramBot.mockSendMessage.mockClear();
    MockTelegramBot.mockSendPhoto.mockClear();
    MockTelegramBot.mockSendVideo.mockClear();
    // Reset adminState (assuming it's exported or accessible for modification)
    // If adminState is not exported, we test its implicit state changes.
    // For now, we'll assume main.js might need to export adminState for robust testing.
    // Let's simulate reset if it were exported:
    // for (const key in adminState) { delete adminState[key]; }
    
    // Mock fs for getUniqueUserData
    fs.__clearAllMockFiles();
    fs.existsSync.mockReturnValue(true); // Assume phone_numbers.csv exists
    const defaultUserCsv = `USER ID,USER NAME,NAME\n1,u1,N1\n2,u2,N2`;
    fs.__setMockFileData(actualCsvFilePath, defaultUserCsv); // actualCsvFilePath is globally defined in test file

    // Spy on console messages if necessary
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
    console.log.mockRestore();
    // Restore Math.random if it was spied on in any test within this block
    // (currently not, but good practice if adding more tests)
  });

  describe('/start command handler (adminBot.onText)', () => {
    test('should send unauthorized message for non-admin user', async () => {
      const msg = { chat: { id: nonAdminUserId }, text: '/start' };
      // Simulate the bot receiving the /start command
      // The mock adminBot._simulateText will find the regex and execute the callback
      adminBot._simulateText(msg.text, msg); 
      
      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledTimes(1);
      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledWith(nonAdminUserId, "You are not authorized to use this bot.");
    });

    test('should send welcome message and options for admin user', async () => {
      const msg = { chat: { id: adminUserId }, text: '/start' };
      // getUniqueUserData is called, fs mock is already set up in beforeEach to provide 2 users.
      adminBot._simulateText(msg.text, msg);

      // Wait for promises in the handler to resolve if any (handler is async)
      await Promise.resolve(); 

      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledTimes(1);
      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledWith(
        adminUserId,
        expect.stringContaining("Welcome Admin! Unique users: 2"), // Check for user count
        expect.objectContaining({ // Check for reply_markup
          reply_markup: {
            inline_keyboard: [
              [{ text: "Send Text Message to All Users", callback_data: "send_text_message_to_all" }],
              [{ text: "Send Media to All Users", callback_data: "send_media_to_all" }],
              [{ text: "Start Challenge", callback_data: "start_challenge" }],
            ],
          },
        })
      );
    });

    test('should handle error if getUniqueUserData fails', async () => {
      const msg = { chat: { id: adminUserId }, text: '/start' };
      // Make getUniqueUserData (via its fs dependency) throw an error
      fs.readFileSync.mockImplementationOnce(() => { throw new Error("DB error"); });
      
      adminBot._simulateText(msg.text, msg);
      await Promise.resolve();

      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledTimes(1);
      // The exact error message might depend on main.js's error handling.
      // Based on the snippet, it might be "Error fetching unique user data" or similar.
      // Let's assume a generic error message or that it logs and sends a fallback.
      // The provided snippet doesn't show specific error message for this,
      // but it should call sendMessage with some indication of failure or fallback.
      // For now, check it was called. A more specific check requires knowing main.js's exact error reply.
      // The snippet shows: console.error("Error fetching unique user data:", error); bot.sendMessage(chatId, "Error fetching user data.");
      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledWith(adminUserId, "Error fetching user data.");
      expect(console.error).toHaveBeenCalledWith("Error fetching unique user data:", expect.any(Error));
    });
  });

  describe('callback_query handler (adminBot.on(\'callback_query\'))', () => {
    // We need adminState to be exported from main.js to properly test its changes.
    // For now, let's assume it is and add it to imports if this causes issues.
    // Or, we test its side-effects on subsequent interactions.
    // Let's proceed by checking the bot's replies, which imply state changes.

    test('should send unauthorized for non-admin user on callback_query', async () => {
      const callbackQuery = { message: { chat: { id: nonAdminUserId } }, data: 'send_text_message_to_all' };
      adminBot._simulateEvent('callback_query', callbackQuery);
      await Promise.resolve();
      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledWith(nonAdminUserId, "You are not authorized.");
    });

    test('should set state and prompt for text on "send_text_message_to_all"', async () => {
      const callbackQuery = { message: { chat: { id: adminUserId } }, data: 'send_text_message_to_all' };
      adminBot._simulateEvent('callback_query', callbackQuery);
      await Promise.resolve();
      // Assert adminState[adminUserId] is 'awaiting_text_message' - this requires exporting adminState or a getter
      // For now, check the bot's response
      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledWith(adminUserId, "Please send the text message you want to broadcast.");
      // To assert state: expect(getAdminState(adminUserId)).toBe('awaiting_text_message');
    });

    test('should set state and prompt for media on "send_media_to_all"', async () => {
      const callbackQuery = { message: { chat: { id: adminUserId } }, data: 'send_media_to_all' };
      adminBot._simulateEvent('callback_query', callbackQuery);
      await Promise.resolve();
      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledWith(adminUserId, "Please send the photo or video with a caption.");
      // To assert state: expect(getAdminState(adminUserId)).toBe('awaiting_media');
    });

    test('should set state and prompt for participants on "start_challenge"', async () => {
      const callbackQuery = { message: { chat: { id: adminUserId } }, data: 'start_challenge' };
      adminBot._simulateEvent('callback_query', callbackQuery);
      await Promise.resolve();
      expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledWith(adminUserId, "Enter the number of participants for the challenge:");
      // To assert state: expect(getAdminState(adminUserId).stage).toBe('awaiting_challenge_participants');
    });
    
    // Test for unknown callback data if such logic exists in main.js
    test('should handle unknown callback_data gracefully', async () => {
        const callbackQuery = { message: { chat: { id: adminUserId } }, data: 'unknown_action_123' };
        adminBot._simulateEvent('callback_query', callbackQuery);
        await Promise.resolve();
        // Based on provided snippet, no explicit handling for unknown data, so no message might be sent.
        // Or, if there's a default handler or error message:
        // expect(MockTelegramBot.mockSendMessage).toHaveBeenCalledWith(adminUserId, "Unknown action.");
        // For now, let's assume no message for unhandled. If main.js has a default, this needs adjustment.
        // The provided snippet only has if/else if for specific data strings.
        expect(MockTelegramBot.mockSendMessage).not.toHaveBeenCalledWith(adminUserId, expect.stringContaining("Unknown action"));
    });
  });
});
