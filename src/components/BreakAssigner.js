export default class BreakAssigner {
    constructor(assignments, examDays) {
        this.assignments = assignments;
        this.examDays = examDays;
    }

    assignBreaks() {
        this.examDays.forEach(day => {
            // Collect all shift objects for this exam code
            const examShifts = this.assignments
                .flatMap(({ shifts }) => shifts.filter(s => s.examCode === day.examCode));

            if (examShifts.length === 0) return;

            // Group supervisors by their actual shift time range
            const shiftGroups = {};
            examShifts.forEach(shift => {
                const key = shift.timeRange;
                if (key) {
                    if (!shiftGroups[key]) shiftGroups[key] = [];
                    shiftGroups[key].push(shift);
                }
            });

            Object.entries(shiftGroups).forEach(([timeRange, shifts]) => {
                const [start, end] = timeRange.split('-').map(t => this.parseTime(t));
                if (!start || !end) return;
                const totalMinutes = (end - start) / (1000 * 60);

                if (totalMinutes > 360) {
                    const adjustedStart = new Date(start.getTime() + 30 * 60 * 1000);
                    const adjustedEnd = new Date(end.getTime() - 60 * 60 * 1000);

                    if (adjustedEnd > adjustedStart) {
                        const breakSchedule = this.calculateBreaks(shifts, adjustedStart, adjustedEnd);
                        this.applyBreaks(shifts, breakSchedule);
                    }
                }
            });
        });
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
        const hallGroups = supervisors.reduce((groups, shift) => {
            const key = shift.room || shift.hall || 'ungrouped';
            if (!groups[key]) groups[key] = [];
            groups[key].push(shift);
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
                supervisor.breakTime = `${breakInfo.start}-${breakInfo.end}`;
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
