const apiBase = '/api';
const message = document.getElementById('message');
const logoutButton = document.getElementById('logoutButton');
const profileButton = document.getElementById('profileButton');
const dashboardProfileButton = document.getElementById('dashboardProfileButton');
const loadUsersButton = document.getElementById('loadUsersButton');
const usersTable = document.getElementById('usersTable');

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

function goToProfile() {
  window.location.href = '/admin/profile';
}

async function buildUsersTable() {
  try {
    const response = await fetch(`${apiBase}/users`, {
      headers: { Authorization: `Bearer ${getAccessToken()}` },
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || 'Unable to load users', 'error');
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      usersTable.innerHTML = '<p>No users found.</p>';
      usersTable.classList.remove('hidden');
      return;
    }

    const rows = data
      .map((user) => {
        return `
          <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td>${user.address}</td>
            <td>${user.balance}</td>
            <td>
              <button class="small-button" data-action="make-user" data-id="${user.id}">User</button>
              <button class="small-button" data-action="make-admin" data-id="${user.id}">Admin</button>
              <button class="small-button delete" data-action="delete" data-id="${user.id}">Delete</button>
            </td>
          </tr>`;
      })
      .join('');

    usersTable.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Address</th>
            <th>Balance</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>`;
    usersTable.classList.remove('hidden');
  } catch (error) {
    setMessage('Error loading users', 'error');
  }
}

async function changeUserRole(userId, role) {
  try {
    const response = await fetch(`${apiBase}/users/${userId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAccessToken()}`,
      },
      body: JSON.stringify({ role }),
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || 'Unable to change role', 'error');
      return;
    }

    setMessage(`Role updated for ${data.email || userId}`, 'success');
    await buildUsersTable();
  } catch (error) {
    setMessage('Unable to update role', 'error');
  }
}

async function deleteUser(userId) {
  try {
    const response = await fetch(`${apiBase}/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getAccessToken()}` },
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || 'Unable to delete user', 'error');
      return;
    }

    setMessage(data.message, 'success');
    await buildUsersTable();
  } catch (error) {
    setMessage('Unable to delete user', 'error');
  }
}

usersTable.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  const action = button.dataset.action;
  const userId = button.dataset.id;

  if (action === 'make-user') {
    await changeUserRole(userId, 'USER');
  } else if (action === 'make-admin') {
    await changeUserRole(userId, 'ADMIN');
  } else if (action === 'delete') {
    if (confirm('Delete this user?')) {
      await deleteUser(userId);
    }
  }
});

dashboardProfileButton?.addEventListener('click', goToProfile);
profileButton?.addEventListener('click', goToProfile);
logoutButton.addEventListener('click', logout);
loadUsersButton.addEventListener('click', buildUsersTable);
