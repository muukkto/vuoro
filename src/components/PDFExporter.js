import jsPDF from "jspdf";

export default class PDFExporter {
    constructor(assignments, examDays) {
        this.assignments = assignments;
        this.examDays = examDays;
    }

    exportByExams(filteredExamDays = this.examDays) {
        const doc = new jsPDF();
        let yOffset = 10;

        const addTextWithPageBreak = (text, x, y) => {
            if (y > 270) {
                doc.addPage();
                y = 10;
            }
            doc.text(text, x, y);
            return y + 10;
        };

        filteredExamDays.forEach((examDay) => {
            doc.setFontSize(20);
            doc.setFont("helvetica", "bold");
            yOffset = addTextWithPageBreak(`Exam: ${examDay.examName} (${examDay.examCode})`, 10, yOffset);
            doc.setFontSize(14);
            doc.setFont("helvetica", "normal"); // Reset font to normal after bold text
            yOffset = addTextWithPageBreak(`Date: ${examDay.date}, Time: ${examDay.timeRange}`, 10, yOffset);

            doc.setFontSize(12);
            const supervisors = Object.values(this.assignments).filter(({ shifts }) =>
                shifts.some(shift => shift.date === examDay.date && shift.examCode === examDay.examCode)
            );

            if (supervisors.length === 0) {
                yOffset = addTextWithPageBreak("No supervisors assigned.", 10, yOffset);
            } else {
                supervisors.forEach(({ supervisor, shifts }) => {
                    const relevantShifts = shifts.filter(shift => shift.date === examDay.date && shift.examCode === examDay.examCode);
                    relevantShifts.forEach(shift => {
                        yOffset = addTextWithPageBreak(
                            `${supervisor.firstName} ${supervisor.lastName}: ${shift.timeRange} (${shift.hall || "N/A"})`,
                            10,
                            yOffset
                        );
                    });
                });
            }
            doc.addPage();
            yOffset = 10;
        });

        doc.save("supervisors_by_exams.pdf");
    }
}
