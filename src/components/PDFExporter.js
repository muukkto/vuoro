export default class PDFExporter {
    constructor(assignments, examDays, rolesAndLocation) {
        this.assignments = assignments;
        this.examDays = examDays;
        this.rolesAndLocation = rolesAndLocation;
    }

    exportByExams(filteredExamDays = this.examDays, selectedHall = null) {
        const doc = new window.jspdf.jsPDF();
        let isFirstPageUsed = false;

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
                    // Lisää uusi sivu vain, jos ensimmäinen sivu on jo käytetty
                    if (isFirstPageUsed) {
                        doc.addPage();
                    }
                    this._generateExamPage(doc, examDay, hall);
                    isFirstPageUsed = true; // Merkitään ensimmäinen sivu käytetyksi
                });
            });
        } else {
            filteredExamDays.forEach((examDay, index) => {
                // Lisää uusi sivu vain, jos ensimmäinen sivu on jo käytetty
                if (isFirstPageUsed) {
                    doc.addPage();
                }
                this._generateExamPage(doc, examDay, selectedHall);
                isFirstPageUsed = true; // Merkitään ensimmäinen sivu käytetyksi
            });
        }

        console.log("Global role data:", this.rolesAndLocation);

        const fileName = selectedHall === "all_by_halls"
            ? (filteredExamDays.length > 1
                ? `valintakokeet_2025_kaikki_kokeet_halleitain.pdf`
                : `${filteredExamDays[0].examName.replace(/\s+/g, "_")}_${filteredExamDays[0].date}_valvojat_halleittain.pdf`)
            : (filteredExamDays.length > 1
                ? `valintakokeet_2025_kaikki_kokeet.pdf`
                : `${filteredExamDays[0].examName.replace(/\s+/g, "_")}_${filteredExamDays[0].date}${selectedHall ? `_${selectedHall.replace(/\s+/g, "_")}` : "_kaikki_valvojat"}.pdf`);

        // Tarkista ja poista tyhjä ensimmäinen sivu
        if (doc.internal.getNumberOfPages() === 1 && doc.internal.pages[1].length === 0) {
            doc.deletePage(1);
        }

        // Tallenna PDF-tiedosto
        doc.save(fileName);
    }

    exportBySupervisors() {
        const zip = new JSZip(); // Luo uusi ZIP-instanssi
        const csvRows = [["Etunimi", "Sukunimi", "Sähköposti", "Tiedostonimi"]]; // CSV-otsikot

        Object.values(this.assignments).forEach(({ supervisor, shifts }) => {
            const doc = new window.jspdf.jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            doc.setFontSize(15);
            doc.setFont("helvetica", "italic");
            doc.text(`Valintakokeet 2025`, pageWidth / 2, 10, { align: "center" });

            doc.setFontSize(30);
            doc.setFont("helvetica", "bold");
            doc.text(`Työvuorot`, 20, 25);
            doc.setFont("helvetica", "italic");
            doc.text(`${this.rolesAndLocation.role}`, 100, 25);

            doc.setFontSize(20);
            doc.setFont("helvetica", "normal");
            doc.text(`${supervisor.firstName} ${supervisor.lastName}`, 20, 40);

            doc.setFont("helvetica", "bold");
            doc.text(`Paikka:`, 20, 50);
            doc.setFont("helvetica", "normal");
            doc.text(`${this.rolesAndLocation.location}`, 50, 50);

            if (shifts.length === 0) {
                doc.text("Ei vuoroja.", 20, 60);
            } else {
                const tableData = shifts.map(shift => [
                    shift.date,
                    shift.timeRange,
                    shift.examCode,
                    shift.hall || "N/A",
                    shift.information || "",
                    shift.break || ""
                ]);

                doc.autoTable({
                    head: [["Päivämäärä", "Aika", "Koe", "Halli", "Lisätiedot", "Tauko"]],
                    body: tableData,
                    startY: 60,
                    theme: "grid",
                    headStyles: {
                        fillColor: [200, 200, 200], // White background
                        textColor: [0, 0, 0], // Black text
                        fontStyle: "bold", // Bold text
                        cellPadding: 2, // Add padding to allow wrapping
                        lineColor: [0, 0, 0] // Black border color
                    },
                    styles: {
                        fontSize: 10,
                        overflow: "linebreak",
                        cellWidth: "wrap"
                    }
                });
            }

            const fileName = `${supervisor.nickname}_${supervisor.lastName}_vuorot.pdf`.replace(/\s+/g, "_");
            const pdfBlob = doc.output("blob"); // Luo PDF-blob

            zip.file(fileName, pdfBlob); // Lisää PDF-tiedosto ZIP-tiedostoon

            // Lisää CSV-rivi
            csvRows.push([supervisor.firstName, supervisor.lastName, supervisor.email || "N/A", fileName]);
        });

        // Luo CSV-tiedosto
        const csvContent = csvRows.map(row => row.join(",")).join("\n");
        zip.file(`${this.rolesAndLocation.role}_massapostitus.csv`, csvContent); // Lisää CSV-tiedosto ZIP-tiedostoon

        // Luo ZIP-tiedosto ja lataa se
        zip.generateAsync({ type: "blob" }).then((content) => {
            const rolePrefix = `${this.rolesAndLocation.location}_${this.rolesAndLocation.role}`
            const zipFileName = `${rolePrefix}_valvojien_vuorot.zip`;

            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = zipFileName;
            link.click();
        });
    }

    _generateExamPage(doc, examDay, selectedHall) {
        doc.setFontSize(30);
        doc.setFont("helvetica", "bold");
        doc.text(`${examDay.examName}`, 20, 20);
        doc.setFont("helvetica", "italic");
        doc.text(`${this.rolesAndLocation.role}`, 120, 20);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text(`Päivämäärä:`, 10, 35);
        doc.text(`Kello:`, 100, 35);
        doc.text(`Paikka:`, 10, 44);
        doc.setFont("helvetica", "normal");
        doc.text(`${examDay.date}`, 55, 35);
        doc.text(`${examDay.timeRange}`, 135, 35);
        doc.text(`${this.rolesAndLocation.location}`, 55, 44);

        if (selectedHall) {
            doc.setFont("helvetica", "bold");
            doc.text(`Halli:`, 100, 44);
            doc.setFont("helvetica", "normal");
            doc.text(`${selectedHall}`, 135, 44);
        }

        const supervisors = Object.values(this.assignments).filter(({ shifts }) =>
            shifts.some(shift => 
                shift.date === examDay.date && 
                shift.examCode === examDay.examCode && 
                (!selectedHall || shift.hall === selectedHall)
            )
        );

        if (supervisors.length === 0) {
            doc.text("No supervisors assigned.", 10, 60);
        } else {
            // Summary section
            const totalSupervisors = supervisors.length;
            const totalExperience = supervisors.reduce((sum, { supervisor }) => sum + (supervisor.previousExperience || 0), 0);
            const experienceRatio = `${totalExperience}/${totalSupervisors}`;
            const languageSkills = supervisors.reduce((acc, { supervisor }) => {
                acc[supervisor.languageSkill] = (acc[supervisor.languageSkill] || 0) + 1;
                return acc;
            }, {});

            // Ensure all language skill categories are present
            const orderedLanguageSkills = {
                "Äidinkieli": languageSkills["äidinkieli"] || 0,
                "Kiitettävä": languageSkills["kiitettävä"] || 0,
                "Hyvä": languageSkills["hyvä"] || 0,
                "Tyydyttävä": languageSkills["tyydyttävä"] || 0,
                "Välttävä": languageSkills["välttävä"] || 0,
                "Ei osaamista": languageSkills["ei osaamista"] || 0
            };

            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text(`Valvojien lukumäärä`, 10, 51);
            doc.text(`Aiempi kokemus`, 100, 51);
            doc.text(`Kielitaito`, 10, 58);

            doc.setFont("helvetica", "normal");
            doc.text(`${totalSupervisors}`, 55, 51);
            doc.text(`${experienceRatio}`, 135, 51);

            let languageSkillsText = Object.entries(orderedLanguageSkills)
                .map(([skill, count]) => `${skill}: ${count}`)
                .join(", ");
            doc.text(languageSkillsText, 55, 58);

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
                        supervisor.previousExperience ? "Kyllä" : "Ei",
                        shift.timeRange,
                        shift.hall || "N/A",
                        shift.information || "",
                        shift.break || ""
                    ]);
                });
            });

            tableData.sort((a, b) => {
                const roleComparison = a[5].localeCompare(b[5]);
                if (roleComparison !== 0) return roleComparison;
                return (a[4] || "").localeCompare(b[4] || "");
            });

            doc.autoTable({
                head: [["Valvoja", "Ruotsinkieli", "Aiempi kokemus", "Vuoro", "Halli", "Rooli", "Tauko"]],
                body: tableData,
                startY: 65,
                theme: "grid",
                rowPageBreak: "auto", // Automatically handle page breaks
                margin: { top: 15, left: 10 }, // Set left margin to 10
                headStyles: {
                    fillColor: [200, 200, 200], // White background
                    textColor: [0, 0, 0], // Black text
                    fontStyle: "bold", // Bold text
                    cellPadding: 2, // Add padding to allow wrapping
                    lineColor: [0, 0, 0] // Black border color
                },
                styles: {
                    fontSize: 9, // Muutettu fonttikooksi 9
                    overflow: "linebreak", // Enable line wrapping for text
                    cellWidth: "wrap" // Adjust cell width to content
                },
                didDrawPage: (data) => {
                    if (data.pageNumber > 1) {
                        // Add smaller header on subsequent pages
                        doc.setFontSize(10);
                        doc.setFont("helvetica", "bold");
                        const hallText = selectedHall ? ` | Halli: ${selectedHall}` : "";
                        doc.text(
                            `${examDay.examName} | Päivämäärä: ${examDay.date} | Aika: ${examDay.timeRange}${hallText}`,
                            10,
                            10
                        );
                    }
                }
            });
        }
    }
}
