const AUTH_API = "http://localhost:8000/auth";
const PROFILE_API = "http://localhost:8000/profile";
// const AUTH_API = "https://richie-iynf.onrender.com/auth";
// const PROFILE_API = "https://richie-iynf.onrender.com/profile";

let currentProfile = null;

function switchTab(tabName, clickedButton) {
    document.getElementById("login").classList.remove("active");
    document.getElementById("signup").classList.remove("active");

    document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.classList.remove("active");
    });

    document.getElementById(tabName).classList.add("active");

    const activeButton =
        clickedButton ||
        document.querySelector(`.tab-btn[onclick*="${tabName}"]`);
    if (activeButton) activeButton.classList.add("active");

    const title = document.getElementById("formTitle");
    const subtitle = document.getElementById("formSubtitle");
    if (!title || !subtitle) return;

    if (tabName === "signup") {
        title.textContent = "Create your account";
        subtitle.textContent = "Join StudyHub and start learning today.";
    } else {
        title.textContent = "Welcome back";
        subtitle.textContent = "Sign in to continue your learning journey.";
    }
}

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
        const res = await fetch(`${AUTH_API}/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await readJson(res);

        if (res.ok) {
            showSuccess("Account created! Please sign in.");
            document.getElementById("signupEmail").value = "";
            document.getElementById("signupPassword").value = "";
            document.getElementById("signupConfirm").value = "";
            setTimeout(() => switchTab("login"), 800);
        } else {
            showError(getApiError(data, "Sign up failed. Please try again."));
        }
    } catch (error) {
        showError("Connection error. Please check your backend.");
        console.error(error);
    }
}

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
        const res = await fetch(`${AUTH_API}/signin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await readJson(res);

        if (res.ok && data.access_token) {
            localStorage.setItem("token", data.access_token);
            localStorage.setItem("userEmail", email);
            if (data.user?.id) localStorage.setItem("userId", data.user.id);
            showSuccess("Welcome back!");
            await loadDashboard();
        } else {
            showError(getApiError(data, "Invalid email or password"));
        }
    } catch (error) {
        showError("Connection error. Please check your backend.");
        console.error(error);
    }
}

async function loadDashboard() {
    const token = localStorage.getItem("token");
    if (!token) {
        showAuth();
        return;
    }

    try {
        const res = await fetch(`${PROFILE_API}/me`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await readJson(res);
        if (!res.ok) {
            throw new Error(getApiError(data, "Unable to load profile"));
        }

        currentProfile = data;
        showDashboard();
        renderProfile(data);
    } catch (error) {
        console.error(error);
        showError(error.message || "Could not load your dashboard");
        logout(false);
    }
}

function showAuth() {
    document.getElementById("authPage").style.display = "flex";
    document.getElementById("dashboardApp").style.display = "none";
}

function showDashboard() {
    document.getElementById("authPage").style.display = "none";
    document.getElementById("dashboardApp").style.display = "grid";
    showView("dashboard");
}

function renderProfile(profile) {
    const displayName = profile.full_name || "Student";
    const email = profile.email || localStorage.getItem("userEmail") || "";
    const avatarUrl = profile.avatar_url || "";
    const initials = getInitials(displayName, email);

    setText("topbarName", displayName);
    setText("topbarEmail", email);
    setText("studentName", displayName);
    setText("studentEmail", email);
    setText("profileInitials", initials);

    setText("statProgram", profile.program || "Not set");
    setText("statDepartment", profile.department || "Not set");
    setText("statLevel", profile.level || "Not set");
    setText("statStudentId", profile.student_id || "Not set");

    renderAvatar("topbarAvatar", avatarUrl);
    renderAvatar("profileAvatar", avatarUrl);
    document.getElementById("profileInitials").style.display = avatarUrl ? "none" : "grid";

    const details = [
        ["Full Name", displayName],
        ["Email", email],
        ["Student ID", profile.student_id || "Not set"],
        ["Program", profile.program || "Not set"],
        ["Department", profile.department || "Not set"],
        ["Level", profile.level || "Not set"],
        ["Phone", profile.phone || "Not set"],
        ["Role", profile.role || "user"],
    ];

    const detailsNode = document.getElementById("profileDetails");
    detailsNode.innerHTML = "";
    details.forEach(([label, value]) => {
        const term = document.createElement("dt");
        const description = document.createElement("dd");
        term.textContent = label;
        description.textContent = value;
        detailsNode.append(term, description);
    });

    fillSettingsForm(profile);
}

function fillSettingsForm(profile) {
    setValue("fullName", profile.full_name || "");
    setValue("avatarUrl", profile.avatar_url || "");
    setValue("studentId", profile.student_id || "");
    setValue("program", profile.program || "");
    setValue("department", profile.department || "");
    setValue("level", profile.level || "");
    setValue("phone", profile.phone || "");
    setValue("settingsEmail", profile.email || localStorage.getItem("userEmail") || "");
}

async function saveProfile(event) {
    event.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) {
        showError("Please sign in again");
        showAuth();
        return;
    }

    const updates = {
        full_name: getValue("fullName"),
        avatar_url: getValue("avatarUrl"),
        student_id: getValue("studentId"),
        program: getValue("program"),
        department: getValue("department"),
        level: getValue("level"),
        phone: getValue("phone"),
    };

    try {
        const res = await fetch(`${PROFILE_API}/me`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updates),
        });

        const data = await readJson(res);
        if (!res.ok) {
            throw new Error(getApiError(data, "Profile update failed"));
        }

        currentProfile = data;
        renderProfile(data);
        showSuccess("Profile updated");
        showView("dashboard");
    } catch (error) {
        console.error(error);
        showError(error.message || "Profile update failed");
    }
}

