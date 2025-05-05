export default class BreakAssigner {
    constructor(assignments, examDays) {
        this.assignments = assignments;
        this.examDays = examDays;
    }

    assignBreaks() {
        console.log('Assigning breaks...');
        this.examDays.forEach(day => {
            ['shiftA', 'shiftB'].forEach(shiftKey => {
                const shift = day[shiftKey];
                if (shift && shift.timeRange) {
                    const [start, end] = shift.timeRange.split('-').map(time => this.parseTime(time));
                    const [examStart, examEnd] = day.timeRange.split('-').map(time => this.parseTime(time));
                    const totalMinutes = (end - start) / (1000 * 60);

                    if (totalMinutes > 360) { // Only assign breaks if shift is longer than 6 hours (360 minutes)
                        const adjustedStart = new Date(examStart.getTime() + 30 * 60 * 1000); // Start 30 minutes after shift start
                        const adjustedEnd = new Date(examEnd.getTime() - 60 * 60 * 1000); // End 1 hour before shift end

                        if (adjustedEnd > adjustedStart) { // Ensure there is time for breaks
                            const assignedSupervisors = this.getAssignedSupervisors(day.date, shift.timeRange);
                            const breakSchedule = this.calculateBreaks(assignedSupervisors, adjustedStart, adjustedEnd);
                            this.applyBreaks(assignedSupervisors, breakSchedule);
                        }
                    }
                }
            });
        });
    }

    getAssignedSupervisors(date, timeRange) {
        return Object.values(this.assignments)
            .flatMap(data => data.shifts)
            .filter(assignment => assignment.date === date && assignment.timeRange === timeRange);
    }

    calculateBreaks(supervisors, adjustedStart, adjustedEnd) {
        const totalMinutes = (adjustedEnd - adjustedStart) / (1000 * 60);
        const breakDuration = 30; // 30 minutes per break
        const breakInterval = Math.floor(totalMinutes / supervisors.length);

        return supervisors.map((_, index) => {
            // Calculate break start time
            let breakStart = new Date(adjustedStart.getTime() + index * breakInterval * 60 * 1000);
            breakStart.setMinutes(breakStart.getMinutes() + (breakStart.getMinutes() % 30 === 0 ? 0 : 30 - (breakStart.getMinutes() % 30))); // Align to 00 or 30

            // Ensure break ends within adjustedEnd
            let breakEnd = new Date(breakStart.getTime() + breakDuration * 60 * 1000);
            if (breakEnd > adjustedEnd) {
                breakStart = new Date(adjustedEnd.getTime() - breakDuration * 60 * 1000);
                breakEnd = adjustedEnd;
            }

            return {
                start: this.formatTime(breakStart),
                end: this.formatTime(breakEnd)
            };
        });
    }

    applyBreaks(supervisors, breakSchedule) {
        supervisors.forEach((supervisor, index) => {
            supervisor.break = `${breakSchedule[index].start}-${breakSchedule[index].end}`;
        });
    }

    parseTime(time) {
        const [hours, minutes] = time.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    }

    formatTime(date) {
        return date.toTimeString().slice(0, 5);
    }
}
