class ShiftAssigner {
    constructor(supervisors, examDays) {
        this.supervisors = supervisors;
        this.examDays = examDays;
        this.assignments = {};
    }

    assignShifts() {
        console.log('Starting shift assignment...');
        console.log('Supervisors:', this.supervisors);

        const supervisorShiftCounts = this.supervisors.reduce((acc, supervisor) => {
            acc[supervisor.lastName] = 0;
            return acc;
        }, {});

        // Step 1: Determine potential shifts for all supervisors
        let potentialShifts = this.examDays.map(day => ({
            day,
            availableSupervisors: this.getAvailableSupervisors(day.examCode)
        }));

        // Sort shifts by the number of potential supervisors (ascending)
        potentialShifts.sort((a, b) => a.availableSupervisors.length - b.availableSupervisors.length);

        // Step 2: Assign shifts based on sorted potential shifts
        potentialShifts.forEach(({ day, availableSupervisors }) => {
            console.log(`Available supervisors for ${day.date} (${day.shiftA.timeRange}):`, availableSupervisors);

            const assignedSupervisors = [];
            while (assignedSupervisors.length < day.shiftA.minSupervisors && availableSupervisors.length > 0) {
                const supervisor = this.selectSupervisorForShift(
                    availableSupervisors.filter(s => !this.hasShiftOnSameDay(s, day.date)), // Ensure no duplicate shifts on the same day
                    supervisorShiftCounts
                );
                if (!supervisor) break; // No valid supervisor available
                assignedSupervisors.push(supervisor);
                supervisorShiftCounts[supervisor.lastName]++;
                this.addAssignment(supervisor, day);
                availableSupervisors.splice(availableSupervisors.indexOf(supervisor), 1);
            }

            if (assignedSupervisors.length < day.shiftA.minSupervisors) {
                console.error(`Error: Not enough supervisors assigned for shift on ${day.date} (${day.shiftA.timeRange}). Required: ${day.shiftA.minSupervisors}, Assigned: ${assignedSupervisors.length}`);
            }
        });

        // Step 3: Ensure all supervisors have at least three shifts
        this.ensureMinimumShifts(supervisorShiftCounts);

        // Step 4: Distribute extra shifts proportionally based on exam participants
        this.distributeExtraShifts(supervisorShiftCounts);
    }

    ensureMinimumShifts(supervisorShiftCounts) {
        this.supervisors.forEach(supervisor => {
            while (supervisorShiftCounts[supervisor.lastName] < 3) {
                const unassignedDays = this.examDays.filter(day =>
                    !this.hasShiftOnSameDay(supervisor, day.date) &&
                    this.isSupervisorAvailable(supervisor, day)
                );

                if (unassignedDays.length === 0) {
                    console.warn(`Warning: Unable to assign minimum shifts to ${supervisor.lastName}`);
                    break;
                }

                const day = unassignedDays[0]; // Assign to the first available day
                this.addAssignment(supervisor, day);
                supervisorShiftCounts[supervisor.lastName]++;
            }
        });
    }

    distributeExtraShifts(supervisorShiftCounts) {
        const totalParticipants = this.examDays.reduce((sum, day) => sum + day.participants, 0);

        this.examDays.forEach(day => {
            const availableSupervisors = this.getAvailableSupervisors(day.examCode).filter(
                supervisor => !this.hasShiftOnSameDay(supervisor, day.date)
            );

            const extraShifts = Math.max(0, day.shiftA.minSupervisors - (this.assignments[day.examCode]?.length || 0));
            const proportionalShifts = Math.ceil((day.participants / totalParticipants) * extraShifts);

            for (let i = 0; i < proportionalShifts && availableSupervisors.length > 0; i++) {
                const supervisor = this.selectSupervisorForShift(availableSupervisors, supervisorShiftCounts);
                if (!supervisor) break;

                this.addAssignment(supervisor, day);
                supervisorShiftCounts[supervisor.lastName]++;
                availableSupervisors.splice(availableSupervisors.indexOf(supervisor), 1);
            }
        });
    }

