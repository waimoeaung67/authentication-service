const apiBase = '/api';
const authForm = document.getElementById('authForm');
const message = document.getElementById('message');

function setMessage(text, type = 'success') {
  message.textContent = text;
  message.className = `message ${type}`;
}

function getAccessToken() {
  return localStorage.getItem('accessToken');
}

function getStoredRole() {
  return localStorage.getItem('role');
}

function redirectAuthenticatedUser() {
  const token = getAccessToken();
  const role = getStoredRole();
  if (!token || !role) {
    return;
  }

  if (role === 'ADMIN') {
    window.location.href = '/admin';
  } else {
    window.location.href = '/user';
  }
}

window.addEventListener('DOMContentLoaded', redirectAuthenticatedUser);

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!email || !password) {
    setMessage('Email and password are required', 'error');
    return;
  }

  try {
    const response = await fetch(`${apiBase}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || 'Login failed', 'error');
      return;
    }

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('role', data.user.role);

    if (data.user.role === 'ADMIN') {
      window.location.href = '/admin';
    } else {
      window.location.href = '/user';
    }
  } catch (error) {
    setMessage('Unable to reach server. Please try again.', 'error');
  }
});
