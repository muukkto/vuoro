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
                    if (isFirstPageUsed) {
                        doc.addPage();
                    }
                    this._generateExamPage(doc, examDay, hall);
                    isFirstPageUsed = true;
                });
            });
        } else if (selectedHall === "all_by_alpha") {
            filteredExamDays.forEach((examDay) => {
                const supervisors = Object.values(this.assignments).filter(({ shifts }) =>
                    shifts.some(shift =>
                        shift.examCode === examDay.examCode &&
                        shift.date === examDay.date
                    )
                );

                supervisors.sort((a, b) => {
                    const lastA = (a.supervisor.lastName || "").toLowerCase();
                    const lastB = (b.supervisor.lastName || "").toLowerCase();
                    if (lastA !== lastB) return lastA.localeCompare(lastB, "fi");
                    return (a.supervisor.firstName || "").toLowerCase().localeCompare((b.supervisor.firstName || "").toLowerCase(), "fi");
                });

                // 1. Ryhmitellään kahden ensimmäisen kirjaimen mukaan
                const prefixGroups = [];
                let currentGroup = [];
                let currentPrefix = null;
                supervisors.forEach((sup) => {
                    const lastName = (sup.supervisor.lastName || "").toUpperCase();
                    const prefix = lastName.substring(0, Math.min(2, lastName.length));
                    if (currentPrefix === null) {
                        currentPrefix = prefix;
                        currentGroup.push(sup);
                    } else if (prefix === currentPrefix) {
                        currentGroup.push(sup);
                    } else {
                        prefixGroups.push({ prefix: currentPrefix, group: currentGroup });
                        currentPrefix = prefix;
                        currentGroup = [sup];
                    }
                });
                if (currentGroup.length > 0) {
                    prefixGroups.push({ prefix: currentPrefix, group: currentGroup });
                }

                console.log("Prefix groups:", prefixGroups);

                // 2. Yhdistellään prefix-ryhmiä mahdollisimman tasaisiksi listoiksi
                // lasketaan tasaisten ryhmien koot
                const totalSupervisors = supervisors.length;
                const numGroups = Math.ceil(totalSupervisors / 40);
                const groupSize = Math.ceil(totalSupervisors / numGroups);

                console.log("Total supervisors:", totalSupervisors);
                console.log("Number of groups:", numGroups);
                console.log("Group size:", groupSize);

                const finalGroups = [];
                let tempGroup = [];
                let tempPrefixes = [];

                prefixGroups.forEach(({ prefix, group }) => { 
                    if (tempGroup.length + group.length > groupSize && tempGroup.length > 0) {
                        tempGroup = tempGroup.concat(group);
                        tempPrefixes.push(prefix);
                        finalGroups.push({
                            group: tempGroup,
                            firstSupervisor: tempGroup[0],
                            lastSupervisor: tempGroup[tempGroup.length - 1]
                        });
                        tempGroup = [];
                        tempPrefixes = [];
                    } else {
                        tempGroup = tempGroup.concat(group);
                        tempPrefixes.push(prefix);
                    }
                });
                if (tempGroup.length > 0) {
                    finalGroups.push({
                        group: tempGroup,
                        firstSupervisor: tempGroup[0],
                        lastSupervisor: tempGroup[tempGroup.length - 1]
                    });
                }
                console.log("Final groups:", finalGroups);

                for (let i = 0; i < finalGroups.length; i++) {
                    let surnameRange = "";
                    const firstSupervisor = finalGroups[i].firstSupervisor;
                    const lastSupervisor = finalGroups[i].lastSupervisor;
                    if (firstSupervisor && lastSupervisor) {
                        const firstName = (firstSupervisor.supervisor.lastName || "").trim();
                        const lastName = (lastSupervisor.supervisor.lastName || "").trim();
                        let firstLetters = "";
                        let lastLetters = "";

                        if (firstName && lastName) {
                            // Selvietään onko ryhmä eka 

                            if (i === 0) {
                                firstLetters = firstName.substring(0, 1).toUpperCase();
                            } else {
                                // Selvitetään edellisen ryhmän viimeinen sukunimi
                                const prevLastName = finalGroups[i - 1].lastSupervisor.supervisor.lastName || "";
                                const prevFirstLetters = prevLastName.substring(0, 1).toUpperCase();

                                if (prevFirstLetters === firstName.substring(0, 1).toUpperCase()) {
                                    firstLetters = firstName.substring(0, Math.min(2, firstName.length)).toUpperCase();
                                } else {
                                    firstLetters = firstName.substring(0, 1).toUpperCase();
                                }
                            }
                            // Selvitetään onko ryhmä vika
                            if (i === finalGroups.length - 1) {
                                lastLetters = lastName.substring(0, 1).toUpperCase();
                            } else {
                                // Selvitetään seuraavan ryhmän ensimmäinen sukunimi
                                const nextFirstName = finalGroups[i + 1].firstSupervisor.supervisor.lastName || "";
                                const nextFirstLetters = nextFirstName.substring(0, 1).toUpperCase();

                                if (nextFirstLetters === lastName.substring(0, 1).toUpperCase()) {
                                    lastLetters = lastName.substring(0, Math.min(2, lastName.length)).toUpperCase();
                                } else {
                                    lastLetters = lastName.substring(0, 1).toUpperCase();
                                }
                            }
                            // Muodostetaan sukunimien väli
                            surnameRange = `${firstLetters} - ${lastLetters}`;
                            finalGroups[i].surnameRange = surnameRange;
                        }
                    }
                    if (isFirstPageUsed) {
                        doc.addPage();
                    }
                    this._generateExamPageAlpha(
                        doc,
                        examDay,
                        finalGroups[i].group,
                        i + 1,
                        finalGroups.length,
                        surnameRange
                    );
                    isFirstPageUsed = true;
                }

                finalGroups.forEach(({ surnameRange }, idx) => {
                    doc.addPage();
                    const pageWidth = doc.internal.pageSize.getWidth();
                    const pageHeight = doc.internal.pageSize.getHeight();

                    console.log("Page width:", pageWidth, "Page height:", pageHeight);

                    doc.setFontSize(125)
                    doc.setFont("helvetica", "italic");
                    const roleText = `${this.rolesAndLocation.role}`;
                    const roleTextWidth = doc.getTextWidth(roleText);
                    const roleTextHeight = doc.getTextDimensions(roleText).h;

                    console.log("Role text width:", roleTextWidth);
                    console.log("Role text height:", roleTextHeight);

                    const roleX = 20 + roleTextHeight;
                    const roleY = pageHeight / 2 + roleTextWidth / 2;

                    console.log("Role X:", roleX, "Role Y:", roleY);

                    doc.text(roleText, roleX, roleY, { angle: 90 });

                    doc.setFontSize(200);
                    doc.setFont("helvetica", "bold");
                    const surnameText = `${surnameRange}`;
                    const surnameTextWidth = doc.getTextWidth(surnameText);
                    const surnameTextHeight = doc.getTextDimensions(surnameText).h;

                    console.log("Surname text width:", surnameTextWidth);
                    console.log("Surname text height:", surnameTextHeight);

                    const surnameX = pageWidth / 2 + 20 + surnameTextHeight / 2;
                    const surnameY = pageHeight / 2 + surnameTextWidth / 2;

                    console.log("Surname X:", surnameX, "Surname Y:", surnameY);

                    doc.text(surnameText, surnameX, surnameY, { angle: 90 });

                    doc.setFontSize(15);
                    doc.setFont("helvetica", "normal");
                    const examInfoText = `${examDay.examName} | ${examDay.date} | ${examDay.timeRange}`;
                    const examInfoTextWidth = doc.getTextWidth(examInfoText);
                    const examInfoTextHeight = doc.getTextDimensions(examInfoText).h;
                    const examInfoX = 200;
                    const examInfoY = pageHeight / 2 + examInfoTextWidth / 2;

                    doc.text(examInfoText, examInfoX, examInfoY, { angle: 90 });                    

                });
            });

        } else {
            filteredExamDays.forEach((examDay, index) => {
                if (isFirstPageUsed) {
                    doc.addPage();
                }
                this._generateExamPage(doc, examDay, selectedHall);
                isFirstPageUsed = true;
            });
        }

        console.log("Global role data:", this.rolesAndLocation);

        const role = this.rolesAndLocation.role.toLowerCase();
        const location = this.rolesAndLocation.location.toLowerCase();

        const fileName = selectedHall === "all_by_halls"
            ? (filteredExamDays.length > 1
                ? `valintakokeet_2025_kaikki_kokeet_${role}_halleitain.pdf`
                : `${filteredExamDays[0].examName.replace(/\s+/g, "_")}_${filteredExamDays[0].date}_${role}_halleittain.pdf`)
            : (selectedHall === "all_by_alpha" 
                ? `${filteredExamDays[0].examName.replace(/\s+/g, "_")}_${filteredExamDays[0].date}_${role}_aakkosittain.pdf`
                : (filteredExamDays.length > 1
                    ? `valintakokeet_2025_kaikki_kokeet_${role}.pdf`
                    : `${filteredExamDays[0].examName.replace(/\s+/g, "_")}_${filteredExamDays[0].date}${selectedHall ? `_${selectedHall.replace(/\s+/g, "_")}` : `_kaikki_${role}`}.pdf`));

        if (doc.internal.getNumberOfPages() === 1 && doc.internal.pages[1].length === 0) {
            doc.deletePage(1);
        }

        doc.save(fileName);
    }

    exportBySupervisors() {
        const zip = new JSZip();
        const csvRows = [["Etunimi", "Sukunimi", "Sähköposti", "Tiedostonimi"]];

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
                        fillColor: [200, 200, 200],
                        textColor: [0, 0, 0],
                        fontStyle: "bold",
                        cellPadding: 2,
                        lineColor: [0, 0, 0]
                    },
                    styles: {
                        fontSize: 10,
                        overflow: "linebreak",
                        cellWidth: "wrap"
                    }
                });
            }

            const fileName = `${supervisor.nickname}_${supervisor.lastName}_vuorot.pdf`.replace(/\s+/g, "_");
            const pdfBlob = doc.output("blob");

            zip.file(fileName, pdfBlob);

            csvRows.push([supervisor.firstName, supervisor.lastName, supervisor.email || "N/A", fileName]);
        });

        const csvContent = csvRows.map(row => row.join(",")).join("\n");
        zip.file(`${this.rolesAndLocation.role}_massapostitus.csv`, csvContent);

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
            const totalSupervisors = supervisors.length;
            const totalExperience = supervisors.reduce((sum, { supervisor }) => sum + (supervisor.previousExperience || 0), 0);
            const experienceRatio = `${totalExperience}/${totalSupervisors}`;
            const languageSkills = supervisors.reduce((acc, { supervisor }) => {
                acc[supervisor.languageSkill] = (acc[supervisor.languageSkill] || 0) + 1;
                return acc;
            }, {});

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
                        shift.break || "",
                        supervisor.lastName || "",
                        supervisor.nickname || ""
                    ]);
                });
            });

            tableData.sort((a, b) => {
                const roleA = (a[5] || "").toLowerCase();
                const roleB = (b[5] || "").toLowerCase();

                const breakA = (a[6] || "").toLowerCase();
                const breakB = (b[6] || "").toLowerCase();

                const hallA = (a[4] || "").toLowerCase();
                const hallB = (b[4] || "").toLowerCase();

                const collator = new Intl.Collator('fi', { numeric: true, sensitivity: 'base' });
                
                if (hallA !== hallB) return collator.compare(hallA, hallB);
                if (roleA !== roleB) return collator.compare(roleA, roleB);

                return collator.compare(breakA, breakB);
            });

            const printableTableData = tableData.map(row => row.slice(0, 7));

            doc.autoTable({
                head: [["Valvoja", "Ruotsinkieli", "Aiempi kokemus", "Vuoro", "Halli", "Rooli", "Tauko"]],
                body: printableTableData,
                startY: 65,
                theme: "grid",
                rowPageBreak: "auto",
                margin: { top: 15, left: 10 },
                headStyles: {
                    fillColor: [200, 200, 200],
                    textColor: [0, 0, 0],
                    fontStyle: "bold",
                    cellPadding: 2,
                    lineColor: [0, 0, 0]
                },
                styles: {
                    fontSize: 9,
                    overflow: "linebreak",
                    cellWidth: "wrap"
                },
                didDrawPage: (data) => {
                    if (data.pageNumber > 1) {
                        doc.setFontSize(10);
                        doc.setFont("helvetica", "bold");
                        const hallText = selectedHall ? ` | Halli: ${selectedHall}` : "";
                        doc.text(
                            `${examDay.examName} | Päivämäärä: ${examDay.date} | Aika: ${examDay.timeRange}${hallText}`,
                            10,
                            10
                        );
                    }
                },
                didParseCell: function (data) {
                    if (data.section === 'body' && data.row.index % 2 === 1) {
                        data.cell.styles.fillColor = [240, 240, 240];
                    }
                }
            });
        }
    }

    _generateExamPageAlpha(doc, examDay, supervisors, groupIndex, numGroups, surnameRange) {
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
        doc.text(`Sukunimet:`, 100, 44);
        doc.setFont("helvetica", "normal");
        doc.text(`${examDay.date}`, 55, 35);
        doc.text(`${examDay.timeRange}`, 145, 35);
        doc.text(`${this.rolesAndLocation.location}`, 55, 44);
        doc.text(surnameRange, 145, 44);

        if (supervisors.length === 0) {
            doc.text("No supervisors assigned.", 10, 60);
        } else {
            const allSupervisorsForExam = Object.values(this.assignments).filter(({ shifts }) =>
                shifts.some(shift =>
                    shift.date === examDay.date &&
                    shift.examCode === examDay.examCode
                )
            );
            const totalSupervisors = allSupervisorsForExam.length;
            const groupSupervisors = supervisors.length;

            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text(`Valvojien lukumäärä`, 10, 55);
            doc.text(`Lista`, 100, 55);

            doc.setFont("helvetica", "normal");
            doc.text(`${groupSupervisors}/${totalSupervisors}`, 55, 55);
            doc.text(`${groupIndex}/${numGroups}`, 120, 55);

            doc.setFontSize(11);
            doc.setFont("helvetica", "bold",);
            doc.text("Tämä on virallinen työvuorolista!", 105, 65, { align: "center" });
            doc.text("Säilytettävä ja palautettava toimistotilaan työvuorokuittauksen kanssa!", 105, 71, { align: "center" });


            const tableData = [];
            supervisors.forEach(({ supervisor, shifts }) => {
                const relevantShifts = shifts.filter(shift =>
                    shift.date === examDay.date &&
                    shift.examCode === examDay.examCode
                );
                relevantShifts.forEach(shift => {
                    tableData.push([
                        `${supervisor.lastName} ${supervisor.nickname}`,
                        shift.timeRange,
                        shift.hall || "N/A",
                        shift.information || "",
                        shift.break || "",
                        "", // Placeholdr for checkmark,
                        "", // Placeholder for information,
                        supervisor.lastName || "",
                        supervisor.firstName || ""
                    ]);
                });
            });

            tableData.sort((a, b) => {
                const lastA = (a[7] || "").toLowerCase();
                const lastB = (b[7] || "").toLowerCase();
                if (lastA !== lastB) return lastA.localeCompare(lastB, "fi");
                const firstA = (a[8] || "").toLowerCase();
                const firstB = (b[8] || "").toLowerCase();
                return firstA.localeCompare(firstB, "fi");
            });

            const printableTableData = tableData.map(row => row.slice(0, 7));

            doc.autoTable({
                head: [["Valvoja", "Vuoro", "Halli", "Rooli", "Tauko", "Sap", "Lisätiedot"]],
                body: printableTableData,
                startY: 77,
                theme: "grid",
                rowPageBreak: "auto",
                margin: { top: 15, left: 10 },
                headStyles: {
                    fillColor: [200, 200, 200],
                    textColor: [0, 0, 0],
                    fontStyle: "bold",
                    cellPadding: 2,
                    lineColor: [0, 0, 0]
                },
                styles: {
                    fontSize: 9,
                    overflow: "linebreak",
                    cellWidth: "wrap"
                },
                columnStyles: {
                    6: { cellWidth: 'auto', minCellWidth: 50, halign: "left" },
                },
                didDrawPage: (data) => {
                    if (data.pageNumber > 1) {
                        doc.setFontSize(10);
                        doc.setFont("helvetica", "bold");
                        doc.text(
                            `${examDay.examName} | Päivämäärä: ${examDay.date} | Aika: ${examDay.timeRange} | Valvojat ${surnameRange} (${groupIndex}/${numGroups})`,
                            10,
                            10
                        );
                    }
                },
                didParseCell: function (data) {
                    if (data.section === 'body' && data.row.index % 2 === 1) {
                        data.cell.styles.fillColor = [240, 240, 240];
                    }
                }
            });
        }
    }
}
