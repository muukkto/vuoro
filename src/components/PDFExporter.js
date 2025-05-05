export default class PDFExporter {
    constructor(assignments, examDays) {
        this.assignments = assignments;
        this.examDays = examDays;
    }

    exportByExams(filteredExamDays = this.examDays, selectedHall = null) {
        const doc = new window.jspdf.jsPDF();

        if (selectedHall === "all_by_halls") {
            filteredExamDays.forEach((examDay) => {
                const halls = new Set();
                Object.values(this.assignments).forEach(({ shifts }) => {
                    shifts.forEach(shift => {
                        if (shift.examCode === examDay.examCode && shift.date === examDay.date && shift.hall) {
                            halls.add(shift.hall);
                        }
                    });
                });

                halls.forEach(hall => {
                    if (doc.internal.getNumberOfPages() > 1 || doc.internal.pages.length > 1) {
                        doc.addPage();
                    }
                    this._generateExamPage(doc, examDay, hall);
                });
            });
        } else {
            filteredExamDays.forEach((examDay, index) => {
                if (index > 0 || doc.internal.getNumberOfPages() > 1) {
                    doc.addPage();
                }
                this._generateExamPage(doc, examDay, selectedHall);
            });
        }

        doc.save("supervisors_by_exams.pdf");
    }

    _generateExamPage(doc, examDay, selectedHall) {
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text(`Exam: ${examDay.examName} (${examDay.examCode})`, 10, 10);
        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.text(`Date: ${examDay.date}, Time: ${examDay.timeRange}`, 10, 20);

        if (selectedHall) {
            doc.text(`Hall: ${selectedHall}`, 10, 30);
        }

        const supervisors = Object.values(this.assignments).filter(({ shifts }) =>
            shifts.some(shift => 
                shift.date === examDay.date && 
                shift.examCode === examDay.examCode && 
                (!selectedHall || shift.hall === selectedHall)
            )
        );

        if (supervisors.length === 0) {
            doc.text("No supervisors assigned.", 10, selectedHall ? 40 : 30);
        } else {
            // Summary section
            const totalSupervisors = supervisors.length;
            const totalExperience = supervisors.reduce((sum, { supervisor }) => sum + (supervisor.previousExperience || 0), 0);
            const experienceRatio = `${totalExperience}/${totalSupervisors * 100}`;
            const languageSkills = supervisors.reduce((acc, { supervisor }) => {
                acc[supervisor.languageSkill] = (acc[supervisor.languageSkill] || 0) + 1;
                return acc;
            }, {});

            doc.text(`Summary:`, 10, selectedHall ? 40 : 30);
            doc.text(`- Total Supervisors: ${totalSupervisors}`, 10, selectedHall ? 50 : 40);
            doc.text(`- Previous Experience: ${experienceRatio}`, 10, selectedHall ? 60 : 50);
            doc.text(`- Language Skills:`, 10, selectedHall ? 70 : 60);

            let yOffset = selectedHall ? 80 : 70;
            Object.entries(languageSkills).forEach(([skill, count]) => {
                doc.text(`  * ${skill}: ${count}`, 10, yOffset);
                yOffset += 10;
            });

            // Supervisor table
            const tableData = [];
            supervisors.forEach(({ supervisor, shifts }) => {
                const relevantShifts = shifts.filter(shift => 
                    shift.date === examDay.date && 
                    shift.examCode === examDay.examCode && 
                    (!selectedHall || shift.hall === selectedHall)
                );
                relevantShifts.forEach(shift => {
                    tableData.push([
                        `${supervisor.nickname} ${supervisor.lastName}`,
                        supervisor.languageSkill,
                        supervisor.previousExperience,
                        shift.timeRange,
                        shift.hall || "N/A",
                        shift.information || "",
                        shift.break || ""
                    ]);
                });
            });

            doc.autoTable({
                head: [["Supervisor", "Language skill", "Previous Experience", "Time Range", "Hall", "Information", "Break"]],
                body: tableData,
                startY: yOffset,
                theme: "grid",
                rowPageBreak: "auto", // Automatically handle page breaks
                margin: { top: 10 }, // Ensure consistent top margin for new pages
                headStyles: { fillColor: [200, 200, 200] }, // Set header background to gray
                didDrawPage: (data) => {
                    if (data.pageNumber > 1) {
                        // Add smaller header on subsequent pages
                        doc.setFontSize(10);
                        doc.setFont("helvetica", "bold");
                        doc.text(
                            `Exam: ${examDay.examName} (${examDay.examCode}) | Date: ${examDay.date} | Time: ${examDay.timeRange} | Hall: ${selectedHall || "N/A"}`,
                            10,
                            10
                        );
                    }
                }
            });
        }
    }
}
