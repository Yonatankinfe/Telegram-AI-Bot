// __mocks__/csv-parser.js
const csv = jest.fn(() => {
  const stream = require('stream');
  const readable = new stream.Readable({ objectMode: true });
  readable._read = () => {}; // No-op for a mock readable stream

  // Simulate async processing, pushing data based on what fs.createReadStream might provide
  // This is tricky because it depends on the input stream.
  // For more robust mocking, you might need to inspect the input or have tests provide mock CSV data directly.
  
  // For now, let's assume it will be piped from a stream that emits 'data' events with row objects
  // This mock will be refined if tests show issues with how csv-parser is used.
  
  // A simple way to make it work with .pipe() is to return a transform stream
  const { Transform } = require('stream');
  const parser = new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      // This is a simplified mock. Real csv-parser does complex parsing.
      // We'll assume the input chunk is already somewhat structured if coming from our mocked fs.createReadStream
      const lines = chunk.toString().trim().split('\n');
      if (!this.headers) {
          this.headers = lines.shift().split(',');
      }
      for (const line of lines) {
          if (line) {
              const values = line.split(',');
              const row = this.headers.reduce((obj, header, index) => {
                  obj[header.trim()] = values[index] ? values[index].trim() : '';
                  return obj;
              }, {});
              this.push(row);
          }
      }
      callback();
    }
  });
  return parser;
});

module.exports = csv;
