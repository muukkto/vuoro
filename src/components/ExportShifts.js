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
        const headers = ['First Name', 'Last Name', ...this.examDays.map(day => day.date)];
        const rows = Object.values(this.assignments).map(({ supervisor, shifts }) => {
            const shiftMap = shifts.reduce((map, shift) => {
                map[shift.date] = shift.timeRange;
                return map;
            }, {});
            return [
                supervisor.firstName,
                supervisor.lastName,
                ...this.examDays.map(day => shiftMap[day.date] || '') // Fill empty if no shift
            ];
        });

        const csvContent = [headers, ...rows]
            .map(row => row.map(value => `"${value}"`).join(','))
            .join('\n');

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
