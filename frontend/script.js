const API = "https://richie-iynf.onrender.com/auth";

/* ========================================
   TAB SWITCHING
   ======================================== */

function switchTab(tabName) {
    // Hide all forms
    document.getElementById('login').classList.remove('active');
    document.getElementById('signup').classList.remove('active');
    
    // Remove active class from all tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected form
    document.getElementById(tabName).classList.add('active');
    
    // Add active class to clicked tab
    event.target.classList.add('active');
}

/* ========================================
   SIGNUP
   ======================================== */

async function signup(event) {
    event.preventDefault();
    
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const confirmPassword = document.getElementById("signupConfirm").value;
    
    // Validation
    if (!email || !password || !confirmPassword) {
        showError("Please fill in all fields");
        return;
    }
    
    if (password.length < 8) {
        showError("Password must be at least 8 characters");
        return;
    }
    
    if (password !== confirmPassword) {
        showError("Passwords do not match");
        return;
    }
    
    if (!isValidEmail(email)) {
        showError("Please enter a valid email address");
        return;
    }
    
    try {
        const res = await fetch(`${API}/signup`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            showSuccess("Account created! Please sign in.");
            setTimeout(() => switchTab('login'), 1500);
            document.getElementById('signupEmail').value = '';
            document.getElementById('signupPassword').value = '';
            document.getElementById('signupConfirm').value = '';
        } else {
            showError(data.message || "Sign up failed. Please try again.");
        }
    } catch (error) {
        showError("Connection error. Please check your internet.");
        console.error(error);
    }
}

/* ========================================
   LOGIN
   ======================================== */

