// __mocks__/csv-writer.js
const mockCreateObjectCsvWriter = jest.fn(() => ({
  writeRecords: jest.fn(() => Promise.resolve()), // Mock the writeRecords function
}));

module.exports = {
  object: { // Simulate the .object property
    createObjectCsvWriter: mockCreateObjectCsvWriter,
  }
  // Mock other exports from csv-writer if your main.js uses them
};
