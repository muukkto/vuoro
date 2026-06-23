import FileUploader from "./components/FileUploader.js";
import ScheduleDisplay from "./components/ScheduleDisplay.js";
import PDFExporter from "./components/PDFExporter.js";
import BreakAssigner from "./components/BreakAssigner.js";
import ExportShifts from './components/ExportShifts.js';
import ShiftValidator from './components/ShiftValidator.js';

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
            const url = './src/conf/exam_information.csv';
            console.debug('[ExamDays] Haetaan:', url);
            const response = await fetch(url);
            console.debug('[ExamDays] HTTP status:', response.status, response.statusText);
            if (!response.ok) {
                console.error('[ExamDays] Fetch epäonnistui:', response.status, response.statusText);
                return [];
            }
            const csvData = await response.text();
            console.debug('[ExamDays] Raakateksti (ensimmäiset 300 merkkiä):\n', csvData.slice(0, 300));
            const fileUploader = new FileUploader();
            const result = fileUploader.parseExamDays(csvData);
            console.debug('[ExamDays] parseExamDays tulos (%d kpl):', result.length);
            console.table(result);
            return result;
        } catch (error) {
            console.error('[ExamDays] Lataus epäonnistui poikkeuksella:', error);
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
        const roleSelect = document.getElementById('role-select').value;
        const isKeskusta = roleSelect === 'keskusta-supervisors' || roleSelect === 'keskusta-it-support';

        hallSelect.innerHTML = '<option value="all" data-i18n="allSupervisors">All Halls</option>'; // Reset options
        hallSelect.innerHTML += `<option value="all_by_halls">${isKeskusta ? 'Kaikki rakennuksittain' : 'Kaikki halleittain'}</option>`;
        hallSelect.innerHTML += '<option value="all_by_alpha" data-i18n="allByAlpha">All by Alphabet</option>'; // Add "All by Alphabet" option

        const halls = new Set();

        if (selectedExamIndex !== 'all') {
            const selectedExam = processedExamDays[selectedExamIndex];
            assignments.forEach(({ shifts }) => {
                shifts.forEach(shift => {
                    if (shift.examCode === selectedExam.examCode && shift.date === selectedExam.date) {
                        const key = shift.hall || shift.building;
                        if (key) halls.add(key);
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
            const hasAssignedBreaks = assignments.some(({ shifts }) =>
                shifts.some(shift => shift.breakTime)
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
            const roleSelect = document.getElementById('role-select').value;
            const isKeskusta = roleSelect === 'keskusta-supervisors' || roleSelect === 'keskusta-it-support';
            assignments = isKeskusta
                ? await new FileUploader().handleKeskustaUpload()
                : await new FileUploader().handleAssignmentUpload();

            if (!assignments) return;

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
            : roleSelect === 'it-support'
            ? { location: 'Messukeskus', role: 'IT-valvojat' }
            : roleSelect === 'keskusta-supervisors'
            ? { location: 'Keskusta', role: 'Valvojat' }
            : { location: 'Keskusta', role: 'IT-valvojat' };

        const pdfExporter = new PDFExporter(assignments, processedExamDays, rolesAndLocation); // Käytetään päivitettyä dataa

        const filteredExamDays = selectedExamIndex === 'all' 
            ? processedExamDays 
            : [processedExamDays[selectedExamIndex]];

        let hallOption = selectedExamIndex === 'all' && allByHallsCheckbox ? "all_by_halls" : selectedHall;

        // Jos valittu "all_by_alpha", käytetään sitä
        if (selectedHall === "all_by_alpha") {
            hallOption = "all_by_alpha";
        }

        pdfExporter.exportByExams(filteredExamDays, hallOption === 'all' ? null : hallOption);
    });

    document.getElementById('export-shifts-button').addEventListener('click', () => {
        const roleSelect = document.getElementById('role-select').value;
        if (roleSelect === 'keskusta-supervisors' || roleSelect === 'keskusta-it-support') {
            alert('CSV-vienti ei ole käytettävissä Keskusta-rooleilla.');
            return;
        }
        const exportShifts = new ExportShifts(assignments, processedExamDays);
        exportShifts.exportToCSV();
    });

    document.getElementById('validate-shifts-button').addEventListener('click', () => {
        if (!assignments || !assignments.length) {
            alert('Lataa vuorot ensin.');
            return;
        }
        const validator = new ShiftValidator(assignments);
        const warnings = validator.validate();
        const container = document.getElementById('validation-results-container');
        container.innerHTML = '';

        if (warnings.length === 0) {
            container.innerHTML = '<p style="color:green;">&#10003; Ei havaittu ongelmia vuoroissa.</p>';
        } else {
            const typeLabels = {
                availability:     'Saatavuus',
                overlap:          'Päällekkäisyys',
                disqualification: 'Jääviys',
                missing_break:    'Puuttuva tauko',
                min_shifts:       'Liian vähän vuoroja'
            };
            const grouped = {};
            for (const w of warnings) {
                if (!grouped[w.type]) grouped[w.type] = [];
                grouped[w.type].push(w);
            }
            for (const [type, items] of Object.entries(grouped)) {
                const section = document.createElement('div');
                section.style.marginBottom = '12px';
                const heading = document.createElement('h4');
                heading.style.color = '#c0392b';
                heading.textContent = `${typeLabels[type] || type} (${items.length})`;
                section.appendChild(heading);
                const ul = document.createElement('ul');
                for (const item of items) {
                    const li = document.createElement('li');
                    li.textContent = `${item.supervisorName}: ${item.message}`;
                    ul.appendChild(li);
                }
                section.appendChild(ul);
                container.appendChild(section);
            }
        }
        container.style.display = 'block';
    });

    document.getElementById('export-supervisors-button').addEventListener('click', () => {
        const roleSelect = document.getElementById('role-select').value;
        const rolesAndLocation = roleSelect === 'supervisors'
            ? { location: 'Messukeskus', role: 'Valvojat' }
            : roleSelect === 'it-support'
            ? { location: 'Messukeskus', role: 'IT-valvojat' }
            : roleSelect === 'keskusta-supervisors'
            ? { location: 'Keskusta', role: 'Valvojat' }
            : { location: 'Keskusta', role: 'IT-valvojat' };

        const pdfExporter = new PDFExporter(assignments, processedExamDays, rolesAndLocation);
        const footerText = (document.getElementById('supervisor-pdf-footer')?.value || '').trim();
        pdfExporter.exportBySupervisors(footerText);
    });
});
