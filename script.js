const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

const CALORIE_RATES = { course: 10, musculation: 5, velo: 7, natation: 8, marche: 4.5 };
const EXERCISE_NAMES = { course: "Course à pied", musculation: "Musculation / Renforcement", velo: "Cyclisme / Vélo", natation: "Natation", marche: "Marche active", custom: "Personnalisé" };
const EXERCISE_ICONS = { course: "fa-person-running", musculation: "fa-dumbbell", velo: "fa-bicycle", natation: "fa-person-swimming", marche: "fa-person-walking", custom: "fa-heart-pulse" };

let currentUser = null;
let activeCharts = {};

document.addEventListener("DOMContentLoaded", () => {
    seedDemoData();
    $("current-date-display").textContent = new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    $("exe-date").value = getLocalDate();
    $("wei-date").value = getLocalDate();
    bindFormEvents();

    const savedEmail = localStorage.getItem("activeUserEmail");
    const allUsers = JSON.parse(localStorage.getItem("users") || "[]");
    currentUser = allUsers.find(u => u.email === savedEmail);
    if (currentUser) { showApp(); return; }

    showLogin();
});

function bindFormEvents() {
    $("login-form").addEventListener("submit", e => { e.preventDefault(); handleLogin(); });
    $("register-form").addEventListener("submit", e => { e.preventDefault(); handleRegister(); });
    $("exercise-form").addEventListener("submit", e => { e.preventDefault(); addExercise(); });
    $("weight-form").addEventListener("submit", e => { e.preventDefault(); addWeight(); });
    $("profile-form").addEventListener("submit", e => { e.preventDefault(); updateProfile(); });
}

function seedDemoData() {
    const allUsers = JSON.parse(localStorage.getItem("users") || "[]");
    if (allUsers.some(u => u.email === "demo@avicenne.com")) return;

    const weightValues = [76.5, 76.2, 75.9, 76.0, 75.6, 75.3, 74.8];
    const exercisePresets = [
        { type: "course", name: "Course à pied", duration: 40, calories: 400 },
        { type: "musculation", name: "Musculation", duration: 50, calories: 250 },
        { type: "velo", name: "Vélo d'appartement", duration: 30, calories: 210 },
        { type: "natation", name: "Natation", duration: 45, calories: 360 },
        { type: "marche", name: "Marche active", duration: 60, calories: 270 },
        { type: "musculation", name: "Renforcement muscu", duration: 40, calories: 200 },
        { type: "course", name: "Footing du matin", duration: 35, calories: 350 }
    ];
    const mockExercises = [], mockWeights = [];
    for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
        const dateStr = getLocalDate(new Date(Date.now() - daysAgo * 86400000));
        const i = 6 - daysAgo;
        mockWeights.push({ id: `w-seed-${daysAgo}`, date: dateStr, val: weightValues[i] });
        mockExercises.push({ id: `e-seed-${daysAgo}`, date: dateStr, ...exercisePresets[i] });
    }
    allUsers.push({
        name: "Marc Lemoine", email: "demo@avicenne.com", password: "demo123",
        age: 32, gender: "H", height: 182, referenceWeight: 75.5,
        goalWeight: 72, weeklyWeightGoal: 0.5, dailyGoalCalories: 300,
        exercises: mockExercises, weights: mockWeights
    });
    localStorage.setItem("users", JSON.stringify(allUsers));
}

// --- connexion / inscription / deconnexion ---
function switchAuthTab(tab) {
    $("tab-login-btn").classList.toggle("active", tab === "login");
    $("tab-register-btn").classList.toggle("active", tab === "register");
    $("login-form").classList.toggle("active-form", tab === "login");
    $("register-form").classList.toggle("active-form", tab === "register");
}
function handleLogin() {
    const email = $("login-email").value.trim().toLowerCase();
    const password = $("login-password").value;
    const allUsers = JSON.parse(localStorage.getItem("users") || "[]");
    const match = allUsers.find(u => u.email === email && u.password === password);
    if (!match) return alert("Identifiants incorrects.\nCompte de test : demo@avicenne.com / demo123");
    currentUser = match;
    localStorage.setItem("activeUserEmail", email);
    showApp();
}
function handleRegister() {
    const email = $("register-email").value.trim().toLowerCase();
    const allUsers = JSON.parse(localStorage.getItem("users") || "[]");
    if (allUsers.some(u => u.email === email)) return alert("Cette adresse email est déjà enregistrée.");

    const refWeight = parseFloat($("register-weight").value);
    currentUser = {
        name: $("register-name").value.trim(), email, password: $("register-password").value,
        age: parseInt($("register-age").value), gender: $("register-gender").value,
        height: parseInt($("register-height").value), referenceWeight: refWeight,
        goalWeight: null, weeklyWeightGoal: 0.5, dailyGoalCalories: 300,
        exercises: [], weights: [{ id: `w-${Date.now()}`, date: getLocalDate(), val: refWeight }]
    };
    allUsers.push(currentUser);
    localStorage.setItem("users", JSON.stringify(allUsers));
    localStorage.setItem("activeUserEmail", email);
    showApp();
}
function logout() {
    localStorage.removeItem("activeUserEmail");
    currentUser = null;
    destroyAllCharts();
    showLogin();
}
function showLogin() {
    $("auth-container").classList.remove("hidden");
    $("app-container").classList.add("hidden");
}
function showApp() {
    $("auth-container").classList.add("hidden");
    $("app-container").classList.remove("hidden");
    updateSidebarProfile();
    showSection("dashboard");
}
function saveUser() {
    const allUsers = JSON.parse(localStorage.getItem("users") || "[]");
    const index = allUsers.findIndex(u => u.email === currentUser.email);
    if (index === -1) return;
    allUsers[index] = currentUser;
    localStorage.setItem("users", JSON.stringify(allUsers));
}
function updateSidebarProfile() {
    $("sidebar-user-name").textContent = currentUser.name;
    $("sidebar-user-stats").textContent = `Taille: ${currentUser.height} cm | Réf: ${currentUser.referenceWeight} kg`;
}

