import FileUploader from './components/FileUploader.js';
import ScheduleDisplay from './components/ScheduleDisplay.js';
import ExportShifts from './components/ExportShifts.js';
import ShiftAssignerV4 from './components/ShiftAssigner_v4.js';
import TableDisplay from './components/TableDisplay.js';

document.addEventListener('DOMContentLoaded', () => {
    let processedSupervisors = [];
    let processedExamDays = [];
    let reservedForKeskusta = 0;
    let assignments = {};

    const translations = {
        en: {
            appTitle: "SHIFT - Smart Handler for Invigilation and Functional Timetables",
            reservedKeskustaLabel: "Reserved for Keskusta:",
            reservedLastName: "Last Name",
            reservedFirstName: "First Name",
            reservedPosition: "Position",
            assignShiftsButton: "Assign Shifts",
            scheduleFirstName: "First Name",
            scheduleLastName: "Last Name",
            scheduleSwedishSkill: "Swedish Skill",
            scheduleExperience: "Experience",
            scheduleDisqualifications: "Disqualifications",
            scheduleShiftCount: "Shift Count",
            scheduleAssignedShifts: "Assigned Shifts",
            summaryShift: "Shift",
            summarySupervisorsAssigned: "Supervisors Assigned",
            summarySupervisorsByHall: "Supervisors by Hall",
            summaryActions: "Actions"
        },
        fi: {
            appTitle: "VUORO - Valintakokeiden organisointialgoritmi ja resurssien ohjaaja",
            reservedKeskustaLabel: "Keskustaan varattavat:",
            reservedLastName: "Sukunimi",
            reservedFirstName: "Etunimi",
            reservedPosition: "Sijoitus",
            assignShiftsButton: "Jaa työvuorot",
            scheduleFirstName: "Etunimi",
            scheduleLastName: "Sukunimi",
            scheduleSwedishSkill: "Ruotsin taito",
            scheduleExperience: "Kokemus",
            scheduleDisqualifications: "Jääviydet",
            scheduleShiftCount: "Vuorojen määrä",
            scheduleAssignedShifts: "Määrätyt vuorot",
            summaryShift: "Vuoro",
            summarySupervisorsAssigned: "Valvojia määrätty",
            summarySupervisorsByHall: "Valvojat halleittain",
            summaryActions: "Toiminnot"
        }
    };

    const updateElementText = (elementId, text) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    };

    const updateLanguage = (lang) => {
        const keysToUpdate = [
            { id: "app-title", key: "appTitle" },
            { id: "reserved-keskusta-label", key: "reservedKeskustaLabel" },
            { id: "assign-shifts-button", key: "assignShiftsButton" }
        ];

        keysToUpdate.forEach(({ id, key }) => {
            updateElementText(id, translations[lang][key]);
        });
    };

    document.getElementById("language-select").addEventListener("change", (event) => {
        updateLanguage(event.target.value);
    });

    // Set default language to English
    updateLanguage("en");

    document.getElementById('uploadFilesButton').addEventListener('click', async () => {
        try {
            const { supervisors, examDays, supervisorsData, examDaysData } = await new FileUploader().handleFileUpload();
            onFilesUploaded(supervisorsData, examDaysData, supervisors, examDays);
            document.getElementById('preview-container').style.display = 'block'; // Show the button
        } catch (error) {
            console.error('Error uploading files:', error);
            alert('An error occurred while uploading files. Please try again.');
        }
    });

    const validateReservedInput = (input) => {
        const value = parseInt(input, 10);
        if (isNaN(value) || value < 0) {
            alert('Please enter a valid number for "Keskustaan varattavat".');
            return 0;
        }
        return value;
    };

    document.getElementById('reserved-keskusta-button').addEventListener('click', () => {
        const input = document.getElementById('reserved-keskusta-input').value;
        reservedForKeskusta = validateReservedInput(input);
        console.log(`Reserved for Keskusta: ${reservedForKeskusta}`);
        updateElementText('reserved-keskusta-display', `Current value: ${reservedForKeskusta}`);
    });

    const createTable = (containerId, data) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        console.log(`Creating table for ${containerId} with data:`, data);

        const rows = data.split('\n').map(row => row.split(';').map(cell => cell.trim()));
        const headers = rows[0];
        const bodyRows = rows.slice(1);

        const tableDisplay = new TableDisplay(headers, bodyRows);
        const tableElement = tableDisplay.render();
        container.innerHTML = ''; // Clear existing content
        container.appendChild(tableElement);
    };

    const onFilesUploaded = (supervisorsData, examDaysData, supervisors, examDays) => {
        console.log('Processed Supervisors:', supervisors);
        console.log('Processed Exam Days:', examDays);
        processedSupervisors = supervisors;
        processedExamDays = examDays;

        console.log('Files uploaded and processed successfully.');
        console.log('Generating data preview...');

        createTable("supervisorsPreview", supervisorsData);
        createTable("examDaysPreview", examDaysData);

        document.getElementById('assign-shifts-container').style.display = 'block';
        document.getElementById('reserved-keskusta-container').style.display = 'block';
    };

    /*new FileUploader('file-upload-container', onFilesUploaded);*/

    const populateReservedSupervisorsTable = (reservedSupervisors) => {
        const reservedTableContainer = document.getElementById('reserved-keskusta-table-container');
        if (!reservedTableContainer) return;

        const headers = ["Last Name", "First Name", "Position", "Language Skill", "Previous Experience", "Disqualifications"];
        const data = reservedSupervisors.map(supervisor => ({
            lastName: supervisor.lastName,
            firstName: supervisor.firstName,
            position: supervisor.position,
            languageSkill: supervisor.languageSkill,
            previousExperience: supervisor.previousExperience,
            disqualifications: supervisor.disqualifications.length > 0 ? supervisor.disqualifications.join(', ') : 'None'
        }));

        const tableDisplay = new TableDisplay(headers, data);
        const tableElement = tableDisplay.render();
        reservedTableContainer.innerHTML = ''; // Clear existing content
        reservedTableContainer.appendChild(tableElement);
    };

    document.getElementById('assign-shifts-button').addEventListener('click', () => {
        if (processedSupervisors.length === 0 || processedExamDays.length === 0) {
            alert('Please upload and validate the CSV files first.');
            return;
        }

        const reservedSupervisors = [];
        const positionsOrder = ['Keskustakampus', 'Keskustakampus / Messukeskus', 'Messukeskus'];
        positionsOrder.forEach(position => {
            const availableSupervisors = processedSupervisors.filter(
                supervisor => supervisor.position === position && !reservedSupervisors.includes(supervisor)
            );
            reservedSupervisors.push(...availableSupervisors.slice(0, reservedForKeskusta - reservedSupervisors.length));
        });

        populateReservedSupervisorsTable(reservedSupervisors);

        const supervisorsForAssignment = processedSupervisors.filter(
            supervisor => !reservedSupervisors.includes(supervisor)
        );

        const shiftAssigner = new ShiftAssignerV4(supervisorsForAssignment, processedExamDays);
        shiftAssigner.assignShifts();
        assignments = shiftAssigner.getAssignments();

        console.log('Assigned Shifts:', assignments);

        const scheduleDisplay = new ScheduleDisplay(assignments, processedExamDays);
        scheduleDisplay.render();

        document.getElementById('schedule-display-container').style.display = 'block';
        document.getElementById('export-container').style.display = 'block';
    });

    document.getElementById('export-shifts-button').addEventListener('click', () => {
        const exportShifts = new ExportShifts(assignments, processedExamDays);
        exportShifts.exportToCSV();
    });
});