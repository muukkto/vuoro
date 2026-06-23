class ShiftAssignerV3 {
    constructor(supervisors, exams) {
        this.supervisors = supervisors;
        this.exams = exams;
        this.assignments = {};
        this.supervisorShiftCounts = {}; // Cache supervisor shift counts
        this.supervisorsByDay = {}; // Precompute supervisors available by day
        this.experienceRatio = 0;
        this.languageSkillRatio = 0;
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

        const prioritizedSupervisorsLanguageBest = this.supervisors.filter(supervisor =>
            supervisor.languageSkill.toLowerCase() === "äidinkieli" || supervisor.languageSkill.toLowerCase() === "kiitettävä"
        );

        const prioritizedSupervisorsLanguageGood = this.supervisors.filter(supervisor =>
            supervisor.languageSkill.toLowerCase() === "hyvä"
        );

        const prioritizedSupervisorsPreviousExperience = this.supervisors.filter(supervisor => supervisor.previousExperience);

        const potentialShifts = this.exams.flatMap(exam => [
            { exam, shift: exam.shiftA, availableSupervisors: [] },
            exam.shiftB?.timeRange ? { exam, shift: exam.shiftB, availableSupervisors: [] } : null,
            exam.shiftC?.timeRange ? { exam, shift: exam.shiftC, availableSupervisors: [] } : null
        ].filter(shift => shift && shift.shift.minSupervisors > 0));

        const totalMinSupervisors = potentialShifts.reduce((total, shift) => total + shift.shift.minSupervisors, 0);
        console.log('Total minimum supervisors required:', totalMinSupervisors);

        const prioritizedSupervisorsCount = {
            language: prioritizedSupervisorsLanguageBest.length + prioritizedSupervisorsLanguageGood.length*0.4,
            experience: prioritizedSupervisorsPreviousExperience.length
        };

        console.log('Prioritized supervisors with language skill:', prioritizedSupervisorsCount.language);
        console.log('Prioritized supervisors with previous experience:', prioritizedSupervisorsCount.experience);

        this.experienceRatio = Math.min(1, prioritizedSupervisorsCount.experience / totalMinSupervisors);
        this.languageSkillRatio = Math.min(1, prioritizedSupervisorsCount.language / totalMinSupervisors);

        console.log('Experience ratio:', this.experienceRatio);
        console.log('Language skill ratio:', this.languageSkillRatio);

        potentialShifts.forEach(shift => {
            shift.availableSupervisors = this.getAvailableSupervisors(shift);
        });

        potentialShifts.forEach(shift => {
            const dayAvailable = this.supervisorsByDay[shift.exam.date]?.length || 0;
            console.log(`Exam date: ${shift.exam.date}, Shift time: ${shift.shift.timeRange}, Available supervisors for the day: ${dayAvailable}, Available supervisors for the shift: ${shift.availableSupervisors.length}`);
        });

        potentialShifts.sort((a, b) => {
            const aDayAvailable = this.supervisorsByDay[a.exam.date]?.length || 0;
            const bDayAvailable = this.supervisorsByDay[b.exam.date]?.length || 0;

            const aDayDifference = aDayAvailable - potentialShifts
                .filter(shift => shift.exam.date === a.exam.date)
                .reduce((total, shift) => total + shift.shift.minSupervisors, 0);

            const bDayDifference = bDayAvailable - potentialShifts
                .filter(shift => shift.exam.date === b.exam.date)
                .reduce((total, shift) => total + shift.shift.minSupervisors, 0);

            if (aDayDifference !== bDayDifference) {
                return aDayDifference - bDayDifference; // Prioritize by smallest difference for the day
            }

            const aShiftDifference = a.availableSupervisors.length - a.shift.minSupervisors;
            const bShiftDifference = b.availableSupervisors.length - b.shift.minSupervisors;

            return aShiftDifference - bShiftDifference; // Prioritize by smallest difference for the shift
        });

        console.log('Sorted potential shifts:');
        potentialShifts.forEach((shift, index) => {
            const dayAvailable = this.supervisorsByDay[shift.exam.date]?.length || 0;
            const dayDifference = dayAvailable - shift.shift.minSupervisors;
            const shiftDifference = shift.availableSupervisors.length - shift.shift.minSupervisors;
            console.log(
                `Order ${index + 1}: Exam date: ${shift.exam.date}, Shift time: ${shift.shift.timeRange}, ` +
                `Available supervisors for the day: ${dayAvailable}, Day difference: ${dayDifference}, ` +
                `Available supervisors for the shift: ${shift.availableSupervisors.length}, Shift difference: ${shiftDifference}`
            );
        });

        console.log('Potential shifts sorted by available supervisors:', potentialShifts);

potentialShifts.forEach(({ exam, shift, availableSupervisors }) => {
            console.log(`Available supervisors for ${exam.date} (${shift.timeRange}):`, availableSupervisors);

            const assignedSupervisorsList = [];
            while (assignedSupervisorsList.length < shift.minSupervisors && availableSupervisors.length > 0) {
                const experiencedSupervisors = assignedSupervisorsList.filter(s => s.previousExperience).length;
                const bestLanguageSupervisors = assignedSupervisorsList.filter(s => 
                    s.languageSkill.toLowerCase() === "äidinkieli" || s.languageSkill.toLowerCase() === "kiitettävä"
                ).length;
                const goodLanguageSupervisors = assignedSupervisorsList.filter(s => 
                    s.languageSkill.toLowerCase() === "hyvä"
                ).length;

                console.log('Exam code:', exam.examCode, 'Date:', exam.date, 'Time range:', shift.timeRange);

                const experienceRatio = Math.min(1, (experiencedSupervisors ) / (shift.minSupervisors));
                const languageRatio = Math.min(1, (bestLanguageSupervisors + goodLanguageSupervisors*0.5) / (shift.minSupervisors));

                const supervisor = this.selectSupervisorForShift(
                    availableSupervisors.filter(s => 
                        !this.hasShiftOnSameDay(s, exam.date) && this.supervisorShiftCounts[s.id] < 3 // Ensure no supervisor exceeds 3 shifts
                    ),
                    languageRatio,
                    experienceRatio
                );
                if (!supervisor) break;
                console.log(`Selected supervisor: ${supervisor.firstName} ${supervisor.lastName}`, 'with language skill:', supervisor.languageSkill, 'and previous experience:', supervisor.previousExperience);
                assignedSupervisorsList.push(supervisor);
                this.supervisorShiftCounts[supervisor.id]++;
                this.addAssignment(supervisor, exam, shift);
                availableSupervisors.splice(availableSupervisors.indexOf(supervisor), 1);
            }

            if (assignedSupervisorsList.length < shift.minSupervisors) {
                console.error(`Error: Not enough supervisors assigned for shift on ${exam.date} (${shift.timeRange}). Required: ${shift.minSupervisors}, Assigned: ${assignedSupervisorsList.length}`);
            }
        });

        // Assign additional shifts to supervisors with fewer than 3 shifts
        const supervisorsWithFewShifts = this.supervisors.filter(s => this.supervisorShiftCounts[s.id] < 3);

        console.log('Supervisors with fewer than 3 shifts:', supervisorsWithFewShifts);

        supervisorsWithFewShifts.forEach(supervisor => {
            const unfilledShifts = potentialShifts
                .filter(({ exam, shift, availableSupervisors }) =>
                    shift.minSupervisors > 0 &&
                    availableSupervisors.includes(supervisor) &&
                    !this.hasShiftOnSameDay(supervisor, exam.date) &&
                    this.supervisorShiftCounts[supervisor.id] < 3
                )
                .sort((a, b) => a.shift.minSupervisors - (a.shift.assignedSupervisors?.length || 0) - 
                                (b.shift.minSupervisors - (b.shift.assignedSupervisors?.length || 0)));

            unfilledShifts.forEach(({ exam, shift }) => {
                if (this.supervisorShiftCounts[supervisor.id] >= 3) return;
                this.addAssignment(supervisor, exam, shift);
                this.supervisorShiftCounts[supervisor.id]++;
            });
        });

        // Fill shifts with fewer than the minimum required supervisors
        potentialShifts.forEach(({ exam, shift, availableSupervisors }) => {
            const assignedSupervisorsList = shift.assignedSupervisors || [];
            
            // Käydään läpi kaikki mahdolliset valvojat ja lisätään, kunnes minimi saavutetaan
            for (let i = 0; i < availableSupervisors.length && assignedSupervisorsList.length < shift.minSupervisors; i++) {
                const supervisor = this.selectSupervisorForShift(
                    availableSupervisors.filter(s => 
                        !this.hasShiftOnSameDay(s, exam.date) // Allow supervisors to exceed 3 shifts
                    ),
                    0,
                    0
                );

                if (!supervisor) {
                    console.warn(`No suitable supervisor found for shift on ${exam.date} (${shift.timeRange}).`);
                    break;
                }

                console.log(`Adding supervisor: ${supervisor.firstName} ${supervisor.lastName} to fill gap in shift on ${exam.date} (${shift.timeRange})`);
                this.supervisorShiftCounts[supervisor.id] = (this.supervisorShiftCounts[supervisor.id] || 0) + 1;
                this.addAssignment(supervisor, exam, shift);
                availableSupervisors.splice(availableSupervisors.indexOf(supervisor), 1);

                console.log(`i: ${i}, Supervisor: ${supervisor.firstName} ${supervisor.lastName}, Assigned: ${assignedSupervisorsList.length}`);
            }

            if (assignedSupervisorsList.length < shift.minSupervisors) {
                console.error(`Critical Error: Unable to fill minimum supervisor requirement for shift on ${exam.date} (${shift.timeRange}).`);
            }
        });

        this.exams.forEach(exam => {
            this.assignSupervisorsToHalls(exam); // Ensure hall assignment is performed
        });
    }

    selectSupervisorForShift(availableSupervisors, languageRatio, experienceRatio) {
        if (availableSupervisors.length === 0) return null;

        return availableSupervisors.reduce((selected, current) => {
            const selectedShiftCount = this.supervisorShiftCounts[selected.id];
            const currentShiftCount = this.supervisorShiftCounts[current.id];

            // Prioritize supervisors with fewer than 3 shifts
            if (currentShiftCount < 3 && selectedShiftCount >= 3) {
                return current;
            } else if (selectedShiftCount < 3 && currentShiftCount >= 3) {
                return selected;
            }

            // If both have fewer than 3 shifts or both have 3 or more, compare priorities
            if (currentShiftCount < selectedShiftCount) {
                return current;
            } else if (currentShiftCount === selectedShiftCount) {
                return this.compareSupervisorPriority(selected, current, languageRatio, experienceRatio);
            }
            return selected;
        }, availableSupervisors[0]);
    }

    compareSupervisorPriority(selected, current, languageRatio, experienceRatio) {
        const languageWeight = 0.7;
        const experienceWeight = 0.7;

        const calculatePriority = (supervisor) => {
            const experienceScore = supervisor.previousExperience ? experienceWeight * (1 - experienceRatio / this.experienceRatio) : 0;
            const languageScore = supervisor.languageSkill.toLowerCase() === "äidinkieli" || supervisor.languageSkill.toLowerCase() === "kiitettävä"
                ? languageWeight * (1 - languageRatio / this.languageSkillRatio)
                : supervisor.languageSkill.toLowerCase() === "hyvä"
                ? (languageWeight * 0.4) * (1 - languageRatio / this.languageSkillRatio)
                : 0;
            return experienceScore + languageScore;
        };

        return calculatePriority(current) > calculatePriority(selected) ? current : selected;
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
            hall: null,
            information: null,
            break: null
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
                .filter(assignment => {
                    return assignment.shifts.some(s => s.date === day.date && s.timeRange === shift.timeRange);
                })

            if (assignedSupervisors.length === 0) return;

            const totalParticipants = day.totalParticipants;
            const unassignedSupervisors = [...assignedSupervisors];
            
            console.log(`Unassigned supervisors for ${day.date} (${shift.timeRange}):`, unassignedSupervisors);

            // Sort supervisors by language skill and experience
            unassignedSupervisors.sort((a, b) => {
                const aScore = (a.supervisor.languageSkill.toLowerCase() === "äidinkieli" || a.supervisor.languageSkill.toLowerCase() === "kiitettävä" ? 2 : 
                                a.supervisor.languageSkill.toLowerCase() === "hyvä" ? 1 : 0) +
                               (a.supervisor.previousExperience ? 2 : 0);
                const bScore = (b.supervisor.languageSkill.toLowerCase() === "äidinkieli" || b.supervisor.languageSkill.toLowerCase() === "kiitettävä" ? 2 : 
                                b.supervisor.languageSkill.toLowerCase() === "hyvä" ? 1 : 0) +
                               (b.supervisor.previousExperience ? 2 : 0);
                return bScore - aScore; // Higher score first
            });

            console.log(`Sort complete. Unassigned supervisors sorted by language skill and experience`);
            console.log(unassignedSupervisors);

            const hallSupervisorCounts = day.halls.map(hall => {
                if (hall.participants === 0) return 0;
                const hallProportion = hall.participants / totalParticipants;
                return Math.floor(hallProportion * assignedSupervisors.length);
            });
    
            console.log(`Calculated hall supervisor counts:`, hallSupervisorCounts);
    
            const hallSupervisorAssignments = new Map();

            // Initialize hallSupervisorAssignments with hall names and their current counts
            day.halls.filter(hall => hall.participants > 0).forEach(hall => {
                hallSupervisorAssignments.set(hall.name, 0);
            });

            const hallsToAssign = day.halls.filter(hall => hall.participants > 0).map(hall => hall.name);

            console.log(`Initialized hall supervisor assignments:`, hallSupervisorAssignments);
            console.log(`Halls to assign:`, hallsToAssign);

            let supervisorIndex = 0;

            // Assign supervisors to halls until all halls have enough supervisors or no supervisors are left
            while (hallsToAssign.length > 0 && supervisorIndex < unassignedSupervisors.length) {
                for (let i = 0; i < hallsToAssign.length; i++) {
                    const hallName = hallsToAssign[i];
                    const currentCount = hallSupervisorAssignments.get(hallName);
                    const hallIndex = day.halls.findIndex(hall => hall.name === hallName);

                    if (currentCount < hallSupervisorCounts[hallIndex]) {
                        const supervisor = unassignedSupervisors[supervisorIndex];
                        supervisorIndex++;

                        hallSupervisorAssignments.set(hallName, currentCount + 1);
                        const shiftProcessing = supervisor.shifts.find(s => s.date === day.date && s.timeRange === shift.timeRange);
                        shiftProcessing.hall = hallName;

                        if (currentCount + 1 >= hallSupervisorCounts[hallIndex]) {
                            hallsToAssign.splice(i, 1); // Remove hall from assignment list if it has enough supervisors
                            i--; // Adjust index after removal
                        }

                        if (supervisorIndex >= unassignedSupervisors.length) break; // Stop if no more supervisors are available
                    }
                }
            }

            // Distribute remaining supervisors evenly among halls
            while (supervisorIndex < unassignedSupervisors.length) {
                for (let i = 0; i < day.halls.length && supervisorIndex < unassignedSupervisors.length; i++) {
                    const hall = day.halls[i];
                    if (hall.participants > 0) {
                        const supervisor = unassignedSupervisors[supervisorIndex];
                        supervisorIndex++;

                        const shiftProcessing = supervisor.shifts.find(s => s.date === day.date && s.timeRange === shift.timeRange);
                        shiftProcessing.hall = hall.name;
                    }
                }
            }
            
        };

        assignToHalls(day.shiftA);
        if (day.shiftB) assignToHalls(day.shiftB);
        if (day.shiftC) assignToHalls(day.shiftC);
    }

    getAssignments() {
        return this.assignments;
    }
}

export default ShiftAssignerV3;