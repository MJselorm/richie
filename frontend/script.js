/* ========================================
   SUPABASE CLIENT
   ======================================== */

const SUPABASE_URL = "https://0ec90b57d6e95fcbda19832f.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ========================================
   STATE
   ======================================== */

let currentUser = null;
let allCourses = [];
let myEnrollments = [];
let myNotes = [];
let editingNoteId = null;

/* ========================================
   AUTH — TAB SWITCHING
   ======================================== */

function switchTab(tabName, event) {
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(tabName).classList.add('active');
    if (event && event.target) event.target.classList.add('active');

    const title = document.getElementById('formTitle');
    const subtitle = document.getElementById('formSubtitle');
    if (tabName === 'signup') {
        title.textContent = 'Create your account';
        subtitle.textContent = 'Join StudyHub and start learning today.';
    } else {
        title.textContent = 'Welcome back';
        subtitle.textContent = 'Sign in to continue your learning journey.';
    }

    clearFieldErrors();
}

/* ========================================
   AUTH — SIGNUP
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    if (signupForm) signupForm.addEventListener('submit', signup);

    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', login);

    setupPasswordToggles();
    setupLiveValidation();

    checkSession();
});

async function signup(event) {
    event.preventDefault();

    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const confirm = document.getElementById("signupConfirm").value;

    clearFieldErrors();

    let valid = true;
    if (!email) { setFieldError('signupEmailError', 'Email is required'); valid = false; }
    else if (!isValidEmail(email)) { setFieldError('signupEmailError', 'Enter a valid email address'); valid = false; }

    if (!password) { setFieldError('signupPasswordError', 'Password is required'); valid = false; }
    else if (password.length < 8) { setFieldError('signupPasswordError', 'Password must be at least 8 characters'); valid = false; }

    if (!confirm) { setFieldError('signupConfirmError', 'Please confirm your password'); valid = false; }
    else if (password !== confirm) { setFieldError('signupConfirmError', 'Passwords do not match'); valid = false; }

    if (!valid) return;

    const btn = document.getElementById('signupBtn');
    setLoading(btn, true);

    try {
        const { data, error } = await sb.auth.signUp({ email, password });

        if (error) {
            if (error.message.toLowerCase().includes('already')) {
                showError('An account with this email already exists. Try signing in.');
            } else {
                showError(error.message || 'Sign up failed. Please try again.');
            }
            return;
        }

        if (data.user) {
            showSuccess('Account created! Please sign in.');
            setTimeout(() => switchTab('login', { target: document.querySelector('.tab-btn') }), 1500);
            document.getElementById('signupEmail').value = '';
            document.getElementById('signupPassword').value = '';
            document.getElementById('signupConfirm').value = '';
        }
    } catch (err) {
        showError('Connection error. Please check your internet.');
        console.error(err);
    } finally {
        setLoading(btn, false);
    }
}

/* ========================================
   AUTH — LOGIN
   ======================================== */

async function login(event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    clearFieldErrors();

    let valid = true;
    if (!email) { setFieldError('loginEmailError', 'Email is required'); valid = false; }
    else if (!isValidEmail(email)) { setFieldError('loginEmailError', 'Enter a valid email address'); valid = false; }

    if (!password) { setFieldError('loginPasswordError', 'Password is required'); valid = false; }

    if (!valid) return;

    const btn = document.getElementById('loginBtn');
    setLoading(btn, true);

    try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });

        if (error) {
            if (error.message.toLowerCase().includes('invalid')) {
                setFieldError('loginPasswordError', 'Incorrect email or password');
            } else {
                showError(error.message || 'Sign in failed.');
            }
            return;
        }

        if (data.user) {
            currentUser = data.user;
            showSuccess('Welcome back!');
            setTimeout(() => showDashboard(), 600);
        }
    } catch (err) {
        showError('Connection error. Please check your internet.');
        console.error(err);
    } finally {
        setLoading(btn, false);
    }
}

/* ========================================
   AUTH — LOGOUT & SESSION
   ======================================== */

async function logout() {
    await sb.auth.signOut();
    currentUser = null;
    allCourses = [];
    myEnrollments = [];
    myNotes = [];
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('auth').style.display = 'flex';
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
}

