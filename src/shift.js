import FileUploader from "./components/FileUploader.js";
document.addEventListener('DOMContentLoaded', function() {
    let assignments = {};

    document.getElementById('uploadShiftFileButton').addEventListener('click', async () => {
        try {
            assignments = await new FileUploader().handleAssignmentUpload("shiftFileInput");
            console.log("Assignments uploaded successfully:", assignments);
        } catch (error) {
            console.error("Error uploading file:", error);
            alert("An error occurred while uploading the file. Please try again.");
        }
    });
});
        
