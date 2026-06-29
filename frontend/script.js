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

    // Update the form heading to match the active tab
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
            showSuccess("Welcome back!");
            setTimeout(() => showProfile(email), 1000);
        } else {
            showError(data.message || "Invalid email or password");
        }
    } catch (error) {
        showError("Connection error. Please check your internet.");
        console.error(error);
    }
}

/* ========================================
   PROFILE MANAGEMENT
   ======================================== */

function showProfile(email) {
    document.getElementById("auth").style.display = "none";
    document.getElementById("profile").style.display = "block";
    document.getElementById("user").textContent = email;

    // Pull richer profile details from the backend and render the dashboard.
    loadDashboard(email);
}

async function loadDashboard(email) {
    const token = localStorage.getItem("token");
    const grid = document.getElementById("dashGrid");
    const greeting = document.getElementById("dashGreeting");
    const avatar = document.getElementById("dashAvatar");

    if (grid) {
        grid.innerHTML = renderSkeletonCards();
    }

    if (!token) {
        return;
    }

    try {
        const res = await fetch(`${API}/profile`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await res.json();

        if (!res.ok) {
            if (res.status === 401) {
                showError("Your session expired. Please sign in again.");
                setTimeout(logout, 1500);
                return;
            }
            throw new Error(data.detail || "Could not load your profile");
        }

        const profile = data.profile || {};
        const displayName = profile.full_name || profile.name || profile.username || email.split("@")[0];

        if (greeting) {
            greeting.textContent = `Welcome, ${displayName}!`;
        }

        if (avatar && profile.avatar_url) {
            avatar.innerHTML = `<img src="${escapeHtml(profile.avatar_url)}" alt="Your profile picture">`;
        }

        renderProfileCards(email, profile);
    } catch (error) {
        console.error(error);
        if (grid) {
            grid.innerHTML = `
                <div class="dash-card dash-card-empty">
                    <p>We couldn't load your profile details right now.</p>
                </div>`;
        }
    }
}

/* Pretty labels for known profile columns */
const PROFILE_LABELS = {
    full_name: "Full name",
    name: "Name",
    username: "Username",
    bio: "Bio",
    role: "Role",
    school: "School",
    phone: "Phone",
    website: "Website",
    location: "Location",
    created_at: "Member since",
    updated_at: "Last updated"
};

const PROFILE_HIDDEN_FIELDS = ["id", "user_id", "avatar_url"];

function renderProfileCards(email, profile) {
    const grid = document.getElementById("dashGrid");
    if (!grid) return;

    const cards = [];

    // Always show the account email first.
    cards.push(buildCard("Email address", email));

    const entries = Object.entries(profile || {})
        .filter(([key, value]) => !PROFILE_HIDDEN_FIELDS.includes(key) && value !== null && value !== "");

    if (entries.length === 0) {
        cards.push(`
            <div class="dash-card dash-card-empty">
                <p>Your profile is empty. Add some details to personalize your dashboard.</p>
            </div>`);
    } else {
        for (const [key, value] of entries) {
            const label = PROFILE_LABELS[key] || prettifyKey(key);
            let display = value;

            if (typeof value === "object") {
                display = JSON.stringify(value);
            } else if (/_at$/.test(key) || /date/i.test(key)) {
                display = formatDate(value);
            }

            cards.push(buildCard(label, String(display)));
        }
    }

    grid.innerHTML = cards.join("");
}

function buildCard(label, value) {
    return `
        <div class="dash-card">
            <span class="dash-card-label">${escapeHtml(label)}</span>
            <span class="dash-card-value">${escapeHtml(value)}</span>
        </div>`;
}

function renderSkeletonCards() {
    return Array.from({ length: 3 }, () => `
        <div class="dash-card dash-card-skeleton" aria-hidden="true">
            <span class="skeleton-line skeleton-sm"></span>
            <span class="skeleton-line skeleton-lg"></span>
        </div>`).join("");
}

function prettifyKey(key) {
    return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(value) {
    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

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
        showProfile(userEmail);
    }
});
