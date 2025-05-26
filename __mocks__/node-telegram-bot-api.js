// __mocks__/node-telegram-bot-api.js

const mockSendMessage = jest.fn(() => Promise.resolve({ message_id: 123 }));
const mockSendPhoto = jest.fn(() => Promise.resolve({ message_id: 124 }));
const mockSendVideo = jest.fn(() => Promise.resolve({ message_id: 125 }));
const mockGetFileLink = jest.fn(() => Promise.resolve('http://fake.telegram.link/file'));
// Keep mockOnText and mockOn for direct calls if needed, but also store callbacks.

class MockTelegramBot {
    constructor(token, options) {
        this.token = token;
        this.options = options;
        
        this.sendMessage = mockSendMessage;
        this.sendPhoto = mockSendPhoto;
        this.sendVideo = mockSendVideo;
        this.getFileLink = mockGetFileLink;

        // Store registered handlers
        this.textRegexpCallbacks = []; // For onText listeners
        this.eventCallbacks = {};    // For on(event, listener)

        // Mock implementations for onText and on to store callbacks
        this.onText = jest.fn((regexp, callback) => {
            this.textRegexpCallbacks.push({ regexp, callback });
        });

        this.on = jest.fn((event, callback) => {
            if (!this.eventCallbacks[event]) {
                this.eventCallbacks[event] = [];
            }
            this.eventCallbacks[event].push(callback);
        });
    }

    // Helper method for tests to find and trigger text callbacks
    _simulateText(text, msg = {}) {
        const fullMsg = { text, ...msg }; // Allow passing partial msg
        for (const regCallback of this.textRegexpCallbacks) {
            const match = regCallback.regexp.exec(text);
            if (match) {
                // Call the callback with the message and the match object
                regCallback.callback(fullMsg, match);
                return true; // Indicate a match was found and callback triggered
            }
        }
        return false; // No match found
    }

    // Helper method for tests to find and trigger event callbacks
    _simulateEvent(event, data) {
        if (this.eventCallbacks[event]) {
            this.eventCallbacks[event].forEach(callback => callback(data));
            return true;
        }
        return false;
    }
}

// Export the mock functions so they can be imported and checked in tests
MockTelegramBot.mockSendMessage = mockSendMessage;
MockTelegramBot.mockSendPhoto = mockSendPhoto;
MockTelegramBot.mockSendVideo = mockSendVideo;
MockTelegramBot.mockGetFileLink = mockGetFileLink;
// Keep original mockOnText and mockOn if needed for just checking if 'onText' was called
// but the instance methods above will be used by the SUT.
// MockTelegramBot.mockOnText = jest.fn(); // if we need to spy on the prototype method itself
// MockTelegramBot.mockOn = jest.fn();

module.exports = MockTelegramBot;
