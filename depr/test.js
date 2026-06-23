const this_experienceRatio = 0.5; // Example ratio for experience
const this_languageSkillRatio = 0.5; // Example ratio for language skill

const selected = {
    languageSkill: "Ei osaamista",
    previousExperience: false
};
        
const experienceRatio = 0; // Example ratio for experience
const languageRatio = 0; // Example ratio for language skill

const selectedPriority = Math.max(0, (1 - experienceRatio / this_experienceRatio)*(selected.previousExperience ? 1 : 0)) + 
            Math.max(0, (1- languageRatio/this_languageSkillRatio)*(selected.languageSkill === "Äidinkieli" || selected.languageSkill === "Kiitettävä" ? 1 :
            selected.languageSkill === "Hyvä" ? 0.5 : 0));
        console.log('Selected language skill:', selected.languageSkill, 'and previous experience:', selected.previousExperience, 'with priority:', selectedPriority);