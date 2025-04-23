import ShiftAssignerV3 from '../components/ShiftAssigner_v3';

/*beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Ohittaa kaikki console.log-kutsut
});*/

/*afterAll(() => {
    console.log.mockRestore(); // Palauttaa alkuperäisen console.log-toiminnallisuuden
});*/

describe('ShiftAssignerV3 - getAvailableSupervisors', () => {
    const supervisors = [        { id: 1, lastName: 'Virtanen', availableDays: ['01.05.2025', '02.05.2025'], disqualifications: ['A'], shiftPreferences: [] },
        { id: 2, lastName: 'Korhonen', availableDays: ['02.05.2025', '03.05.2025'], disqualifications: [], shiftPreferences: [] },
        { id: 3, lastName: 'Laine', availableDays: ['02.05.2025'], disqualifications: ['B'], shiftPreferences: [] },
        { id: 4, lastName: 'Nieminen', availableDays: ['01.05.2025', '02.05.2025', '03.05.2025'], disqualifications: [], shiftPreferences: ["02.05.2025 13:30-17:30"] },
        { id: 5, lastName: 'Mäkinen', availableDays: ['03.05.2025'], disqualifications: ['C'], shiftPreferences: [] },
        { id: 6, lastName: 'Hämäläinen', availableDays: ['01.05.2025'], disqualifications: [], shiftPreferences: [] },
        { id: 7, lastName: 'Seppälä', availableDays: ['02.05.2025', '03.05.2025'], disqualifications: ['D'], shiftPreferences: [] },
        { id: 8, lastName: 'Heikkinen', availableDays: ['01.05.2025', '02.05.2025'], disqualifications: [], shiftPreferences: [] },
        { id: 9, lastName: 'Koskinen', availableDays: ['03.05.2025'], disqualifications: ['E'], shiftPreferences: [] },
        { id: 10, lastName: 'Järvinen', availableDays: ['01.05.2025', '02.05.2025', '03.05.2025'], disqualifications: [], shiftPreferences: [] },
        { id: 11, lastName: 'Ahonen', availableDays: ['01.05.2025', '02.05.2025'], disqualifications: [], shiftPreferences: ['01.05.2025 08:30-12:30'] },
        { id: 12, lastName: 'Lehtinen', availableDays: ['02.05.2025', '03.05.2025'], disqualifications: [], shiftPreferences: ['02.05.2025 13:30-17:30', '03.05.2025 10:30-14:30'] },
        { id: 13, lastName: 'Salminen', availableDays: ['01.05.2025', '03.05.2025'], disqualifications: [], shiftPreferences: ['01.05.2025 08:30-12:30', '03.05.2025 10:30-14:30'] },
        { id: 14, lastName: 'Rantanen', availableDays: ['02.05.2025'], disqualifications: [], shiftPreferences: ['02.05.2025 09:30-13:30'] },
        { id: 15, lastName: 'Hakala', availableDays: ['01.05.2025', '02.05.2025', '03.05.2025'], disqualifications: [], shiftPreferences: ['01.05.2025 12:30-15:30', '02.05.2025 13:30-17:30'] },
    ];

    const examDays = {
        A: {
            exam: { 
                date: '01.05.2025', 
                examCode: 'A', 
                timeRange: '09:00-12:00'
            }, 
            shift: { timeRange: '08:30-12:30', minSupervisors: 5 } 
        },
        B:{ 
            exam: {
                date: '01.05.2025', 
                examCode: 'B', 
                timeRange: '13:00-15:00'
            },  
            shift: { timeRange: '12:30-15:30', minSupervisors: 5 } 
        },
        C:{ 
            exam: {
                date: '02.05.2025',
                examCode: 'C',
                timeRange: '14:00-17:00'
            },
            shift: { timeRange: '13:30-17:30', minSupervisors: 4 } 
        },
        D: { 
            exam: {
                date: '02.05.2025', 
                examCode: 'D', 
                timeRange: '10:00-13:00', 
            },
            shift: { timeRange: '09:30-13:30', minSupervisors: 4 } 
        },
        E:{ 
            exam: {
                date: '03.05.2025',
                examCode: 'E',
                timeRange: '11:00-14:00'
            },
            shift: { timeRange: '10:30-14:30', minSupervisors: 3 } 
        }
    };

    test('should not return supervisors who are disqualified for the exam', () => {
        const shiftAssigner = new ShiftAssignerV3(supervisors, examDays);
        const availableSupervisors = shiftAssigner.getAvailableSupervisors(examDays.A);

        expect(availableSupervisors).not.toContainEqual(expect.objectContaining({ lastName: 'Virtanen' })); // Virtanen is disqualified for exam A
    });

    test('should not return supervisors who are unavailable on the given day', () => {
        const shiftAssigner = new ShiftAssignerV3(supervisors, examDays);
        const availableSupervisors = shiftAssigner.getAvailableSupervisors(examDays.A);

        expect(availableSupervisors).not.toContainEqual(expect.objectContaining({ lastName: 'Korhonen' })); // Korhonen marked 01.05.2025 as unavailable
    });

    test('should not return supervisors who are not available on the given day', () => {
        const shiftAssigner = new ShiftAssignerV3(supervisors, examDays);
        const availableSupervisors = shiftAssigner.getAvailableSupervisors(examDays.A);

        expect(availableSupervisors).not.toContainEqual(expect.objectContaining({ lastName: 'Laine' })); // Laine is not available on 01.05.2025
    });

    test('should return supervisors who are available and not disqualified', () => {
        const shiftAssigner = new ShiftAssignerV3(supervisors, examDays);
        const availableSupervisors = shiftAssigner.getAvailableSupervisors(examDays.A);

        expect(availableSupervisors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ lastName: 'Nieminen' }),
                expect.objectContaining({ lastName: 'Heikkinen' }),
                expect.objectContaining({ lastName: 'Järvinen' }),
            ])
        ); // Valid supervisors for 01.05.2025 and exam A
    });

    test('should handle multiple days and exams correctly', () => {
        const shiftAssigner = new ShiftAssignerV3(supervisors, examDays);

        const availableForDay1ExamB = shiftAssigner.getAvailableSupervisors(examDays.B);
        expect(availableForDay1ExamB).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ lastName: 'Nieminen' }),
                expect.objectContaining({ lastName: 'Heikkinen' }),
                expect.objectContaining({ lastName: 'Järvinen' }),
            ])
        );

        const availableForDay2ExamC = shiftAssigner.getAvailableSupervisors(examDays.C);
        expect(availableForDay2ExamC).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ lastName: 'Nieminen' }),
                expect.objectContaining({ lastName: 'Heikkinen' }),
                expect.objectContaining({ lastName: 'Järvinen' }),
            ])
        );

        const availableForDay3ExamE = shiftAssigner.getAvailableSupervisors(examDays.E);
        expect(availableForDay3ExamE).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ lastName: 'Järvinen' }),
            ])
        );
    });

    test('should return all suitable supervisors for a given exam day', () => {
        const shiftAssigner = new ShiftAssignerV3(supervisors, examDays);
        const availableSupervisors = shiftAssigner.getAvailableSupervisors(examDays.C);

        expect(availableSupervisors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ lastName: 'Korhonen' }),
                expect.objectContaining({ lastName: 'Laine' }),
                expect.objectContaining({ lastName: 'Nieminen' }),
                expect.objectContaining({ lastName: 'Heikkinen' }),
                expect.objectContaining({ lastName: 'Järvinen' }),
            ])
        );
    });

    test('should exclude a supervisor disqualified for one exam but include them for another on the same day', () => {
        const shiftAssigner = new ShiftAssignerV3(supervisors, examDays);

        const availableForExamA = shiftAssigner.getAvailableSupervisors(examDays.A);
        expect(availableForExamA).not.toContainEqual(expect.objectContaining({ lastName: 'Virtanen' })); // Virtanen is disqualified for exam A

        const availableForExamB = shiftAssigner.getAvailableSupervisors(examDays.B);
        expect(availableForExamB).toContainEqual(expect.objectContaining({ lastName: 'Virtanen' })); // Virtanen is not disqualified for exam B
    });

    test('should exclude a supervisor disqualified for one exam and not availabel on the other)', () => {
        const shiftAssigner = new ShiftAssignerV3(supervisors, examDays);

        const availableForExamC = shiftAssigner.getAvailableSupervisors(examDays.C);
        expect(availableForExamC).not.toContainEqual(expect.objectContaining({ lastName: 'Mäkinen' })); // Mäkinen is disqualified for exam C

        const availableForExamD = shiftAssigner.getAvailableSupervisors(examDays.D);
        expect(availableForExamD).not.toContainEqual(expect.objectContaining({ lastName: 'Mäkinen' })); // Mäkinen is not disqualified for exam D, but not available on 02.05.2025
    });

    test('should exclude a supervisor disqualified for one exam but include them for another on the same day (another)', () => {
        const shiftAssigner = new ShiftAssignerV3(supervisors, examDays);

        const availableForExamC = shiftAssigner.getAvailableSupervisors(examDays.D);
        expect(availableForExamC).not.toContainEqual(expect.objectContaining({ lastName: 'Seppälä' })); // Seppälä is disqualified for exam D

        const availableForExamD = shiftAssigner.getAvailableSupervisors(examDays.C);
        expect(availableForExamD).toContainEqual(expect.objectContaining({ lastName: 'Seppälä' })); // Seppälä is not disqualified for exam C
    });

    test('should only allow supervisors with one preference to participate in their preferred shift', () => {
        const shiftAssigner = new ShiftAssignerV3(supervisors, examDays);

        const availableForExamA = shiftAssigner.getAvailableSupervisors(examDays.A);
        const availableForExamB = shiftAssigner.getAvailableSupervisors(examDays.B);
        expect(availableForExamA).toContainEqual(expect.objectContaining({ lastName: 'Ahonen' })); // Ahonen prefers this shift
        expect(availableForExamB).not.toContainEqual(expect.objectContaining({ lastName: 'Ahonen' })); // Ahonen cannot participate in other shifts
    });

    test('should only allow supervisors with multiple preferences to participate in their preferred shifts', () => {
        const shiftAssigner = new ShiftAssignerV3(supervisors, examDays);

        const availableForExamB = shiftAssigner.getAvailableSupervisors(examDays.B);
        const availableForExamA = shiftAssigner.getAvailableSupervisors(examDays.A);
        expect(availableForExamB).toContainEqual(expect.objectContaining({ lastName: 'Hakala' })); // Hakala prefers this shift
        expect(availableForExamA).not.toContainEqual(expect.objectContaining({ lastName: 'Hakala' })); // Hakala cannot participate in other shifts

        const availableForExamC = shiftAssigner.getAvailableSupervisors(examDays.C);
        const availableForExamD = shiftAssigner.getAvailableSupervisors(examDays.D);
        expect(availableForExamC).toContainEqual(expect.objectContaining({ lastName: 'Hakala' })); // Hakala prefers this shift
        expect(availableForExamD).not.toContainEqual(expect.objectContaining({ lastName: 'Hakala' })); // Hakala cannot participate in other shifts
    });

    test('shift preference should not affect availability on other days', () => {
        const shiftAssigner = new ShiftAssignerV3(supervisors, examDays);

        const availableForExamC = shiftAssigner.getAvailableSupervisors(examDays.C);
        expect(availableForExamC).toContainEqual(expect.objectContaining({ lastName: 'Ahonen' })); // Ahonen is available on this day

        const availableForExamE = shiftAssigner.getAvailableSupervisors(examDays.E);
        expect(availableForExamE).toContainEqual(expect.objectContaining({ lastName: 'Hakala' })); // Hakala is available on this day
    });
});
