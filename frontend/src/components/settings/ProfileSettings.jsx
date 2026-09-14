// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Profile Settings
// ============================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { changePassword, setUser } = useAuth();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: currentUser.full_name || '',
    email: currentUser.email || '',
    phone: currentUser.phone || '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.auth.updateProfile({
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim()
      });

      // Refresh stored user
      const updated = {
        ...currentUser,
        full_name: response.user.full_name,
        phone: response.user.phone
      };
      localStorage.setItem('user', JSON.stringify(updated));
      if (setUser) setUser(updated);

      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (formData.new_password !== formData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }

    if (!formData.current_password || !formData.new_password) {
      toast.error('Please fill in current and new password');
      return;
    }

    setLoading(true);

    try {
      const result = await changePassword(formData.current_password, formData.new_password);

      if (result.success) {
        setFormData({
          ...formData,
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <button onClick={() => navigate('/settings')} className="btn btn-sm btn-secondary">
            <FiArrowLeft size={16} /> Back
          </button>
          <h1>Profile Settings</h1>
          <p>Manage your account information</p>
        </div>
      </div>

      <div className="grid-2">
        {/* Profile info */}
        <div className="card">
          <h3>Profile Information</h3>
          <form onSubmit={handleProfileSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                disabled
                style={{ backgroundColor: '#f3f4f6' }}
              />
              <small style={{ color: '#6b7280' }}>Email cannot be changed</small>
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter your phone number"
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Password change */}
        <div className="card">
          <h3>Change Password</h3>
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                name="current_password"
                value={formData.current_password}
                onChange={handleChange}
                placeholder="Enter current password"
              />
            </div>

            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                name="new_password"
                value={formData.new_password}
                onChange={handleChange}
                placeholder="Enter new password"
              />
              <small style={{ color: '#6b7280' }}>
                Min 6 characters with at least 1 number
              </small>
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                placeholder="Confirm new password"
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;