import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const LoginPage = () => {
  const demoLoginLock = useRef(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoginBusy, setDemoLoginBusy] = useState(false);
  const navigate = useNavigate();

  const completeLogin = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    navigate('/');
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      completeLogin(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    if (demoLoginLock.current) return;
    demoLoginLock.current = true;
    setDemoLoginBusy(true);
    setError('');
    try {
      const response = await axios.post('/api/auth/demo');
      completeLogin(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Demo login is unavailable. Ask an administrator to enable the seeded demo account.');
    } finally {
      demoLoginLock.current = false;
      setDemoLoginBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">{'🏗️'}</div>
        <h1>BidAnalyzer AI</h1>
        <p className="login-subtitle">Construction Bid Intelligence Platform</p>

        {error && <div className="login-error" role="alert">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              className="form-control"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              autoComplete="username"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              className="form-control"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading || demoLoginBusy}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '16px' }}>
          <button
            type="button"
            className="btn btn-outline btn-block"
            disabled={loading || demoLoginBusy}
            onClick={handleDemoLogin}
          >
            {demoLoginBusy ? 'Opening demo…' : 'Log in as Demo'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
