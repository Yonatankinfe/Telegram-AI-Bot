// __mocks__/json2csv.js
const json2csv = {
    parse: jest.fn(data => {
        if (!data || data.length === 0) return '';
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        data.forEach(row => {
            csvRows.push(headers.map(header => row[header]).join(','));
        });
        return csvRows.join('\n');
    })
};
module.exports = json2csv;
