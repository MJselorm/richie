const API = "http://localhost:8000/auth";

/* ========================================
   DATA MANAGEMENT
   ======================================== */

let appData = {
    courses: [],
    assignments: [],
    sessions: [],
    achievements: [],
    streak: 0,
    lastStudyDate: null
};

function loadData() {
    const saved = localStorage.getItem('studyHubData');
    if (saved) {
        appData = JSON.parse(saved);
    }
}

function saveData() {
    localStorage.setItem('studyHubData', JSON.stringify(appData));
}

/* ========================================
   TAB SWITCHING (AUTH)
   ======================================== */

function switchTab(tabName) {
    document.getElementById('login').classList.remove('active');
    document.getElementById('signup').classList.remove('active');
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabName).classList.add('active');
    
    if (event && event.target) {
        event.target.classList.add('active');
    }

    const title = document.getElementById('formTitle');
    const subtitle = document.getElementById('formSubtitle');
    if (title && subtitle) {
        if (tabName === 'signup') {
            title.textContent = 'Create your account';
            subtitle.textContent = 'Join StudyHub and start learning today.';
        } else {
            title.textContent = 'Welcome back';
            subtitle.textContent = 'Sign in to continue your learning journey.';
        }
    }
}

/* ========================================
   SIGNUP
   ======================================== */