async function checkSession() {
    const { data: { session } } = await sb.auth.getSession();
    if (session && session.user) {
        currentUser = session.user;
        showDashboard();
    }
}

/* ========================================
   DASHBOARD — SHOW
   ======================================== */

function showDashboard() {
    document.getElementById('auth').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';

    const email = currentUser.email || '';
    document.getElementById('dashUserEmail').textContent = email;
    document.getElementById('dashAvatar').textContent = email.charAt(0).toUpperCase();

    loadDashboard();
}

async function loadDashboard() {
    await Promise.all([loadCourses(), loadEnrollments(), loadNotes()]);
    renderStats();
    renderMyCourses();
    renderCatalog();
    renderNotes();
}

/* ========================================
   DASHBOARD — TABS
   ======================================== */

function switchDashTab(tabName, event) {
    document.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));

    document.getElementById(tabName).classList.add('active');
    if (event && event.target) event.target.classList.add('active');
}

/* ========================================
   DATA LOADING
   ======================================== */

async function loadCourses() {
    const { data, error } = await sb.from('courses').select('*').order('title');
    if (error) { console.error('Failed to load courses', error); return; }
    allCourses = data || [];
}

async function loadEnrollments() {
    const { data, error } = await sb.from('enrollments').select('*, courses(*)').order('created_at', { ascending: false });
    if (error) { console.error('Failed to load enrollments', error); return; }
    myEnrollments = data || [];
}

async function loadNotes() {
    const { data, error } = await sb.from('notes').select('*, courses(title)').order('updated_at', { ascending: false });
    if (error) { console.error('Failed to load notes', error); return; }
    myNotes = data || [];
}

/* ========================================
   STATS
   ======================================== */

function renderStats() {
    document.getElementById('statEnrolled').textContent = myEnrollments.length;
    const completed = myEnrollments.filter(e => e.progress >= 100).length;
    document.getElementById('statCompleted').textContent = completed;

    const hours = myEnrollments.reduce((sum, e) => {
        const course = e.courses || allCourses.find(c => c.id === e.course_id);
        if (!course) return sum;
        return sum + Math.round(course.duration_hours * (e.progress / 100));
    }, 0);
    document.getElementById('statHours').textContent = hours + 'h';

    document.getElementById('statNotes').textContent = myNotes.length;
}

/* ========================================
   MY COURSES
   ======================================== */

