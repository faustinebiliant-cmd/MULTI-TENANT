import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLock, FiMail, FiAlertCircle, FiShield } from 'react-icons/fi';
import { useAdmin } from '../../contexts/AdminContext';

const AdminLogin = () => {
  const { login } = useAdmin();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email.trim(), password);
      if (res.success) {
        navigate('/admin/dashboard');
      } else {
        setError(res.error || 'Login failed');
      }
    } catch (err) {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <div className="admin-login-icon">
            <FiShield size={26} />
          </div>
          <h1>Platform Admin</h1>
          <p>Restricted access</p>
        </div>

        {error && (
          <div className="admin-alert admin-alert--danger">
            <FiAlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="admin-form-group">
            <label>Email</label>
            <div className="admin-input-wrap">
              <FiMail size={16} className="admin-input-icon" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                autoFocus
                disabled={loading}
                style={{ paddingLeft: 38 }}
              />
            </div>
          </div>

          <div className="admin-form-group">
            <label>Password</label>
            <div className="admin-input-wrap">
              <FiLock size={16} className="admin-input-icon" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your admin password"
                required
                disabled={loading}
                style={{ paddingLeft: 38 }}
              />
            </div>
          </div>

          <button type="submit" className="admin-btn admin-btn--primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="admin-login-footer">
          Customer? <a href="/login">Go to shop login</a>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;