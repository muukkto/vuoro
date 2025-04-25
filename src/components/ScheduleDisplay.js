import TableDisplay from "./TableDisplay.js";

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
        const scheduleTableContainer = document.getElementById('schedule-table-container');

        const headers = ["First Name", "Last Name", "Language Skill", "Previous Experience", "Disqualifications", "Total Shifts", "Shift Details"];
        const data = Object.entries(this.assignments).map(([_, data]) => ({
            firstName: data.supervisor.firstName,
            lastName: data.supervisor.lastName,
            languageSkill: data.supervisor.languageSkill,
            previousExperience: data.supervisor.previousExperience,
            disqualifications: data.supervisor.disqualifications.length > 0 ? data.supervisor.disqualifications.join(', ') : 'None',
            totalShifts: data.shifts.length,
            shiftDetails: this.formatShiftDetails(data.shifts)
        }));

        const tableDisplay = new TableDisplay(headers, data);
        const tableElement = tableDisplay.render();
        scheduleTableContainer.innerHTML = ''; // Clear existing content
        scheduleTableContainer.appendChild(tableElement);
    }

    renderSummaryTable() {
        const summaryTableContainer = document.getElementById('summary-table-container');

        const headers = ["Shift", "Supervisors Assigned", "Supervisors by Hall", "Actions"];
        const data = this.examDays.flatMap(day => 
            ['shiftA', 'shiftB'].map(shiftKey => {
                const shift = day[shiftKey];
                if (shift && shift.timeRange) {
                    const assignedSupervisors = this.getAssignedSupervisors(day.date, shift.timeRange);
                    const hallSummary = this.getHallSummary(day.halls, assignedSupervisors);
                    const supervisorList = this.createSupervisorList(day.date, shift.timeRange);
                    const statsList = this.createStatsList(day.date, shift.timeRange);

                    return {
                        shift: `${day.date} (${shift.timeRange}, Exam: ${day.examCode})`,
                        supervisorsAssigned: `${assignedSupervisors.length} / ${shift.minSupervisors}`,
                        supervisorsByHall: hallSummary,
                        actions: `
                            <button class="view-supervisors-btn" data-date="${day.date}" data-time-range="${shift.timeRange}">View Supervisors</button>
                            <div id="supervisor-list-${day.date}-${shift.timeRange}" class="supervisor-list" style="display: none; margin-top: 10px; padding: 5px; border: 1px solid #ccc; background-color: #f9f9f9;">
                            ${supervisorList}</div>
                            <button class="view-stats-btn" data-date="${day.date}" data-time-range="${shift.timeRange}">View Stats</button>
                            <div id="stats-${day.date}-${shift.timeRange}" class="stats-list" style="display: none; margin-top: 10px; padding: 5px; border: 1px solid #ccc; background-color: #f9f9f9;">
                            ${statsList}</div>
                        `
                    };
                }
                return null;
            }).filter(row => row !== null)
        );

        const tableDisplay = new TableDisplay(headers, data);
        const tableElement = tableDisplay.render();
        summaryTableContainer.innerHTML = ''; // Clear existing content
        summaryTableContainer.appendChild(tableElement);

        // Add event listeners for buttons
        summaryTableContainer.querySelectorAll('.view-supervisors-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const { date, timeRange } = event.target.dataset;
                this.handleViewSupervisors(date, timeRange);
            });
        });

        summaryTableContainer.querySelectorAll('.view-stats-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const { date, timeRange } = event.target.dataset;
                this.handleViewStats(date, timeRange);
            });
        });
    }

    handleViewSupervisors(date, timeRange) {
        let supervisorListContainer = document.getElementById(`supervisor-list-${date}-${timeRange}`);
        supervisorListContainer.style.display = supervisorListContainer.style.display === 'none' ? 'block' : 'none';
    }

    handleViewStats(date, timeRange) {
        let statsListContainer = document.getElementById(`stats-${date}-${timeRange}`);
        statsListContainer.style.display = statsListContainer.style.display === 'none' ? 'block' : 'none';
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

    createSupervisorList(date, timeRange) {
        const supervisors = this.getSupervisorsForShift(date, timeRange);
        return supervisors.join('<br>');
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

    createStatsList(date, timeRange) {
        const stats = this.getStatsForShift(date, timeRange);
        const statsList = `
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