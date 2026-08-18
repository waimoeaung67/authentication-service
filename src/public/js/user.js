const logoutButton = document.getElementById('logoutButton');
const profileButton = document.getElementById('profileButton');
const dashboardProfileButton = document.getElementById('dashboardProfileButton');

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
  window.location.href = '/user/profile';
}

profileButton?.addEventListener('click', goToProfile);
dashboardProfileButton?.addEventListener('click', goToProfile);
logoutButton.addEventListener('click', logout);
