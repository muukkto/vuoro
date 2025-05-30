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

        const headers = [
            { label: "First Name", i18nKey: "firstName" },
            { label: "Last Name", i18nKey: "lastName" },
            { label: "Language Skill", i18nKey: "languageSkill" },
            { label: "Previous Experience", i18nKey: "previousExperience" },
            { label: "Disqualifications", i18nKey: "disqualifications" },
            { label: "Total Shifts", i18nKey: "totalShifts" },
            { label: "Shift Details", i18nKey: "shiftDetails" }
        ];

        const data = Object.entries(this.assignments).map(([_, data]) => ({
            firstName: data.supervisor.nickname,
            lastName: data.supervisor.lastName,
            languageSkill: data.supervisor.languageSkill,
            previousExperience: data.supervisor.previousExperience,
            disqualifications: data.supervisor.disqualifications.length > 0 ? data.supervisor.disqualifications.join(', ') : 'None',
            totalShifts: data.shifts.length,
            shiftDetails: this.formatShiftDetails(data.shifts)
        }));

        const tableDisplay = new TableDisplay(headers,data);
        const tableElement = tableDisplay.render();
        scheduleTableContainer.innerHTML = ''; // Clear existing content
        scheduleTableContainer.appendChild(tableElement);
    }

    renderSummaryTable() {
        const summaryTableContainer = document.getElementById('summary-table-container');

        const headers = [
            { label: "Shift", i18nKey: "shift" },
            { label: "Supervisors Assigned", i18nKey: "supervisorsAssigned" },
            { label: "Supervisors by Hall", i18nKey: "supervisorsByHall" },
            { label: "Actions", i18nKey: "actions" }
        ];

        const data = this.examDays.flatMap(day => 
            ['shiftA', 'shiftB', 'shiftC'].map(shiftKey => {
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
                            <button class="view-supervisors-btn" data-date="${day.date}" data-time-range="${shift.timeRange}" data-i18n="viewSupervisors">View Supervisors</button>
                            <div id="supervisor-list-${day.date}-${shift.timeRange}" class="supervisor-list" style="display: none; margin-top: 10px; padding: 5px; border: 1px solid #ccc; background-color: #f9f9f9;">
                            ${supervisorList}</div>
                            <button class="view-stats-btn" data-date="${day.date}" data-time-range="${shift.timeRange}" data-i18n="viewStats">View Stats</button>
                            <div id="stats-${day.date}-${shift.timeRange}" class="stats-list" style="display: none; margin-top: 10px; padding: 5px; border: 1px solid #ccc; background-color: #f9f9f9;">
                            ${statsList}</div>
                        `
                    };
                }
                return null;
            }).filter(row => row !== null)
        );

        const tableDisplay = new TableDisplay(            headers,             data        );
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
        return shifts.map(shift => {
            let details = `${shift.date} (${shift.timeRange}, Exam: ${shift.examCode}, Hall: ${shift.hall || 'N/A'}`;
            if (shift.information) {
                details += `, Information: ${shift.information}`;
            }
            if (shift.break) {
                details += `, Break: ${shift.break}`;
            }
            details += `)`; // Close the parentheses
            return details;
        }).join('<br>');
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
                let supervisorInfo = `${data.supervisor.nickname} ${data.supervisor.lastName} (${shift.hall || 'N/A'})`;
                if (shift.break) {
                    supervisorInfo += `, Break: ${shift.break}`;
                }
                return supervisorInfo;
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
            .map(supervisor => supervisor.languageSkill.toLowerCase()) // Convert to lowercase
            .reduce((acc, skill) => {
                acc[skill] = (acc[skill] || 0) + 1;
                return acc;
            }, {});

        const orderedLanguageSkills = [
            "äidinkieli", 
            "kiitettävä", 
            "hyvä", 
            "tyydyttävä", 
            "välttävä", 
            "ei osaamista"
        ].map(skill => `${skill.charAt(0).toUpperCase() + skill.slice(1)}: ${languageSkills[skill] || 0}`) // Capitalize for display
         .join(', ');

        console.log("Supervisors list", supervisors);
        const previousExperience = supervisors.filter(supervisor => supervisor.previousExperience).length;

        return {
            languageSkills: orderedLanguageSkills,
            previousExperience: `${previousExperience} / ${supervisors.length}`
        };
    }
}

export default ScheduleDisplay;