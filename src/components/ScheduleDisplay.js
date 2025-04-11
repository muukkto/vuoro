class ScheduleDisplay {
    constructor(assignments) {
        this.assignments = assignments;
    }

    render(container) {
        const table = document.createElement('table');
        table.className = 'schedule-table';

        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Supervisor</th>
                <th>Assigned Shifts</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        Object.entries(this.assignments).forEach(([supervisor, shifts]) => {
            const row = document.createElement('tr');
            const shiftDetails = shifts.map(shift => 
                `${shift.date} (${shift.timeRange}, Exam: ${shift.examCode})`
            ).join('<br>');
            row.innerHTML = `
                <td>${supervisor}</td>
                <td>${shiftDetails}</td>
            `;
            tbody.appendChild(row);
        });
        table.appendChild(tbody);

        container.appendChild(table);
    }
}

export default ScheduleDisplay;