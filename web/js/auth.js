import { api } from './api.js';

// Check if user is already logged in
async function checkAuth() {
  const token = localStorage.getItem('jwt');
  if (token) {
    try {
      await api.getMe();
      window.location.href = '/app.html';
    } catch (e) {
      localStorage.removeItem('jwt');
      localStorage.removeItem('user');
    }
  }
}

function showMessage(msg, type) {
  const el = document.getElementById('auth-msg');
  el.textContent = msg;
  el.className = `auth-message ${type}`;
  el.style.display = 'block';
}

window.handleLogin = async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btn-login');
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  btn.disabled = true;
  btn.textContent = 'LOGGING IN...';
  
  try {
    const res = await api.login(email, password);
    if (res.ok) {
      localStorage.setItem('jwt', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      window.location.href = '/app.html';
    }
  } catch (err) {
    showMessage(err.message, 'error');
    btn.disabled = false;
    btn.textContent = 'LOGIN';
  }
};

window.handleRegister = async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btn-register');
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;

  btn.disabled = true;
  btn.textContent = 'REGISTERING...';
  
  try {
    const res = await api.register(name, email, password);
    if (res.ok) {
      showMessage(res.message, 'success');
      document.getElementById('register-form').reset();
      
      // Auto-switch to login tab after 3 seconds if not admin
      if (!res.message.includes('Admin')) {
        setTimeout(() => switchTab('login'), 3000);
      }
    }
  } catch (err) {
    showMessage(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'REGISTER';
  }
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});
