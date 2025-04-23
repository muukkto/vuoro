import Solver from 'javascript-lp-solver';

class ShiftAssignerWithLPSolver {
    constructor(supervisors, examDays) {
        this.supervisors = supervisors;
        this.examDays = examDays;
        this.assignments = {};
    }

    assignShifts() {
        console.log('Starting shift assignment with LP solver...');
        console.log('Supervisors:', this.supervisors);
        console.log('Exam Days:', this.examDays);
        const model = this.buildLPModel();
        console.log('LP Model:', model);
        const results = Solver.Solve(model); // Use Solver.Solve directly

        if (results.feasible) {
            console.log('LP solution found:', results);
            this.processLPSolution(results);
        } else {
            console.error('No feasible solution found for shift assignment.');
        }
    }

    buildLPModel() {
        const model = {
            optimize: 'totalShifts',
            opType: 'min',
            constraints: {},
            variables: {}
        };

        this.examDays.forEach(day => {
            ['shiftA', 'shiftB'].forEach(shiftKey => {
                const shift = day[shiftKey];
                if (shift && shift.timeRange) {
                    const shiftId = `${day.date}_${shift.timeRange}`;
                    model.constraints[shiftId] = { min: shift.minSupervisors };
                    console.log(`Adding constraint for shift ${shiftId}: min ${shift.minSupervisors}`);

                    this.supervisors.forEach(supervisor => {
                        const varName = `${supervisor.id}_${shiftId}`;
                        model.variables[varName][shiftId] = 1;
                        model.variables[varName][`supervisor_${supervisor.id}`] = 1;
                    });
                }
            });
        });

        this.supervisors.forEach(supervisor => {
            const supervisorVarNames = Object.keys(model.variables).filter(varName => varName.startsWith(`${supervisor.id}_`));
            model.constraints[`supervisor_${supervisor.id}`] = { min: 3 };
            /*supervisorVarNames.forEach(varName => {
                model.constraints[`minShifts_${supervisor.id}`][varName] = 1;
            });*/
        });

        return model;
    }

    processLPSolution(results) {
        Object.entries(results).forEach(([varName, value]) => {
            console.log(`Variable: ${varName}, Value: ${value}`);
            if (value === 1) {
                const [supervisorId, shiftId] = varName.split('_');
                const [date, timeRange] = shiftId.split('_');
                const supervisor = this.supervisors.find(s => s.id === parseInt(supervisorId, 10));
                const day = this.examDays.find(d => d.date === date);
                const shift = day.shiftA.timeRange === timeRange ? day.shiftA : day.shiftB;

                this.addAssignment(supervisor, day, shift);
            }
        });
    }

    isSupervisorAvailable(supervisor, day, shift) {
        return supervisor.availableDays.includes(day.date) &&
               !this.hasConflicts(supervisor, day.examCode) &&
               !this.hasShiftOnSameDay(supervisor, day.date);
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
    }

    getAssignments() {
        return this.assignments;
    }
}

export default ShiftAssignerWithLPSolver;