async function login(event) {
    event.preventDefault();
    
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    
    // Validation
    if (!email || !password) {
        showError("Please enter your email and password");
        return;
    }
    
    if (!isValidEmail(email)) {
        showError("Please enter a valid email address");
        return;
    }
    
    try {
        const res = await fetch(`${API}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        });
        
        const data = await res.json();
        
        if (data.access_token) {
            localStorage.setItem("token", data.access_token);
            localStorage.setItem("userEmail", email);
            showSuccess("Welcome back!");
            setTimeout(() => showDashboard(email), 1000);
        } else {
            showError(data.message || "Invalid email or password");
        }
    } catch (error) {
        showError("Connection error. Please check your internet.");
        console.error(error);
    }
}

/* ========================================
   DASHBOARD
   ======================================== */

let currentUser = null;
let studyData = { tasks: [], courses: [], focusedMinutes: 0, streak: 1, lastActive: null };

function dataKey(email) {
    return `studyhub:${email}`;
}

function loadData(email) {
    const raw = localStorage.getItem(dataKey(email));
    if (raw) {
        try {
            studyData = JSON.parse(raw);
        } catch (e) {
            console.error("[v0] Failed to parse study data", e);
        }
    } else {
        // Seed a friendly starter so the dashboard isn't empty
        studyData = {
            tasks: [
                { id: 1, text: "Review lecture notes", done: false },
                { id: 2, text: "Finish problem set", done: false }
            ],
            courses: [
                { id: 1, name: "Mathematics", progress: 40 },
                { id: 2, name: "Computer Science", progress: 65 }
            ],
            focusedMinutes: 0,
            streak: 1,
            lastActive: new Date().toDateString()
        };
    }
    updateStreak();
}

function saveData() {
    if (!currentUser) return;
    localStorage.setItem(dataKey(currentUser), JSON.stringify(studyData));
}

function updateStreak() {
    const today = new Date().toDateString();
    if (studyData.lastActive !== today) {
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        studyData.streak = studyData.lastActive === yesterday ? (studyData.streak || 0) + 1 : 1;
        studyData.focusedMinutes = 0; // reset daily focus
        studyData.lastActive = today;
    }
}

function showDashboard(email) {
    currentUser = email;
    loadData(email);

    document.getElementById("auth").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    document.body.classList.add("dashboard-active");

    document.getElementById("user").textContent = email;
    document.getElementById("userInitial").textContent = email.charAt(0);

    const hour = new Date().getHours();
    const greet = hour < 12 ? "Good morning!" : hour < 18 ? "Good afternoon!" : "Good evening!";
    document.getElementById("greetingText").textContent = greet;

    renderTasks();
    renderCourses();
    renderStats();
    saveData();
}

/* ---------- Stats ---------- */

function renderStats() {
    const done = studyData.tasks.filter(t => t.done).length;
    const total = studyData.tasks.length;
    document.getElementById("statStreak").textContent = studyData.streak || 1;
    document.getElementById("statHours").textContent =
        (studyData.focusedMinutes >= 60
            ? (studyData.focusedMinutes / 60).toFixed(1) + "h"
            : (studyData.focusedMinutes || 0) + "m");
    document.getElementById("statTasks").textContent = `${done}/${total}`;
    document.getElementById("statCourses").textContent = studyData.courses.length;
}

/* ---------- Tasks ---------- */

function renderTasks() {
    const list = document.getElementById("taskList");
    const empty = document.getElementById("taskEmpty");
    list.innerHTML = "";

    if (studyData.tasks.length === 0) {
        empty.style.display = "block";
    } else {
        empty.style.display = "none";
        studyData.tasks.forEach(task => {
            const li = document.createElement("li");
            li.className = "task-item" + (task.done ? " done" : "");

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "task-check";
            checkbox.checked = task.done;
            checkbox.setAttribute("aria-label", "Mark task complete");
            checkbox.onchange = () => toggleTask(task.id);

            const span = document.createElement("span");
            span.className = "task-text";
            span.textContent = task.text;

            const del = document.createElement("button");
            del.className = "task-delete";
            del.type = "button";
            del.innerHTML = "&times;";
            del.setAttribute("aria-label", "Delete task");
            del.onclick = () => deleteTask(task.id);

            li.append(checkbox, span, del);
            list.appendChild(li);
        });
    }

    const remaining = studyData.tasks.filter(t => !t.done).length;
    document.getElementById("tasksMeta").textContent = `${remaining} remaining`;
}

function addTask(event) {
    event.preventDefault();
    const input = document.getElementById("taskInput");
    const text = input.value.trim();
    if (!text) return;
    studyData.tasks.push({ id: Date.now(), text, done: false });
    input.value = "";
    saveData();
    renderTasks();
    renderStats();
}

function toggleTask(id) {
    const task = studyData.tasks.find(t => t.id === id);
    if (task) task.done = !task.done;
    saveData();
    renderTasks();
    renderStats();
}

function deleteTask(id) {
    studyData.tasks = studyData.tasks.filter(t => t.id !== id);
    saveData();
    renderTasks();
    renderStats();
}

function openTaskInput() {
    document.getElementById("taskInput").focus();
}

/* ---------- Courses ---------- */

function renderCourses() {
    const list = document.getElementById("courseList");
    const empty = document.getElementById("courseEmpty");
    list.innerHTML = "";

    if (studyData.courses.length === 0) {
        empty.style.display = "block";
        return;
    }
    empty.style.display = "none";

    studyData.courses.forEach(course => {
        const li = document.createElement("li");
        li.className = "course-item";

        const head = document.createElement("div");
        head.className = "course-item-head";
        const name = document.createElement("span");
        name.className = "course-name";
        name.textContent = course.name;
        const pct = document.createElement("span");
        pct.className = "course-percent";
        pct.textContent = course.progress + "%";
        head.append(name, pct);

        const bar = document.createElement("div");
        bar.className = "course-bar";
        const fill = document.createElement("div");
        fill.className = "course-bar-fill";
        fill.style.width = course.progress + "%";
        bar.appendChild(fill);

        const actions = document.createElement("div");
        actions.className = "course-actions";
        const minus = document.createElement("button");
        minus.className = "course-step";
        minus.type = "button";
        minus.textContent = "−10%";
        minus.onclick = () => stepCourse(course.id, -10);
        const plus = document.createElement("button");
        plus.className = "course-step";
        plus.type = "button";
        plus.textContent = "+10%";
        plus.onclick = () => stepCourse(course.id, 10);
        actions.append(minus, plus);

        li.append(head, bar, actions);
        list.appendChild(li);
    });
}

function addCourse() {
    const name = prompt("Course name:");
    if (!name || !name.trim()) return;
    studyData.courses.push({ id: Date.now(), name: name.trim(), progress: 0 });
    saveData();
    renderCourses();
    renderStats();
}

function stepCourse(id, delta) {
    const course = studyData.courses.find(c => c.id === id);
    if (!course) return;
    course.progress = Math.max(0, Math.min(100, course.progress + delta));
    saveData();
    renderCourses();
}

/* ---------- Focus Timer ---------- */

const FOCUS_SECONDS = 25 * 60;
let timerRemaining = FOCUS_SECONDS;
let timerInterval = null;
let timerRunning = false;

function formatTime(seconds) {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
}

function toggleTimer() {
    const btn = document.getElementById("timerToggle");
    if (timerRunning) {
        clearInterval(timerInterval);
        timerRunning = false;
        btn.textContent = "Resume";
        return;
    }
    timerRunning = true;
    btn.textContent = "Pause";
    timerInterval = setInterval(() => {
        timerRemaining--;
        document.getElementById("timerDisplay").textContent = formatTime(timerRemaining);
        if (timerRemaining <= 0) {
            clearInterval(timerInterval);
            timerRunning = false;
            studyData.focusedMinutes = (studyData.focusedMinutes || 0) + 25;
            saveData();
            renderStats();
            showSuccess("Focus session complete! Great work.");
            resetTimer();
        }
    }, 1000);
}

function resetTimer() {
    clearInterval(timerInterval);
    timerRunning = false;
    timerRemaining = FOCUS_SECONDS;
    document.getElementById("timerDisplay").textContent = formatTime(timerRemaining);
    document.getElementById("timerToggle").textContent = "Start";
}

/* ---------- Logout ---------- */

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    location.reload();
}

/* ========================================
   UTILITY FUNCTIONS
   ======================================== */

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showError(message) {
    const alert = createAlert(message, 'error');
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 4000);
}

function showSuccess(message) {
    const alert = createAlert(message, 'success');
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 4000);
}

function createAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    const style = document.createElement('style');
    style.textContent = `
        .alert {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            font-size: 0.95rem;
            font-weight: 600;
            max-width: 350px;
            z-index: 1000;
            animation: slideInDown 0.3s ease-out;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        
        .alert-error {
            background-color: #fee;
            color: #c33;
            border-left: 4px solid #c33;
        }
        
        .alert-success {
            background-color: #efe;
            color: #3c3;
            border-left: 4px solid #3c3;
        }
        
        @keyframes slideInDown {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @media (max-width: 480px) {
            .alert {
                left: 20px;
                right: 20px;
                max-width: none;
            }
        }
    `;
    
    if (!document.querySelector('style[data-alert-style]')) {
        style.setAttribute('data-alert-style', 'true');
        document.head.appendChild(style);
    }
    
    return alert;
}

/* ========================================
   PAGE LOAD - Check if user is logged in
   ======================================== */

window.addEventListener('load', () => {
    const token = localStorage.getItem("token");
    const userEmail = localStorage.getItem("userEmail");
    
    if (token && userEmail) {
        showDashboard(userEmail);
    }
});
