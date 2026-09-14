// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Login Page (DEVELOPMENT MODE)
// ============================================================
//
// ⚠️⚠️⚠️ DEVELOPMENT MODE — FRONTEND LOCKOUT DISABLED ⚠️⚠️⚠️
//
// The attempts counter and 15-minute lockout are disabled below.
// The original code is preserved in comments so it can be
// re-enabled before shipping.
//
// >>> BEFORE PRODUCTION, SEARCH FOR "⚠️⚠️⚠️" AND RESTORE <<<
//
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiZap, FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  // ✅ Clean any leftover lockout from previous sessions
  useEffect(() => {
    localStorage.removeItem('loginBlocked');
  }, []);

  // ⚠️⚠️⚠️ Original "check blocked status on mount" logic — commented out
  // useEffect(() => {
  //   const blocked = localStorage.getItem('loginBlocked');
  //   if (blocked) {
  //     const blockedTime = parseInt(blocked);
  //     if (Date.now() < blockedTime) {
  //       setBlockedUntil(new Date(blockedTime));
  //       setError(`Too many attempts. Please wait ${Math.ceil((blockedTime - Date.now()) / 60000)} minutes.`);
  //     } else {
  //       localStorage.removeItem('loginBlocked');
  //       setAttempts(0);
  //     }
  //   }
  // }, []);

  // ⚠️⚠️⚠️ Original auto-unblock timer — commented out
  // useEffect(() => {
  //   if (blockedUntil) {
  //     const timer = setInterval(() => {
  //       if (Date.now() >= blockedUntil.getTime()) {
  //         localStorage.removeItem('loginBlocked');
  //         setBlockedUntil(null);
  //         setError('');
  //         setAttempts(0);
  //         clearInterval(timer);
  //       }
  //     }, 1000);
  //     return () => clearInterval(timer);
  //   }
  // }, [blockedUntil]);

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Frontend validation
    if (!email || !isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // ⚠️⚠️⚠️ Original "already blocked" guard — commented out
    // if (blockedUntil && Date.now() < blockedUntil.getTime()) {
    //   const remaining = Math.ceil((blockedUntil.getTime() - Date.now()) / 60000);
    //   setError(`Too many attempts. Please wait ${remaining} minutes.`);
    //   return;
    // }

    setLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        setAttempts(0);
        localStorage.removeItem('loginBlocked');
        navigate('/dashboard');
        return;
      }

      // Login failed — show the error
      const rawError = result.error || 'Invalid email or password';
      setError(rawError);

      // ⚠️⚠️⚠️ Original lockout logic — commented out
      // const isInvalidCredentials =
      //   rawError.toLowerCase().includes('invalid email or password');
      //
      // if (!isInvalidCredentials) {
      //   setError(rawError);
      //   return;
      // }
      //
      // const newAttempts = attempts + 1;
      // setAttempts(newAttempts);
      //
      // if (newAttempts >= 5) {
      //   const blockTime = Date.now() + (15 * 60 * 1000);
      //   localStorage.setItem('loginBlocked', String(blockTime));
      //   setBlockedUntil(new Date(blockTime));
      //   setError('Too many failed attempts. Please wait 15 minutes.');
      // } else {
      //   setError('Invalid email or password');
      // }

    } catch (err) {
      console.error('Login error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) setError('');
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (error) setError('');
  };

  // ⚠️⚠️⚠️ Original "isLoginDisabled" with lockout — simplified for dev
  const isLoginDisabled = loading;
  // const isLoginDisabled = loading || (blockedUntil && Date.now() < blockedUntil.getTime());

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <FiZap size={26} />
            </div>
            <h1>OSWAGO</h1>
            <p>Electrical Equipment</p>
            <span className="login-subtitle">Shop Management System</span>
          </div>

          {error && (
            <div className="alert alert-danger">
              <FiAlertCircle size={16} style={{ marginRight: '8px', flexShrink: 0 }} />
              {error}
            </div>
          )}

          {/* ⚠️⚠️⚠️ Original "account locked" warning banner — commented out
          {blockedUntil && Date.now() < blockedUntil.getTime() && (
            <div className="alert alert-warning" style={{ marginBottom: '16px' }}>
              <FiAlertCircle size={16} style={{ marginRight: '8px', flexShrink: 0 }} />
              Account temporarily locked. Please wait {Math.ceil((blockedUntil.getTime() - Date.now()) / 60000)} minutes.
            </div>
          )}
          */}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email Address</label>
              <div className="login-input-wrapper">
                <FiMail size={17} className="login-input-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
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
                  onChange={handlePasswordChange}
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

            {/* ⚠️⚠️⚠️ Original attempts counter display — commented out
            {attempts > 0 && attempts < 5 && (
              <div style={{
                marginTop: '12px',
                fontSize: '12px',
                color: '#6b7280',
                textAlign: 'center'
              }}>
                Attempts: {attempts}/5
              </div>
            )}
            */}
          </form>

          <div className="login-footer">
            <p>OSWAGO Electrical Equipment</p>
            <small>Darajani, Kigamboni, Dar es Salaam</small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;