// --- navigation ---
const PAGE_HEADERS = {
    dashboard: { title: "Tableau de Bord", subtitle: "Résumé, objectifs, activité et calendrier de la semaine, tout au même endroit" },
    journal: { title: "Journal des Exercices", subtitle: "Enregistrez vos entraînements et suivez vos dépenses caloriques" },
    weight: { title: "Suivi du Poids", subtitle: "Suivez l'évolution de votre poids et comparez-le à votre référence" },
    profile: { title: "Profil Utilisateur", subtitle: "Gérez vos informations de santé et vos paramètres physiques" }
};
function showSection(sectionId) {
    $$(".menu-item").forEach(btn => btn.classList.toggle("active", btn.id === `nav-${sectionId}`));
    $$(".app-section").forEach(sec => sec.classList.toggle("active-section", sec.id === `section-${sectionId}`));
    $("page-title").textContent = PAGE_HEADERS[sectionId].title;
    $("page-subtitle").textContent = PAGE_HEADERS[sectionId].subtitle;

    if (sectionId === "dashboard") renderDashboard();
    else if (sectionId === "journal") { renderExercisesTable(); $("exe-date").value = getLocalDate(); }
    else if (sectionId === "weight") { renderWeightTable(); $("wei-date").value = getLocalDate(); }
    else if (sectionId === "profile") renderProfilePage();
}

// --- journal des exercices ---
function onExerciseTypeChange() {
    const isCustom = $("exe-type").value === "custom";
    $("custom-exe-group").classList.toggle("hidden", !isCustom);
    $("exe-custom-name").required = isCustom;
    if (!isCustom) $("exe-custom-name").value = "";
    estimateCalories();
}
function estimateCalories() {
    const type = $("exe-type").value;
    const duration = parseInt($("exe-duration").value) || 0;
    const badge = $("estimation-badge-text");
    if (!type) return badge.textContent = "Sélectionnez une activité pour estimer les calories.";
    if (type === "custom") return badge.textContent = "Saisissez les calories manuellement pour cette activité.";

    const rate = CALORIE_RATES[type] || 0;
    if (duration > 0) {
        const estimated = Math.round(duration * rate);
        badge.textContent = `Estimation : ~${estimated} kcal (${rate} kcal/min)`;
        $("exe-calories").value = estimated;
    } else {
        badge.textContent = `Entrez une durée pour voir l'estimation (Taux: ${rate} kcal/min).`;
    }
}
function addExercise() {
    const type = $("exe-type").value;
    const isCustom = type === "custom";
    const name = isCustom ? ($("exe-custom-name").value.trim() || "Activité personnalisée") : EXERCISE_NAMES[type];
    currentUser.exercises.push({
        id: `e-${Date.now()}`, date: $("exe-date").value, type, name,
        duration: parseInt($("exe-duration").value), calories: parseInt($("exe-calories").value)
    });
    saveUser();
    $("exercise-form").reset();
    $("custom-exe-group").classList.add("hidden");
    $("exe-custom-name").required = false;
    $("exe-date").value = getLocalDate();
    $("estimation-badge-text").textContent = "Sélectionnez une activité pour estimer les calories.";
    renderExercisesTable();
}
function deleteExercise(id) {
    if (!confirm("Supprimer cet exercice de votre journal ?")) return;
    currentUser.exercises = currentUser.exercises.filter(item => item.id !== id);
    saveUser();
    renderExercisesTable();
}
function filterExercises() { renderExercisesTable(); }
function clearExerciseFilter() { $("filter-date").value = ""; renderExercisesTable(); }
function renderExercisesTable() {
    const filterDate = $("filter-date").value;
    let logs = currentUser.exercises || [];
    if (filterDate) logs = logs.filter(item => item.date === filterDate);
    logs.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

    const tbody = $("exercise-list-body");
    if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center empty-state"><i class="fa-solid fa-dumbbell"></i><p>${filterDate ? "Aucune séance ce jour-là." : "Votre journal est vide pour l'instant."}</p></td></tr>`;
        return;
    }
    tbody.innerHTML = logs.map(item => `
        <tr>
            <td><strong>${formatDate(item.date)}</strong></td>
            <td><i class="fa-solid ${EXERCISE_ICONS[item.type] || "fa-dumbbell"}" style="color: var(--primary); margin-right: 8px;"></i>${item.name}</td>
            <td>${item.duration} min</td>
            <td><span style="font-weight: 600; color: var(--primary);">${item.calories} kcal</span></td>
            <td class="text-right"><button class="action-btn btn-delete" onclick="deleteExercise('${item.id}')" title="Supprimer"><i class="fa-solid fa-trash-can"></i></button></td>
        </tr>`).join("");
}

