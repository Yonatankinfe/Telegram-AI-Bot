// __mocks__/axios.js
const stream = require('stream');

const mockAxiosInstance = {
    get: jest.fn((url, config) => {
        if (config && config.responseType === 'stream') {
            const PassThrough = stream.PassThrough;
            const mockStream = new PassThrough();
            process.nextTick(() => {
               mockStream.write('some data chunk 1'); // Use write for PassThrough
               mockStream.write('some data chunk 2');
               mockStream.end(); // End the PassThrough stream
            });
            return Promise.resolve({ data: mockStream, status: 200 });
        }
        return Promise.resolve({ data: { message: 'mock get success' }, status: 200 });
    }),
    post: jest.fn(() => Promise.resolve({ data: { message: 'mock post success' }, status: 200 })),
};

const axios = jest.fn((config) => {
    if (config.responseType === 'stream' && config.method && config.method.toLowerCase() === 'get') {
        const PassThrough = stream.PassThrough;
        const mockStream = new PassThrough();
        process.nextTick(() => {
           mockStream.write('some data chunk 1');
           mockStream.write('some data chunk 2');
           mockStream.end();
        });
        return Promise.resolve({ data: mockStream, status: 200 });
    }
    if (config.method && config.method.toLowerCase() === 'post') {
         return mockAxiosInstance.post(config.url, config.data, config);
    }
    return mockAxiosInstance.get(config.url, config);
});

axios.get = mockAxiosInstance.get;
axios.post = mockAxiosInstance.post;
axios.create = jest.fn(() => mockAxiosInstance);

module.exports = axios;
