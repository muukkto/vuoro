import FileUploader from './components/FileUploader.js';
import ShiftAssigner from './components/ShiftAssigner.js';
import ScheduleDisplay from './components/ScheduleDisplay.js';

document.addEventListener('DOMContentLoaded', () => {
    let processedSupervisors = [];
    let processedExamDays = [];

    const onFilesUploaded = (supervisors, examDays) => {
        console.log('Processed Supervisors:', supervisors);
        console.log('Processed Exam Days:', examDays);
        processedSupervisors = supervisors;
        processedExamDays = examDays;

        // Show the "Assign Shifts" button
        document.getElementById('assign-shifts-container').style.display = 'block';
    };

    new FileUploader('file-upload-container', onFilesUploaded);

    document.getElementById('assign-shifts-button').addEventListener('click', () => {
        if (processedSupervisors.length === 0 || processedExamDays.length === 0) {
            alert('Please upload and validate the CSV files first.');
            return;
        }

        const shiftAssigner = new ShiftAssigner(processedSupervisors, processedExamDays);
        shiftAssigner.assignShifts();
        const assignments = shiftAssigner.getAssignments();

        console.log('Assigned Shifts:', assignments);

        // Render the schedule display
        const scheduleDisplayContainer = document.getElementById('schedule-display-container');
        scheduleDisplayContainer.innerHTML = '';
        const scheduleDisplay = new ScheduleDisplay(assignments);
        scheduleDisplay.render(scheduleDisplayContainer);
    });
});