function showView(viewName) {
    document.querySelectorAll(".view").forEach((view) => {
        view.classList.remove("active-view");
    });
    document.querySelectorAll(".nav-item").forEach((item) => {
        item.classList.toggle("active", item.dataset.view === viewName);
    });

    const title = toTitle(viewName);
    setText("pageTitle", title);

    if (viewName === "dashboard") {
        document.getElementById("dashboardView").classList.add("active-view");
    } else if (viewName === "settings") {
        document.getElementById("settingsView").classList.add("active-view");
    } else {
        setText("placeholderTitle", title);
        document.getElementById("placeholderView").classList.add("active-view");
    }

    toggleSidebar(false);
}

function toggleSidebar(forceState) {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    const shouldOpen =
        typeof forceState === "boolean" ? forceState : !sidebar.classList.contains("open");

    sidebar.classList.toggle("open", shouldOpen);
    overlay.classList.toggle("show", shouldOpen);
}

function logout(reload = true) {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userId");
    currentProfile = null;

    if (reload) {
        location.reload();
    } else {
        showAuth();
    }
}

function setupNavigation() {
    document.querySelectorAll(".nav-item").forEach((item) => {
        item.addEventListener("click", () => showView(item.dataset.view));
    });
}

function renderAvatar(id, src) {
    const image = document.getElementById(id);
    if (!image) return;

    if (src) {
        image.src = src;
        image.style.display = "block";
    } else {
        image.removeAttribute("src");
        image.style.display = "none";
    }
}

function getInitials(name, email) {
    const source = name && name !== "Student" ? name : email;
    return source
        .split(/[ @._-]/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("") || "S";
}

function getValue(id) {
    return document.getElementById(id).value.trim();
}

function setValue(id, value) {
    document.getElementById(id).value = value;
}

function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
}

function toTitle(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function readJson(response) {
    try {
        return await response.json();
    } catch {
        return {};
    }
}

function getApiError(data, fallback) {
    if (!data) return fallback;
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) return data.detail[0]?.msg || fallback;
    return data.message || fallback;
}

function showError(message) {
    showAlert(message, "error");
}

function showSuccess(message) {
    showAlert(message, "success");
}

function showAlert(message, type) {
    const alert = document.createElement("div");
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 4000);
}

window.addEventListener("load", () => {
    setupNavigation();

    if (localStorage.getItem("token")) {
        loadDashboard();
    }
});
