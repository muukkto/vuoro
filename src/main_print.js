import FileUploader from "./components/FileUploader.js";
import ScheduleDisplay from "./components/ScheduleDisplay.js";
import PDFExporter from "./components/PDFExporter.js";
import BreakAssigner from "./components/BreakAssigner.js";

document.addEventListener('DOMContentLoaded', async () => {
    let assignments = {};
    let processedExamDays = [];

    const loadExamDaysFromFile = async () => {
        try {
            const response = await fetch('./src/conf/it_shifts.csv');
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
        examSelect.innerHTML = '<option value="all">All Exams</option>'; // Reset options
        processedExamDays.forEach((examDay, index) => {
            const option = document.createElement('option');
            option.value = index; // Use index as value
            option.textContent = `${examDay.examName} (${examDay.examCode})`;
            examSelect.appendChild(option);
        });
    };

    const populateHallDropdown = (selectedExamIndex) => {
        const hallSelect = document.getElementById('hall-select');
        hallSelect.innerHTML = '<option value="all">All Halls</option>'; // Reset options
        hallSelect.innerHTML += '<option value="all_by_halls">All by Halls</option>'; // Add "All by Halls" option

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
        const pdfExporter = new PDFExporter(assignments, processedExamDays);

        const filteredExamDays = selectedExamIndex === 'all' 
            ? processedExamDays 
            : [processedExamDays[selectedExamIndex]];

        const hallOption = selectedExamIndex === 'all' && allByHallsCheckbox ? "all_by_halls" : selectedHall;

        pdfExporter.exportByExams(filteredExamDays, hallOption === 'all' ? null : hallOption);
    });
});
