import FileUploader from "./components/FileUploader.js";
import ScheduleDisplay from "./components/ScheduleDisplay.js";
import PDFExporter from "./components/PDFExporter.js";

document.addEventListener('DOMContentLoaded', () => {
    let assignments = {};
    let processedExamDays = [];

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

    document.getElementById('uploadAssignmentFileButton').addEventListener('click', async () => {
        try {
            assignments = await new FileUploader().handleAssignmentUpload();
            processedExamDays = await new FileUploader().handleExamDaysUpload();

            console.log('Assignments:', assignments);
            console.log('Processed Exam Days:', processedExamDays);

            const scheduleDisplay = new ScheduleDisplay(assignments, processedExamDays);
            scheduleDisplay.render();
            document.getElementById('schedule-display-container').style.display = 'block'; // Show the schedule container

            populateExamDropdown(); // Populate dropdown after data is loaded
        } catch (error) {
            console.error('Error uploading files:', error);
            alert('An error occurred while uploading files. Please try again.');
        }
    });

    document.getElementById('export-pdf-button').addEventListener('click', () => {
        const selectedExamIndex = document.getElementById('exam-select').value;
        const pdfExporter = new PDFExporter(assignments, processedExamDays);

        if (selectedExamIndex === 'all') {
            pdfExporter.exportByExams(); // Export all exams
        } else {
            const selectedExam = [processedExamDays[selectedExamIndex]];
            pdfExporter.exportByExams(selectedExam); // Export only the selected exam
        }
    });
});
