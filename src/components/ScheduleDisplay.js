class ScheduleDisplay {
    constructor(assignments, examDays) {
        this.assignments = assignments;
        this.examDays = examDays;
    }

    render() {
        this.renderScheduleTable();
        this.renderSummaryTable();
    }

    renderScheduleTable() {
        const scheduleTableBody = document.getElementById('schedule-table-body');
        scheduleTableBody.innerHTML = ''; // Clear existing rows

        Object.entries(this.assignments).forEach(([_, data]) => {
            const { supervisor, shifts } = data;
            const shiftDetails = this.formatShiftDetails(shifts);
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
    }

    renderSummaryTable() {
        const summaryTableBody = document.getElementById('summary-table-body');
        summaryTableBody.innerHTML = ''; // Clear existing rows

        this.examDays.forEach(day => {
            ['shiftA', 'shiftB'].forEach(shiftKey => {
                const shift = day[shiftKey];
                if (shift && shift.timeRange) {
                    const assignedSupervisors = this.getAssignedSupervisors(day.date, shift.timeRange);
                    const hallSummary = this.getHallSummary(day.halls, assignedSupervisors);

                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${day.date} (${shift.timeRange}, Exam: ${day.examCode})</td>
                        <td>${assignedSupervisors.length} / ${shift.minSupervisors}</td>
                        <td>${hallSummary}</td>
                        <td>
                            <button class="view-supervisors-btn">View Supervisors</button>
                            <button class="view-stats-btn">View Stats</button>
                        </td>
                    `;
                    this.addViewSupervisorsButton(row, day.date, shift.timeRange);
                    this.addViewStatsButton(row, day.date, shift.timeRange);
                    summaryTableBody.appendChild(row);
                }
            });
        });
    }

    formatShiftDetails(shifts) {
        return shifts.map(shift => 
            `${shift.date} (${shift.timeRange}, Exam: ${shift.examCode}, Hall: ${shift.hall || 'N/A'})`
        ).join('<br>');
    }

    getAssignedSupervisors(date, timeRange) {
        return Object.values(this.assignments)
            .flatMap(data => data.shifts)
            .filter(assignment => assignment.date === date && assignment.timeRange === timeRange);
    }

    getHallSummary(halls, assignedSupervisors) {
        const hallCounts = halls.reduce((acc, hall) => {
            acc[hall.name] = assignedSupervisors.filter(assignment => assignment.hall === hall.name).length;
            return acc;
        }, {});

        return Object.entries(hallCounts)
            .map(([hallName, count]) => `${hallName}: ${count}`)
            .join('<br>');
    }

    addViewSupervisorsButton(row, date, timeRange) {
        const button = row.querySelector('.view-supervisors-btn');
        button.addEventListener('click', () => {
            let supervisorList = row.querySelector('.supervisor-list');
            if (supervisorList) {
                // Toggle visibility
                supervisorList.style.display = supervisorList.style.display === 'none' ? 'block' : 'none';
            } else {
                // Create and display the supervisor list
                supervisorList = this.createSupervisorList(date, timeRange);
                row.querySelector('td:last-child').appendChild(supervisorList);
            }
        });
    }

    createSupervisorList(date, timeRange) {
        const supervisorList = document.createElement('div');
        supervisorList.className = 'supervisor-list';
        supervisorList.style.marginTop = '10px';
        supervisorList.style.padding = '5px';
        supervisorList.style.border = '1px solid #ccc';
        supervisorList.style.backgroundColor = '#f9f9f9';

        const supervisors = this.getSupervisorsForShift(date, timeRange);
        supervisorList.innerHTML = supervisors.length > 0 
            ? `<strong>Assigned Supervisors:</strong><br>${supervisors.join('<br>')}`
            : '<strong>No supervisors assigned.</strong>';

        return supervisorList;
    }

    getSupervisorsForShift(date, timeRange) {
        return Object.entries(this.assignments)
            .filter(([_, data]) => 
                data.shifts.some(shift => shift.date === date && shift.timeRange === timeRange)
            )
            .map(([_, data]) => {
                const shift = data.shifts.find(shift => shift.date === date && shift.timeRange === timeRange);
                return `${data.supervisor.firstName} ${data.supervisor.lastName} (${shift.hall || 'N/A'})`;
            });
    }

    addViewStatsButton(row, date, timeRange) {
        const button = row.querySelector('.view-stats-btn');
        button.addEventListener('click', () => {
            let statsList = row.querySelector('.stats-list');
            if (statsList) {
                // Toggle visibility
                statsList.style.display = statsList.style.display === 'none' ? 'block' : 'none';
            } else {
                // Create and display the stats list
                statsList = this.createStatsList(date, timeRange);
                row.querySelector('td:last-child').appendChild(statsList);
            }
        });
    }

    createStatsList(date, timeRange) {
        const statsList = document.createElement('div');
        statsList.className = 'stats-list';
        statsList.style.marginTop = '10px';
        statsList.style.padding = '5px';
        statsList.style.border = '1px solid #ccc';
        statsList.style.backgroundColor = '#f9f9f9';

        const stats = this.getStatsForShift(date, timeRange);
        statsList.innerHTML = `
            <strong>Supervisor Stats:</strong><br>
            Language Skills: ${stats.languageSkills}<br>
            Previous Experience: ${stats.previousExperience}
        `;

        return statsList;
    }

    getStatsForShift(date, timeRange) {
        const supervisors = Object.entries(this.assignments)
            .filter(([_, data]) => 
                data.shifts.some(shift => shift.date === date && shift.timeRange === timeRange)
            )
            .map(([_, data]) => data.supervisor);

        const languageSkills = supervisors
            .map(supervisor => supervisor.languageSkill)
            .reduce((acc, skill) => {
                acc[skill] = (acc[skill] || 0) + 1;
                return acc;
            }, {});

        const orderedLanguageSkills = [
            "Äidinkieli", 
            "Kiitettävä", 
            "Hyvä", 
            "Tyydyttävä", 
            "Välttävä", 
            "Ei osaamista"
        ].map(skill => `${skill}: ${languageSkills[skill] || 0}`)
         .join(', ');

        const previousExperience = supervisors.filter(supervisor => supervisor.previousExperience).length;

        return {
            languageSkills: orderedLanguageSkills,
            previousExperience: `${previousExperience} / ${supervisors.length}`
        };
    }
}

export default ScheduleDisplay;