    selectSupervisorForShift(availableSupervisors, supervisorShiftCounts) {
        // Return null if no supervisors are available
        if (availableSupervisors.length === 0) return null;

        // Select the supervisor with the fewest shifts to balance assignments
        return availableSupervisors.reduce((selected, current) => {
            const selectedShiftCount = supervisorShiftCounts[selected.lastName];
            const currentShiftCount = supervisorShiftCounts[current.lastName];

            if (currentShiftCount < selectedShiftCount) {
                return current;
            } else if (currentShiftCount === selectedShiftCount) {
                // Prioritize supervisors with experience or Swedish language skills
                const selectedPriority = (selected.previousExperience ? 1 : 0) + 
                    (selected.languageSkill === "Äidinkieli" || selected.languageSkill === "Kiitettävä" ? 1 : 
                    selected.languageSkill === "Hyvä" ? 0.5 : 0);
                const currentPriority = (current.previousExperience ? 1 : 0) + 
                    (current.languageSkill === "Äidinkieli" || current.languageSkill === "Kiitettävä" ? 1 : 
                    current.languageSkill === "Hyvä" ? 0.5 : 0);
                return currentPriority > selectedPriority ? current : selected;
            }
            return selected;
        }, availableSupervisors[0]); // Use the first supervisor as the initial value
    }

    validateShiftAssignments(day) {
        const assignedSupervisors = Object.values(this.assignments).flat().filter(assignment => assignment.date === day.date && assignment.timeRange === day.shiftA.timeRange);
        if (assignedSupervisors.length < day.shiftA.minSupervisors) {
            console.error(`Error: Not enough supervisors assigned for shift on ${day.date} (${day.shiftA.timeRange}). Required: ${day.shiftA.minSupervisors}, Assigned: ${assignedSupervisors.length}`);
        }
        // Optional: Add similar validation for shift B if applicable
    }

    getAvailableSupervisors(examCode) {
        const day = this.getExamDayByCode(examCode);
        if (!day) return [];
        console.table(this.supervisors)
        return this.supervisors.filter(supervisor => this.isSupervisorAvailable(supervisor, day));
    }

    isSupervisorAvailable(supervisor, day) {
        return supervisor.availableDays.includes(day.date) &&
               !this.hasConflicts(supervisor, day.examCode) &&
               this.matchesShiftPreference(supervisor, day) &&
               !this.hasShiftOnSameDay(supervisor, day.date);
    }

    matchesShiftPreference(supervisor, day) {
        if (supervisor.shiftPreferences.length === 0) return true;
        const preferredShifts = supervisor.shiftPreferences.filter(pref => pref.startsWith(day.date));
        if (preferredShifts.length === 0) return true;
        const preferredShift = preferredShifts[0].split(' ')[1];
        return preferredShift === day.shiftA.timeRange;
    }

    hasConflicts(supervisor, examCode) {
        const day = this.getExamDayByCode(examCode);
        if (!day) return true;
        return supervisor.disqualifications?.includes(day.examCode) || false;
    }

    hasShiftOnSameDay(supervisor, date) {
        const assignments = this.assignments[supervisor.lastName]?.shifts || [];
        return assignments.some(assignment => assignment.date === date);
    }

    assignSupervisor(availableSupervisors, examCode) {
        const day = this.getExamDayByCode(examCode);
        if (!day) return null;

        // Poistetaan preferenssien huomioiminen
        return availableSupervisors[0];
    }

    addAssignment(supervisor, day) {
        if (!this.assignments[supervisor.lastName]) {
            this.assignments[supervisor.lastName] = {supervisor, shifts: []};
        }
        this.assignments[supervisor.lastName].shifts.push({
            date: day.date,
            timeRange: day.shiftA.timeRange,
            examCode: day.examCode
        });
    }

    getExamDayByCode(examCode) {
        return this.examDays.find(day => day.examCode === examCode);
    }

    getAssignments() {
        return this.assignments;
    }
}

export default ShiftAssigner;