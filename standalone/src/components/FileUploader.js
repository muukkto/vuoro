import { validateAndNormalizeAssignmentsCSV, formatValidationSummary, loadExamInfo, splitCSV, validateKeskustaCSV } from "./Validation.js";

function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
        const curr = [i];
        for (let j = 1; j <= n; j++) {
            curr[j] = a[i - 1] === b[j - 1]
                ? prev[j - 1]
                : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
        }
        prev = curr;
    }
    return prev[n];
}

export default class FileUploader {

    handleAssignmentUpload(fileInputId = 'assignmentFile') {
        const assignmentFile = document.getElementById(fileInputId).files[0];

        if (!assignmentFile) {
            alert('Please upload the assignment CSV file.');
            return Promise.resolve(null);
        }

        return this.readFiles([assignmentFile])
            .then(async ([assignmentData]) => {
                const validation = await validateAndNormalizeAssignmentsCSV(assignmentData);
                if (validation.valid) {
                    return this.parseAssignments(validation.normalizedData);
                }
                alert(`Assignments-tiedoston validointi epÃ¤onnistui:\n\n${formatValidationSummary(validation.errors, validation.overflow)}`);
                return null;
            })
            .catch((error) => {
                alert('Failed to read the assignment file. Please try again.');
                console.error('File read error:', error);
                return null;
            });
    }

    handleKeskustaUpload(fileInputId = 'assignmentFile') {
        const assignmentFile = document.getElementById(fileInputId).files[0];

        if (!assignmentFile) {
            alert('Please upload the assignment CSV file.');
            return Promise.resolve(null);
        }

        return this.readFiles([assignmentFile])
            .then(async ([assignmentData]) => {
                const validation = await validateKeskustaCSV(assignmentData);
                if (validation.valid) {
                    return this.parseKeskustaAssignments(validation.normalizedData);
                }
                alert(`Tiedoston validointi epäonnistui:\n\n${formatValidationSummary(validation.errors, validation.overflow)}`);
                return null;
            })
            .catch((error) => {
                alert('Failed to read the assignment file. Please try again.');
                console.error('File read error:', error);
                return null;
            });
    }

    async parseAssignments(data) {
        const examInfo = await loadExamInfo();
        const { rows, headers } = splitCSV(data);

        // Detect AVAILABILITY_DD.MM.YYYY columns
        const availabilityColumns = headers
            .map((h, i) => {
                const m = h.match(/^AVAILABILITY_(\d{1,2}\.\d{1,2}\.\d{2,4})$/);
                return m ? { idx: i, date: m[1] } : null;
            })
            .filter(Boolean);

        return rows.map((row) => {
            const availability = availabilityColumns
                .filter(({ idx }) => {
                    const val = (row[idx] || '').trim().toLowerCase();
                    return val !== '' && val !== 'unchecked' && val !== '0' && val !== 'false' && val !== 'ei';
                })
                .map(({ date }) => date);

            const supervisor = {
                firstName: row[headers.indexOf('First Name')],
                lastName: row[headers.indexOf('Last Name')],
                nickname: row[headers.indexOf('Nickname')],
                email: row[headers.indexOf('Email')],
                id: row[headers.indexOf('Haka_id')],
                languageSkill: row[headers.indexOf('Language Skill')],
                previousExperience: row[headers.indexOf('Previous Experience')] === 'Kyllä',
                disqualifications: row[headers.indexOf('Disqualifications')]?.split(', ') || [],
                availability: availability.length > 0 ? availability : null
            };

            const shifts = headers
                .filter(header => examInfo.codes.has(header))
                .map(code => {
                    const timeRange = (row[headers.indexOf(code)] || '').trim();
                    const hallIdx = headers.indexOf(`${code}-Hall`);
                    const infoIdx = headers.indexOf(`${code}-Information`);
                    const breakIdx = headers.indexOf(`${code}-Break`);

                    const hall = hallIdx !== -1 ? (row[hallIdx] || '').trim() : null;
                    const information = infoIdx !== -1 ? (row[infoIdx] || '').trim() : null;
                    const breakTime = breakIdx !== -1 ? (row[breakIdx] || '').trim() : null;

                    if (!timeRange && !hall) return null;

                    const examData = examInfo.byCode.get(code);
                    return {
                        date: examData?.date || '',
                        examCode: code,
                        hall,
                        timeRange,
                        information,
                        breakTime
                    };
                })
                .filter(shift => shift !== null);

            return { supervisor, shifts };
        });
    }

