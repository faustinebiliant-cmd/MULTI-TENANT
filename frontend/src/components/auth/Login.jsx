// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Login
// ============================================================

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiZap, FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import LanguageSwitcher from '../../i18n/LanguageSwitcher';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const Login = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState(null);
  const { login } = useAuth();
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
      setError(t('auth.errors.invalid_email'));
      return;
    }

    if (!password || password.length < 6) {
      setError(t('auth.errors.short_password'));
      return;
    }

    if (blockedUntil && Date.now() < blockedUntil.getTime()) {
      const remaining = Math.ceil((blockedUntil.getTime() - Date.now()) / 60000);
      setError(t('auth.errors.too_many_attempts', { count: remaining }));
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

      // Backend error messages stay English for now (Phase 5).
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
        setError(t('auth.errors.locked_out'));
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(t('auth.errors.generic'));
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
          <div className="lang-switcher-row">
            <LanguageSwitcher variant="login" />
          </div>

          <div className="login-header">
            <div className="login-logo">
              <FiZap size={26} />
            </div>
            <h1>{t('auth.brand')}</h1>
            <span className="login-subtitle">{t('auth.subtitle')}</span>
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
              {t('auth.errors.locked_wait', {
                count: Math.ceil((blockedUntil.getTime() - Date.now()) / 60000)
              })}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t('auth.email_label')}</label>
              <div className="login-input-wrapper">
                <FiMail size={17} className="login-input-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder={t('auth.email_placeholder')}
                  required
                  autoFocus
                  disabled={isLoginDisabled}
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>{t('auth.password_label')}</label>
              <div className="login-input-wrapper">
                <FiLock size={17} className="login-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder={t('auth.password_placeholder')}
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
              {loading ? t('auth.login_loading') : t('auth.login_button')}
            </button>

            {attempts > 0 && attempts < MAX_ATTEMPTS && (
              <div className="login-attempts">
                {t('auth.attempts_counter', { current: attempts, max: MAX_ATTEMPTS })}
              </div>
            )}
          </form>

          <div className="login-footer">
            <p style={{ marginBottom: '6px' }}>
              {t('auth.no_account')}{' '}
              <Link to="/signup" style={{ fontWeight: 600 }}>
                {t('auth.create_account')}
              </Link>
            </p>
            <p>
              {t('auth.powered_by')}{' '}
              <a
                href="https://oswagotech.co.tz"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontWeight: 600 }}
              >
                {t('auth.brand')}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;