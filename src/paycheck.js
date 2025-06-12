import TableDisplay from "./components/TableDisplay.js";

document.addEventListener('DOMContentLoaded', async () => {
    let assignments = [];

    document.getElementById('uploadAssignmentFileButton').addEventListener('click', async () => {
        assignments = await handleAssignmentUpload();
        if (assignments) {
            console.log('Parsed Assignments:', assignments);
            calculateWorkHours(assignments);
            displayWorkHours(assignments);
            const workHoursContainer = document.getElementById('work-hours-container');
            workHoursContainer.style.display = 'block';

            const exportContainer = document.getElementById('export-container');
            exportContainer.style.display = 'block';
        }

    document.getElementById('export-paychecks-summary-button').addEventListener('click', () => {
        if (assignments.length === 0) {
            alert('Vuoroja ei ole ladattu. Lataa vuorot ensin.');
            return;
        }
        exportPaychecksSummary(assignments);
    });

    document.getElementById('export-paychecks-button').addEventListener('click', () => {
        if (assignments.length === 0) {
            alert('Vuoroja ei ole ladattu. Lataa vuorot ensin.');
            return;
        }
        exportPaychecks(assignments);
    });
});
});

function exportPaychecks(assignments) {
    const zip = new JSZip();
    const csvRows = [["Etunimi", "Sukunimi", "Sähköposti", "Tiedostonimi"]];

    assignments.forEach(assignment => {
        const doc = new window.jspdf.jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const supervisor = assignment.supervisor;
        const shifts = assignment.shifts;
        
        doc.setFontSize(15);
        doc.setFont("helvetica", "italic");
        doc.text(`Valintakokeet 2025`, pageWidth / 2, 10, { align: "center" });

        doc.setFontSize(30);
        doc.setFont("helvetica", "bold");
        doc.text(`Toteutuneet työvuorot`, 20, 25);

        doc.setFontSize(20);
        doc.setFont("helvetica", "normal");
        doc.text(`${supervisor.firstName} ${supervisor.lastName}`, 20, 40);

        if (shifts.length === 0) {
            doc.text("Ei vuoroja.", 20, 60);
        } else {
            const tableData = shifts.map(shift => [
                shift.date,
                shift.examCode,
                shift.timeRange,
                shift.breakTime || "",
                shift.payableDuration || "0.00",
                shift.information || ""
            ]);

            doc.autoTable({
                head: [["Päivämäärä","Koe", "Työvuoro", "Tauko", "Maksettavat tunnit", "Lisätiedot"]],
                    body: tableData,
                    startY: 60,
                    theme: "grid",
                    headStyles: {
                        fillColor: [200, 200, 200],
                        textColor: [0, 0, 0],
                        fontStyle: "bold",
                        cellPadding: 2,
                        lineColor: [0, 0, 0]
                    },
                    styles: {
                        fontSize: 10,
                        overflow: "linebreak",
                        cellWidth: "wrap"
                    }
                });
            }

            doc.setFontSize(15);
            doc.setFont("helvetica", "bold");
            doc.text(`Tunnit, joista palkkio maksetaan: ${assignment.totalHours} h`, 15, doc.lastAutoTable.finalY + 10);

            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            const contactText = "Mikäli työvuoroissa on virheitä tai epäselvyyksiä ota yhteyttä valintakokeiden-henkilostoasiat@helsinki.fi viimeistään su 15.6.2025.";
            doc.text(contactText, 15, doc.lastAutoTable.finalY + 30, { maxWidth: pageWidth - 30 });
            doc.text(`Yllä oleva tuntimäärä syötetään palkkiohakemuksen "Palkkion määrä (kpl/h)"-kenttään.`, 15, doc.lastAutoTable.finalY + 20);

            const fileName = `${supervisor.nickname}_${supervisor.lastName}_tyotunnit.pdf`.replace(/\s+/g, "_");
            const pdfBlob = doc.output("blob");

            zip.file(fileName, pdfBlob);

            csvRows.push([supervisor.firstName, supervisor.lastName, supervisor.email || "N/A", fileName]);

        });

        const csvContent = csvRows.map(row => row.join(",")).join("\n");
        zip.file(`toteutuneet_tyovuorot_massapostitus.csv`, csvContent);

        zip.generateAsync({ type: "blob" }).then((content) => {
            const zipFileName = `toteutuneet_tyovuorot.zip`;

            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = zipFileName;
            link.click();
        });

    };
        
