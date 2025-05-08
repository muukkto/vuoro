export default class BreakAssigner {
    constructor(assignments, examDays) {
        this.assignments = assignments;
        this.examDays = examDays;
    }

    assignBreaks() {
        console.log('Assigning breaks...');
        this.examDays.forEach(day => {
            ['shiftA', 'shiftB', 'shiftC'].forEach(shiftKey => {
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

                            console.log('Break schedule:', breakSchedule);

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
        const totalSlots = Math.floor(totalMinutes / breakDuration); // Calculate total break slots
        console.log(`Exam code: ${supervisors[0].examCode}`);
        console.log(`Date: ${supervisors[0].date}`);
        console.log(`Start time: ${this.formatTime(adjustedStart)}`);
        console.log(`End time: ${this.formatTime(adjustedEnd)}`);
        console.log(`Total slots: ${totalSlots}`);
        const hallGroups = supervisors.reduce((groups, supervisor) => {
            if (!groups[supervisor.hall]) {
                groups[supervisor.hall] = [];
            }
            groups[supervisor.hall].push(supervisor);
            return groups;
        }, {});

        const breakSchedule = [];
        Object.values(hallGroups).forEach(group => {
            const supervisorsPerSlot = Math.ceil(group.length / totalSlots); // Distribute supervisors evenly
            let slotStart = new Date(adjustedStart);

            console.log(`Supervisors per slot: ${supervisorsPerSlot}`);
            console.log(`Group size: ${group.length}`);

            for (let i = 0; i < totalSlots; i++) {
                const slotEnd = new Date(slotStart.getTime() + breakDuration * 60 * 1000);

                group.splice(0, supervisorsPerSlot).forEach(supervisor => {
                    breakSchedule.push({
                        supervisor,
                        start: this.formatTime(slotStart),
                        end: this.formatTime(slotEnd)
                    });
                });

                slotStart = slotEnd;
                if (slotStart >= adjustedEnd) break; // Stop if we reach the end of the adjusted time
            }
        });

        return breakSchedule;
    }

    applyBreaks(supervisors, breakSchedule) {
        supervisors.forEach(supervisor => {
            const breakInfo = breakSchedule.find(schedule => schedule.supervisor === supervisor);
            if (breakInfo) {
                supervisor.break = `${breakInfo.start}-${breakInfo.end}`;
            }
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
