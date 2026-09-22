// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Signup
// Public page. Creates a Boss account, a business, and a
// first branch in one step, then logs the user in.
// ============================================================

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiZap, FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle,
  FiUser, FiPhone, FiBriefcase, FiMapPin
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';

const Signup = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    business_name: '',
    branch_name: 'Main Branch',
    location: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.full_name.trim()) return setError('Full name is required');
    if (!form.email.trim() || !isValidEmail(form.email)) return setError('Please enter a valid email');
    if (!form.password || form.password.length < 6) return setError('Password must be at least 6 characters');
    if (!/\d/.test(form.password)) return setError('Password must contain at least 1 number');
    if (form.password !== form.confirm_password) return setError('Passwords do not match');
    if (!form.business_name.trim()) return setError('Business name is required');
    if (!form.branch_name.trim()) return setError('Branch name is required');

    setLoading(true);

    try {
      const result = await signup({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || '',
        password: form.password,
        business_name: form.business_name.trim(),
        branch_name: form.branch_name.trim(),
        location: form.location.trim() || ''
      });

      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Signup failed');
      }
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container" style={{ maxWidth: '520px' }}>
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <FiZap size={26} />
            </div>
            <h1>Create your account</h1>
            <p>Start Managing Your Business in minutes</p>
          </div>

          {error && (
            <div className="alert alert-danger">
              <FiAlertCircle size={16} style={{ marginRight: '8px', flexShrink: 0 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="signup-section-label">Your Account</div>

            <div className="form-group">
              <label>Full Name *</label>
              <div className="login-input-wrapper">
                <FiUser size={17} className="login-input-icon" />
                <input
                  type="text"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  required
                  autoFocus
                  disabled={loading}
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>

            <div className="grid-2" style={{ gap: '12px' }}>
              <div className="form-group">
                <label>Email *</label>
                <div className="login-input-wrapper">
                  <FiMail size={17} className="login-input-icon" />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                    disabled={loading}
                    style={{ paddingLeft: '40px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Phone (optional)</label>
                <div className="login-input-wrapper">
                  <FiPhone size={17} className="login-input-icon" />
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+255 7XX XXX XXX"
                    disabled={loading}
                    style={{ paddingLeft: '40px' }}
                  />
                </div>
              </div>
            </div>

            <div className="grid-2" style={{ gap: '12px' }}>
              <div className="form-group">
                <label>Password *</label>
                <div className="login-input-wrapper">
                  <FiLock size={17} className="login-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Min 6 characters, 1 number"
                    required
                    disabled={loading}
                    style={{ paddingLeft: '40px', paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    className="login-input-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    disabled={loading}
                  >
                    {showPassword ? <FiEyeOff size={17} /> : <FiEye size={17} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Confirm Password *</label>
                <div className="login-input-wrapper">
                  <FiLock size={17} className="login-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirm_password"
                    value={form.confirm_password}
                    onChange={handleChange}
                    placeholder="Repeat password"
                    required
                    disabled={loading}
                    style={{ paddingLeft: '40px' }}
                  />
                </div>
              </div>
            </div>

            <div className="signup-section-label" style={{ marginTop: '18px' }}>Your Shop</div>

            <div className="form-group">
              <label>Business Name *</label>
              <div className="login-input-wrapper">
                <FiBriefcase size={17} className="login-input-icon" />
                <input
                  type="text"
                  name="business_name"
                  value={form.business_name}
                  onChange={handleChange}
                  placeholder="e.g. OSWAGO Electronics"
                  required
                  disabled={loading}
                  style={{ paddingLeft: '40px' }}
                />
              </div>
              <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>
                This is your shop name. It appears in the sidebar and reports.
              </small>
            </div>

            <div className="form-group">
              <label>First Branch Name *</label>
              <div className="login-input-wrapper">
                <FiMapPin size={17} className="login-input-icon" />
                <input
                  type="text"
                  name="branch_name"
                  value={form.branch_name}
                  onChange={handleChange}
                  placeholder="e.g. Main Branch"
                  required
                  disabled={loading}
                  style={{ paddingLeft: '40px' }}
                />
              </div>
              <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>
                Your first location. You can add more later from Settings.
              </small>
            </div>

            <div className="form-group">
              <label>Location (optional)</label>
              <div className="login-input-wrapper">
                <FiMapPin size={17} className="login-input-icon" />
                <input
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="e.g. Kariakoo, Dar es Salaam"
                  disabled={loading}
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
              style={{ marginTop: '8px' }}
            >
              {loading ? 'Creating your account...' : 'Create Account'}
            </button>
          </form>

          <div className="login-footer">
            <p>
              Already have an account? <Link to="/login" style={{ fontWeight: 600 }}>Log in</Link>
            </p>
            <p>
              Powered by{' '}
              <a
                href="https://oswagotech.co.tz"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontWeight: 600 }}
              >
                Oswagotech
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;