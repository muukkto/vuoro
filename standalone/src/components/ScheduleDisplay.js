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
            firstName: data.supervisor.nickname || data.supervisor.firstName,
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
            { label: "Exam", i18nKey: "exam" },
            { label: "Date", i18nKey: "date" },
            { label: "Supervisors", i18nKey: "supervisorsAssigned" },
            { label: "By Hall", i18nKey: "supervisorsByHall" },
            { label: "Actions", i18nKey: "actions" }
        ];

        const data = this.examDays
            .filter(day => day.examCode)
            .map(day => {
                const assigned = this.getAssignedByCode(day.examCode);
                const hallCounts = assigned.reduce((acc, s) => {
                    const key = s.hall || (s.building ? `${s.building}, ${s.room || ''}`.trim().replace(/,\s*$/, '') : null);
                    if (key) acc[key] = (acc[key] || 0) + 1;
                    return acc;
                }, {});
                const hallSummary = Object.entries(hallCounts)
                    .map(([h, c]) => `${h}: ${c}`).join('<br>') || '-';
                const supervisorList = this.createSupervisorListByCode(day.examCode);

                return {
                    exam: `${day.examName} (${day.examCode})`,
                    date: day.date,
                    supervisorsAssigned: assigned.length,
                    supervisorsByHall: hallSummary,
                    actions: `
                        <button class="view-supervisors-btn" data-exam-code="${day.examCode}" data-i18n="viewSupervisors">View Supervisors</button>
                        <div id="supervisor-list-${day.examCode}" class="supervisor-list" style="display:none;margin-top:10px;padding:5px;border:1px solid #ccc;background:#f9f9f9;">
                            ${supervisorList}
                        </div>
                    `
                };
            });

        const tableDisplay = new TableDisplay(headers, data);
        const tableElement = tableDisplay.render();
        summaryTableContainer.innerHTML = '';
        summaryTableContainer.appendChild(tableElement);

        summaryTableContainer.querySelectorAll('.view-supervisors-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const examCode = event.target.dataset.examCode;
                const list = document.getElementById(`supervisor-list-${examCode}`);
                if (list) list.style.display = list.style.display === 'none' ? 'block' : 'none';
            });
        });
    }

    getAssignedByCode(examCode) {
        return this.assignments
            .flatMap(({ shifts }) => shifts.filter(s => s.examCode === examCode));
    }

    createSupervisorListByCode(examCode) {
        return this.assignments
            .filter(({ shifts }) => shifts.some(s => s.examCode === examCode))
            .map(({ supervisor, shifts }) => {
                const shift = shifts.find(s => s.examCode === examCode);
                let info = `${supervisor.nickname || supervisor.firstName || ''} ${supervisor.lastName}`;
                if (shift) {
                    const tila = shift.hall || (shift.building ? `${shift.building}, ${shift.room || ''}`.trim().replace(/,\s*$/, '') : 'N/A');
                    info += ` (${tila}, ${shift.timeRange || ''})`;
                    if (shift.breakTime) info += `, Tauko: ${shift.breakTime}`;
                }
                return info;
            })
            .join('<br>');
    }

    formatShiftDetails(shifts) {
        return shifts.map(shift => {
            const tila = shift.hall || (shift.building ? `${shift.building}, ${shift.room || ''}`.trim().replace(/,\s*$/, '') : 'N/A');
            let details = `${shift.date || ''} (${shift.timeRange}, ${shift.examCode}, Tila: ${tila}`;
            if (shift.information) details += `, Info: ${shift.information}`;
            if (shift.breakTime) details += `, Tauko: ${shift.breakTime}`;
            details += ')';
            return details;
        }).join('<br>');
    }

    getStatsForExam(examCode) {
        const supervisors = this.assignments
            .filter(({ shifts }) => shifts.some(s => s.examCode === examCode))
            .map(({ supervisor }) => supervisor);

        const languageSkills = supervisors
            .map(s => s.languageSkill.toLowerCase())
            .reduce((acc, skill) => { acc[skill] = (acc[skill] || 0) + 1; return acc; }, {});

        const orderedSkills = ['äidinkieli', 'kiitettävä', 'hyvä', 'tyydyttävä', 'välttävä', 'ei osaamista']
            .map(skill => `${skill}: ${languageSkills[skill] || 0}`)
            .join(', ');

        const previousExperience = supervisors.filter(s => s.previousExperience).length;
        return {
            languageSkills: orderedSkills,
            previousExperience: `${previousExperience} / ${supervisors.length}`
        };
    }
}

export default ScheduleDisplay;