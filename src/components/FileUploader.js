export default class FileUploader {
    constructor(containerId, onFilesUploaded) {
        console.log('Initializing FileUploader with containerId:', containerId);
        this.container = document.getElementById(containerId);
        this.onFilesUploaded = onFilesUploaded;
        this.render();
    }

    render() {
        console.log('Rendering file upload UI...');
        this.container.innerHTML = `
            <div>
                <h2>Upload CSV Files</h2>
                <label for="supervisorsFile">Supervisors CSV:</label>
                <input type="file" id="supervisorsFile" accept=".csv">
                <br>
                <label for="examDaysFile">Exam Days CSV:</label>
                <input type="file" id="examDaysFile" accept=".csv">
                <br>
                <button id="uploadFilesButton">Upload Files</button>
                <div id="previewContainer"></div>
            </div>
        `;

        document.getElementById('uploadFilesButton').addEventListener('click', () => this.handleFileUpload());
    }

    handleFileUpload() {
        console.log('Handling file upload...');
        const supervisorsFile = document.getElementById('supervisorsFile').files[0];
        const examDaysFile = document.getElementById('examDaysFile').files[0];

        if (!supervisorsFile || !examDaysFile) {
            alert('Please upload both CSV files.');
            return;
        }

        const readFile = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target.result);
                reader.onerror = (error) => reject(error);
                reader.readAsText(file);
            });
        };

        Promise.all([readFile(supervisorsFile), readFile(examDaysFile)])
            .then(([supervisorsData, examDaysData]) => {
                if (this.validateCSV(supervisorsData, 'supervisors') && this.validateCSV(examDaysData, 'examDays')) {
                    const supervisors = this.parseSupervisors(supervisorsData);
                    const examDays = this.parseExamDays(examDaysData);
                    this.previewData(supervisorsData, examDaysData);
                    this.onFilesUploaded(supervisors, examDays);
                }
            })
            .catch((error) => {
                alert('Failed to read files. Please try again.');
            });
    }

    parseSupervisors(data) {
        console.log('Parsing supervisors data...');
        const rows = data.split('\n').map(row => row.split(';').map(cell => cell.trim()));
        const headers = rows[0];
        const dateColumns = headers.filter(header => /^\d{2}\.\d{2}\.\d{4}$/.test(header));

        return rows.slice(1).map(row => {
            const supervisor = {
                lastName: row[headers.indexOf('Sukunimi')],
                firstName: row[headers.indexOf('Etunimi')],
                availableDays: dateColumns.filter(date => row[headers.indexOf(date)] === 'Checked'),
                languageSkill: row[headers.indexOf('Ruotsinkielen taito')],
                previousExperience: row[headers.indexOf('Valvonut aikaisemmin')] === 'Checked',
                position: row[headers.indexOf('Sijoitus')],
                disqualifications: row[headers.indexOf('Jääviydet')]?.split(' ') || [],
                shiftPreferences: row[headers.indexOf('Vuorotoiveet')]?.match(/\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}-\d{2}:\d{2}/g) || []
            };
            return supervisor;
        });
    }

    parseExamDays(data) {
        console.log('Parsing exam days data...');
        const rows = data.split('\n').map(row => row.split(';').map(cell => cell.trim()));
        const headers = rows[0];

        return rows.slice(1).map(row => ({
            date: row[headers.indexOf('Päivä')],
            timeRange: row[headers.indexOf('Koe klo')],
            examName: row[headers.indexOf('Valintakokeen nimi')],
            examCode: row[headers.indexOf('Koekoodi')],
            totalParticipants: parseInt(row[headers.indexOf('Osallistujat yhteensä')], 10),
            halls: headers
                .filter(header => /^Halli [A-Za-z0-9]+ osallistujat$/.test(header))
                .reduce((acc, hallHeader) => {
                    acc[hallHeader] = parseInt(row[headers.indexOf(hallHeader)], 10) || 0;
                    return acc;
                }, {}),
            shiftA: {
                timeRange: row[headers.indexOf('Työvuoro A klo')],
                minSupervisors: parseInt(row[headers.indexOf('Työvuoro A hlömäärä')], 10) || 0
            },
            shiftB: headers.includes('Työvuoro B klo') ? {
                timeRange: row[headers.indexOf('Työvuoro B klo')],
                minSupervisors: parseInt(row[headers.indexOf('Työvuoro B hlömäärä')], 10) || 0
            } : null
        }));
    }

    validateCSV(data, type) {
        console.log(`Validating ${type} CSV data...`);
        const rows = data.split('\n').map(row => row.split(';').map(cell => cell.trim())); // Updated delimiter to ;
        const headers = rows[0];
        if (type === 'supervisors') {
            const expectedHeaders = ['Sukunimi', 'Etunimi', 'Ruotsinkielen taito', 'Valvonut aikaisemmin', 'Sijoitus', 'Jääviydet', 'Vuorotoiveet'];
            const dateColumns = headers.filter(header => /^\d{2}\.\d{2}\.\d{4}$/.test(header)); // Identify all date columns

            if (dateColumns.length < 1) {
                console.warn('Validation failed: No date columns found.');
                alert('Invalid Supervisors CSV format. Ensure there is at least one date column in the format DD.MM.YYYY.');
                return false;
            }

            const allExpectedHeaders = [...expectedHeaders.slice(0, 2), ...dateColumns, ...expectedHeaders.slice(2)];
            if (!this.validateHeaders(headers, allExpectedHeaders)) {
                console.warn('Validation failed: Headers do not match expected format.');
                alert('Invalid Supervisors CSV format. Ensure headers match the expected format.');
                return false;
            }

            const columnIndices = {
                lastName: headers.indexOf('Sukunimi'),
                firstName: headers.indexOf('Etunimi'),
                languageSkill: headers.indexOf('Ruotsinkielen taito'),
                previousExperience: headers.indexOf('Valvonut aikaisemmin'),
                position: headers.indexOf('Sijoitus'),
                disqualifications: headers.indexOf('Jääviydet'),
                shiftPreferences: headers.indexOf('Vuorotoiveet'),
                dateColumns: dateColumns.map(date => headers.indexOf(date))
            };

            const validLanguages = ['Äidinkieli', 'Kiitettävä', 'Hyvä', 'Tyydyttävä', 'Välttävä', 'Ei osaamista'];
            const validPositions = ['Messukeskus', 'Keskustakampus / Messukeskus', 'Keskustakampus'];

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row[columnIndices.lastName] || !row[columnIndices.firstName]) {
                    alert(`Row ${i + 1} is missing a name.`);
                    return false;
                }
                const languageSkill = row[columnIndices.languageSkill]?.trim();
                if (!validLanguages.includes(languageSkill)) {
                    alert(`Invalid language skill in row ${i + 1}. Allowed values: ${validLanguages.join(', ')}.`);
                    return false;
                }
                const previousExperience = row[columnIndices.previousExperience]?.trim();
                if (previousExperience && previousExperience !== 'Checked' && previousExperience !== 'Unchecked') {
                    alert(`Invalid value in column "Valvonut aikaisemmin" for row ${i + 1}. Allowed values: "Checked" or "Unchecked".`);
                    return false;
                }
                const position = row[columnIndices.position]?.trim();
                if (position && !validPositions.includes(position)) {
                    alert(`Invalid value in column "Sijoitus" for row ${i + 1}. Allowed values: ${validPositions.join(', ')}.`);
                    return false;
                }
                const disqualifications = row[columnIndices.disqualifications]?.trim();
                if (disqualifications && !/^([A-Za-z0-9]+( )?)*$/.test(disqualifications)) {
                    alert(`Invalid value in column "Jääviydet" for row ${i + 1}. Expected a space-separated list of codes.`);
                    return false;
                }
                const shiftPreferences = row[columnIndices.shiftPreferences]?.trim();
                if (shiftPreferences && !/^(\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}-\d{2}:\d{2}( )?)*$/.test(shiftPreferences)) {
                    alert(`Invalid value in column "Vuorotoiveet" for row ${i + 1}. Expected format: "DD.MM.YYYY HH:MM-HH:MM".`);
                    return false;
                }
                for (const dateIndex of columnIndices.dateColumns) {
                    const dateValue = row[dateIndex]?.trim();
                    if (dateValue && dateValue !== 'Checked' && dateValue !== 'Unchecked') {
                        alert(`Invalid value in column "${headers[dateIndex]}" for row ${i + 1}. Allowed values: "Checked" or "Unchecked".`);
                        return false;
                    }
                }
            }
        } else if (type === 'examDays') {
            const baseHeaders = ['Päivä', 'Koe klo', 'Valintakokeen nimi', 'Koekoodi', 'Osallistujat yhteensä'];
            const hallHeaders = headers.filter(header => /^Halli [A-Za-z0-9]+ osallistujat$/.test(header));
            const additionalHeaders = ['Työvuoro A klo', 'Työvuoro A hlömäärä', 'Työvuoro B klo', 'Työvuoro B hlömäärä'];
            const expectedHeaders = [...baseHeaders, ...hallHeaders, ...additionalHeaders];

            if (!this.validateHeaders(headers, expectedHeaders)) {
                alert('Invalid Exam Days CSV format. Ensure all hall columns are named as "Halli X osallistujat".');
                return false;
            }

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!/^\d{2}\.\d{2}\.\d{4}$/.test(row[headers.indexOf('Päivä')])) {
                    alert(`Invalid date format in row ${i + 1}. Expected format: DD.MM.YYYY.`);
                    return false;
                }
                if (!/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(row[headers.indexOf('Koe klo')])) {
                    alert(`Invalid time range in row ${i + 1}. Expected format: HH:MM-HH:MM.`);
                    return false;
                }
                const totalParticipants = row[headers.indexOf('Osallistujat yhteensä')];
                if (isNaN(parseInt(totalParticipants, 10))) {
                    alert(`Invalid participant count in row ${i + 1}. Must be a number.`);
                    return false;
                }
                for (const hallHeader of hallHeaders) {
                    const hallValue = row[headers.indexOf(hallHeader)];
                    if (hallValue && isNaN(parseInt(hallValue, 10))) {
                        alert(`Invalid value in column "${hallHeader}" for row ${i + 1}. Must be a number.`);
                        return false;
                    }
                }
                const shiftAIndex = headers.indexOf('Työvuoro A klo');
                const shiftBIndex = headers.indexOf('Työvuoro B klo');
                if (shiftAIndex !== -1 && !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(row[shiftAIndex])) {
                    alert(`Invalid time range in "Työvuoro A klo" for row ${i + 1}. Expected format: HH:MM-HH:MM.`);
                    return false;
                }
                if (shiftBIndex !== -1 && row[shiftBIndex] && !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(row[shiftBIndex])) {
                    alert(`Invalid time range in "Työvuoro B klo" for row ${i + 1}. Expected format: HH:MM-HH:MM.`);
                    return false;
                }
                const shiftACountIndex = headers.indexOf('Työvuoro A hlömäärä');
                const shiftBCountIndex = headers.indexOf('Työvuoro B hlömäärä');
                if (shiftACountIndex !== -1 && isNaN(parseInt(row[shiftACountIndex], 10))) {
                    alert(`Invalid value in "Työvuoro A hlömäärä" for row ${i + 1}. Must be a number.`);
                    return false;
                }
                if (shiftBCountIndex !== -1 && row[shiftBCountIndex] && isNaN(parseInt(row[shiftBCountIndex], 10))) {
                    alert(`Invalid value in "Työvuoro B hlömäärä" for row ${i + 1}. Must be a number.`);
                    return false;
                }
            }
        }
        console.log(`${type} CSV data validated successfully.`);
        return true;
    }

    validateHeaders(headers, expectedHeaders) {
        console.log('Validating CSV headers...');
        const missingHeaders = expectedHeaders.filter((header, index) => headers[index]?.trim() !== header.trim());
        if (missingHeaders.length > 0) {
            console.warn('CSV headers do not match the expected format. Missing or incorrect headers:', missingHeaders);
            alert(`CSV headers do not match the expected format. The following headers are missing or incorrect: ${missingHeaders.join(', ')}`);
            return false;
        }
        return true;
    }

    processCSV(data, type) {
        console.log(`Processing ${type} CSV data...`);
        const rows = data.split('\n').map(row => row.split(';')); // Updated delimiter to ;
        const headers = rows[0];
        const processedData = rows.slice(1).map(row => {
            const entry = {};
            headers.forEach((header, index) => {
                entry[header.trim()] = row[index]?.trim();
            });
            return entry;
        });
        console.log(`${type} CSV data processed successfully.`);
        return processedData;
    }

    previewData(supervisorsData, examDaysData) {
        console.log('Generating data preview...');
        const previewContainer = document.getElementById('previewContainer');

        const createTable = (data) => {
            const rows = data.split('\n').map(row => row.split(';').map(cell => cell.trim())); // Updated delimiter to ;
            const headers = rows[0];
            const bodyRows = rows.slice(1);

            let tableHTML = '<table class="preview-table"><thead><tr>';
            headers.forEach(header => {
                tableHTML += `<th>${header}</th>`;
            });
            tableHTML += '</tr></thead><tbody>';
            bodyRows.forEach(row => {
                tableHTML += '<tr>';
                row.forEach(cell => {
                    tableHTML += `<td>${cell}</td>`;
                });
                tableHTML += '</tr>';
            });
            tableHTML += '</tbody></table>';
            return tableHTML;
        };

        previewContainer.innerHTML = `
            <h3>Preview</h3>
            <h4>Supervisors Data:</h4>
            ${createTable(supervisorsData)}
            <h4>Exam Days Data:</h4>
            ${createTable(examDaysData)}
        `;
        console.log('Data preview generated.');
    }
}