    async parseKeskustaAssignments(data) {
        const examInfo = await loadExamInfo();
        const { rows, headers } = splitCSV(data);

        const supervisorIdx = headers.indexOf('Supervisor');
        const examIdx = headers.indexOf('Exam');
        const buildingIdx = headers.indexOf('Building');
        const roomIdx = headers.indexOf('Room');
        const informationIdx = headers.indexOf('Information');
        const shiftStartIdx = headers.indexOf('Shift-start');
        const shiftEndIdx = headers.indexOf('Shift-end');
        const breakStartIdx = headers.indexOf('Break-start');
        const langIdx = headers.indexOf('Language Skill');
        const emailIdx = headers.indexOf('Email');
        const hakaIdx = headers.indexOf('Haka_id');
        const disqIdx = headers.indexOf('Disqualifications');

        const supervisorMap = new Map();
        const groupErrors = [];

        for (const [rowIndex, row] of rows.entries()) {
            const rowNumber = rowIndex + 2;
            const fullName = (supervisorIdx !== -1 ? row[supervisorIdx] || '' : '').trim();
            if (!fullName) continue;

            const normName = fullName.toLowerCase();
            const spaceIdx = fullName.indexOf(' ');
            const firstName = spaceIdx !== -1 ? fullName.slice(0, spaceIdx) : fullName;
            const lastName = spaceIdx !== -1 ? fullName.slice(spaceIdx + 1) : '';

            const rowHakaId = hakaIdx !== -1 ? (row[hakaIdx] || '').trim() : '';
            const rowEmail = emailIdx !== -1 ? (row[emailIdx] || '').trim() : '';

            const shiftStart = shiftStartIdx !== -1 ? (row[shiftStartIdx] || '').trim() : '';
            const shiftEnd = shiftEndIdx !== -1 ? (row[shiftEndIdx] || '').trim() : '';
            const timeRange = shiftStart && shiftEnd ? `${shiftStart}-${shiftEnd}` : (shiftStart || shiftEnd);

            let breakTime = null;
            if (breakStartIdx !== -1) {
                const bs = (row[breakStartIdx] || '').trim();
                if (bs) {
                    const match = bs.match(/^(\d{1,2}):(\d{2})$/);
                    if (match) {
                        let h = parseInt(match[1], 10);
                        let m = parseInt(match[2], 10) + 30;
                        if (m >= 60) { h += 1; m -= 60; }
                        breakTime = `${bs}-${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                    } else {
                        breakTime = bs;
                    }
                }
            }

            const examCode = examIdx !== -1 ? (row[examIdx] || '').trim() : '';
            const building = buildingIdx !== -1 ? (row[buildingIdx] || '').trim() : '';
            const room = roomIdx !== -1 ? (row[roomIdx] || '').trim() : '';
            const information = informationIdx !== -1 ? (row[informationIdx] || '').trim() : '';
            const examData = examInfo.byCode.get(examCode);

            const shift = {
                date: examData?.date || '',
                examCode,
                building,
                room,
                hall: null,
                timeRange,
                information: information || null,
                breakTime
            };

            if (!supervisorMap.has(normName)) {
                const langSkill = langIdx !== -1 ? (row[langIdx] || '').trim() : '';
                const disq = disqIdx !== -1 ? (row[disqIdx] || '').split(', ').filter(Boolean) : [];
                supervisorMap.set(normName, {
                    supervisor: {
                        firstName,
                        lastName,
                        nickname: '',
                        email: rowEmail,
                        id: rowHakaId,
                        languageSkill: langSkill,
                        previousExperience: false,
                        disqualifications: disq
                    },
                    shifts: [shift]
                });
            } else {
                const entry = supervisorMap.get(normName);

                if (rowHakaId && entry.supervisor.id && rowHakaId !== entry.supervisor.id) {
                    groupErrors.push(`Virhe: Valvojalla "${fullName}" on ristiriitainen Haka_id (rivi ${rowNumber}): "${entry.supervisor.id}" vs "${rowHakaId}".`);
                } else if (rowHakaId && !entry.supervisor.id) {
                    entry.supervisor.id = rowHakaId;
                }

                if (rowEmail && entry.supervisor.email && rowEmail !== entry.supervisor.email) {
                    groupErrors.push(`Virhe: Valvojalla "${fullName}" on ristiriitainen sähköpostiosoite (rivi ${rowNumber}): "${entry.supervisor.email}" vs "${rowEmail}".`);
                } else if (rowEmail && !entry.supervisor.email) {
                    entry.supervisor.email = rowEmail;
                }

                if (!entry.supervisor.languageSkill && langIdx !== -1) {
                    entry.supervisor.languageSkill = (row[langIdx] || '').trim();
                }
                if (entry.supervisor.disqualifications.length === 0 && disqIdx !== -1) {
                    entry.supervisor.disqualifications = (row[disqIdx] || '').split(', ').filter(Boolean);
                }

                entry.shifts.push(shift);
            }
        }

        if (groupErrors.length > 0) {
            alert('Valvojatietojen ristiriitoja:\n\n' + groupErrors.join('\n'));
            return null;
        }

        const nameKeys = [...supervisorMap.keys()];
        const nearDupWarnings = [];
        for (let i = 0; i < nameKeys.length; i++) {
            for (let j = i + 1; j < nameKeys.length; j++) {
                if (levenshtein(nameKeys[i], nameKeys[j]) <= 2) {
                    const entryA = supervisorMap.get(nameKeys[i]);
                    const entryB = supervisorMap.get(nameKeys[j]);
                    const displayA = `${entryA.supervisor.firstName} ${entryA.supervisor.lastName}`.trim();
                    const displayB = `${entryB.supervisor.firstName} ${entryB.supervisor.lastName}`.trim();
                    nearDupWarnings.push(`"${displayA}" ja "${displayB}"`);
                }
            }
        }

        if (nearDupWarnings.length > 0) {
            alert('Varoitus: Seuraavat valvojien nimet ovat lähes samat. Tarkista ovatko kyseessä eri henkilöt:\n\n' + nearDupWarnings.join('\n'));
        }

        return [...supervisorMap.values()];
    }

    parseExamDays(data) {
        const { rows, headers } = splitCSV(data);
        return rows.map(row => ({
            date: (row[headers.indexOf('Date')] || '').trim(),
            timeRange: (row[headers.indexOf('Time')] || '').trim(),
            examName: (row[headers.indexOf('Name')] || '').trim(),
            examCode: (row[headers.indexOf('Code')] || '').trim()
        }));
    }

    readFiles(files) {
        const readFile = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const arrayBuffer = event.target.result;
                    const bytes = new Uint8Array(arrayBuffer.slice(0, 4));
                    const hasZipSignature = bytes[0] === 0x50 && bytes[1] === 0x4b;
                    const isExcelByExtension = /\.(xlsx|xls)$/i.test(file.name);
                    const isExcelByMime = /spreadsheetml|excel/i.test(file.type || '');
                    const isExcel = isExcelByExtension || isExcelByMime || hasZipSignature;

                    if (isExcel) {
                        if (typeof XLSX === 'undefined') {
                            reject(new Error('XLSX library is not loaded in the page.'));
                            return;
                        }
                        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                        const sheet = workbook.Sheets[workbook.SheetNames[0]];
                        resolve(XLSX.utils.sheet_to_csv(sheet, { FS: ';' }));
                    } else {
                        resolve(new TextDecoder('utf-8').decode(new Uint8Array(arrayBuffer)));
                    }
                };
                reader.onerror = (error) => reject(error);
                reader.readAsArrayBuffer(file);
            });
        };
        return Promise.all(files.map(readFile));
    }
}
