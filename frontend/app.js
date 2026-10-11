const apiBase = 'http://localhost:8080';

const state = {
  token: '',
  user: null,
  users: [],
  currentProfile: null,
};

const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');
const dashboardView = document.getElementById('dashboard-view');
const loginStatus = document.getElementById('login-status');
const welcomeName = document.getElementById('welcome-name');
const userDetails = document.getElementById('user-details');
const userTableBody = document.getElementById('user-table-body');
const userTableContainer = document.getElementById('user-table-container');
const downloadBtn = document.getElementById('download-btn');

function showView(viewName) {
  loginView.classList.toggle('active', viewName === 'login');
  registerView.classList.toggle('active', viewName === 'register');
  dashboardView.classList.toggle('active', viewName === 'dashboard');
}

function setStatus(message, isError = false) {
  loginStatus.innerHTML = message;
  loginStatus.style.color = isError ? '#b42318' : '#155724';
}

function populateUserCard(profile) {
  if (!profile) {
    userDetails.classList.add('hidden');
    return;
  }

  userDetails.innerHTML = `
    <p><strong>First Name:</strong> ${profile.firstName}</p>
    <p><strong>Last Name:</strong> ${profile.lastName}</p>
    <p><strong>Email:</strong> ${profile.email}</p>
    <p><strong>Mobile Number:</strong> ${profile.mobileNumber}</p>
    <p><strong>User Type:</strong> ${profile.userType}</p>
    <p><strong>Role:</strong> ${profile.role}</p>
  `;
  userDetails.classList.remove('hidden');
}

function renderUsers(rows) {
  userTableBody.innerHTML = '';

  if (!rows || rows.length === 0) {
    userTableContainer.classList.add('hidden');
    return;
  }

  rows.forEach((user) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.firstName || ''}</td>
      <td>${user.lastName || ''}</td>
      <td>${user.email || ''}</td>
      <td>${user.mobileNumber || ''}</td>
      <td>${user.userType || ''}</td>
    `;
    userTableBody.appendChild(row);
  });

  userTableContainer.classList.remove('hidden');
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok && !data.success) {
    const fieldErrors = data.fieldErrors ? Object.values(data.fieldErrors) : [];
    const message = fieldErrors.length > 0 ? fieldErrors[0] : data.message || 'Request failed';
    throw new Error(message);
  }

  return data;
}

function validateRegisterPayload(payload) {
  if (!payload.firstName || payload.firstName.trim().length === 0) {
    return 'First name is required.';
  }
  if (payload.firstName.trim().length > 50) {
    return 'First name must be at most 50 characters.';
  }
  if (!payload.lastName || payload.lastName.trim().length === 0) {
    return 'Last name is required.';
  }
  if (payload.lastName.trim().length > 50) {
    return 'Last name must be at most 50 characters.';
  }
  if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) {
    return 'Enter a valid email address.';
  }
  if (!payload.mobileNumber || !/^(?:\+91|91)?[6-9]\d{9}$/.test(payload.mobileNumber.trim())) {
    return 'Enter a valid Indian mobile number.';
  }
  if (!payload.password || payload.password.length < 8 || payload.password.length > 72) {
    return 'Password must be between 8 and 72 characters.';
  }
  if (!payload.confirmPassword || payload.password !== payload.confirmPassword) {
    return 'Password and confirm password do not match.';
  }
  return null;
}

async function loadUserData() {
  if (!state.token) {
    return;
  }

  const endpoint = state.user && state.user.userType === 'A' ? '/api/users' : '/api/users/me';

  try {
    const result = await apiRequest(`${apiBase}${endpoint}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${state.token}`,
      },
    });

    if (result.success) {
      if (Array.isArray(result.data)) {
        state.users = result.data;
        renderUsers(result.data);
        populateUserCard(null);
        downloadBtn.classList.remove('hidden');
      } else {
        state.currentProfile = result.data;
        populateUserCard(result.data);
        userTableContainer.classList.add('hidden');
        downloadBtn.classList.add('hidden');
      }
    }
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const result = await apiRequest(`${apiBase}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (result.success) {
      state.token = result.data.accessToken;
      state.user = result.data;
      welcomeName.textContent = `${result.data.firstName} ${result.data.lastName}`;
      showView('dashboard');
      setStatus(`Successful Login as ${result.data.role}`);
      await loadUserData();
      return;
    }

    if (result.message === 'User not exist Please register') {
      setStatus('User not exist Please register <a href="#" id="inline-register-link">Register here</a>', true);
      document.getElementById('inline-register-link').addEventListener('click', (event) => {
        event.preventDefault();
        showView('register');
      });
      return;
    }

    setStatus(result.message || 'Login failed', true);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function handleRegister(event) {
  event.preventDefault();

  const payload = {
    firstName: document.getElementById('first-name').value.trim(),
    lastName: document.getElementById('last-name').value.trim(),
    email: document.getElementById('register-email').value.trim(),
    mobileNumber: document.getElementById('mobile-number').value.trim(),
    password: document.getElementById('register-password').value,
    confirmPassword: document.getElementById('confirm-password').value,
  };

  const validationMessage = validateRegisterPayload(payload);
  if (validationMessage) {
    setStatus(validationMessage, true);
    return;
  }

  try {
    const result = await apiRequest(`${apiBase}/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (result.success) {
      setStatus('Registration successful. Please login now.');
      showView('login');
      document.getElementById('register-form').reset();
    } else {
      setStatus(result.message || 'Registration failed', true);
    }
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function handleShowUsers() {
  if (!state.token) {
    return;
  }

  if (state.user && state.user.userType === 'A') {
    try {
      const result = await apiRequest(`${apiBase}/api/users`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${state.token}`,
        },
      });

      if (result.success) {
        state.users = Array.isArray(result.data) ? result.data : [result.data];
        renderUsers(state.users);
        userDetails.classList.add('hidden');
        downloadBtn.classList.remove('hidden');
      }
    } catch (error) {
      setStatus(error.message, true);
    }
    return;
  }

  await loadUserData();
}

async function handleDownload() {
  if (!state.token) {
    return;
  }

  const response = await fetch(`${apiBase}/api/users/export`, {
    headers: {
      Authorization: `Bearer ${state.token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    setStatus(errorText || 'Download failed', true);
    return;
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'existing-users.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
  setStatus('CSV downloaded successfully');
}

function logout() {
  state.token = '';
  state.user = null;
  state.users = [];
  state.currentProfile = null;
  document.getElementById('login-form').reset();
  document.getElementById('register-form').reset();
  userDetails.classList.add('hidden');
  userTableContainer.classList.add('hidden');
  downloadBtn.classList.add('hidden');
  setStatus('');
  showView('login');
}

document.getElementById('login-form').addEventListener('submit', handleLogin);
document.getElementById('register-form').addEventListener('submit', handleRegister);
document.getElementById('show-register').addEventListener('click', (event) => {
  event.preventDefault();
  showView('register');
});
document.getElementById('show-login').addEventListener('click', (event) => {
  event.preventDefault();
  showView('login');
});
document.getElementById('show-users-btn').addEventListener('click', handleShowUsers);
document.getElementById('download-btn').addEventListener('click', handleDownload);
document.getElementById('logout-btn').addEventListener('click', logout);

showView('login');
