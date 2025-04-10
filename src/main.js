import FileUploader from './components/FileUploader.js';

document.addEventListener('DOMContentLoaded', () => {
    const onFilesUploaded = (processedSupervisors, processedExamDays) => {
        console.log('Processed Supervisors:', processedSupervisors);
        console.log('Processed Exam Days:', processedExamDays);

        // TODO: Pass processed data to shift assignment logic and render schedules
    };

    new FileUploader('file-upload-container', onFilesUploaded);
});