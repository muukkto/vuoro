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
                console.log('Supervisors Data:', supervisorsData);
                console.log('Exam Days Data:', examDaysData);
                const processedData = this.processFiles(supervisorsData, examDaysData);
                console.log('Processed Data:', processedData);
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
                console.log('Exam Days Data:', examDaysData);
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
                console.log('Assignment Data:', assignmentData);
                if (this.validateCSV(assignmentData, 'assignments')) {
                    const assignments = this.parseAssignments(assignmentData);
                    console.log('Parsed Assignments:', assignments);
                    return assignments; // Return the parsed assignments
                } else {
                    alert('Invalid Assignments CSV format.');
                    return null;
                }
            })
            .catch((error) => {
                alert('Failed to read the assignment file. Please try again.');
                console.error('File read error:', error);
            });
    }

    parseAssignments(data) {
        console.log('Parsing assignments data...');
        const { rows, headers } = this.splitCSV(data);
        console.log('Assignments CSV Headers:', headers);
        console.log('Assignments CSV Rows:', rows);

        return rows.reduce((assignments, row, index) => {
            const supervisorId = index + 1;
            const supervisor = {
                firstName: row[headers.indexOf('First Name')],
                lastName: row[headers.indexOf('Last Name')],
                nickname: row[headers.indexOf('Nickname')], 
                email: row[headers.indexOf('Email')],      
                id: row[headers.indexOf('Haka_id')],          
                languageSkill: row[headers.indexOf('Language Skill')],
                previousExperience: row[headers.indexOf('Previous Experience')] === 'Checked',
                disqualifications: row[headers.indexOf('Disqualifications')]?.split(', ') || []
            };

            const shifts = headers
                .filter(header => /^\d{2}\.\d{2}\.\d{4}-[A-Z]{1,3}$/.test(header))
                .map(shiftHeader => {
                    const hallHeader = `${shiftHeader}-Hall`;
                    const informationHeader = `${shiftHeader}-Information`; // Added Information
                    const breakHeader = `${shiftHeader}-Break`; // Added Break

                    const hallIndex = headers.indexOf(hallHeader);
                    const timeRangeIndex = headers.indexOf(shiftHeader);
                    const informationIndex = headers.indexOf(informationHeader); // Get index for Information
                    const breakIndex = headers.indexOf(breakHeader); // Get index for Break

                    if (hallIndex === -1 || timeRangeIndex === -1) return null;
                    const hall = row[hallIndex];
                    const timeRange = row[timeRangeIndex];
                    const information = informationIndex !== -1 ? row[informationIndex] : null; // Parse Information
                    const breakTime = breakIndex !== -1 ? row[breakIndex] : null; // Parse Break

                    if (!hall || !timeRange) return null;

                    return {
                        date: shiftHeader.split('-')[0],
                        examCode: shiftHeader.split('-')[1],
                        hall: hall,
                        timeRange: timeRange,
                        information: information, // Include Information
                        break: breakTime // Include Break
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
                reader.onload = (event) => {
                    const text = new TextDecoder('utf-8').decode(new Uint8Array(event.target.result)); // Use UTF-8 with BOM support
                    resolve(text);
                };
                reader.onerror = (error) => reject(error);
                reader.readAsArrayBuffer(file); // Use ArrayBuffer to ensure proper decoding
            });
        };
        return Promise.all(files.map(readFile));
    }

    processFiles(supervisorsData, examDaysData) {
        console.log('Processing files...');
        if (this.validateCSV(supervisorsData, 'supervisors') && this.validateCSV(examDaysData, 'examDays')) {
            const supervisors = this.parseSupervisors(supervisorsData);
            const examDays = this.parseExamDays(examDaysData);
            console.log('Parsed Supervisors:', supervisors);
            console.log('Parsed Exam Days:', examDays);
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
        console.log('Supervisors CSV Headers:', headers);
        console.log('Supervisors CSV Rows:', rows);
        const dateColumns = this.getDateColumns(headers);

        return rows.map((row, index) => ({
            id: index + 1,
            lastName: row[headers.indexOf('Sukunimi')],
            firstName: row[headers.indexOf('Etunimi')],
            nickname: row[headers.indexOf('Kutsumanimi')],
            email: row[headers.indexOf('Sähköposti')],
            hakatunnus: row[headers.indexOf('Hakatunnus')],
            availableDays: dateColumns.filter(date => row[headers.indexOf(date)] === 'Checked'),
            languageSkill: row[headers.indexOf('Ruotsinkielen taito')]?.trim().toLowerCase(), // Store in lowercase
            previousExperience: row[headers.indexOf('Valvonut aikaisemmin')] === 'Checked',
            position: row[headers.indexOf('Sijoitus')],
            disqualifications: row[headers.indexOf('Jääviydet')]?.split(',').map(item => item.trim()) || [], // Parse as a comma-separated list
            shiftPreferences: row[headers.indexOf('Vuorotoiveet')]?.match(/\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}-\d{2}:\d{2}/g) || []
        }));
    }

    parseExamDays(data) {
        console.log('Parsing exam days data...');
        const { rows, headers } = this.splitCSV(data);
        console.log('Exam Days CSV Headers:', headers);
        console.log('Exam Days CSV Rows:', rows);

        return rows.map(row => ({
            date: row[headers.indexOf('Päivä')],
            timeRange: row[headers.indexOf('Koe klo')],
            examName: row[headers.indexOf('Valintakokeen nimi')],
            examCode: row[headers.indexOf('Koekoodi')],
            totalParticipants: parseInt(row[headers.indexOf('Osallistujat yhteensä')], 10),
            halls: this.parseHalls(row, headers),
            shiftA: this.parseShift(row, headers, 'A'),
            shiftB: this.parseShift(row, headers, 'B'),
            shiftC: this.parseShift(row, headers, 'C')
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
        } else if (type === 'assignments') {
            return this.validateAssignmentsCSV(rows, headers);
        }
        return false;
    }

    validateSupervisorsCSV(rows, headers) {
        const expectedHeaders = [
            'Sukunimi', 'Etunimi', 'Kutsumanimi', 'Sähköposti', 'Hakatunnus',
            'Ruotsinkielen taito', 'Valvonut aikaisemmin', 'Sijoitus', 'Jääviydet', 'Vuorotoiveet'
        ];
        const dateColumns = this.getDateColumns(headers);

        if (!this.validateHeaders(headers, [...expectedHeaders.slice(0, 5), ...dateColumns, ...expectedHeaders.slice(5)])) {
            alert('Invalid Supervisors CSV format. Ensure headers match the expected format.');
            return false;
        }

        const columnIndices = {
            lastName: headers.indexOf('Sukunimi'),
            firstName: headers.indexOf('Etunimi'),
            nickname: headers.indexOf('Kutsumanimi'),
            email: headers.indexOf('Sähköposti'),
            hakatunnus: headers.indexOf('Hakatunnus'),
            languageSkill: headers.indexOf('Ruotsinkielen taito'),
            previousExperience: headers.indexOf('Valvonut aikaisemmin'),
            position: headers.indexOf('Sijoitus'),
            disqualifications: headers.indexOf('Jääviydet'),
            shiftPreferences: headers.indexOf('Vuorotoiveet'),
            dateColumns: dateColumns.map(date => headers.indexOf(date))
        };

        const validLanguages = ['äidinkieli', 'kiitettävä', 'hyvä', 'tyydyttävä', 'välttävä', 'ei osaamista'];
        const validPositions = ['Keskustakampus', 'Keskustakampus / Messukeskus', 'Messukeskus'];

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row[columnIndices.lastName] || !row[columnIndices.firstName]) {
                alert(`Row ${i + 1} is missing a name.`);
                return false;
            }
            if (!row[columnIndices.nickname]) {
                alert(`Row ${i + 1} is missing a nickname.`);
                return false;
            }
            const email = row[columnIndices.email]?.trim();
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                alert(`Invalid or missing email in row ${i + 1}.`);
                return false;
            }
            const hakatunnus = row[columnIndices.hakatunnus]?.trim();
            if (hakatunnus && !/^[a-zA-Z0-9]+@[a-zA-Z0-9]+\.[a-zA-Z]+$/.test(hakatunnus)) {
                alert(`Invalid Hakatunnus in row ${i + 1}. Expected format: "xxxxx123@yliopisto.fi".`);
                return false;
            }
            const languageSkill = row[columnIndices.languageSkill]?.trim().toLowerCase(); // Normalize to lowercase
            if (!validLanguages.includes(languageSkill)) {
                alert(`Invalid language skill in row ${i + 1}. Allowed values: ${validLanguages.map(lang => lang.charAt(0).toUpperCase() + lang.slice(1)).join(', ')}.`);
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
            if (disqualifications && !/^([A-Za-z0-9]+(, )?)*$/.test(disqualifications)) {
                alert(`Invalid value in column "Jääviydet" for row ${i + 1}. Expected a comma-separated list of codes.`);
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
        const additionalHeaders = ['Työvuoro A klo', 'Työvuoro A hlömäärä', 'Työvuoro B klo', 'Työvuoro B hlömäärä', 'Työvuoro C klo', 'Työvuoro C hlömäärä'];

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
            const shiftCIndex = headers.indexOf('Työvuoro C klo');
            if (shiftAIndex !== -1 && !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(row[shiftAIndex])) {
                alert(`Invalid time range in "Työvuoro A klo" for row ${i + 1}. Expected format: HH:MM-HH:MM.`);
                return false;
            }
            if (shiftBIndex !== -1 && row[shiftBIndex] && !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(row[shiftBIndex])) {
                alert(`Invalid time range in "Työvuoro B klo" for row ${i + 1}. Expected format: HH:MM-HH:MM.`);
                return false;
            }
            if (shiftCIndex !== -1 && row[shiftCIndex] && !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(row[shiftCIndex])) {
                alert(`Invalid time range in "Työvuoro C klo" for row ${i + 1}. Expected format: HH:MM-HH:MM.`);
                return false;
            }
            const shiftACountIndex = headers.indexOf('Työvuoro A hlömäärä');
            const shiftBCountIndex = headers.indexOf('Työvuoro B hlömäärä');
            const shiftCCountIndex = headers.indexOf('Työvuoro C hlömäärä');
            if (shiftACountIndex !== -1 && isNaN(parseInt(row[shiftACountIndex], 10))) {
                alert(`Invalid value in "Työvuoro A hlömäärä" for row ${i + 1}. Must be a number.`);
                return false;
            }
            if (shiftBCountIndex !== -1 && row[shiftBCountIndex] && isNaN(parseInt(row[shiftBCountIndex], 10))) {
                alert(`Invalid value in "Työvuoro B hlömäärä" for row ${i + 1}. Must be a number.`);
                return false;
            }
            if (shiftCCountIndex !== -1 && row[shiftCCountIndex] && isNaN(parseInt(row[shiftCCountIndex], 10))) {
                alert(`Invalid value in "Työvuoro C hlömäärä" for row ${i + 1}. Must be a number.`);
                return false;
            }
        }
        return true;
    }

    validateAssignmentsCSV(rows, headers) {
        console.log('Headers found in the CSV file:', headers); // Log headers found in the file

        const expectedHeaders = [
            'First Name', 'Last Name', 'Nickname', 'Email', 'Haka_id',
            'Disqualifications', 'Language Skill', 'Previous Experience'
        ];
        const shiftHeaders = headers.filter(header => /^\d{2}\.\d{2}\.\d{4}-[A-Z]{1,3}$/.test(header));

        // Ensure each shift has related columns: -Hall, -Information, -Break
        for (const shiftHeader of shiftHeaders) {
            const relatedHeaders = [`${shiftHeader}-Hall`, `${shiftHeader}-Information`, `${shiftHeader}-Break`];
            for (const relatedHeader of relatedHeaders) {
                if (!headers.includes(relatedHeader)) {
                    alert(`Missing related column "${relatedHeader}" for shift "${shiftHeader}".`);
                    return false;
                }
            }
        }

        console.log('Shift headers found in the CSV file:', shiftHeaders); // Log shift headers found in the file

        if (!this.validateHeaders(headers, [
            ...expectedHeaders,
            ...shiftHeaders,
            ...shiftHeaders.flatMap(shiftHeader => [`${shiftHeader}-Hall`, `${shiftHeader}-Information`, `${shiftHeader}-Break`])
        ])) {
            alert('Invalid Assignments CSV format. Ensure headers match the expected format.');
            return false;
        }

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row[headers.indexOf('First Name')] || !row[headers.indexOf('Last Name')]) {
                alert(`Row ${i + 1} is missing a name.`);
                return false;
            }
            const email = row[headers.indexOf('Email')]?.trim();
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                alert(`Invalid or missing email in row ${i + 1}.`);
                return false;
            }
            const hakaId = row[headers.indexOf('Haka_id')]?.trim();
            if (hakaId && !/^[a-zA-Z0-9]+@[a-zA-Z0-9]+\.[a-zA-Z]+$/.test(hakaId)) {
                alert(`Invalid Haka_id in row ${i + 1}. Expected format: "xxxxx123@yliopisto.fi".`);
                return false;
            }
            const languageSkill = row[headers.indexOf('Language Skill')]?.trim().toLowerCase();
            const validLanguages = ['äidinkieli', 'kiitettävä', 'hyvä', 'tyydyttävä', 'välttävä', 'ei osaamista'];
            if (!validLanguages.includes(languageSkill)) {
                alert(`Invalid language skill in row ${i + 1}. Allowed values: ${validLanguages.join(', ')}.`);
                return false;
            }
            const previousExperience = row[headers.indexOf('Previous Experience')]?.trim();
            if (previousExperience && previousExperience !== 'Checked' && previousExperience !== 'Unchecked') {
                alert(`Invalid value in column "Previous Experience" for row ${i + 1}. Allowed values: "Checked" or "Unchecked".`);
                return false;
            }
            const disqualifications = row[headers.indexOf('Disqualifications')]?.trim();
            if (disqualifications && !/^([A-Za-z0-9]+(, )?)*$/.test(disqualifications)) {
                alert(`Invalid value in column "Disqualifications" for row ${i + 1}. Expected a comma-separated list of codes.`);
                return false;
            }
            for (const shiftHeader of shiftHeaders) {
                const shiftValue = row[headers.indexOf(shiftHeader)]?.trim();
                const hallValue = row[headers.indexOf(`${shiftHeader}-Hall`)]?.trim();
                const informationValue = row[headers.indexOf(`${shiftHeader}-Information`)]?.trim();
                const breakValue = row[headers.indexOf(`${shiftHeader}-Break`)]?.trim();

                // Validate shiftValue format
                if (shiftValue && !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(shiftValue)) {
                    alert(`Invalid time range in column "${shiftHeader}" for row ${i + 1}. Expected format: HH:MM-HH:MM.`);
                    return false;
                }

                // Validate breakValue format
                if (breakValue && !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(breakValue)) {
                    alert(`Invalid time range in column "${shiftHeader}-Break" for row ${i + 1}. Expected format: HH:MM-HH:MM.`);
                    return false;
                }

                if (hallValue && !/^[A-Za-z0-9\s]+$/.test(hallValue)) {
                    alert(`Invalid hall value in column "${shiftHeader}-Hall" for row ${i + 1}.`);
                    return false;
                }
                // No validation for informationValue, it can be anything
            }
        }
        return true;
    }

    splitCSV(data) {
        const rows = data.split('\n')
            .map(row => row.split(';').map(cell => cell.trim()))
            .filter(row => row.some(cell => cell !== ''));
        const headers = rows.shift();
        return { rows, headers };
    }

    getDateColumns(headers) {
        return headers.filter(header => /^\d{2}\.\d{2}\.\d{4}$/.test(header));
    }

    validateHeaders(headers, expectedHeaders) {
        console.log('Validating CSV headers...');
        const missingHeaders = expectedHeaders.filter(header => !headers.includes(header));
        const extraHeaders = headers.filter(header => !expectedHeaders.includes(header));

        if (missingHeaders.length > 0 || extraHeaders.length > 0) {
            console.warn('CSV headers validation failed.');
            if (missingHeaders.length > 0) {
                console.warn('Missing headers:', missingHeaders);
                alert(`CSV headers validation failed. Missing headers: ${missingHeaders.join(', ')}`);
            }
            if (extraHeaders.length > 0) {
                console.warn('Unexpected extra headers:', extraHeaders);
                alert(`CSV headers validation failed. Unexpected extra headers: ${extraHeaders.join(', ')}`);
            }
            return false;
        }
        return true;
    }
}