async function signup(event) {
    event.preventDefault();
    
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const confirmPassword = document.getElementById("signupConfirm").value;
    
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
    
    if (!email || !password) {
        showError("Please enter your email and password");
        return;
    }
    
    if (!isValidEmail(email)) {
        showError("Please enter a valid email address");
        return;
    }
    
    try {
        const res = await fetch(`${API}/signin`, {
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
            loadData();
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

function showDashboard(email) {
    document.getElementById("auth").style.display = "none";
    document.getElementById("dashboard").style.display = "flex";
    document.getElementById("userEmail").textContent = email;
    switchDashboard('overview');
    updateDashboard();
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    location.reload();
}

function switchDashboard(section) {
    document.querySelectorAll('.dashboard-section').forEach(s => {
        s.classList.remove('active');
    });
    document.getElementById(section).classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    const sectionTitles = {
        'overview': { title: 'Welcome back', subtitle: 'Continue your learning journey' },
        'courses': { title: 'My Courses', subtitle: 'Manage your study subjects' },
        'assignments': { title: 'Assignments', subtitle: 'Track your tasks and deadlines' },
        'study-session': { title: 'Study Session', subtitle: 'Focus and make progress' },
        'analytics': { title: 'Analytics', subtitle: 'View your learning progress' },
        'calendar': { title: 'Calendar', subtitle: 'See deadlines and important dates' },
        'achievements': { title: 'Achievements', subtitle: 'Celebrate your progress' }
    };
    
    const sectionInfo = sectionTitles[section] || sectionTitles['overview'];
    document.getElementById('pageTitle').textContent = sectionInfo.title;
    document.getElementById('pageSubtitle').textContent = sectionInfo.subtitle;
    
    if (section === 'calendar') renderCalendar();
}

function toggleSidebar() {
    const sidebar = document.querySelector('.dashboard-sidebar');
    sidebar.classList.toggle('open');
}

function updateDashboard() {
    updateStats();
    renderCourses();
    renderAssignments();
    renderAchievements();
    updateUpcomingTasks();
    populateCourseSelects();
}

/* ========================================
   COURSES
   ======================================== */

function openCourseModal() {
    document.getElementById('courseModal').style.display = 'flex';
}

function closeCourseModal() {
    document.getElementById('courseModal').style.display = 'none';
    document.getElementById('courseName').value = '';
    document.getElementById('courseColor').value = 'blue';
}

function addCourse(event) {
    event.preventDefault();
    
    const name = document.getElementById('courseName').value;
    const color = document.getElementById('courseColor').value;
    
    const course = {
        id: Date.now(),
        name,
        color,
        progress: 0,
        assignments: 0,
        completedAssignments: 0,
        createdAt: new Date().toISOString()
    };
    
    appData.courses.push(course);
    saveData();
    renderCourses();
    populateCourseSelects();
    closeCourseModal();
    showSuccess(`Course "${name}" created!`);
}

function renderCourses() {
    const container = document.getElementById('coursesList');
    
    if (appData.courses.length === 0) {
        container.innerHTML = '<p class="empty-state">No courses yet. Create one to get started!</p>';
        return;
    }
    
    container.innerHTML = appData.courses.map(course => `
        <div class="course-card ${course.color}">
            <div class="course-header">
                <h3 class="course-title">${course.name}</h3>
            </div>
            <div class="course-body">
                <div class="course-stats">
                    <div class="course-stat">
                        <div class="course-stat-value">${course.progress}%</div>
                        <div class="course-stat-label">Progress</div>
                    </div>
                    <div class="course-stat">
                        <div class="course-stat-value">${course.completedAssignments}/${course.assignments}</div>
                        <div class="course-stat-label">Completed</div>
                    </div>
                </div>
                <div class="course-progress">
                    <div class="progress-label">Overall Progress</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${course.progress}%"></div>
                    </div>
                </div>
                <button onclick="deleteCourse(${course.id})" class="action-btn" style="background: #fee; color: #c33; border: none;">
                    ✕ Delete Course
                </button>
            </div>
        </div>
    `).join('');
}

function deleteCourse(courseId) {
    appData.courses = appData.courses.filter(c => c.id !== courseId);
    appData.assignments = appData.assignments.filter(a => a.courseId !== courseId);
    saveData();
    renderCourses();
    renderAssignments();
    populateCourseSelects();
    showSuccess('Course deleted');
}

function populateCourseSelects() {
    const selects = document.querySelectorAll('#assignmentCourse, #timerCourse');
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select a course (optional)</option>' +
            appData.courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        select.value = currentValue;
    });
}

/* ========================================
   ASSIGNMENTS
   ======================================== */

let currentAssignmentFilter = 'all';

function openAssignmentModal() {
    document.getElementById('assignmentModal').style.display = 'flex';
}

function closeAssignmentModal() {
    document.getElementById('assignmentModal').style.display = 'none';
    document.getElementById('assignmentTitle').value = '';
    document.getElementById('assignmentDueDate').value = '';
    document.getElementById('assignmentPriority').value = 'medium';
}

function addAssignment(event) {
    event.preventDefault();
    
    const title = document.getElementById('assignmentTitle').value;
    const courseId = document.getElementById('assignmentCourse').value;
    const dueDate = document.getElementById('assignmentDueDate').value;
    const priority = document.getElementById('assignmentPriority').value;
    
    const assignment = {
        id: Date.now(),
        title,
        courseId: courseId ? parseInt(courseId) : null,
        dueDate,
        priority,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    appData.assignments.push(assignment);
    
    // Update course assignment count
    if (courseId) {
        const course = appData.courses.find(c => c.id === parseInt(courseId));
        if (course) course.assignments++;
    }
    
    saveData();
    renderAssignments();
    updateStats();
    updateUpcomingTasks();
    closeAssignmentModal();
    showSuccess('Assignment added!');
}

function renderAssignments(filter = 'all') {
    const container = document.getElementById('assignmentsList');
    let filtered = appData.assignments;
    
    if (filter !== 'all') {
        if (filter === 'completed') {
            filtered = filtered.filter(a => a.completed);
        } else if (filter === 'pending') {
            filtered = filtered.filter(a => !a.completed);
        } else if (filter === 'overdue') {
            const today = new Date().toISOString().split('T')[0];
            filtered = filtered.filter(a => !a.completed && a.dueDate < today);
        }
    }
    
    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state">No assignments in this category</p>';
        return;
    }
    
    container.innerHTML = filtered.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .map(assignment => {
            const course = appData.courses.find(c => c.id === assignment.courseId);
            const courseName = course ? course.name : 'No Course';
            const daysUntil = Math.ceil((new Date(assignment.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
            const isOverdue = daysUntil < 0 && !assignment.completed;
            
            return `
                <div class="assignment-item">
                    <input type="checkbox" class="assignment-checkbox" ${assignment.completed ? 'checked' : ''} 
                        onchange="toggleAssignment(${assignment.id})">
                    <div class="assignment-content">
                        <div class="assignment-title ${assignment.completed ? 'completed' : ''}">${assignment.title}</div>
                        <div class="assignment-course">${courseName}</div>
                        <div class="assignment-meta">
                            <span class="due-date ${isOverdue ? 'overdue' : ''}">
                                Due: ${new Date(assignment.dueDate).toLocaleDateString()}
                            </span>
                            <span class="priority-badge priority-${assignment.priority}">${assignment.priority.toUpperCase()}</span>
                        </div>
                    </div>
                    <button class="assignment-remove" onclick="deleteAssignment(${assignment.id})">✕</button>
                </div>
            `;
        }).join('');
}

function filterAssignments(filter) {
    currentAssignmentFilter = filter;
    document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    renderAssignments(filter);
}

function toggleAssignment(assignmentId) {
    const assignment = appData.assignments.find(a => a.id === assignmentId);
    if (assignment) {
        assignment.completed = !assignment.completed;
        
        if (assignment.completed) {
            const course = appData.courses.find(c => c.id === assignment.courseId);
            if (course) {
                course.completedAssignments++;
                course.progress = Math.round((course.completedAssignments / course.assignments) * 100);
            }
            showSuccess('Great job! Assignment completed!');
        } else {
            const course = appData.courses.find(c => c.id === assignment.courseId);
            if (course && course.completedAssignments > 0) {
                course.completedAssignments--;
                course.progress = Math.round((course.completedAssignments / course.assignments) * 100);
            }
        }
        
        saveData();
        renderAssignments(currentAssignmentFilter);
        updateStats();
        renderCourses();
    }
}

function deleteAssignment(assignmentId) {
    const assignment = appData.assignments.find(a => a.id === assignmentId);
    if (assignment && assignment.courseId) {
        const course = appData.courses.find(c => c.id === assignment.courseId);
        if (course) course.assignments = Math.max(0, course.assignments - 1);
    }
    
    appData.assignments = appData.assignments.filter(a => a.id !== assignmentId);
    saveData();
    renderAssignments(currentAssignmentFilter);
    renderCourses();
}

function updateUpcomingTasks() {
    const container = document.getElementById('upcomingList');
    const upcoming = appData.assignments
        .filter(a => !a.completed)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5);
    
    if (upcoming.length === 0) {
        container.innerHTML = '<p class="empty-state">No upcoming tasks. Add one to get started!</p>';
        return;
    }
    
    container.innerHTML = upcoming.map(task => {
        const course = appData.courses.find(c => c.id === task.courseId);
        return `<div class="task-item">${task.title} (${course ? course.name : 'No Course'})</div>`;
    }).join('');
}

/* ========================================
   STUDY SESSION
   ======================================== */

let timerInterval = null;
let timerRunning = false;
let remainingSeconds = 25 * 60;
let isBreakTime = false;
let sessionsCompletedToday = 0;
let totalStudySeconds = 0;

function updateTimerDisplay() {
    const studyMinutes = parseInt(document.getElementById('studyMinutes').value) || 25;
    remainingSeconds = studyMinutes * 60;
    isBreakTime = false;
    updateDisplay();
}

function updateDisplay() {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    document.getElementById('timerDisplay').textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function startTimer() {
    if (timerRunning) return;
    
    timerRunning = true;
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('pauseBtn').style.display = 'inline-flex';
    
    timerInterval = setInterval(() => {
        remainingSeconds--;
        updateDisplay();
        
        if (remainingSeconds === 0) {
            completeSession();
        }
    }, 1000);
}

function pauseTimer() {
    timerRunning = false;
    clearInterval(timerInterval);
    document.getElementById('startBtn').style.display = 'inline-flex';
    document.getElementById('pauseBtn').style.display = 'none';
}

function resetTimer() {
    pauseTimer();
    updateTimerDisplay();
}

function completeSession() {
    pauseTimer();
    
    if (!isBreakTime) {
        const studyMinutes = parseInt(document.getElementById('studyMinutes').value) || 25;
        totalStudySeconds += studyMinutes * 60;
        sessionsCompletedToday++;
        
        const courseId = document.getElementById('timerCourse').value;
        if (courseId) {
            const course = appData.courses.find(c => c.id === parseInt(courseId));
            if (course) {
                course.progress = Math.min(100, course.progress + 5);
            }
        }
        
        const session = {
            id: Date.now(),
            courseId: courseId ? parseInt(courseId) : null,
            duration: studyMinutes,
            completedAt: new Date().toISOString()
        };
        appData.sessions.push(session);
        
        saveData();
        showSuccess(`Great work! Study session completed!`);
        
        // Start break
        isBreakTime = true;
        const breakMinutes = parseInt(document.getElementById('breakMinutes').value) || 5;
        remainingSeconds = breakMinutes * 60;
        updateDisplay();
    } else {
        // Break completed
        updateTimerDisplay();
        showSuccess('Break time over! Ready for another session?');
    }
    
    updateStats();
    renderCourses();
}

window.addEventListener('load', () => {
    updateDisplay();
    document.getElementById('sessionsCompleted').textContent = sessionsCompletedToday;
    document.getElementById('totalStudyTime').textContent = `${Math.floor(totalStudySeconds / 3600)}h ${Math.floor((totalStudySeconds % 3600) / 60)}m`;
});

/* ========================================
   STATISTICS
   ======================================== */

function updateStats() {
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = appData.sessions.filter(s => s.completedAt.startsWith(today));
    const todaySeconds = todaySessions.reduce((sum, s) => sum + (s.duration * 60), 0);
    
    document.getElementById('todayStudyTime').textContent = 
        `${Math.floor(todaySeconds / 3600)}h ${Math.floor((todaySeconds % 3600) / 60)}m`;
    
    document.getElementById('currentStreak').textContent = `${appData.streak} days`;
    document.getElementById('activeCourses').textContent = appData.courses.length;
    
    const completedThisWeek = appData.assignments.filter(a => {
        const daysAgo = (new Date() - new Date(a.createdAt)) / (1000 * 60 * 60 * 24);
        return a.completed && daysAgo < 7;
    }).length;
    document.getElementById('completedTasks').textContent = completedThisWeek;
}

/* ========================================
   ACHIEVEMENTS
   ======================================== */

const achievementsList = [
    { id: 1, name: 'First Steps', emoji: '👣', description: 'Complete your first session', condition: () => appData.sessions.length > 0 },
    { id: 2, name: 'Week Warrior', emoji: '⚔️', description: 'Study for 7 days', condition: () => appData.streak >= 7 },
    { id: 3, name: 'Month Master', emoji: '👑', description: 'Study for 30 days', condition: () => appData.streak >= 30 },
    { id: 4, name: 'Course Creator', emoji: '📚', description: 'Create 3 courses', condition: () => appData.courses.length >= 3 },
    { id: 5, name: 'Task Tracker', emoji: '✓', description: 'Complete 10 assignments', condition: () => appData.assignments.filter(a => a.completed).length >= 10 },
    { id: 6, name: 'Time Keeper', emoji: '⏱', description: 'Study 10 hours', condition: () => appData.sessions.reduce((sum, s) => sum + s.duration, 0) >= 600 },
    { id: 7, name: 'Perfect Week', emoji: '🌟', description: 'Study every day for a week', condition: () => appData.streak >= 7 && sessionsCompletedToday > 0 },
    { id: 8, name: 'Early Bird', emoji: '🐦', description: 'Start a session before 8am', condition: () => false }
];

function renderAchievements() {
    const container = document.getElementById('achievementsGrid');
    
    if (!container) return;
    
    container.innerHTML = achievementsList.map(achievement => {
        const unlocked = achievement.condition();
        return `
            <div class="achievement ${unlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-icon">${achievement.emoji}</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.description}</div>
            </div>
        `;
    }).join('');
    
    document.getElementById('streakCount').textContent = appData.streak;
}

/* ========================================
   CALENDAR
   ======================================== */

let currentDate = new Date();

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    document.getElementById('monthYear').textContent = 
        currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';
    
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const div = document.createElement('div');
        div.className = 'calendar-day other-month';
        div.textContent = day;
        grid.appendChild(div);
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const div = document.createElement('div');
        div.className = 'calendar-day';
        div.textContent = day;
        
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasEvent = appData.assignments.some(a => a.dueDate === dateStr && !a.completed);
        
        if (hasEvent) {
            div.classList.add('has-event');
        }
        
        if (dateStr === new Date().toISOString().split('T')[0]) {
            div.style.background = 'var(--primary)';
            div.style.color = '#fff';
            div.style.fontWeight = '700';
        }
        
        grid.appendChild(div);
    }
    
    // Next month days
    const totalCells = grid.children.length;
    for (let day = 1; totalCells + day <= 42; day++) {
        const div = document.createElement('div');
        div.className = 'calendar-day other-month';
        div.textContent = day;
        grid.appendChild(div);
    }
    
    updateCalendarEvents();
}

function updateCalendarEvents() {
    const container = document.getElementById('calendarEventsList');
    const upcomingEvents = appData.assignments
        .filter(a => !a.completed && a.dueDate >= new Date().toISOString().split('T')[0])
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5);
    
    if (upcomingEvents.length === 0) {
        container.innerHTML = '<p class="empty-state">No deadlines this month</p>';
        return;
    }
    
    container.innerHTML = upcomingEvents.map(event => {
        const course = appData.courses.find(c => c.id === event.courseId);
        return `
            <div class="event-item">
                <strong>${event.title}</strong>
                <br>
                <small>${course ? course.name : 'No Course'} • ${new Date(event.dueDate).toLocaleDateString()}</small>
            </div>
        `;
    }).join('');
}

function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
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
            z-index: 2000;
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
    loadData();
    
    const token = localStorage.getItem("token");
    const userEmail = localStorage.getItem("userEmail");
    
    if (token && userEmail) {
        showDashboard(userEmail);
    }
});