function renderMyCourses() {
    const grid = document.getElementById('myCoursesGrid');

    if (myEnrollments.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" width="48" height="48">
                    <path d="M12 4 3 8.5 12 13l9-4.5L12 4Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                    <path d="M6.5 10.5V15c0 1 2.5 2.5 5.5 2.5s5.5-1.5 5.5-2.5v-4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <h3>No courses yet</h3>
                <p>Browse the catalog and enroll in your first course.</p>
            </div>`;
        return;
    }

    grid.innerHTML = myEnrollments.map(enrollment => {
        const course = enrollment.courses || allCourses.find(c => c.id === enrollment.course_id);
        if (!course) return '';
        return courseCardHTML(course, enrollment.progress, true);
    }).join('');
}

/* ========================================
   CATALOG
   ======================================== */

function renderCatalog() {
    const grid = document.getElementById('catalogGrid');
    const enrolledIds = new Set(myEnrollments.map(e => e.course_id));

    if (allCourses.length === 0) {
        grid.innerHTML = '<div class="empty-state"><h3>No courses available</h3><p>Check back later.</p></div>';
        return;
    }

    grid.innerHTML = allCourses.map(course => {
        const enrolled = enrolledIds.has(course.id);
        const progress = enrolled ? (myEnrollments.find(e => e.course_id === course.id)?.progress || 0) : null;
        return courseCardHTML(course, progress, enrolled);
    }).join('');
}

function courseCardHTML(course, progress, enrolled) {
    const initials = course.title.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const levelClass = `level-${course.level.toLowerCase()}`;

    let progressHTML = '';
    if (enrolled && progress !== null) {
        const isComplete = progress >= 100;
        progressHTML = `
            <div class="progress-section">
                <div class="progress-bar">
                    <div class="progress-fill ${isComplete ? 'complete' : ''}" style="width:${progress}%"></div>
                </div>
                <span class="progress-text ${isComplete ? 'complete' : ''}">${isComplete ? 'Completed' : progress + '% complete'}</span>
            </div>`;
    }

    let actionHTML = '';
    if (!enrolled) {
        actionHTML = `<div class="course-actions"><button class="btn-enroll" onclick="enrollCourse('${course.id}', event)">Enroll Now</button></div>`;
    }

    return `
        <div class="course-card" onclick="openCourseModal('${course.id}')">
            <div class="course-thumb" style="background: linear-gradient(135deg, ${course.thumbnail_color}, ${darkenColor(course.thumbnail_color, 25)})">
                ${initials}
            </div>
            <div class="course-body">
                <span class="course-category">${course.category}</span>
                <h3 class="course-title">${escapeHTML(course.title)}</h3>
                <p class="course-desc">${escapeHTML(course.description)}</p>
                <div class="course-meta">
                    <span>
                        <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.8"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                        ${escapeHTML(course.instructor)}
                    </span>
                    <span>
                        <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                        ${course.duration_hours}h
                    </span>
                </div>
                <span class="course-level ${levelClass}">${course.level}</span>
                ${progressHTML}
                ${actionHTML}
            </div>
        </div>`;
}

/* ========================================
   ENROLL
   ======================================== */

async function enrollCourse(courseId, event) {
    if (event) { event.stopPropagation(); }

    const btn = event?.target;
    if (btn) { btn.textContent = 'Enrolling...'; btn.disabled = true; }

    const { error } = await sb.from('enrollments').insert({ course_id: courseId });

    if (error) {
        if (error.code === '23505') {
            showSuccess('You are already enrolled in this course.');
        } else {
            showError('Failed to enroll. Please try again.');
            console.error(error);
        }
        if (btn) { btn.textContent = 'Enroll Now'; btn.disabled = false; }
        return;
    }

    showSuccess('Enrolled successfully!');
    await loadEnrollments();
    renderStats();
    renderMyCourses();
    renderCatalog();
}

/* ========================================
   COURSE DETAIL MODAL
   ======================================== */

function openCourseModal(courseId) {
    const course = allCourses.find(c => c.id === courseId);
    if (!course) return;

    const enrollment = myEnrollments.find(e => e.course_id === courseId);
    const progress = enrollment ? enrollment.progress : 0;
    const initials = course.title.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const levelClass = `level-${course.level.toLowerCase()}`;

    const body = document.getElementById('courseModalBody');
    body.innerHTML = `
        <div class="course-detail">
            <div class="course-detail-thumb" style="background: linear-gradient(135deg, ${course.thumbnail_color}, ${darkenColor(course.thumbnail_color, 25)})">
                ${initials}
            </div>
            <span class="course-category">${course.category}</span>
            <h2>${escapeHTML(course.title)}</h2>
            <div class="course-detail-meta">
                <span class="course-level ${levelClass}">${course.level}</span>
                <span class="course-meta">
                    <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.8"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                    ${escapeHTML(course.instructor)}
                </span>
                <span class="course-meta">
                    <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                    ${course.duration_hours} hours
                </span>
            </div>
            <p class="course-detail-desc">${escapeHTML(course.description)}</p>
            ${enrollment ? `
                <div class="course-detail-section">
                    <h3>Your Progress</h3>
                    <div class="progress-control">
                        <input type="range" min="0" max="100" value="${progress}" id="progressSlider" oninput="updateProgressDisplay(this.value)">
                        <span class="progress-value" id="progressDisplay">${progress}%</span>
                    </div>
                    <button class="btn btn-primary btn-block" style="margin-top:1rem" onclick="saveProgress('${courseId}')">
                        <span class="btn-label">Save Progress</span>
                    </button>
                </div>
            ` : `
                <button class="btn btn-primary btn-block" onclick="enrollFromModal('${courseId}')">
                    <span class="btn-label">Enroll in this Course</span>
                </button>
            `}
        </div>
    `;

    document.getElementById('courseModal').style.display = 'flex';
}

function closeCourseModal() {
    document.getElementById('courseModal').style.display = 'none';
}

function updateProgressDisplay(value) {
    document.getElementById('progressDisplay').textContent = value + '%';
}

async function saveProgress(courseId) {
    const slider = document.getElementById('progressSlider');
    const progress = parseInt(slider.value);

    const { error } = await sb.from('enrollments')
        .update({ progress })
        .eq('course_id', courseId);

    if (error) {
        showError('Failed to save progress.');
        console.error(error);
        return;
    }

    showSuccess('Progress saved!');
    await loadEnrollments();
    renderStats();
    renderMyCourses();
    renderCatalog();
    closeCourseModal();
}

async function enrollFromModal(courseId) {
    const { error } = await sb.from('enrollments').insert({ course_id: courseId });

    if (error) {
        showError('Failed to enroll. Please try again.');
        console.error(error);
        return;
    }

    showSuccess('Enrolled successfully!');
    await loadEnrollments();
    renderStats();
    renderMyCourses();
    renderCatalog();
    openCourseModal(courseId);
}

/* ========================================
   NOTES — RENDER
   ======================================== */

function renderNotes() {
    const grid = document.getElementById('notesGrid');

    if (myNotes.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" width="48" height="48">
                    <path d="M4 4h16v16H4zM4 9h16M9 9v11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <h3>No notes yet</h3>
                <p>Create your first study note to get started.</p>
            </div>`;
        return;
    }

    grid.innerHTML = myNotes.map(note => `
        <div class="note-card">
            <span class="note-course-tag">${escapeHTML(note.courses?.title || 'Unknown course')}</span>
            <div class="note-card-head">
                <h3 class="note-title">${escapeHTML(note.title)}</h3>
            </div>
            <p class="note-content">${escapeHTML(note.content)}</p>
            <span class="note-date">Updated ${formatDate(note.updated_at)}</span>
            <div class="note-actions">
                <button onclick="editNote('${note.id}')">Edit</button>
                <button class="note-delete" onclick="deleteNote('${note.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

/* ========================================
   NOTES — MODAL (CREATE / EDIT)
   ======================================== */

function openNoteModal() {
    editingNoteId = null;
    document.getElementById('noteModalTitle').textContent = 'New Note';
    document.getElementById('noteForm').reset();
    populateNoteCourseSelect();
    document.getElementById('noteModal').style.display = 'flex';
}

function editNote(noteId) {
    const note = myNotes.find(n => n.id === noteId);
    if (!note) return;

    editingNoteId = noteId;
    document.getElementById('noteModalTitle').textContent = 'Edit Note';
    document.getElementById('noteCourse').value = note.course_id;
    document.getElementById('noteTitle').value = note.title;
    document.getElementById('noteContent').value = note.content;
    document.getElementById('noteModal').style.display = 'flex';
}

function closeNoteModal() {
    document.getElementById('noteModal').style.display = 'none';
    editingNoteId = null;
}

function populateNoteCourseSelect() {
    const select = document.getElementById('noteCourse');
    const enrolledCourses = myEnrollments.map(e => {
        const course = e.courses || allCourses.find(c => c.id === e.course_id);
        return course;
    }).filter(Boolean);

    if (enrolledCourses.length === 0) {
        select.innerHTML = '<option value="">Enroll in a course first</option>';
        select.disabled = true;
    } else {
        select.disabled = false;
        select.innerHTML = enrolledCourses.map(c =>
            `<option value="${c.id}">${escapeHTML(c.title)}</option>`
        ).join('');
    }
}

async function saveNote(event) {
    event.preventDefault();

    const courseId = document.getElementById('noteCourse').value;
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();

    if (!courseId) {
        showError('Please select a course.');
        return;
    }
    if (!title) {
        showError('Please enter a title.');
        return;
    }

    const btn = document.getElementById('noteSaveBtn');
    setLoading(btn, true);

    try {
        if (editingNoteId) {
            const { error } = await sb.from('notes')
                .update({ title, content, course_id: courseId })
                .eq('id', editingNoteId);

            if (error) throw error;
            showSuccess('Note updated!');
        } else {
            const { error } = await sb.from('notes')
                .insert({ title, content, course_id: courseId });

            if (error) throw error;
            showSuccess('Note created!');
        }

        closeNoteModal();
        await loadNotes();
        renderStats();
        renderNotes();
    } catch (err) {
        showError('Failed to save note.');
        console.error(err);
    } finally {
        setLoading(btn, false);
    }
}

async function deleteNote(noteId) {
    if (!confirm('Delete this note? This cannot be undone.')) return;

    const { error } = await sb.from('notes').delete().eq('id', noteId);

    if (error) {
        showError('Failed to delete note.');
        console.error(error);
        return;
    }

    showSuccess('Note deleted.');
    await loadNotes();
    renderStats();
    renderNotes();
}

/* ========================================
   PASSWORD TOGGLES
   ======================================== */

function setupPasswordToggles() {
    document.querySelectorAll('.toggle-pwd').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            if (!input) return;

            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';

            btn.querySelector('.eye-open').style.display = isPassword ? 'none' : 'block';
            btn.querySelector('.eye-closed').style.display = isPassword ? 'block' : 'none';
            btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
        });
    });
}

/* ========================================
   LIVE VALIDATION
   ======================================== */

function setupLiveValidation() {
    const fields = [
        { id: 'loginEmail', errorId: 'loginEmailError', validate: (v) => {
            if (!v) return 'Email is required';
            if (!isValidEmail(v)) return 'Enter a valid email address';
            return '';
        }},
        { id: 'signupEmail', errorId: 'signupEmailError', validate: (v) => {
            if (!v) return 'Email is required';
            if (!isValidEmail(v)) return 'Enter a valid email address';
            return '';
        }},
        { id: 'signupPassword', errorId: 'signupPasswordError', validate: (v) => {
            if (!v) return 'Password is required';
            if (v.length < 8) return 'Password must be at least 8 characters';
            return '';
        }},
        { id: 'signupConfirm', errorId: 'signupConfirmError', validate: (v) => {
            const pwd = document.getElementById('signupPassword').value;
            if (!v) return 'Please confirm your password';
            if (pwd && v !== pwd) return 'Passwords do not match';
            return '';
        }},
    ];

    fields.forEach(f => {
        const input = document.getElementById(f.id);
        if (!input) return;
        input.addEventListener('blur', () => {
            const err = f.validate(input.value.trim());
            if (err) setFieldError(f.errorId, err);
            else clearFieldError(f.errorId);
        });
        input.addEventListener('input', () => {
            if (input.classList.contains('input-error')) {
                const err = f.validate(input.value.trim());
                if (!err) clearFieldError(f.errorId);
            }
        });
    });
}

/* ========================================
   FIELD ERROR HELPERS
   ======================================== */

function setFieldError(errorId, message) {
    const el = document.getElementById(errorId);
    if (!el) return;
    el.textContent = message;
    const input = el.previousElementSibling?.querySelector('input') || el.closest('.form-group')?.querySelector('input');
    if (input) input.classList.add('input-error');
}

function clearFieldError(errorId) {
    const el = document.getElementById(errorId);
    if (!el) return;
    el.textContent = '';
    const input = el.previousElementSibling?.querySelector('input') || el.closest('.form-group')?.querySelector('input');
    if (input) input.classList.remove('input-error');
}

function clearFieldErrors() {
    document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
}

/* ========================================
   LOADING STATE HELPER
   ======================================== */

function setLoading(btn, loading) {
    if (!btn) return;
    if (loading) btn.classList.add('loading');
    else btn.classList.remove('loading');
}

/* ========================================
   TOAST ALERTS
   ======================================== */

function showError(message) {
    showToast(message, 'error');
}

function showSuccess(message) {
    showToast(message, 'success');
}

function showToast(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    document.body.appendChild(alert);
    setTimeout(() => {
        alert.style.opacity = '0';
        alert.style.transform = 'translateY(-10px)';
        alert.style.transition = 'opacity 0.3s, transform 0.3s';
        setTimeout(() => alert.remove(), 300);
    }, 3500);
}

/* ========================================
   UTILITIES
   ======================================== */

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = (now - d) / 1000;

    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function darkenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - Math.round(255 * percent / 100));
    const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * percent / 100));
    const b = Math.max(0, (num & 0xff) - Math.round(255 * percent / 100));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

/* Close modals on overlay click */
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.style.display = 'none';
    }
});

/* Close modals on Escape */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(m => {
            if (m.style.display === 'flex') m.style.display = 'none';
        });
    }
});
