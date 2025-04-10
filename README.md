# Shift Assignment App

This web-based application is designed to assign shifts to IT support supervisors based on uploaded CSV files containing supervisor and exam day data. The application operates entirely in the browser, ensuring that no data is saved to a server, making it suitable for deployment on GitHub Pages.

## Features

- Upload two CSV files: one for supervisor data and another for exam day data.
- Local processing of data to assign shifts based on specified rules.
- Display of assigned shifts and schedules in a user-friendly interface.
- All operations are performed in the browser without server-side storage.

## Project Structure

```
shift-assignment-app
├── src
│   ├── assets
│   │   └── styles.css        # CSS styles for the application
│   ├── components
│   │   ├── FileUploader.js   # Component for uploading CSV files
│   │   ├── ShiftAssigner.js   # Logic for assigning shifts
│   │   └── ScheduleDisplay.js  # Component for displaying schedules
│   ├── utils
│   │   ├── csvParser.js      # Functions for parsing CSV files
│   │   └── shiftLogic.js     # Functions for shift assignment logic
│   ├── index.html            # Main HTML file
│   └── main.js               # Main JavaScript file
├── .gitignore                # Files to ignore in version control
├── package.json              # npm configuration file
└── README.md                 # Project documentation
```

## Setup Instructions

1. Clone the repository to your local machine.
2. Open the `index.html` file in your web browser to run the application.
3. Use the file uploader to select and upload the required CSV files.
4. View the assigned shifts and schedules displayed on the screen.

## Usage Guidelines

- Ensure that the CSV files are formatted correctly according to the application's requirements.
- The application will process the data locally, and no information will be sent to a server.
- Refresh the page to reset the application and start a new shift assignment process.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.