function exportPaychecksSummary(assignments) {
    const doc = new window.jspdf.jsPDF();

    const tableData = assignments.map(supervisor => {
        return [
            `${supervisor.supervisor.firstName} ${supervisor.supervisor.lastName}`,
            supervisor.supervisor.email,
            supervisor.totalHours,
            supervisor.supervisor.firstName,
            supervisor.supervisor.lastName
        ];
    });

    tableData.sort((a, b) => {
                const lastA = (a[4] || "").toLowerCase();
                const lastB = (b[4] || "").toLowerCase();
                if (lastA !== lastB) return lastA.localeCompare(lastB, "fi");
                const firstA = (a[3] || "").toLowerCase();
                const firstB = (b[3] || "").toLowerCase();
                return firstA.localeCompare(firstB, "fi");
    });

    const printableTableData = tableData.map(row => row.slice(0, 3));

    doc.autoTable({
        head: [['Valvoja', 'Sähköposti', 'Työtunnit']],
        body: printableTableData,
        theme: 'grid',
        margin: { top: 15, left: 10 },
        headStyles: {
            fillColor: [200, 200, 200],
            textColor: [0, 0, 0],
            fontStyle: "bold",
            cellPadding: 2,
            lineColor: [0, 0, 0]
        },
        styles: {
            fontSize: 9,
            overflow: "linebreak",
            cellWidth: "wrap"
        },
    });


    const fileName = 'valvojat_maksettavat_tyotunnit.pdf';

    if (doc.internal.getNumberOfPages() === 1 && doc.internal.pages[1].length === 0) {
            doc.deletePage(1);
    }

    doc.save(fileName);
}

function calculateWorkHours(assignments) {
    for (const supervisor of assignments) {
        const shifts = supervisor.shifts;
        let totalHours = 0;

        for (const shift of shifts) {
            const [start, end] = shift.timeRange.split('-');
            const startTime = new Date(`1970-01-01T${start}:00`);
            const endTime = new Date(`1970-01-01T${end}:00`);
            if (endTime < startTime) {
                endTime.setDate(endTime.getDate() + 1);
            }   

            let breakDuration = 0;

            if (shift.breakTime) {
                const [breakStart, breakEnd] = shift.breakTime.split('-');
                const breakStartTime = new Date(`1970-01-01T${breakStart}:00`);
                const breakEndTime = new Date(`1970-01-01T${breakEnd}:00`);

                breakDuration = (breakEndTime - breakStartTime)
            }

            const shiftDuration = (endTime - startTime);

            let payableDuration = 0;

            if (shift.information.includes('Palkkioton')) {
                payableDuration = 0;
            } else {
                payableDuration = (shiftDuration - breakDuration) / (1000 * 60 * 60);
            }

            shift.payableDuration = payableDuration;
            totalHours += payableDuration;
    }

        supervisor.totalHours = totalHours.toFixed(2); // Muotoillaan tuntimäärä kahden desimaalin tarkkuudella
}}

function displayWorkHours(assignments) {
    const workHoursTableContainer = document.getElementById('work-hours-table-container');

    const headers = [
        { label: 'First Name', i18nKey: 'firstName' },
        { label: 'Last Name', i18nKey: 'lastName' },
        { label: 'Nickname', i18nKey: 'nickname' },
        { label: 'Email', i18nKey: 'email' },
        { label: 'Shifts', i18nKey: 'shifts' },
        { label: 'Total Hours', i18nKey: 'totalHours' }
    ];

    const shiftTable = (shifts) => {
        const table = document.createElement('table');
        const headerRow = document.createElement('tr');
        ["Exam Code", "Date", "Time Range", "Break", "Information", "Payable Hours"].forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);

        shifts.forEach(shift => {
            const row = document.createElement('tr');
            const examCodeCell = document.createElement('td');
            examCodeCell.textContent = shift.examCode;
            row.appendChild(examCodeCell);

            const dateCell = document.createElement('td');
            dateCell.textContent = shift.date;
            row.appendChild(dateCell);

            const timeRangeCell = document.createElement('td');
            timeRangeCell.textContent = shift.timeRange;
            row.appendChild(timeRangeCell);

            const breakTimeCell = document.createElement('td');
            breakTimeCell.textContent = shift.breakTime || '';
            row.appendChild(breakTimeCell);

            const informationCell = document.createElement('td');
            informationCell.textContent = shift.information || '';
            row.appendChild(informationCell);

            const payableHoursCell = document.createElement('td');
            payableHoursCell.textContent = shift.payableDuration;
            row.appendChild(payableHoursCell);

            table.appendChild(row);
        })

        return table.outerHTML;
    }

    const data = assignments.map(supervisor => ({
        firstName: supervisor.supervisor.firstName,
        lastName: supervisor.supervisor.lastName,
        nickname: supervisor.supervisor.nickname,
        email: supervisor.supervisor.email,
        shifts: shiftTable(supervisor.shifts),
        totalHours: supervisor.totalHours
    }));

    const tableDisplay = new TableDisplay(headers, data);
    const tableElement = tableDisplay.render();
    workHoursTableContainer.innerHTML = ''; // Clear existing content
    workHoursTableContainer.appendChild(tableElement);
}

