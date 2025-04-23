class ScheduleDisplay {
    constructor(assignments, examDays) {
        this.assignments = assignments;
        this.examDays = examDays;
    }

    render() {
        const scheduleTableBody = document.getElementById('schedule-table-body');

        Object.entries(this.assignments).forEach(([supervisorId, data]) => {
            const { supervisor, shifts } = data;
            const shiftDetails = shifts.map(shift => 
                `${shift.date} (${shift.timeRange}, Exam: ${shift.examCode}, Hall: ${shift.hall || 'N/A'})`
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
            scheduleTableBody.appendChild(row);
        });

        const summaryTableBody = document.getElementById('summary-table-body');
        summaryTableBody.innerHTML = ''; // Clear existing rows

        this.examDays.forEach(day => {
            ['shiftA', 'shiftB'].forEach(shiftKey => {
                const shift = day[shiftKey];
                if (shift && shift.timeRange) {
                    const assignedSupervisors = Object.values(this.assignments).flatMap(data => data.shifts).filter(assignment => 
                        assignment.date === day.date && assignment.timeRange === shift.timeRange
                    );

                    const hallCounts = day.halls.reduce((acc, hall) => {
                        acc[hall.name] = assignedSupervisors.filter(assignment => assignment.hall === hall.name).length;
                        return acc;
                    }, {});

                    const hallSummary = Object.entries(hallCounts)
                        .map(([hallName, count]) => `${hallName}: ${count}`)
                        .join('<br>');

                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${day.date} (${shift.timeRange}, Exam: ${day.examCode})</td>
                        <td>${assignedSupervisors.length} / ${shift.minSupervisors}</td>
                        <td>${hallSummary}</td>
                        <td>
                            <button class="view-supervisors-btn">View Supervisors</button>
                        </td>
                    `;
                    const button = row.querySelector('.view-supervisors-btn');
                    button.addEventListener('click', () => {
                        let supervisorList = button.parentElement.querySelector('.supervisor-list');
                        if (supervisorList) {
                            // Toggle visibility
                            supervisorList.style.display = supervisorList.style.display === 'none' ? 'block' : 'none';
                        } else {
                            // Create and display the supervisor list
                            supervisorList = document.createElement('div');
                            supervisorList.className = 'supervisor-list';
                            supervisorList.style.marginTop = '10px';
                            supervisorList.style.padding = '5px';
                            supervisorList.style.border = '1px solid #ccc';
                            supervisorList.style.backgroundColor = '#f9f9f9';

                            const supervisors = Object.entries(this.assignments)
                                .filter(([_, data]) => 
                                    data.shifts.some(shift => 
                                        shift.date === day.date && shift.timeRange === shift.timeRange
                                    )
                                )
                                .map(([_, data]) => {
                                    const shift = data.shifts.find(shift => shift.date === day.date && shift.timeRange === shift.timeRange);
                                    return `${data.supervisor.firstName} ${data.supervisor.lastName} (${shift.hall || 'N/A'})`;
                                });

                            supervisorList.innerHTML = supervisors.length > 0 
                                ? `<strong>Assigned Supervisors:</strong><br>${supervisors.join('<br>')}`
                                : '<strong>No supervisors assigned.</strong>';

                            button.parentElement.appendChild(supervisorList);
                        }
                    });
                    summaryTableBody.appendChild(row);
                }
            });
        });
    }

    showSupervisors(date, timeRange, examCode, button) {
        const supervisors = Object.entries(this.assignments)
            .filter(([_, data]) => 
                data.shifts.some(shift => 
                    shift.date === date && shift.timeRange === timeRange
                )
            )
            .map(([_, data]) => {
                const shift = data.shifts.find(shift => shift.date === date && shift.timeRange === timeRange);
                return `${data.supervisor.firstName} ${data.supervisor.lastName} (${shift.hall || 'N/A'})`;
            });

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