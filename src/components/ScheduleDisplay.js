class ScheduleDisplay {
    constructor(assignments, examDays) {
        this.assignments = assignments;
        this.examDays = examDays;

        // Bind the static method to the instance or attach it to the global scope
        ScheduleDisplay.showSupervisors = ScheduleDisplay.showSupervisors.bind(this);
        window.ScheduleDisplay = ScheduleDisplay; // Attach to global scope
    }

    render(container) {
        const table = document.createElement('table');
        table.className = 'schedule-table';

        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Swedish Skill</th>
                <th>Experience</th>
                <th>Disqualifications</th>
                <th>Shift Count</th>
                <th>Assigned Shifts</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        Object.entries(this.assignments).forEach(([supervisorLastName, data]) => {
            const { supervisor, shifts } = data;
            const shiftDetails = shifts.map(shift => 
                `${shift.date} (${shift.timeRange}, Exam: ${shift.examCode})`
            ).join('<br>');
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${supervisor.firstName}</td>
                <td>${supervisor.lastName}</td>
                <td>${supervisor.languageSkill}</td>
                <td>${supervisor.previousExperience}</td>
                <td>${supervisor.disqualifications.length > 0 ? supervisor.disqualifications.join(', ') : 'None'}</td>
                <td>${shifts.length}</td>
                <td>${shiftDetails}</td>
            `;
            tbody.appendChild(row);
        });
        table.appendChild(tbody);

        container.appendChild(table);

        console.log(this.assignments);

        // Add summary table
        const summaryTable = document.createElement('table');
        summaryTable.className = 'schedule-table';
        summaryTable.innerHTML = `
            <thead>
                <tr>
                    <th>Shift</th>
                    <th>Supervisors Assigned</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${this.examDays.map(day => `
                    <tr>
                        <td>${day.date} (${day.shiftA.timeRange}, Exam: ${day.examCode})</td>
                        <td>${Object.values(this.assignments).flatMap(data => data.shifts).filter(assignment => 
                            assignment.date === day.date && assignment.timeRange === day.shiftA.timeRange
                        ).length}</td>
                        <td>
                            <button onclick="ScheduleDisplay.showSupervisors('${day.date}', '${day.shiftA.timeRange}', '${day.examCode}', this)">View Supervisors</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        container.appendChild(summaryTable);
    }

    static showSupervisors(date, timeRange, examCode, button) {
        const supervisors = Object.entries(this.assignments)
            .filter(([_, data]) => 
                data.shifts.some(shift => 
                    shift.date === date && shift.timeRange === timeRange
                )
            )
            .map(([supervisorLastName, data]) => data.supervisor.lastName);

        let supervisorList = button.parentElement.querySelector('.supervisor-list');
        if (!supervisorList) {
            supervisorList = document.createElement('div');
            supervisorList.className = 'supervisor-list';
            supervisorList.style.marginTop = '10px';
            supervisorList.style.padding = '5px';
            supervisorList.style.border = '1px solid #ccc';
            supervisorList.style.backgroundColor = '#f9f9f9';
            button.parentElement.appendChild(supervisorList);
        }

        supervisorList.innerHTML = supervisors.length > 0 
            ? `<strong>Assigned Supervisors:</strong><br>${supervisors.join('<br>')}`
            : '<strong>No supervisors assigned.</strong>';
    }
}

export default ScheduleDisplay;