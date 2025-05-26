// __mocks__/openai.js
const mockChatCompletionsCreate = jest.fn(() => Promise.resolve({
  choices: [{ message: { content: 'Mocked OpenAI response' } }],
}));

class MockOpenAI {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.chat = {
      completions: {
        create: mockChatCompletionsCreate,
      },
    };
  }
}

// Export the mock functions if tests need to assert calls to them
MockOpenAI.mockChatCompletionsCreate = mockChatCompletionsCreate;

module.exports = MockOpenAI;