// --- suivi du poids ---
function addWeight() {
    const date = $("wei-date").value;
    const weightVal = parseFloat($("wei-val").value);
    if (!date || isNaN(weightVal)) return;

    const existing = currentUser.weights.find(w => w.date === date);
    if (existing) existing.val = weightVal;
    else currentUser.weights.push({ id: `w-${Date.now()}`, date, val: weightVal });

    saveUser();
    $("wei-val").value = "";
    $("wei-date").value = getLocalDate();
    renderWeightTable();
}
function deleteWeight(id) {
    if (!confirm("Supprimer cette pesée de votre historique ?")) return;
    currentUser.weights = currentUser.weights.filter(w => w.id !== id);
    saveUser();
    renderWeightTable();
}
function renderWeightTable() {
    const weights = (currentUser.weights || []).sort((a, b) => b.date.localeCompare(a.date));
    updateWeightIndicators();

    const tbody = $("weight-list-body");
    if (weights.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center empty-state"><i class="fa-solid fa-scale-unbalanced"></i><p>Aucune pesée enregistrée pour l'instant.</p></td></tr>`;
        return;
    }
    tbody.innerHTML = weights.map(item => {
        const diff = item.val - currentUser.referenceWeight;
        const diffClass = diff > 0.05 ? "diff-positive" : diff < -0.05 ? "diff-negative" : "diff-neutral";
        return `
            <tr>
                <td><strong>${formatDate(item.date)}</strong></td>
                <td><strong>${item.val.toFixed(1)} kg</strong></td>
                <td><span class="${diffClass}" style="font-weight: 500;">${(diff > 0 ? "+" : "") + diff.toFixed(1)} kg</span></td>
                <td class="text-right"><button class="action-btn btn-delete" onclick="deleteWeight('${item.id}')" title="Supprimer"><i class="fa-solid fa-trash-can"></i></button></td>
            </tr>`;
    }).join("");
}
function updateWeightIndicators() {
    const ref = currentUser.referenceWeight || 0;
    const weights = currentUser.weights || [];
    $("meta-ref-weight").textContent = `${ref.toFixed(1)} kg`;
    if (weights.length === 0) {
        $("meta-current-weight").textContent = "-- kg";
        $("meta-weight-diff").textContent = "-- kg";
        $("meta-bmi").textContent = "--";
        return;
    }
    const latestWeight = [...weights].sort((a, b) => a.date.localeCompare(b.date)).pop().val;
    $("meta-current-weight").textContent = `${latestWeight.toFixed(1)} kg`;

    const diff = latestWeight - ref;
    const diffEl = $("meta-weight-diff");
    diffEl.textContent = `${diff > 0 ? "+" : ""}${diff.toFixed(1)} kg`;
    diffEl.className = diff > 0.05 ? "diff-positive" : diff < -0.05 ? "diff-negative" : "diff-neutral";

    const heightMeters = currentUser.height / 100;
    if (heightMeters > 0) {
        const bmi = latestWeight / (heightMeters * heightMeters);
        const category = bmi < 18.5 ? "Insuffisance pondérale" : bmi < 25 ? "Normal" : bmi < 30 ? "Surpoids" : "Obésité";
        $("meta-bmi").textContent = `${bmi.toFixed(1)} (${category})`;
    }
}

