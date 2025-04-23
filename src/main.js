import FileUploader from './components/FileUploader.js';
import ShiftAssigner from './components/ShiftAssigner.js';
import ScheduleDisplay from './components/ScheduleDisplay.js';
import ExportShifts from './components/ExportShifts.js';
/*import ShiftAssignerWithLPSolver from './components/ShiftAssignerWithLPSolver.js';*/
import ShiftAssignerV3 from './components/ShiftAssigner_v3.js';

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

    const updateLanguage = (lang) => {
        document.getElementById("app-title").textContent = translations[lang].appTitle;
        document.getElementById("reserved-keskusta-label").textContent = translations[lang].reservedKeskustaLabel;
        document.getElementById("reserved-last-name").textContent = translations[lang].reservedLastName;
        document.getElementById("reserved-first-name").textContent = translations[lang].reservedFirstName;
        document.getElementById("reserved-position").textContent = translations[lang].reservedPosition;
        document.getElementById("assign-shifts-button").textContent = translations[lang].assignShiftsButton;
        document.getElementById("schedule-first-name").textContent = translations[lang].scheduleFirstName;
        document.getElementById("schedule-last-name").textContent = translations[lang].scheduleLastName;
        document.getElementById("schedule-swedish-skill").textContent = translations[lang].scheduleSwedishSkill;
        document.getElementById("schedule-experience").textContent = translations[lang].scheduleExperience;
        document.getElementById("schedule-disqualifications").textContent = translations[lang].scheduleDisqualifications;
        document.getElementById("schedule-shift-count").textContent = translations[lang].scheduleShiftCount;
        document.getElementById("schedule-assigned-shifts").textContent = translations[lang].scheduleAssignedShifts;
        document.getElementById("summary-shift").textContent = translations[lang].summaryShift;
        document.getElementById("summary-supervisors-assigned").textContent = translations[lang].summarySupervisorsAssigned;
        document.getElementById("summary-supervisors-by-hall").textContent = translations[lang].summarySupervisorsByHall;
        document.getElementById("summary-actions").textContent = translations[lang].summaryActions;
    };

    document.getElementById("language-select").addEventListener("change", (event) => {
        updateLanguage(event.target.value);
    });

    // Set default language to English
    updateLanguage("en");

    const onFilesUploaded = (supervisors, examDays) => {
        console.log('Processed Supervisors:', supervisors);
        console.log('Processed Exam Days:', examDays);
        processedSupervisors = supervisors;
        processedExamDays = examDays;

        // Show the "Assign Shifts" and "Reserved for Keskusta" sections
        document.getElementById('assign-shifts-container').style.display = 'block';
        document.getElementById('reserved-keskusta-container').style.display = 'block';
    };

    new FileUploader('file-upload-container', onFilesUploaded);

    const addToggleButtonForTable = (tableId, containerId, buttonText) => {
        const table = document.getElementById(tableId);
        const container = document.getElementById(containerId);
        const toggleButton = document.createElement('button');
        toggleButton.textContent = buttonText;
        toggleButton.style.marginTop = '10px';
        toggleButton.addEventListener('click', () => {
            table.style.display = table.style.display === 'none' ? 'table' : 'none';
        });
        container.insertBefore(toggleButton, table);
    };

    document.getElementById('reserved-keskusta-button').addEventListener('click', () => {
        const input = document.getElementById('reserved-keskusta-input').value;
        reservedForKeskusta = parseInt(input, 10);
        if (isNaN(reservedForKeskusta) || reservedForKeskusta < 0) {
            alert('Please enter a valid number for "Keskustaan varattavat".');
            reservedForKeskusta = 0;
        } else {
            console.log(`Reserved for Keskusta: ${reservedForKeskusta}`);
            document.getElementById('reserved-keskusta-display').textContent = `Current value: ${reservedForKeskusta}`;
        }
    });

    document.getElementById('assign-shifts-button').addEventListener('click', () => {
        if (processedSupervisors.length === 0 || processedExamDays.length === 0) {
            alert('Please upload and validate the CSV files first.');
            return;
        }

        // Reserve supervisors for Keskusta
        const reservedSupervisors = [];
        const positionsOrder = ['Keskustakampus', 'Keskustakampus / Messukeskus', 'Messukeskus'];
        positionsOrder.forEach(position => {
            const availableSupervisors = processedSupervisors.filter(
                supervisor => supervisor.position === position && !reservedSupervisors.includes(supervisor)
            );
            reservedSupervisors.push(...availableSupervisors.slice(0, reservedForKeskusta - reservedSupervisors.length));
        });

        // Populate the reserved supervisors table
        const reservedTable = document.getElementById('reserved-keskusta-table');
        const reservedTableBody = reservedTable.querySelector('tbody');
        reservedTableBody.innerHTML = ''; // Clear existing rows
        reservedSupervisors.forEach(supervisor => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${supervisor.lastName}</td>
                <td>${supervisor.firstName}</td>
                <td>${supervisor.position}</td>
                <td>${supervisor.languageSkill}</td>
                <td>${supervisor.previousExperience}</td>
                <td>${supervisor.disqualifications.length > 0 ? supervisor.disqualifications.join(', ') : 'None'}</td>
            `;
            reservedTableBody.appendChild(row);
        });
        reservedTable.style.display = 'none'; // Hide by default
        addToggleButtonForTable('reserved-keskusta-table', 'reserved-keskusta-container', 'Show Reserved Supervisors');

        // Remove reserved supervisors from the main list
        const supervisorsForAssignment = processedSupervisors.filter(
            supervisor => !reservedSupervisors.includes(supervisor)
        );

        const shiftAssigner = new ShiftAssignerV3(supervisorsForAssignment, processedExamDays);
        shiftAssigner.assignShifts();
        assignments = shiftAssigner.getAssignments();

        console.log('Assigned Shifts:', assignments);

        // Render the schedule display
        const scheduleDisplay = new ScheduleDisplay(assignments, processedExamDays);
        scheduleDisplay.render();

        document.getElementById('schedule-display-container').style.display = 'block';

        const scheduleTable = document.getElementById('schedule-table');
        scheduleTable.style.display = 'none'; // Hide by default
        addToggleButtonForTable('schedule-table', 'schedule-display-container', 'Show Shifts by Supervisor');

        const summaryTable = document.getElementById('summary-table');
        summaryTable.style.display = 'none'; // Hide by default
        addToggleButtonForTable('summary-table', 'schedule-display-container', 'Show Shifts by Day');

        // Initialize ExportShifts component
        new ExportShifts('export-container', assignments, processedExamDays);
    });
});