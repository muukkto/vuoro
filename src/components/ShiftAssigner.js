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
            acc[supervisor.id] = 0; // Use unique id instead of lastName
            return acc;
        }, {});

        // Step 1: Determine potential shifts for all supervisors
        let potentialShifts = this.examDays.flatMap(day => [
            { day, shift: day.shiftA, availableSupervisors: this.getAvailableSupervisors(day.examCode) },
            day.shiftB ? { day, shift: day.shiftB, availableSupervisors: this.getAvailableSupervisors(day.examCode) } : null
        ].filter(Boolean));

        // Sort shifts by the number of potential supervisors (ascending)
        potentialShifts.sort((a, b) => a.availableSupervisors.length - b.availableSupervisors.length);

        // Step 2: Assign shifts based on sorted potential shifts
        potentialShifts.forEach(({ day, shift, availableSupervisors }) => {
            console.log(`Available supervisors for ${day.date} (${shift.timeRange}):`, availableSupervisors);

            const assignedSupervisors = [];
            while (assignedSupervisors.length < shift.minSupervisors && availableSupervisors.length > 0) {
                const supervisor = this.selectSupervisorForShift(
                    availableSupervisors.filter(s => !this.hasShiftOnSameDay(s, day.date)), // Ensure no duplicate shifts on the same day
                    supervisorShiftCounts
                );
                if (!supervisor) break; // No valid supervisor available
                assignedSupervisors.push(supervisor);
                supervisorShiftCounts[supervisor.id]++; // Use id instead of lastName
                this.addAssignment(supervisor, day, shift);
                availableSupervisors.splice(availableSupervisors.indexOf(supervisor), 1);
            }

            if (assignedSupervisors.length < shift.minSupervisors) {
                console.error(`Error: Not enough supervisors assigned for shift on ${day.date} (${shift.timeRange}). Required: ${shift.minSupervisors}, Assigned: ${assignedSupervisors.length}`);
            }
        });

        // Step 3: Ensure all supervisors have at least three shifts
        this.ensureMinimumShifts(supervisorShiftCounts);

        // Step 4: Distribute extra shifts proportionally based on exam participants
        this.distributeExtraShifts(supervisorShiftCounts);

        // Step 5: Validate all shift assignments
        this.examDays.forEach(day => {
            this.validateShiftAssignments(day);
        });

        // Step 6: Assign supervisors to halls within each shift
        this.examDays.forEach(day => {
            this.assignSupervisorsToHalls(day);
        });
    }

    ensureMinimumShifts(supervisorShiftCounts) {
        this.supervisors.forEach(supervisor => {
            while (supervisorShiftCounts[supervisor.id] < 3) { // Use id instead of lastName
                const unassignedDays = this.examDays.filter(day =>
                    !this.hasShiftOnSameDay(supervisor, day.date) &&
                    this.isSupervisorAvailable(supervisor, day)
                );

                if (unassignedDays.length === 0) {
                    console.warn(`Warning: Unable to assign minimum shifts to ${supervisor.id}`);
                    break;
                }

                const day = unassignedDays[0]; // Assign to the first available day
                this.addAssignment(supervisor, day, day.shiftA); // Default to shiftA
                supervisorShiftCounts[supervisor.id]++; // Use id instead of lastName
            }
        });
    }

    distributeExtraShifts(supervisorShiftCounts) {
        const totalParticipants = this.examDays.reduce((sum, day) => sum + day.participants, 0);

        this.examDays.forEach(day => {
            const shifts = [day.shiftA, day.shiftB].filter(Boolean);

            shifts.forEach(shift => {
                const availableSupervisors = this.getAvailableSupervisors(day.examCode).filter(
                    supervisor => !this.hasShiftOnSameDay(supervisor, day.date)
                );

                const extraShifts = Math.max(0, shift.minSupervisors - (this.assignments[day.examCode]?.length || 0));
                const proportionalShifts = Math.ceil((day.participants / totalParticipants) * extraShifts);

                for (let i = 0; i < proportionalShifts && availableSupervisors.length > 0; i++) {
                    const supervisor = this.selectSupervisorForShift(availableSupervisors, supervisorShiftCounts);
                    if (!supervisor) break;

                    this.addAssignment(supervisor, day, shift);
                    supervisorShiftCounts[supervisor.id]++; // Use id instead of lastName
                    availableSupervisors.splice(availableSupervisors.indexOf(supervisor), 1);
                }
            });
        });
    }

    selectSupervisorForShift(availableSupervisors, supervisorShiftCounts) {
        // Return null if no supervisors are available
        if (availableSupervisors.length === 0) return null;

        // Select the supervisor with the fewest shifts to balance assignments
        return availableSupervisors.reduce((selected, current) => {
            const selectedShiftCount = supervisorShiftCounts[selected.id]; // Use id instead of lastName
            const currentShiftCount = supervisorShiftCounts[current.id]; // Use id instead of lastName

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
        const validateShift = (shift) => {
            const assignedSupervisors = Object.values(this.assignments).flat().filter(assignment => assignment.date === day.date && assignment.timeRange === shift.timeRange);
            if (assignedSupervisors.length < shift.minSupervisors) {
                console.error(`Validation Error: Shift on ${day.date} (${shift.timeRange}) does not have enough supervisors. Required: ${shift.minSupervisors}, Assigned: ${assignedSupervisors.length}`);
            }
        };

        validateShift(day.shiftA);
        if (day.shiftB) validateShift(day.shiftB);
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
        return preferredShift === day.shiftA.timeRange || (day.shiftB && preferredShift === day.shiftB.timeRange);
    }

    hasConflicts(supervisor, examCode) {
        const day = this.getExamDayByCode(examCode);
        if (!day) return true;
        return supervisor.disqualifications?.includes(day.examCode) || false;
    }

    hasShiftOnSameDay(supervisor, date) {
        const assignments = this.assignments[supervisor.id]?.shifts || []; // Use id instead of lastName
        return assignments.some(assignment => assignment.date === date);
    }

    assignSupervisor(availableSupervisors, examCode) {
        const day = this.getExamDayByCode(examCode);
        if (!day) return null;

        // Poistetaan preferenssien huomioiminen
        return availableSupervisors[0];
    }

    addAssignment(supervisor, day, shift) {
        console.log(supervisor)
        if (!this.assignments[supervisor.id]) { // Use id instead of lastName
            this.assignments[supervisor.id] = { supervisor, shifts: [] }; // Use id instead of lastName
        }
        this.assignments[supervisor.id].shifts.push({
            date: day.date,
            timeRange: shift.timeRange,
            examCode: day.examCode,
            hall: null // Initialize hall as null, to be assigned later
        });
    }

    assignSupervisorsToHalls(day) {
        const assignToHalls = (shift) => {
            const assignedSupervisors = Object.values(this.assignments)
                .flatMap(assignment => assignment.shifts)
                .filter(assignment => assignment.date === day.date && assignment.timeRange === shift.timeRange);

            if (assignedSupervisors.length === 0) return;

            const totalParticipants = day.totalParticipants;

            day.halls.forEach(hall => {
                if (hall.participants === 0) return; // Skip halls with 0 participants

                const hallProportion = hall.participants / totalParticipants;
                const hallSupervisorsCount = Math.round(hallProportion * assignedSupervisors.length);

                for (let i = 0; i < hallSupervisorsCount && assignedSupervisors.length > 0; i++) {
                    const supervisor = assignedSupervisors.shift();
                    supervisor.hall = hall.name; // Assign hall name to supervisor's shift
                }
            });

            // Assign remaining supervisors to halls if any are left unassigned
            assignedSupervisors.forEach((supervisor, index) => {
                const nonEmptyHalls = day.halls.filter(hall => hall.participants > 0);
                const hall = nonEmptyHalls[index % nonEmptyHalls.length];
                supervisor.hall = hall.name;
            });
        };

        assignToHalls(day.shiftA);
        if (day.shiftB) assignToHalls(day.shiftB);
    }

    getExamDayByCode(examCode) {
        return this.examDays.find(day => day.examCode === examCode);
    }

    getAssignments() {
        return this.assignments;
    }
}

export default ShiftAssigner;