async function handleAssignmentUpload(fileInputId = 'assignmentFile') {
    const assignmentFile = document.getElementById(fileInputId).files[0];
    if (!assignmentFile) {
        alert('Please select a file to upload.');
        return null;
    }
    try {
        const assignmentData = await readFileAsync(assignmentFile);
        if (validateAssignmentsCSV(assignmentData)) {
            const assignments = parseAssignments(assignmentData);
            return assignments;
        } else {
            alert('Invalid Assignments CSV format.');
            return null;
        }
    } catch (error) {
        alert('Failed to read the assignment file. Please try again.');
        console.error('File read error:', error);
        return null;
    }
}

// Lukee tiedoston ja palauttaa tekstin
function readFileAsync(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = new TextDecoder('utf-8').decode(new Uint8Array(event.target.result));
            resolve(text);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}

// Validoi assignments CSV:n (ilman hall-kenttiä)
function validateAssignmentsCSV(data) {
    const { rows, headers } = splitCSV(data);
    const expectedHeaders = [
        'First Name', 'Last Name', 'Nickname', 'Email'
    ];
    const shiftHeaders = headers.filter(header => /^\d{2}\.\d{2}\.\d{4}-[A-Z0-9]{1,3}$/.test(header));

    // Tarkista että kaikki expectedHeaders ja shiftHeaders löytyvät
    const missingHeaders = [...expectedHeaders, ...shiftHeaders].filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
        alert('CSV headers validation failed. Missing headers: ' + missingHeaders.join(', '));
        return false;
    }

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row[headers.indexOf('First Name')] || !row[headers.indexOf('Last Name')]) {
            alert(`Row ${i + 2} is missing a name.`);
            return false;
        }
        const email = row[headers.indexOf('Email')]?.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert(`Invalid or missing email in row ${i + 2}.`);
            return false;
        }
        for (const shiftHeader of shiftHeaders) {
            const shiftValue = row[headers.indexOf(shiftHeader)]?.trim();
            if (shiftValue && !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(shiftValue)) {
                alert(`Invalid time range in column "${shiftHeader}" for row ${i + 2}. Expected format: HH:MM-HH:MM.`);
                return false;
            }
        }
    }
    return true;
}

// Parsii assignments-datan (ilman hall-kenttiä)
function parseAssignments(data) {
    const { rows, headers } = splitCSV(data);
    return rows.map((row, index) => {
        const supervisor = {
            firstName: row[headers.indexOf('First Name')],
            lastName: row[headers.indexOf('Last Name')],
            nickname: row[headers.indexOf('Nickname')],
            email: row[headers.indexOf('Email')],
        };
        const shifts = headers
            .filter(header => /^\d{2}\.\d{2}\.\d{4}-[A-Z0-9]{1,3}$/.test(header))
            .map(shiftHeader => {
                const informationHeader = `${shiftHeader}-Information`;
                const breakHeader = `${shiftHeader}-Break`;

                const timeRange = row[headers.indexOf(shiftHeader)];
                const information = row[headers.indexOf(informationHeader)];
                const breakTime = row[headers.indexOf(breakHeader)];

                if (!timeRange) return null;
                return {
                    date: shiftHeader.split('-')[0],
                    examCode: shiftHeader.split('-')[1],
                    timeRange: timeRange,
                    information: information,
                    breakTime: breakTime,
                };
            }).filter(shift => shift !== null);
        return { supervisor, shifts };
    });
}

// Jakaa CSV:n riveihin ja otsikoihin
function splitCSV(data) {
    const rows = data.split('\n')
        .map(row => row.split(';').map(cell => cell.trim()))
        .filter(row => row.some(cell => cell !== ''));
    const headers = rows.shift();
    return { rows, headers };
}
