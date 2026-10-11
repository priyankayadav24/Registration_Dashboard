import { useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

function App() {
  const [view, setView] = useState('login');
  const [token, setToken] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState({ message: '', isError: false });
  const [loading, setLoading] = useState(false);

  const userRole = useMemo(() => {
    const role = currentUser?.userType || currentUser?.role || '';
    if (role === 'A' || role === 'ADMIN') return 'ADMIN';
    if (role === 'U' || role === 'USER') return 'USER';
    return '';
  }, [currentUser]);

  const parseResponse = async (response) => {
    const text = await response.text();
    let data = {};
    if (text) {
      try { data = JSON.parse(text); }
      catch { throw new Error(`Server returned an invalid response (HTTP ${response.status}). Check that the API Gateway is running on port 8080.`); }
    }

    if (!response.ok) {
      const fieldErrors = data.fieldErrors ? Object.values(data.fieldErrors) : [];
      const message = (typeof fieldErrors[0] === 'string' ? fieldErrors[0] : '') || data.message || `Request failed (HTTP ${response.status})`;
      throw new Error(message);
    }

    return data;
  };

  const formatLoginError = (errorMessage) => {
    const message = String(errorMessage || '').trim();

    if (!message) return 'Credentials are incorrect.';
    if (message.toLowerCase().includes('password')) return 'Password is wrong. Please try again.';
    if (message.toLowerCase().includes('user not exist') || message.toLowerCase().includes('not register')) return 'User not exist Please register';
    if (message.toLowerCase().includes('credential')) return 'Credentials are incorrect.';

    return message;
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    const email = event.target.email.value.trim();
    const password = event.target.password.value;

    try {
      const result = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }).then(parseResponse);

      if (result.success) {
        const user = result.data;
        setToken(user.accessToken);
        setCurrentUser(user);
        setStatus({ message: `Successful Login as ${user.role}`, isError: false });
        setView('dashboard');
        await loadUserData(user.accessToken, user.userType);
        return;
      }

      setStatus({ message: result.message || 'Login failed', isError: true });
    } catch (error) {
      setStatus({ message: error.message?.includes('Failed to fetch') ? 'Cannot reach the backend. Start PostgreSQL, auth-service, user-service, and API Gateway, then try again.' : formatLoginError(error.message), isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setLoading(true);

    const payload = {
      firstName: event.target.firstName.value.trim(),
      lastName: event.target.lastName.value.trim(),
      email: event.target.email.value.trim(),
      mobileNumber: event.target.mobileNumber.value.trim(),
      password: event.target.password.value,
      confirmPassword: event.target.confirmPassword.value,
    };

    const validationRules = [
      { valid: !!payload.firstName, message: 'First name is required.' },
      { valid: !!payload.lastName, message: 'Last name is required.' },
      { valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email), message: 'Enter a valid email address.' },
      { valid: /^(?:\+91|91)?[6-9]\d{9}$/.test(payload.mobileNumber), message: 'Enter a valid Indian mobile number.' },
      { valid: payload.password && payload.password.length >= 8 && payload.password.length <= 72, message: 'Password must be between 8 and 72 characters.' },
      { valid: payload.password === payload.confirmPassword, message: 'Password and confirm password do not match.' },
    ];

    const failedRule = validationRules.find((rule) => !rule.valid);
    if (failedRule) {
      setStatus({ message: failedRule.message, isError: true });
      setLoading(false);
      return;
    }

    try {
      const result = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(parseResponse);

      if (result.success) {
        setStatus({ message: 'Registration successful. Please login now.', isError: false });
        event.target.reset();
        setView('login');
      } else {
        setStatus({ message: result.message || 'Registration failed', isError: true });
      }
    } catch (error) {
      setStatus({ message: error.message?.includes('Failed to fetch') ? 'Cannot reach the backend. Confirm API Gateway is running at http://localhost:8080.' : error.message, isError: true });
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async (authToken, userType = currentUser?.userType || 'U') => {
    const endpoint = userType === 'A' ? '/api/users' : '/api/users/me';

    try {
      const result = await fetch(`${API_BASE}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      }).then(parseResponse);

      if (result.success) {
        if (Array.isArray(result.data)) {
          setUsers(result.data);
        } else {
          setCurrentUser(result.data);
          setUsers([]);
        }
      }
    } catch (error) {
      setStatus({ message: error.message, isError: true });
    }
  };

  const handleShowExistingUser = async () => {
    if (!token) return;
    setLoading(true);

    try {
      const result = await fetch(`${API_BASE}${currentUser?.userType === 'A' ? '/api/users' : '/api/users/me'}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }).then(parseResponse);

      if (result.success) {
        if (Array.isArray(result.data)) {
          setUsers(result.data);
          setCurrentUser((prev) => prev || { userType: 'A' });
        } else {
          setCurrentUser(result.data);
          setUsers([]);
        }
      }
    } catch (error) {
      setStatus({ message: error.message, isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/api/users/export`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.message || 'Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'existing-users.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setStatus({ message: 'CSV downloaded successfully.', isError: false });
    } catch (error) {
      setStatus({ message: error.message, isError: true });
    }
  };

  const logout = () => {
    setToken('');
    setCurrentUser(null);
    setUsers([]);
    setStatus({ message: '', isError: false });
    setView('login');
  };

  const renderDashboardData = () => {
    if (!currentUser && users.length === 0) return null;

    if (currentUser && !Array.isArray(currentUser) && userRole !== 'ADMIN') {
      return (
        <div className="card info-card">
          <h3>User Details</h3>
          <p><strong>First Name:</strong> {currentUser.firstName}</p>
          <p><strong>Last Name:</strong> {currentUser.lastName}</p>
          <p><strong>Email:</strong> {currentUser.email}</p>
          <p><strong>Mobile Number:</strong> {currentUser.mobileNumber}</p>
          <p><strong>User Type:</strong> {currentUser.userType}</p>
          <p><strong>Role:</strong> {currentUser.role}</p>
        </div>
      );
    }

    if (users.length > 0) {
      return (
        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Email</th>
                <th>Mobile Number</th>
                <th>User Type</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={`${user.email}-${index}`}>
                  <td>{user.firstName}</td>
                  <td>{user.lastName}</td>
                  <td>{user.email}</td>
                  <td>{user.mobileNumber}</td>
                  <td>{user.userType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="app-shell">
      <div className="panel">
        {view === 'login' && (
          <div className="form-panel">
            <h1>Login</h1>
            {status.message && (
              <div className={`status-box ${status.isError ? 'error' : 'success'}`} role="alert">
                {status.message}
              </div>
            )}
            <form onSubmit={handleLogin} className="auth-form">
              <label>UserName / Email ID</label>
              <input name="email" type="email" placeholder="Enter email" required />

              <label>Password</label>
              <input name="password" type="password" placeholder="Enter password" required />

              <button type="submit" disabled={loading}>
                {loading ? 'Please wait...' : 'Submit'}
              </button>
            </form>

            <p className="form-link">
              New user? <button type="button" className="text-button" onClick={() => { setStatus({ message: '', isError: false }); setView('register'); }}>Register here</button>
            </p>
          </div>
        )}

        {view === 'register' && (
          <div className="form-panel">
            <h1>Register</h1>
            {status.message && (
              <div className={`status-box ${status.isError ? 'error' : 'success'}`} role="alert">
                {status.message}
              </div>
            )}
            <form onSubmit={handleRegister} className="auth-form register-form">
              <div className="register-fields">
                <div className="register-field">
                  <label>First Name</label>
                  <input name="firstName" type="text" placeholder="First Name" required />
                </div>
                <div className="register-field">
                  <label>Last Name</label>
                  <input name="lastName" type="text" placeholder="Last Name" required />
                </div>
                <div className="register-field">
                  <label>Email</label>
                  <input name="email" type="email" placeholder="Email" required />
                </div>
                <div className="register-field">
                  <label>Mobile Number</label>
                  <input name="mobileNumber" type="text" placeholder="Mobile Number" required />
                </div>
                <div className="register-field">
                  <label>Choose Password</label>
                  <input name="password" type="password" placeholder="Choose password" required />
                </div>
                <div className="register-field">
                  <label>Confirm Password</label>
                  <input name="confirmPassword" type="password" placeholder="Confirm password" required />
                </div>
              </div>

              <button type="submit" disabled={loading}>
                {loading ? 'Please wait...' : 'Submit'}
              </button>
            </form>

            <p className="form-link">
              Already have account? <button type="button" className="text-button" onClick={() => { setStatus({ message: '', isError: false }); setView('login'); }}>Login here</button>
            </p>
          </div>
        )}

        {view === 'dashboard' && (
          <div className="dashboard-panel">
            <div className="dashboard-header">
              <div>
                <h1>Welcome</h1>
                <h2>{currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : 'User'}</h2>
              </div>
              <button type="button" className="secondary" onClick={logout}>Logout</button>
            </div>

            {status.message && (
              <div className={`status-box ${status.isError ? 'error' : 'success'}`}>
                {status.message}
              </div>
            )}

            <div className="action-row">
              <button type="button" onClick={handleShowExistingUser} disabled={loading}>
                Show Existing User
              </button>
              {userRole === 'ADMIN' && (
                <button type="button" className="success" onClick={handleDownload}>
                  Download
                </button>
              )}
            </div>

            {renderDashboardData()}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
