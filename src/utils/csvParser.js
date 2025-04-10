export function parseCSV(data) {
    const rows = data.split('\n').map(row => row.trim()).filter(row => row);
    const headers = rows[0].split(';'); // Updated delimiter to ;
    const records = rows.slice(1).map(row => {
        const values = row.split(';'); // Updated delimiter to ;
        return headers.reduce((acc, header, index) => {
            acc[header.trim()] = values[index]?.trim();
            return acc;
        }, {});
    });
    return records;
}