class ShiftAssigner {
    constructor(supervisors, examDays) {
        this.supervisors = supervisors;
        this.examDays = examDays;
        this.assignments = {};
        // console.log('ShiftAssigner initialized with supervisors and examDays:', supervisors, examDays);
    }

    assignShifts() {
        // console.log('Starting shift assignment...');
        console.log('Exam days:', this.examDays);
        // console.log('Supervisors:', this.supervisors);
        this.examDays.forEach(day => {
            console.log('Processing exam day:', day);
            const availableSupervisors = this.getAvailableSupervisors(day.examCode);
            // console.log('Available supervisors for', day.date, ':', availableSupervisors);
            if (availableSupervisors.length > 0) {
                const assignedSupervisor = this.assignSupervisor(availableSupervisors, day.examCode);
                // console.log('Assigned supervisor:', assignedSupervisor);
                if (!this.assignments[assignedSupervisor.lastName]) {
                    this.assignments[assignedSupervisor.lastName] = [];
                }
                this.assignments[assignedSupervisor.lastName].push({
                    date: day.date,
                    timeRange: day.shiftA.timeRange,
                    examCode: day.examCode
                });
                // console.log('Updated assignments:', this.assignments);
            } else {
                // console.log('No available supervisors for', day.date);
            }
        });
        // console.log('Shift assignment completed. Final assignments:', this.assignments);
    }

    getAvailableSupervisors(examCode) {
        const day = this.getExamDayByCode(examCode);
        if (!day) return [];
        // console.log('Checking availability for exam code:', examCode);
        return this.supervisors.filter(supervisor => {
            // Check if supervisor is available on the given day
            if (!supervisor.availableDays.includes(day.date)) {
                return false;
            }

            // Check if supervisor has conflicts (e.g., disqualifications)
            if (this.hasConflicts(supervisor, examCode)) {
                return false;
            }

            // If supervisor has a shift preference for the given day, ensure it matches the current shift
            if (supervisor.shiftPreferences.length > 0) {
                const preferredShifts = supervisor.shiftPreferences.filter(pref => pref.startsWith(day.date));
                if (preferredShifts.length > 0) {
                    const preferredShift = preferredShifts[0].split(' ')[1]; // Extract time range
                    // console.log('Preferred shift for supervisor:', preferredShift);
                    // console.log('Day shift:', day);
                    return preferredShift === day.shiftA.timeRange; // Only allow if it matches shift A
                }
            }

            return true; // Supervisor is available and has no conflicts
        });
    }

    hasConflicts(supervisor, examCode) {
        const day = this.getExamDayByCode(examCode);
        if (!day) return true;
        // console.log('Checking conflicts for supervisor:', supervisor, 'on exam code:', examCode);

        // Check if the supervisor is disqualified for the exam
        if (supervisor.disqualifications && day.examCode) {
            const isDisqualified = supervisor.disqualifications.includes(day.examCode);
            if (isDisqualified) {
                // console.log('Conflict found: Supervisor', supervisor.lastName, 'is disqualified for exam', day.examCode);
                return true;
            }
        }

        return false; // No conflicts
    }

    assignSupervisor(availableSupervisors, examCode) {
        const day = this.getExamDayByCode(examCode);
        if (!day) return null;
        // console.log('Assigning supervisor from available list:', availableSupervisors);
        // Prioritize supervisors with preferences for the current shift
        const preferredSupervisors = availableSupervisors.filter(supervisor =>
            supervisor.shiftPreferences.some(pref => pref.includes(day.shiftA.timeRange))
        );

        if (preferredSupervisors.length > 0) {
            return preferredSupervisors[0]; // Assign the first preferred supervisor
        }

        // Fallback: assign the first available supervisor
        return availableSupervisors[0];
    }

    getExamDayByCode(examCode) {
        return this.examDays.find(day => day.examCode === examCode);
    }

    getAssignments() {
        // console.log('Fetching assignments:', this.assignments);
        return this.assignments;
    }
}

export default ShiftAssigner;