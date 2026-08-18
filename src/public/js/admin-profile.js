const apiBase = '/api';
const message = document.getElementById('message');
const nameEl = document.getElementById('name');
const emailEl = document.getElementById('email');
const roleEl = document.getElementById('role');
const addressEl = document.getElementById('address');
const balanceEl = document.getElementById('balance');
const backButton = document.getElementById('backButton');
const logoutButton = document.getElementById('logoutButton');
const saveButton = document.getElementById('saveButton');
const nameInput = document.getElementById('nameInput');
const addressInput = document.getElementById('addressInput');

function setMessage(text, type = 'success') {
  message.textContent = text;
  message.className = `message ${type}`;
}

function getAccessToken() {
  return localStorage.getItem('accessToken');
}

function logout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('role');
  window.location.href = '/login';
}

function goBack() {
  window.location.href = '/admin';
}

async function loadProfile() {
  try {
    const response = await fetch(`${apiBase}/users/me`, {
      headers: { Authorization: `Bearer ${getAccessToken()}` },
    });

    if (!response.ok) {
      throw new Error('Not authenticated');
    }

    const user = await response.json();
    nameEl.textContent = user.name;
    emailEl.textContent = user.email;
    roleEl.textContent = user.role;
    addressEl.textContent = user.address;
    balanceEl.textContent = user.balance;
    nameInput.value = user.name;
    addressInput.value = user.address;
  } catch (error) {
    logout();
  }
}

async function saveProfile() {
  try {
    const response = await fetch(`${apiBase}/users/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAccessToken()}`,
      },
      body: JSON.stringify({
        name: nameInput.value.trim(),
        address: addressInput.value.trim(),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || 'Update failed', 'error');
      return;
    }

    setMessage('Profile updated successfully', 'success');
    await loadProfile();
  } catch (error) {
    setMessage('Unable to save profile', 'error');
  }
}

backButton.addEventListener('click', goBack);
logoutButton.addEventListener('click', logout);
saveButton.addEventListener('click', saveProfile);
window.addEventListener('DOMContentLoaded', loadProfile);
