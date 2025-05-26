const path = jest.createMockFromModule('path');
path.join = (...args) => args.join('/'); // Basic mock for join
path.resolve = (...args) => args.join('/'); // Basic mock for resolve
path.dirname = (p) => p.substring(0, p.lastIndexOf('/')); // Basic mock for dirname
module.exports = path;