// --- profil utilisateur ---
const GENDER_LABELS = { H: "Homme", F: "Femme", A: "Autre" };
function renderProfilePage() {
    $("profile-card-name").textContent = currentUser.name;
    $("profile-card-email").textContent = currentUser.email;
    $("profile-card-age").textContent = `${currentUser.age} ans`;
    $("profile-card-gender").textContent = GENDER_LABELS[currentUser.gender] || currentUser.gender;
    $("profile-card-height").textContent = `${currentUser.height} cm`;
    $("profile-card-weight").textContent = `${currentUser.referenceWeight} kg`;

    $("prof-name").value = currentUser.name;
    $("prof-age").value = currentUser.age;
    $("prof-gender").value = currentUser.gender;
    $("prof-height").value = currentUser.height;
    $("prof-weight").value = currentUser.referenceWeight;
    $("prof-goal-weight").value = currentUser.goalWeight ?? "";
    $("prof-weekly-goal").value = currentUser.weeklyWeightGoal ?? "";
    $("prof-daily-goal").value = currentUser.dailyGoalCalories ?? "";
}
function updateProfile() {
    currentUser.name = $("prof-name").value.trim();
    currentUser.age = parseInt($("prof-age").value);
    currentUser.gender = $("prof-gender").value;
    currentUser.height = parseInt($("prof-height").value);
    currentUser.referenceWeight = parseFloat($("prof-weight").value);

    const goalWeightVal = $("prof-goal-weight").value;
    currentUser.goalWeight = goalWeightVal !== "" ? parseFloat(goalWeightVal) : null;
    const weeklyGoalVal = $("prof-weekly-goal").value;
    currentUser.weeklyWeightGoal = weeklyGoalVal !== "" ? parseFloat(weeklyGoalVal) : 0.5;
    const dailyGoalVal = $("prof-daily-goal").value;
    currentUser.dailyGoalCalories = dailyGoalVal !== "" ? parseInt(dailyGoalVal) : 300;

    saveUser();
    updateSidebarProfile();
    renderProfilePage();
    alert("Votre profil a bien été mis à jour !");
}

// --- profil utilisateur (suite) ---

