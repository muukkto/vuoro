import FileUploader from "./components/FileUploader.js";
import ScheduleDisplay from "./components/ScheduleDisplay.js";
import PDFExporter from "./components/PDFExporter.js";
import BreakAssigner from "./components/BreakAssigner.js";
import ExportShifts from './components/ExportShifts.js';

async function loadTranslations(lang) {
    const response = await fetch(`src/assets/lang-${lang}.json`);
    return response.json();
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

let currentObserver = null; // Tallennetaan viite nykyiseen observeriin

function applyTranslations(translations) {
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (translations[key]) {
            el.textContent = translations[key];
        }
    });
}

function observeDOMChanges(translations) {
    // Poista aiempi observer, jos sellainen on olemassa
    if (currentObserver) {
        currentObserver.disconnect();
    }

    const debouncedApplyTranslations = debounce(() => applyTranslations(translations), 200);

    const observer = new MutationObserver(() => {
        debouncedApplyTranslations();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    currentObserver = observer; // Päivitä viite nykyiseen observeriin
}

function setLanguage(lang) {
    loadTranslations(lang).then(translations => {
        applyTranslations(translations); // Päivitä käännökset heti
        observeDOMChanges(translations); // Aloita DOM-muutosten tarkkailu uusilla käännöksillä
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    let assignments = {};
    let processedExamDays = [];

    document.getElementById('language-select').addEventListener('change', (event) => {
        setLanguage(event.target.value);
    });

    setLanguage("fi");

    const loadExamDaysFromFile = async () => {
        try {
            const roleSelect = document.getElementById('role-select').value;
            const fileName = roleSelect === 'it-support' ? './src/conf/it_shifts.csv' : './src/conf/supervisor_shifts.csv';

            const response = await fetch(fileName);
            const csvData = await response.text();
            const fileUploader = new FileUploader();
            return fileUploader.parseExamDays(csvData); // Use FileUploader's parseExamDays method
        } catch (error) {
            console.error('Error loading exam days from file:', error);
            alert('Failed to load exam days data. Please check the file.');
            return [];
        }
    };

    const populateExamDropdown = () => {
        const examSelect = document.getElementById('exam-select');
        examSelect.innerHTML = '<option value="all" data-i18n="allExams">All exams</option>'; // Reset options
        console.log('Processed Exam Days:', processedExamDays); // Log the processed exam days
        processedExamDays.forEach((examDay, index) => {
            const option = document.createElement('option');
            option.value = index; // Use index as value
            option.textContent = `${examDay.examName}`;
            examSelect.appendChild(option);
        });
    };

    const populateHallDropdown = (selectedExamIndex) => {
        const hallSelect = document.getElementById('hall-select');
        hallSelect.innerHTML = '<option value="all" data-i18n="allSupervisors">All Halls</option>'; // Reset options
        hallSelect.innerHTML += '<option value="all_by_halls" data-i18n="allByHalls">All by Halls</option>'; // Add "All by Halls" option

        const halls = new Set();

        if (selectedExamIndex !== 'all') {
            const selectedExam = processedExamDays[selectedExamIndex];
            Object.values(assignments).forEach(({ shifts }) => {
                shifts.forEach(shift => {
                    if (shift.examCode === selectedExam.examCode && shift.date === selectedExam.date && shift.hall) {
                        halls.add(shift.hall);
                    }
                });
            });
        }

        halls.forEach(hall => {
            const option = document.createElement('option');
            option.value = hall;
            option.textContent = hall;
            hallSelect.appendChild(option);
        });

        document.getElementById('hall-select-container').style.display = halls.size > 0 ? 'block' : 'none';
    };

    document.getElementById('exam-select').addEventListener('change', (event) => {
        const selectedExamIndex = event.target.value;
        populateHallDropdown(selectedExamIndex);

        // Show or hide the "All by Halls" checkbox based on the selected exam
        const allByHallsContainer = document.getElementById('all-by-halls-container');
        allByHallsContainer.style.display = selectedExamIndex === 'all' ? 'block' : 'none';
    });

    document.getElementById('assign-breaks-button').addEventListener('click', () => {
        try {
            // Check if any supervisor already has breaks assigned
            const hasAssignedBreaks = Object.values(assignments).some(({ shifts }) =>
                shifts.some(shift => shift.break)
            );

            if (hasAssignedBreaks) {
                const confirmReassign = confirm('Some supervisors already have breaks assigned. Do you want to reassign breaks?');
                if (!confirmReassign) {
                    return; // Exit if the user does not confirm
                }
            }

            const breakAssigner = new BreakAssigner(assignments, processedExamDays);
            breakAssigner.assignBreaks(); // Assign breaks to supervisors

            const scheduleDisplay = new ScheduleDisplay(assignments, processedExamDays);
            scheduleDisplay.render(); // Update the schedule display
            document.getElementById('schedule-display-container').style.display = 'block'; // Ensure the schedule container is visible

            alert('Breaks have been successfully assigned.');
        } catch (error) {
            console.error('Error assigning breaks:', error);
            alert('An error occurred while assigning breaks. Please try again.');
        }
    });

    document.getElementById('uploadAssignmentFileButton').addEventListener('click', async () => {
        try {
            assignments = await new FileUploader().handleAssignmentUpload();
            processedExamDays = await loadExamDaysFromFile(); // Load exam days from file

            console.log('Assignments:', assignments);
            console.log('Processed Exam Days:', processedExamDays);

            const scheduleDisplay = new ScheduleDisplay(assignments, processedExamDays);
            scheduleDisplay.render(); // Render the schedule without assigning breaks
            document.getElementById('schedule-display-container').style.display = 'block'; // Show the schedule container
            document.getElementById('export-container').style.display = 'block'; // Show the preview container

            populateExamDropdown(); // Populate dropdown after data is loaded
            document.getElementById('hall-select-container').style.display = 'none'; // Hide hall dropdown initially
            document.getElementById('all-by-halls-container').style.display = 'block'; // Show "All by Halls" checkbox initially
        } catch (error) {
            console.error('Error uploading files:', error);
            alert('An error occurred while uploading files. Please try again.');
        }
    });

    document.getElementById('export-pdf-button').addEventListener('click', () => {
        const selectedExamIndex = document.getElementById('exam-select').value;
        const selectedHall = document.getElementById('hall-select').value;
        const allByHallsCheckbox = document.getElementById('all-by-halls-checkbox').checked;

        // Päivitetään globalRoleData valinnan perusteella
        const roleSelect = document.getElementById('role-select').value;
        const rolesAndLocation = roleSelect === 'supervisors'
            ? { location: 'Messukeskus', role: 'Valvojat' }
            : { location: 'Messukeskus', role: 'IT-lähituki' };

        const pdfExporter = new PDFExporter(assignments, processedExamDays, rolesAndLocation); // Käytetään päivitettyä dataa

        const filteredExamDays = selectedExamIndex === 'all' 
            ? processedExamDays 
            : [processedExamDays[selectedExamIndex]];

        const hallOption = selectedExamIndex === 'all' && allByHallsCheckbox ? "all_by_halls" : selectedHall;

        pdfExporter.exportByExams(filteredExamDays, hallOption === 'all' ? null : hallOption);
    });

    document.getElementById('export-shifts-button').addEventListener('click', () => {
        const exportShifts = new ExportShifts(assignments, processedExamDays);
        exportShifts.exportToCSV();
    });

    document.getElementById('export-supervisors-button').addEventListener('click', () => {
        const roleSelect = document.getElementById('role-select').value;
        const rolesAndLocation = roleSelect === 'supervisors'
            ? { location: 'Messukeskus', role: 'Valvojat' }
            : { location: 'Messukeskus', role: 'IT-lähituki' };

        const pdfExporter = new PDFExporter(assignments, processedExamDays, rolesAndLocation);
        pdfExporter.exportBySupervisors();
    });
});
