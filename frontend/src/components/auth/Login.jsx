// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Login
// ============================================================

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiZap, FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useShop } from '../../contexts/ShopContext';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState(null);
  const { login } = useAuth();
  const { appName, location, phone } = useShop();
  const navigate = useNavigate();

  useEffect(() => {
    const blocked = localStorage.getItem('loginBlocked');
    if (blocked) {
      const until = parseInt(blocked);
      if (Date.now() < until) {
        setBlockedUntil(new Date(until));
      } else {
        localStorage.removeItem('loginBlocked');
        setAttempts(0);
      }
    }
  }, []);

  useEffect(() => {
    if (!blockedUntil) return;
    const timer = setInterval(() => {
      if (Date.now() >= blockedUntil.getTime()) {
        localStorage.removeItem('loginBlocked');
        setBlockedUntil(null);
        setAttempts(0);
        setError('');
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [blockedUntil]);

  const isValidEmail = (value) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (blockedUntil && Date.now() < blockedUntil.getTime()) {
      const remaining = Math.ceil((blockedUntil.getTime() - Date.now()) / 60000);
      setError(`Too many attempts. Please wait ${remaining} minute${remaining === 1 ? '' : 's'}.`);
      return;
    }

    setLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        setAttempts(0);
        localStorage.removeItem('loginBlocked');
        navigate('/dashboard');
        return;
      }

      const rawError = result.error || 'Invalid email or password';
      setError(rawError);

      const isInvalidCredentials = rawError.toLowerCase().includes('invalid email or password');
      if (!isInvalidCredentials) return;

      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_MS;
        localStorage.setItem('loginBlocked', String(until));
        setBlockedUntil(new Date(until));
        setError('Too many failed attempts. Please wait 15 minutes.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isLocked = blockedUntil && Date.now() < blockedUntil.getTime();
  const isLoginDisabled = loading || isLocked;

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <FiZap size={26} />
            </div>
            <h1>{appName}</h1>
            <p>Electrical Equipment</p>
            <span className="login-subtitle">Shop Management System</span>
          </div>

          {error && (
            <div className="alert alert-danger">
              <FiAlertCircle size={16} style={{ marginRight: '8px', flexShrink: 0 }} />
              {error}
            </div>
          )}

          {isLocked && (
            <div className="alert alert-warning">
              <FiAlertCircle size={16} style={{ marginRight: '8px', flexShrink: 0 }} />
              Account temporarily locked. Please wait {Math.ceil((blockedUntil.getTime() - Date.now()) / 60000)} minute(s).
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email Address</label>
              <div className="login-input-wrapper">
                <FiMail size={17} className="login-input-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter your email"
                  required
                  autoFocus
                  disabled={isLoginDisabled}
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="login-input-wrapper">
                <FiLock size={17} className="login-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter your password"
                  required
                  disabled={isLoginDisabled}
                  style={{ paddingLeft: '40px', paddingRight: '40px' }}
                />
                <button
                  type="button"
                  className="login-input-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  disabled={isLoginDisabled}
                >
                  {showPassword ? <FiEyeOff size={17} /> : <FiEye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={isLoginDisabled}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

            {attempts > 0 && attempts < MAX_ATTEMPTS && (
              <div className="login-attempts">
                Attempts: {attempts}/{MAX_ATTEMPTS}
              </div>
            )}
          </form>

          <div className="login-footer">
            <p style={{ marginBottom: '6px' }}>
              Don't have an account?{' '}
              <Link to="/signup" style={{ fontWeight: 600 }}>
                Create one
              </Link>
            </p>
            <p>{appName}</p>
            <small>{location}{phone ? ` - ${phone}` : ''}</small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;