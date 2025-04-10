export function assignShifts(supervisors, examDays) {
    const assignments = {};

    supervisors.forEach(supervisor => {
        assignments[supervisor.id] = [];
    });

    examDays.forEach(day => {
        const availableSupervisors = supervisors.filter(supervisor => supervisor.availableDays.includes(day.date));
        const assignedSupervisor = selectSupervisor(availableSupervisors);
        
        if (assignedSupervisor) {
            assignments[assignedSupervisor.id].push(day.date);
        }
    });

    return assignments;
}

function selectSupervisor(availableSupervisors) {
    if (availableSupervisors.length === 0) return null;

    // Implement logic to select a supervisor based on preferences or other criteria
    return availableSupervisors[0]; // Placeholder: select the first available supervisor
}

export function validateAssignments(assignments, supervisors) {
    const errors = [];

    supervisors.forEach(supervisor => {
        const assignedDays = assignments[supervisor.id] || [];
        if (assignedDays.length > supervisor.maxShifts) {
            errors.push(`Supervisor ${supervisor.name} assigned too many shifts.`);
        }
    });

    return errors;
}