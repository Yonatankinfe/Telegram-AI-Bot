const fsActual = jest.requireActual('fs');
const pathActual = jest.requireActual('path');
const { Writable } = require('stream');

let mockFiles = Object.create(null);

function __setMockFileData(filename, data) {
  const resolvedPath = pathActual.resolve(filename);
  mockFiles[resolvedPath] = data;
}

function __clearAllMockFiles() {
    mockFiles = Object.create(null);
}

function readFileSync(filePath, options) {
  const resolvedPath = pathActual.resolve(filePath);
  return mockFiles[resolvedPath] === undefined ? '' : mockFiles[resolvedPath];
}

function writeFileSync(filePath, data, options) {
  const resolvedPath = pathActual.resolve(filePath);
  mockFiles[resolvedPath] = data; 
}

function appendFileSync(filePath, data, options) {
  const resolvedPath = pathActual.resolve(filePath);
  mockFiles[resolvedPath] = (mockFiles[resolvedPath] || '') + data;
}

function existsSync(filePath) {
  const resolvedPath = pathActual.resolve(filePath);
  return mockFiles[resolvedPath] !== undefined;
}

// Updated createWriteStream mock to use stream.Writable
function createWriteStream(filePath) {
    const resolvedPath = pathActual.resolve(filePath);
    
    const chunks = [];
    const mockStream = new Writable({
        write(chunk, encoding, callback) {
            chunks.push(chunk);
            callback();
        },
        final(callback) { // Called when stream.end() is called
            mockFiles[resolvedPath] = Buffer.concat(chunks).toString();
            callback();
            // Emit 'finish' after final operations. Writable does this.
        }
    });
    // Add a pipe method for compatibility if something tries to call it,
    // but standard is source.pipe(writable)
    mockStream.pipe = jest.fn(); // Should not be called on a Writable directly this way often.
    
    return mockStream;
}

function unlinkSync(filePath) {
    const resolvedPath = pathActual.resolve(filePath);
    delete mockFiles[resolvedPath];
}

const fs = jest.createMockFromModule('fs');

fs.__setMockFileData = __setMockFileData;
fs.__clearAllMockFiles = __clearAllMockFiles;
fs.readFileSync = jest.fn(readFileSync).mockName('mockedReadFileSync');
fs.writeFileSync = jest.fn(writeFileSync).mockName('mockedWriteFileSync');
fs.appendFileSync = jest.fn(appendFileSync).mockName('mockedAppendFileSync');
fs.existsSync = jest.fn(existsSync).mockName('mockedExistsSync');
fs.createWriteStream = jest.fn(createWriteStream).mockName('mockedCreateWriteStream');
fs.unlinkSync = jest.fn(unlinkSync).mockName('mockedUnlinkSync');

fs.createReadStream = jest.fn((filePath) => {
    const resolvedPath = pathActual.resolve(filePath);
    const EventEmitter = require('events'); // Use EventEmitter for simple readable mock
    const stream = new EventEmitter();
    const fileContent = mockFiles[resolvedPath] || '';
    
    // Add a minimal pipe method for the readable mock stream
    stream.pipe = function(destination) {
        this.on('data', (chunk) => destination.write(chunk));
        this.on('end', () => destination.end());
        return destination;
    };

    process.nextTick(() => {
        const lines = fileContent.split('\n');
        lines.forEach(line => stream.emit('data', line + '\n'));
        stream.emit('end');
    });
    return stream;
}).mockName('mockedCreateReadStream');

module.exports = fs;
