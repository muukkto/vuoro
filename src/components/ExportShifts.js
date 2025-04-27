export default class ExportShifts {
    constructor(containerId, assignments, examDays) {
        console.log('Initializing ExportShifts with assignments:', assignments);
        this.container = document.getElementById(containerId);
        this.assignments = assignments;
        this.examDays = examDays; // Store examDays for generating columns
        this.render();
    }

    render() {
        console.log('Rendering ExportShifts UI...');
        this.container.innerHTML = `
            <button id="export-shifts-button">Export Shifts</button>
        `;

        document.getElementById('export-shifts-button').addEventListener('click', () => {
            this.exportToCSV();
        });
    }

    exportToCSV() {
        const headers = [
            'First Name', 
            'Last Name', 
            'Disqualifications', 
            'Language Skill', 
            'Previous Experience', 
            ...this.examDays.flatMap(day => [`${day.date}-${day.examCode}`, `${day.date}-${day.examCode}-Hall`])
        ];
        const rows = Object.values(this.assignments).map(({ supervisor, shifts }) => {
            console.log('Shifts:', shifts); // Debugging line

            const shiftMap = shifts.reduce((map, shift) => {
                map[shift.examCode] = { date: shift.date, timeRange: shift.timeRange, hall: shift.hall };
                return map;
            }, {});

            console.log('Shift Map:', shiftMap); // Debugging line

            const row = [
                supervisor.firstName,
                supervisor.lastName,
                supervisor.disqualifications.join(', '),
                supervisor.languageSkill,
                supervisor.previousExperience ? "Checked" : "Unchecked",
                ...this.examDays.flatMap(day => {
                    const shift = shiftMap[day.examCode] || {};
                    return [shift.timeRange || '', shift.hall || ''];
                })
            ];
            console.log('Generated row:', row);
            return row;
        });

        console.log('CSV Headers:', headers);
        console.log('CSV Rows:', rows);

        const csvContent = [headers, ...rows]
            .map(row => row.join(';'))
            .join('\n');

        console.log('Generated CSV Content:', csvContent);

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'shifts_export.csv';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
