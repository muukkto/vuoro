export default class FileUploader {
    handleFileUpload() {
        console.log('Handling file upload...');
        const [supervisorsFile, examDaysFile] = this.getUploadedFiles();

        if (!supervisorsFile || !examDaysFile) {
            alert('Please upload both CSV files.');
            return;
        }

        return this.readFiles([supervisorsFile, examDaysFile])
            .then(([supervisorsData, examDaysData]) => {
                const processedData = this.processFiles(supervisorsData, examDaysData);
                return { ...processedData, supervisorsData, examDaysData }; // Include raw data in the return
            })
            .catch((error) => {
                this.handleFileReadError(error);
                return null; // Return null in case of an error
            });
    }

    handleExamDaysUpload() {
        console.log('Handling exam days upload...');
        const examDaysFile = document.getElementById('examDaysFile').files[0];

        if (!examDaysFile) {
            alert('Please upload the exam days CSV file.');
            return;
        }

        return this.readFiles([examDaysFile])
            .then(([examDaysData]) => {
                if (this.validateCSV(examDaysData, 'examDays')) {
                    const examDays = this.parseExamDays(examDaysData);
                    console.log('Parsed Exam Days:', examDays);
                    return examDays; // Return the parsed exam days
                } else {
                    alert('Invalid Exam Days CSV format.');
                    return null;
                }
            })
            .catch((error) => {
                alert('Failed to read the exam days file. Please try again.');
                console.error('File read error:', error);
            });
    }

    handleAssignmentUpload() {
        console.log('Handling assignment upload...');
        const assignmentFile = document.getElementById('assignmentFile').files[0];

        if (!assignmentFile) {
            alert('Please upload the assignment CSV file.');
            return;
        }

        return this.readFiles([assignmentFile])
            .then(([assignmentData]) => {
                const assignments = this.parseAssignments(assignmentData);
                return assignments; // Return the parsed assignments
            })
            .catch((error) => {
                alert('Failed to read the assignment file. Please try again.');
                console.error('File read error:', error);
            });
    }

    parseAssignments(data) {
        console.log('Parsing assignments data...');
        const { rows, headers } = this.splitCSV(data);

        return rows.reduce((assignments, row, index) => {
            const supervisorId = index + 1;
            const supervisor = {
                firstName: row[headers.indexOf('First Name')],
                lastName: row[headers.indexOf('Last Name')],
                languageSkill: row[headers.indexOf('Language Skill')],
                previousExperience: row[headers.indexOf('Previous Experience')] === 'Checked',
                disqualifications: row[headers.indexOf('Disqualifications')]?.split(', ') || []
            };

            const shifts = headers
                .filter(header => /^\d{2}\.\d{2}\.\d{4}-[A-Z]$/.test(header))
                .map(shiftHeader => {
                    const hallHeader = `${shiftHeader}-Hall`;

                    const hallIndex = headers.indexOf(hallHeader);
                    const timeRangeIndex = headers.indexOf(shiftHeader);

                    if (hallIndex === -1 || timeRangeIndex === -1) return null;
                    const hall = row[hallIndex];
                    const timeRange = row[timeRangeIndex];

                    if (!hall || !timeRange) return null;

                    return {
                        date: shiftHeader.split('-')[0],
                        examCode: shiftHeader.split('-')[1],
                        hall: hall,
                        timeRange: timeRange
                    };
                }).filter(shift => shift !== null);
            
            assignments[supervisorId] = { supervisor, shifts };
            return assignments;
        }, {});
    }

    getUploadedFiles() {
        const supervisorsFile = document.getElementById('supervisorsFile').files[0];
        const examDaysFile = document.getElementById('examDaysFile').files[0];
        return [supervisorsFile, examDaysFile];
    }

    readFiles(files) {
        const readFile = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target.result);
                reader.onerror = (error) => reject(error);
                reader.readAsText(file);
            });
        };
        return Promise.all(files.map(readFile));
    }

    processFiles(supervisorsData, examDaysData) {
        if (this.validateCSV(supervisorsData, 'supervisors') && this.validateCSV(examDaysData, 'examDays')) {
            const supervisors = this.parseSupervisors(supervisorsData);
            const examDays = this.parseExamDays(examDaysData);
            return { supervisors, examDays }; // Return both supervisors and examDays
        }
        return null; // Return null if validation fails
    }

    handleFileReadError(error) {
        alert('Failed to read files. Please try again.');
        console.error('File read error:', error);
    }

    parseSupervisors(data) {
        console.log('Parsing supervisors data...');
        const { rows, headers } = this.splitCSV(data);
        const dateColumns = this.getDateColumns(headers);

        return rows.map((row, index) => ({
            id: index + 1,
            lastName: row[headers.indexOf('Sukunimi')],
            firstName: row[headers.indexOf('Etunimi')],
            availableDays: dateColumns.filter(date => row[headers.indexOf(date)] === 'Checked'),
            languageSkill: row[headers.indexOf('Ruotsinkielen taito')],
            previousExperience: row[headers.indexOf('Valvonut aikaisemmin')] === 'Checked',
            position: row[headers.indexOf('Sijoitus')],
            disqualifications: row[headers.indexOf('Jääviydet')]?.split(' ') || [],
            shiftPreferences: row[headers.indexOf('Vuorotoiveet')]?.match(/\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}-\d{2}:\d{2}/g) || []
        }));
    }

    parseExamDays(data) {
        console.log('Parsing exam days data...');
        const { rows, headers } = this.splitCSV(data);

        return rows.map(row => ({
            date: row[headers.indexOf('Päivä')],
            timeRange: row[headers.indexOf('Koe klo')],
            examName: row[headers.indexOf('Valintakokeen nimi')],
            examCode: row[headers.indexOf('Koekoodi')],
            totalParticipants: parseInt(row[headers.indexOf('Osallistujat yhteensä')], 10),
            halls: this.parseHalls(row, headers),
            shiftA: this.parseShift(row, headers, 'A'),
            shiftB: this.parseShift(row, headers, 'B')
        }));
    }

    parseHalls(row, headers) {
        return headers
            .filter(header => /^Halli [A-Za-z0-9]+ osallistujat$/.test(header))
            .map(hallHeader => ({
                name: hallHeader.replace(' osallistujat', ''),
                participants: parseInt(row[headers.indexOf(hallHeader)], 10) || 0
            }));
    }

    parseShift(row, headers, shift) {
        const timeRangeIndex = headers.indexOf(`Työvuoro ${shift} klo`);
        const minSupervisorsIndex = headers.indexOf(`Työvuoro ${shift} hlömäärä`);
        if (timeRangeIndex === -1 || minSupervisorsIndex === -1) return null;

        return {
            timeRange: row[timeRangeIndex],
            minSupervisors: parseInt(row[minSupervisorsIndex], 10) || 0
        };
    }

    validateCSV(data, type) {
        console.log(`Validating ${type} CSV data...`);
        const { rows, headers } = this.splitCSV(data);

        if (type === 'supervisors') {
            return this.validateSupervisorsCSV(rows, headers);
        } else if (type === 'examDays') {
            return this.validateExamDaysCSV(rows, headers);
        }
        return false;
    }

    validateSupervisorsCSV(rows, headers) {
        const expectedHeaders = ['Sukunimi', 'Etunimi', 'Ruotsinkielen taito', 'Valvonut aikaisemmin', 'Sijoitus', 'Jääviydet', 'Vuorotoiveet'];
        const dateColumns = this.getDateColumns(headers);

        if (!this.validateHeaders(headers, [...expectedHeaders.slice(0, 2), ...dateColumns, ...expectedHeaders.slice(2)])) {
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
        return true;
    }

    validateExamDaysCSV(rows, headers) {
        const baseHeaders = ['Päivä', 'Koe klo', 'Valintakokeen nimi', 'Koekoodi', 'Osallistujat yhteensä'];
        const hallHeaders = headers.filter(header => /^Halli [A-Za-z0-9]+ osallistujat$/.test(header));
        const additionalHeaders = ['Työvuoro A klo', 'Työvuoro A hlömäärä', 'Työvuoro B klo', 'Työvuoro B hlömäärä'];

        if (!this.validateHeaders(headers, [...baseHeaders, ...hallHeaders, ...additionalHeaders])) {
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
        return true;
    }

    splitCSV(data) {
        const rows = data.split('\n').map(row => row.split(';').map(cell => cell.trim()));
        const headers = rows.shift();
        return { rows, headers };
    }

    getDateColumns(headers) {
        return headers.filter(header => /^\d{2}\.\d{2}\.\d{4}$/.test(header));
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
}