export function validateCSV(data, type) {
    console.log(`Validating ${type} CSV data...`);
    const rows = data.split('\n').map(row => row.split(';').map(cell => cell.trim()));
    const headers = rows[0];

    if (type === 'supervisors') {
        return validateSupervisorsCSV(headers, rows);
    } else if (type === 'examDays') {
        return validateExamDaysCSV(headers, rows);
    }
    console.warn('Unknown CSV type:', type);
    return false;
}

function validateSupervisorsCSV(headers, rows) {
    const expectedHeaders = ['Sukunimi', 'Etunimi', 'Ruotsinkielen taito', 'Valvonut aikaisemmin', 'Sijoitus', 'Jääviydet', 'Vuorotoiveet'];
    const dateColumns = headers.filter(header => /^\d{2}\.\d{2}\.\d{4}$/.test(header));

    if (dateColumns.length < 1) {
        alert('Invalid Supervisors CSV format. Ensure there is at least one date column in the format DD.MM.YYYY.');
        return false;
    }

    const allExpectedHeaders = [...expectedHeaders.slice(0, 2), ...dateColumns, ...expectedHeaders.slice(2)];
    if (!validateHeaders(headers, allExpectedHeaders)) {
        alert('Invalid Supervisors CSV format. Ensure headers match the expected format.');
        return false;
    }

    // Additional row validation logic...
    console.log('Supervisors CSV validated successfully.');
    return true;
}

function validateExamDaysCSV(headers, rows) {
    const baseHeaders = ['Päivä', 'Koe klo', 'Valintakokeen nimi', 'Koekoodi', 'Osallistujat yhteensä'];
    const hallHeaders = headers.filter(header => /^Halli [A-Za-z0-9]+ osallistujat$/.test(header));
    const additionalHeaders = ['Työvuoro A klo', 'Työvuoro A hlömäärä', 'Työvuoro B klo', 'Työvuoro B hlömäärä'];
    const expectedHeaders = [...baseHeaders, ...hallHeaders, ...additionalHeaders];

    if (!validateHeaders(headers, expectedHeaders)) {
        alert('Invalid Exam Days CSV format. Ensure all hall columns are named as "Halli X osallistujat".');
        return false;
    }

    // Additional row validation logic...
    console.log('Exam Days CSV validated successfully.');
    return true;
}

function validateHeaders(headers, expectedHeaders) {
    const missingHeaders = expectedHeaders.filter((header, index) => headers[index]?.trim() !== header.trim());
    if (missingHeaders.length > 0) {
        console.warn('CSV headers do not match the expected format:', missingHeaders);
        return false;
    }
    return true;
}
