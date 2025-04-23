class ShiftAssignerV3 {
    constructor(supervisors, exams) {
        this.supervisors = supervisors;
        this.exams = exams;
        this.assignments = {};
        this.supervisorShiftCounts = {}; // Cache supervisor shift counts
        this.supervisorsByDay = {}; // Precompute supervisors available by day
        this.precomputeSupervisorData();
    }

    precomputeSupervisorData() {
        this.supervisors.forEach(supervisor => {
            this.supervisorShiftCounts[supervisor.id] = 0;
            supervisor.availableDays.forEach(day => {
                if (!this.supervisorsByDay[day]) {
                    this.supervisorsByDay[day] = [];
                }
                this.supervisorsByDay[day].push(supervisor);
            });
        });
    }

    assignShifts() {
        console.log('Starting shift assignment...');
        console.log('Supervisors:', this.supervisors);
        console.log('Exams:', this.exams);

        const potentialShifts = this.exams.flatMap(exam => [
            { exam, shift: exam.shiftA, availableSupervisors: [] },
            exam.shiftB?.timeRange ? { exam, shift: exam.shiftB, availableSupervisors: [] } : null
        ].filter(Boolean));

        potentialShifts.forEach(shift => {
            shift.availableSupervisors = this.getAvailableSupervisors(shift);
        });

        potentialShifts.sort((a, b) => 
            (a.availableSupervisors.length - a.shift.minSupervisors) - 
            (b.availableSupervisors.length - b.shift.minSupervisors)
        );

        potentialShifts.forEach(({ exam, shift, availableSupervisors }) => {
            console.log(`Available supervisors for ${exam.date} (${shift.timeRange}):`, availableSupervisors);

            const assignedSupervisors = [];
            while (assignedSupervisors.length < shift.minSupervisors && availableSupervisors.length > 0) {
                const supervisor = this.selectSupervisorForShift(
                    availableSupervisors.filter(s => !this.hasShiftOnSameDay(s, exam.date))
                );
                if (!supervisor) break;
                assignedSupervisors.push(supervisor);
                this.supervisorShiftCounts[supervisor.id]++;
                this.addAssignment(supervisor, exam, shift);
                availableSupervisors.splice(availableSupervisors.indexOf(supervisor), 1);
            }

            if (assignedSupervisors.length < shift.minSupervisors) {
                console.error(`Error: Not enough supervisors assigned for shift on ${exam.date} (${shift.timeRange}). Required: ${shift.minSupervisors}, Assigned: ${assignedSupervisors.length}`);
            }
        });

        // Assign additional shifts to supervisors with fewer than 3 shifts
        const supervisorsWithFewShifts = this.supervisors.filter(s => this.supervisorShiftCounts[s.id] < 3);

        console.log('Supervisors with fewer than 3 shifts:', supervisorsWithFewShifts);

        supervisorsWithFewShifts.forEach(supervisor => {
            const unfilledShifts = potentialShifts
                .filter(({ exam, shift, availableSupervisors }) =>
                    shift.minSupervisors > 0 && // Skip shifts with minSupervisors = 0
                    availableSupervisors.includes(supervisor) &&
                    !this.hasShiftOnSameDay(supervisor, exam.date) &&
                    this.supervisorShiftCounts[supervisor.id] < 3
                )
                .map(({ exam, shift }) => ({
                    exam,
                    shift,
                    extraSupervisors: (shift.assignedSupervisors?.length || 0) - shift.minSupervisors,
                    score: ((shift.assignedSupervisors?.length || 0) - shift.minSupervisors) / shift.minSupervisors
                }))
                .sort((a, b) => a.score - b.score || b.exam.maxParticipants - a.exam.maxParticipants);

            console.log(`Unfilled shifts for ${supervisor.firstName} ${supervisor.lastName}:`, JSON.parse(JSON.stringify(unfilledShifts)));

            unfilledShifts.forEach(({ exam, shift }) => {
                if (this.supervisorShiftCounts[supervisor.id] >= 3) return;
                this.addAssignment(supervisor, exam, shift);
                this.supervisorShiftCounts[supervisor.id]++;
            });
        });

        this.exams.forEach(exam => {
            this.assignSupervisorsToHalls(exam); // Ensure hall assignment is performed
        });
    }

    selectSupervisorForShift(availableSupervisors) {
        if (availableSupervisors.length === 0) return null;

        return availableSupervisors.reduce((selected, current) => {
            const selectedShiftCount = this.supervisorShiftCounts[selected.id];
            const currentShiftCount = this.supervisorShiftCounts[current.id];

            if (currentShiftCount < selectedShiftCount) {
                return current;
            } else if (currentShiftCount === selectedShiftCount) {
                return this.compareSupervisorPriority(selected, current);
            }
            return selected;
        }, availableSupervisors[0]);
    }

    compareSupervisorPriority(selected, current) {
        const selectedPriority = (selected.previousExperience ? 1 : 0) +
            (selected.languageSkill === "Äidinkieli" || selected.languageSkill === "Kiitettävä" ? 1 :
            selected.languageSkill === "Hyvä" ? 0.5 : 0);
        const currentPriority = (current.previousExperience ? 1 : 0) +
            (current.languageSkill === "Äidinkieli" || current.languageSkill === "Kiitettävä" ? 1 :
            current.languageSkill === "Hyvä" ? 0.5 : 0);
        return currentPriority > selectedPriority ? current : selected;
    }

    getAvailableSupervisors(shift) {
        const { date, examCode } = shift.exam;
        const { timeRange } = shift.shift;

        return (this.supervisorsByDay[date] || []).filter(supervisor =>
            this.isSupervisorAvailable(supervisor, date, timeRange, examCode)
        );
    }

    isSupervisorAvailable(supervisor, date, shift, examCode) {
        return !this.hasConflicts(supervisor, examCode) &&
               !this.hasShiftOnSameDay(supervisor, date) &&
               this.matchesShiftPreference(supervisor, date, shift);
    }

    matchesShiftPreference(supervisor, date, shift) {
        if (supervisor.shiftPreferences.length === 0) return true;
        const preferredShifts = supervisor.shiftPreferences.filter(pref => pref.startsWith(date));
        if (preferredShifts.length === 0) return true;
        const preferredShift = preferredShifts[0].split(' ')[1];
        return preferredShift === shift;
    }

    hasConflicts(supervisor, examCode) {
        return supervisor.disqualifications?.includes(examCode) || false;
    }

    hasShiftOnSameDay(supervisor, date) {
        const assignments = this.assignments[supervisor.id]?.shifts || [];
        return assignments.some(assignment => assignment.date === date);
    }

    addAssignment(supervisor, day, shift) {
        if (!this.assignments[supervisor.id]) {
            this.assignments[supervisor.id] = { supervisor, shifts: [] };
        }
        this.assignments[supervisor.id].shifts.push({
            date: day.date,
            timeRange: shift.timeRange,
            examCode: day.examCode,
            hall: null
        });

        // Add supervisor to the shift's assignedSupervisors list
        if (!shift.assignedSupervisors) {
            shift.assignedSupervisors = [];
        }
        shift.assignedSupervisors.push(supervisor);
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

    getAssignments() {
        return this.assignments;
    }
}

export default ShiftAssignerV3;