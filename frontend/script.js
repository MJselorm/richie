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
    document.getElementById("user").innerHTML = email;
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