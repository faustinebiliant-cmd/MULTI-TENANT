// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Profile Settings
// ============================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft } from 'react-icons/fi';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const ProfileSettings = () => {
  const { t } = useTranslation();
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

      const updated = {
        ...currentUser,
        full_name: response.user.full_name,
        phone: response.user.phone
      };
      localStorage.setItem('user', JSON.stringify(updated));
      if (setUser) setUser(updated);

      toast.success(t('profile_settings.messages.profile_updated'));
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.error || t('profile_settings.messages.profile_update_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (formData.new_password !== formData.confirm_password) {
      toast.error(t('profile_settings.messages.passwords_do_not_match'));
      return;
    }

    if (!formData.current_password || !formData.new_password) {
      toast.error(t('profile_settings.messages.fill_passwords'));
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
            <FiArrowLeft size={16} /> {t('profile_settings.back')}
          </button>
          <h1>{t('profile_settings.title')}</h1>
          <p>{t('profile_settings.subtitle')}</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>{t('profile_settings.profile_card.title')}</h3>
          <form onSubmit={handleProfileSubmit}>
            <div className="form-group">
              <label>{t('profile_settings.profile_card.full_name_label')}</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>{t('profile_settings.profile_card.email_label')}</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                disabled
                style={{ backgroundColor: '#f3f4f6' }}
              />
              <small style={{ color: '#6b7280' }}>
                {t('profile_settings.profile_card.email_cannot_change')}
              </small>
            </div>

            <div className="form-group">
              <label>{t('profile_settings.profile_card.phone_label')}</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder={t('profile_settings.profile_card.phone_placeholder')}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading
                ? t('profile_settings.profile_card.saving_button')
                : t('profile_settings.profile_card.save_button')}
            </button>
          </form>
        </div>

        <div className="card">
          <h3>{t('profile_settings.password_card.title')}</h3>
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label>{t('profile_settings.password_card.current_label')}</label>
              <input
                type="password"
                name="current_password"
                value={formData.current_password}
                onChange={handleChange}
                placeholder={t('profile_settings.password_card.current_placeholder')}
              />
            </div>

            <div className="form-group">
              <label>{t('profile_settings.password_card.new_label')}</label>
              <input
                type="password"
                name="new_password"
                value={formData.new_password}
                onChange={handleChange}
                placeholder={t('profile_settings.password_card.new_placeholder')}
              />
              <small style={{ color: '#6b7280' }}>
                {t('profile_settings.password_card.hint')}
              </small>
            </div>

            <div className="form-group">
              <label>{t('profile_settings.password_card.confirm_label')}</label>
              <input
                type="password"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                placeholder={t('profile_settings.password_card.confirm_placeholder')}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading
                ? t('profile_settings.password_card.changing_button')
                : t('profile_settings.password_card.submit_button')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;