// --- export PDF ---
function exportUserReportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    const sectionTitle = (label, yPos) => {
        doc.setFillColor(37, 99, 235);
        doc.rect(14, yPos - 4.5, 3, 6, "F");
        doc.setFont(undefined, "bold");
        doc.setFontSize(12.5);
        doc.setTextColor(15, 23, 42);
        doc.text(label, 20, yPos);
        doc.setFont(undefined, "normal");
    };

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageW, 36, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, "bold");
    doc.setFontSize(19);
    doc.text("ActiveLife", 14, 17);
    doc.setFont(undefined, "normal");
    doc.setFontSize(10.5);
    doc.text("Rapport de suivi personnel", 14, 25);
    doc.setFontSize(9);
    doc.text(`Genere le ${formatDate(getLocalDate())}`, pageW - 14, 15, { align: "right" });
    doc.text(currentUser.name, pageW - 14, 22, { align: "right" });

    let y = 48;
    sectionTitle("Profil", y);
    y += 9;
    doc.setFontSize(9.5);
    const profCols = [
        [["Nom", currentUser.name], ["Age", `${currentUser.age} ans`], ["Sexe", GENDER_LABELS[currentUser.gender] || currentUser.gender]],
        [["Taille", `${currentUser.height} cm`], ["Poids reference", `${currentUser.referenceWeight} kg`], ["Email", currentUser.email]]
    ];
    profCols.forEach((col, colIndex) => {
        const xLabel = colIndex === 0 ? 14 : 115, xValue = colIndex === 0 ? 55 : 156;
        col.forEach((row, i) => {
            doc.setTextColor(100, 116, 139);
            doc.text(row[0], xLabel, y + i * 7);
            doc.setFont(undefined, "bold");
            doc.setTextColor(15, 23, 42);
            doc.text(String(row[1]), xValue, y + i * 7);
            doc.setFont(undefined, "normal");
        });
    });
    y += profCols[0].length * 7 + 8;

    if (currentUser.goalWeight || currentUser.weeklyWeightGoal || currentUser.dailyGoalCalories) {
        sectionTitle("Objectifs", y);
        y += 9;
        doc.setFontSize(9.5);
        doc.setTextColor(30, 41, 59);
        const goalLines = [];
        if (currentUser.goalWeight) goalLines.push(`Poids cible : ${currentUser.goalWeight} kg`);
        if (currentUser.weeklyWeightGoal) goalLines.push(`Objectif hebdomadaire : ${currentUser.weeklyWeightGoal} kg / semaine`);
        if (currentUser.dailyGoalCalories) goalLines.push(`Objectif calorique quotidien : ${currentUser.dailyGoalCalories} kcal`);
        goalLines.forEach((line, i) => doc.text(`•  ${line}`, 14, y + i * 6.5));
        y += goalLines.length * 6.5 + 8;
    }

    const weights = [...(currentUser.weights || [])].sort((a, b) => b.date.localeCompare(a.date));
    if (weights.length > 0) {
        const latest = weights[0];
        const diff = latest.val - currentUser.referenceWeight;
        sectionTitle("Poids", y);
        y += 9;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, y - 6, 182, 20, 2, 2, "FD");
        doc.setFont(undefined, "bold");
        doc.setFontSize(16);
        doc.setTextColor(37, 99, 235);
        doc.text(`${latest.val.toFixed(1)} kg`, 20, y + 6);
        doc.setFont(undefined, "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Derniere pesee le ${formatDate(latest.date)}`, 20, y + 11);
        const diffColor = diff > 0.05 ? [239, 68, 68] : diff < -0.05 ? [16, 185, 129] : [100, 116, 139];
        doc.setFont(undefined, "bold");
        doc.setFontSize(11);
        doc.setTextColor(...diffColor);
        doc.text(`${diff > 0 ? "+" : ""}${diff.toFixed(1)} kg vs reference`, 130, y + 6);
        doc.setFont(undefined, "normal");
        y += 26;
    }

    const exercises = [...(currentUser.exercises || [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
    sectionTitle("Historique des seances (20 dernieres)", y);
    y += 9;

    if (exercises.length === 0) {
        doc.setFontSize(9.5);
        doc.setTextColor(100, 116, 139);
        doc.text("Aucune seance enregistree pour l'instant.", 14, y);
    } else {
        const colX = { date: 14, activite: 48, duree: 122, calories: 152 };
        const drawTableHead = (yy) => {
            doc.setFillColor(37, 99, 235);
            doc.rect(14, yy - 5, 182, 8, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFont(undefined, "bold");
            doc.setFontSize(9);
            doc.text("Date", colX.date + 2, yy);
            doc.text("Activite", colX.activite + 2, yy);
            doc.text("Duree", colX.duree + 2, yy);
            doc.text("Calories", colX.calories + 2, yy);
            doc.setFont(undefined, "normal");
        };
        drawTableHead(y);
        y += 9;
        doc.setFontSize(9);
        exercises.forEach((ex, i) => {
            if (y > 272) { doc.addPage(); y = 25; drawTableHead(y); y += 9; }
            if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(14, y - 5, 182, 7, "F"); }
            doc.setTextColor(30, 41, 59);
            const shortName = ex.name.length > 30 ? ex.name.slice(0, 30) + "..." : ex.name;
            doc.text(formatDate(ex.date), colX.date + 2, y);
            doc.text(shortName, colX.activite + 2, y);
            doc.text(`${ex.duration} min`, colX.duree + 2, y);
            doc.setFont(undefined, "bold");
            doc.setTextColor(37, 99, 235);
            doc.text(`${ex.calories} kcal`, colX.calories + 2, y);
            doc.setFont(undefined, "normal");
            y += 7;
        });
    }

    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setDrawColor(226, 232, 240);
        doc.line(14, 285, pageW - 14, 285);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("ActiveLife - Avicenne Consulting", 14, 291);
        doc.text(`Page ${p} / ${totalPages}`, pageW - 14, 291, { align: "right" });
    }
    doc.save(`activelife-rapport-${getLocalDate()}.pdf`);
}

// --- dashboard + graphes ---
function destroyAllCharts() {
    Object.values(activeCharts).forEach(chart => chart && chart.destroy());
    activeCharts = {};
}
function renderDashboard() {
    if (!currentUser) return;
    const todayStr = getLocalDate();
    const todayExercises = currentUser.exercises.filter(x => x.date === todayStr);
    const todayBurn = todayExercises.reduce((sum, x) => sum + x.calories, 0);
    $("stat-today-calories").innerHTML = `${todayBurn} <span class="unit">kcal</span>`;
    $("stat-today-exercise-count").textContent = `${todayExercises.length} séance(s) aujourd'hui`;

    const weights = currentUser.weights || [];
    if (weights.length > 0) {
        const latestW = [...weights].sort((a, b) => a.date.localeCompare(b.date)).pop().val;
        const diff = latestW - currentUser.referenceWeight;
        $("stat-current-weight").innerHTML = `${latestW.toFixed(1)} <span class="unit">kg</span>`;
        $("stat-weight-diff").textContent = `Réf: ${currentUser.referenceWeight.toFixed(1)} kg (${diff > 0 ? "+" : ""}${diff.toFixed(1)} kg)`;
    } else {
        $("stat-current-weight").innerHTML = `-- <span class="unit">kg</span>`;
        $("stat-weight-diff").textContent = `Réf: ${currentUser.referenceWeight.toFixed(1)} kg`;
    }

    const last7Days = Array.from({ length: 7 }, (_, i) => getLocalDate(new Date(Date.now() - (6 - i) * 86400000)));
    const last30Days = Array.from({ length: 30 }, (_, i) => getLocalDate(new Date(Date.now() - (29 - i) * 86400000)));

    const weeklyTotal = last7Days.reduce((total, date) => total + caloriesOnDate(date), 0);
    $("stat-weekly-calories").innerHTML = `${weeklyTotal} <span class="unit">kcal</span>`;
    $("stat-weekly-avg-calories").textContent = `Moyenne: ${Math.round(weeklyTotal / 7)} kcal / jour`;

    destroyAllCharts();
    drawAllCharts(last30Days);
    renderGoalsSection();
    renderCalendarSection();
}
function drawAllCharts(caloriesDates) {
    const caloriesLabels30 = caloriesDates.map(d => d.split("-").slice(1).reverse().join("/"));
    const caloriesPerDay30 = caloriesDates.map(caloriesOnDate);
    const sortedWeights = [...currentUser.weights].sort((a, b) => a.date.localeCompare(b.date));

    activeCharts.dailyCalories = new Chart($("chart-daily-calories").getContext("2d"), {
        type: "bar",
        data: { labels: caloriesLabels30, datasets: [{ data: caloriesPerDay30, backgroundColor: "rgba(37, 99, 235, 0.8)", borderRadius: 4, barPercentage: 0.6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { autoSkip: true, maxTicksLimit: 10, maxRotation: 0 } } } }
    });

    const typeThemes = {
        course: { label: "Course", color: "#2563eb" }, musculation: { label: "Musculation", color: "#10b981" },
        velo: { label: "Vélo", color: "#f59e0b" }, natation: { label: "Natation", color: "#06b6d4" },
        marche: { label: "Marche", color: "#8b5cf6" }, custom: { label: "Autre", color: "#64748b" }
    };
    const durationByType = { course: 0, musculation: 0, velo: 0, natation: 0, marche: 0, custom: 0 };
    currentUser.exercises.forEach(x => durationByType[durationByType[x.type] !== undefined ? x.type : "custom"] += x.duration);
    const donutEntries = Object.entries(durationByType).filter(([, minutes]) => minutes > 0);
    const totalMinutes = donutEntries.reduce((sum, [, m]) => sum + m, 0);

    activeCharts.weeklyTypes = new Chart($("chart-weekly-types").getContext("2d"), {
        type: "doughnut",
        data: {
            labels: totalMinutes > 0 ? donutEntries.map(([k]) => typeThemes[k].label) : ["Aucune activité"],
            datasets: [{
                data: totalMinutes > 0 ? donutEntries.map(([, m]) => m) : [1],
                backgroundColor: totalMinutes > 0 ? donutEntries.map(([k]) => typeThemes[k].color) : ["#cbd5e1"]
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: "65%" }
    });

    const recentWeights = sortedWeights.slice(-10);
    const trendLabels = recentWeights.length > 0 ? recentWeights.map(w => w.date.split("-").slice(1).reverse().join("/")) : ["Aujourd'hui"];
    const trendData = recentWeights.length > 0 ? recentWeights.map(w => w.val) : [currentUser.referenceWeight];
    const refLine = trendLabels.map(() => currentUser.referenceWeight);

    activeCharts.weightTrend = new Chart($("chart-weight-trend").getContext("2d"), {
        type: "line",
        data: {
            labels: trendLabels,
            datasets: [
                { label: "Poids (kg)", data: trendData, borderColor: "rgb(37, 99, 235)", backgroundColor: "rgba(37, 99, 235, 0.03)", fill: true, borderWidth: 2, pointRadius: 3, tension: 0.15 },
                { label: "Poids de référence", data: refLine, borderColor: "rgba(100, 116, 139, 0.4)", borderWidth: 1.5, borderDash: [4, 4], pointRadius: 0 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: Math.min(...trendData, currentUser.referenceWeight) - 1.2, max: Math.max(...trendData, currentUser.referenceWeight) + 1.2 } } }
    });
}

// --- objectifs (serie, objectif hebdo, progres global) ---
function goToGoalSettings() {
    showSection("profile");
    setTimeout(() => $("prof-goal-weight").focus(), 150);
}
function caloriesOnDate(date) {
    return currentUser.exercises.filter(x => x.date === date).reduce((sum, x) => sum + x.calories, 0);
}
function hasExerciseOnDate(date) {
    return currentUser.exercises.some(x => x.date === date);
}
function dayMeetsGoal(date) {
    const goal = currentUser.dailyGoalCalories || 0;
    return hasExerciseOnDate(date) || (goal > 0 && caloriesOnDate(date) >= goal);
}
function computeStreakCount() {
    const today = getLocalDate();
    let count = 0;
    let cursor = dayMeetsGoal(today) ? new Date() : new Date(Date.now() - 86400000);
    while (dayMeetsGoal(getLocalDate(cursor))) {
        count++;
        cursor = new Date(cursor.getTime() - 86400000);
    }
    return count;
}
function renderGoalsSection() {
    if (!currentUser) return;
    renderStreakCard();
    renderWeeklyRing();
    renderGlobalArc();
}
function renderStreakCard() {
    const streak = computeStreakCount();
    $("streak-count").textContent = streak;
    const todayStr = getLocalDate();
    const goal = currentUser.dailyGoalCalories || 0;

    if (dayMeetsGoal(todayStr)) {
        $("streak-message").textContent = streak > 1 ? `Bravo, ${streak} jours de suite ! Continue comme ca.` : "Bien joue, ta serie est lancee pour aujourd'hui !";
    } else {
        const remaining = Math.max(0, goal - caloriesOnDate(todayStr));
        $("streak-message").textContent = goal > 0 ? `Enregistre une seance ou brule encore ${remaining} kcal pour garder ta serie aujourd'hui.` : "Enregistre une seance aujourd'hui pour garder ta serie.";
    }

    const dayLabels = ["L", "M", "M", "J", "V", "S", "D"];
    const monday = getMondayOf(new Date());
    $("streak-week-strip").innerHTML = Array.from({ length: 7 }, (_, i) => {
        const dayDate = new Date(monday.getTime() + i * 86400000);
        const dateStr = getLocalDate(dayDate);
        const isToday = dateStr === todayStr;
        const isFuture = dateStr > todayStr;
        const done = !isFuture && dayMeetsGoal(dateStr);
        const stateClass = `${isToday ? "day-today" : isFuture ? "day-future" : ""}${done ? " day-done" : ""}`;
        return `<div class="streak-day ${stateClass}"><i class="fa-solid fa-bolt"></i><span class="streak-day-label">${dayLabels[i]}</span></div>`;
    }).join("");
}
function renderWeeklyRing() {
    const weeklyGoal = currentUser.weeklyWeightGoal;
    const goalWeight = currentUser.goalWeight;
    const sorted = [...(currentUser.weights || [])].sort((a, b) => a.date.localeCompare(b.date));
    const ringValueEl = $("weekly-ring-value"), ringSubEl = $("weekly-ring-sub"), captionEl = $("weekly-ring-caption");

    if (activeCharts.weeklyRing) { activeCharts.weeklyRing.destroy(); activeCharts.weeklyRing = null; }

    if (!goalWeight || !weeklyGoal || sorted.length === 0) {
        ringValueEl.textContent = "--";
        ringSubEl.textContent = "kg cette semaine";
        captionEl.textContent = "Definissez un poids cible et un objectif hebdomadaire dans votre profil.";
        return drawRingChart(0, "#cbd5e1");
    }

    const weekAgoStr = getLocalDate(new Date(Date.now() - 6 * 86400000));
    const latestWeight = sorted[sorted.length - 1].val;
    const olderOrEqual = sorted.filter(w => w.date <= weekAgoStr);
    const startOfWeekWeight = olderOrEqual.length > 0 ? olderOrEqual[olderOrEqual.length - 1].val : sorted[0].val;
    const losingGoal = goalWeight < currentUser.referenceWeight;
    const rawChange = startOfWeekWeight - latestWeight;
    const actualChange = losingGoal ? rawChange : -rawChange;
    const percent = Math.round(Math.max(0, Math.min(1, weeklyGoal > 0 ? actualChange / weeklyGoal : 0)) * 100);

    ringValueEl.textContent = `${(rawChange >= 0 ? "-" : "+") + Math.abs(rawChange).toFixed(1)} kg`;
    ringSubEl.textContent = `sur objectif de ${losingGoal ? "-" : "+"}${weeklyGoal} kg`;
    captionEl.textContent = `${percent}% de l'objectif hebdomadaire atteint (7 derniers jours).`;
    drawRingChart(percent, percent >= 100 ? "#10b981" : "#2563eb");
}
function drawRingChart(percent, color) {
    activeCharts.weeklyRing = new Chart($("chart-weekly-ring").getContext("2d"), {
        type: "doughnut",
        data: { datasets: [{ data: [percent, Math.max(0, 100 - percent)], backgroundColor: [color, "#e2e8f0"], borderWidth: 0 }] },
        options: { responsive: false, cutout: "78%", plugins: { legend: { display: false }, tooltip: { enabled: false } } }
    });
}
function renderGlobalArc() {
    const fillEl = $("global-arc-fill"), valueEl = $("global-arc-value"), captionEl = $("global-arc-caption");
    const goalWeight = currentUser.goalWeight;
    const sorted = [...(currentUser.weights || [])].sort((a, b) => a.date.localeCompare(b.date));

    if (!goalWeight || sorted.length === 0) {
        fillEl.style.strokeDasharray = "0 100";
        valueEl.textContent = "0.0%";
        captionEl.textContent = "Ajoutez un poids cible pour activer votre progression globale.";
        return;
    }

    const startWeight = sorted[0].val;
    const latestWeight = sorted[sorted.length - 1].val;
    let percent = Math.abs(goalWeight - startWeight) < 0.01 ? 100 : ((startWeight - latestWeight) / (startWeight - goalWeight)) * 100;
    percent = Math.max(0, Math.min(100, percent));

    fillEl.style.strokeDasharray = `${percent} 100`;
    valueEl.textContent = `${percent.toFixed(1)}%`;
    captionEl.textContent = `De ${startWeight.toFixed(1)} kg vers ${goalWeight.toFixed(1)} kg (actuellement ${latestWeight.toFixed(1)} kg).`;
}

// --- barre de navigation rapide (sticky) du tableau de bord ---
function scrollToDashSection(id, btn) {
    const el = $(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    $$(".quicknav-btn").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
}

// --- calendrier (vue semaine / jour) ---
let calendarView = "week";
let calendarAnchorDate = new Date();
const CAL_DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

function setCalendarView(view) {
    calendarView = view;
    $("cal-view-week").classList.toggle("active", view === "week");
    $("cal-view-day").classList.toggle("active", view === "day");
    renderCalendarSection();
}
function calendarPrev() {
    const step = calendarView === "week" ? 7 : 1;
    calendarAnchorDate = new Date(calendarAnchorDate.getTime() - step * 86400000);
    renderCalendarSection();
}
function calendarNext() {
    const step = calendarView === "week" ? 7 : 1;
    calendarAnchorDate = new Date(calendarAnchorDate.getTime() + step * 86400000);
    renderCalendarSection();
}
function calendarToday() {
    calendarAnchorDate = new Date();
    renderCalendarSection();
}
function getMondayOf(date) {
    const jsDay = date.getDay();
    return new Date(date.getTime() + (jsDay === 0 ? -6 : 1 - jsDay) * 86400000);
}
function renderCalendarSection() {
    if (!currentUser) return;
    calendarView === "week" ? renderCalendarWeek() : renderCalendarDay();
}
function renderCalendarWeek() {
    const monday = getMondayOf(calendarAnchorDate);
    const sunday = new Date(monday.getTime() + 6 * 86400000);
    $("calendar-range-label").textContent = `${monday.getDate()} ${monday.toLocaleDateString("fr-FR", { month: "short" })} - ${sunday.getDate()} ${sunday.toLocaleDateString("fr-FR", { month: "short" })} ${sunday.getFullYear()}`;

    const todayStr = getLocalDate();
    $("calendar-body").innerHTML = `<div class="calendar-week-grid">${Array.from({ length: 7 }, (_, i) => {
        const dayDate = new Date(monday.getTime() + i * 86400000);
        const dateStr = getLocalDate(dayDate);
        const sessions = currentUser.exercises.filter(x => x.date === dateStr);
        return `
            <div class="calendar-day-col ${dateStr === todayStr ? "is-today" : ""}">
                <div class="calendar-day-head">
                    <div class="cdh-name">${CAL_DAY_NAMES[dayDate.getDay()].slice(0, 3)}</div>
                    <div class="cdh-num">${dayDate.getDate()}</div>
                </div>
                <div class="calendar-day-sessions">
                    ${sessions.length === 0 ? `<div class="calendar-day-empty">Aucune séance</div>` : sessions.map(s => `<div class="calendar-session-chip"><span class="cs-name">${s.name}</span><span class="cs-meta">${s.duration} min · ${s.calories} kcal</span></div>`).join("")}
                </div>
            </div>`;
    }).join("")}</div>`;
}
function renderCalendarDay() {
    const dateStr = getLocalDate(calendarAnchorDate);
    $("calendar-range-label").textContent = calendarAnchorDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const sessions = currentUser.exercises.filter(x => x.date === dateStr);

    $("calendar-body").innerHTML = `<div class="calendar-day-agenda">${
        sessions.length === 0
            ? `<div class="calendar-day-empty" style="padding: 30px;"><i class="fa-solid fa-calendar-xmark" style="font-size:1.4rem; display:block; margin-bottom:8px;"></i>Aucune séance enregistrée ce jour-là.</div>`
            : sessions.map(s => `<div class="calendar-agenda-item"><div class="calendar-agenda-icon"><i class="fa-solid ${EXERCISE_ICONS[s.type] || "fa-dumbbell"}"></i></div><div class="calendar-agenda-details"><strong>${s.name}</strong><span>${s.duration} min · ${s.calories} kcal</span></div></div>`).join("")
    }</div>`;
}

// --- utilitaires ---
function getLocalDate(date = new Date()) {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split("T")[0];
}
function formatDate(str) {
    if (!str) return "";
    const [year, month, day] = str.split("-");
    return `${day}/${month}/${year}`;
}