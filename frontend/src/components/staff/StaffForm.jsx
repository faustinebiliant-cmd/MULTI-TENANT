// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Staff Form
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import { useBranch } from '../../contexts/BranchContext';
import toast from 'react-hot-toast';

const StaffForm = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [currentBranchName, setCurrentBranchName] = useState('');

  const { activeBusiness } = useBranch();
  const branches = activeBusiness?.branches || [];

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'cashier',
    password: 'TempPass123!',
    branch_id: ''
  });

  useEffect(() => {
    if (!isEdit && !formData.branch_id && branches.length > 0) {
      setFormData(prev => ({ ...prev, branch_id: branches[0].id }));
    }
  }, [branches, isEdit, formData.branch_id]);

  useEffect(() => {
    if (!isEdit || !id) return;

    const fetchStaff = async () => {
      try {
        setLoading(true);
        const data = await api.getUser(id);
        setFormData({
          full_name: data.full_name || '',
          email: data.email || '',
          phone: data.phone || '',
          role: data.role || 'cashier',
          password: '',
          branch_id: data.branch_id || ''
        });
      } catch (error) {
        console.error('Error fetching staff:', error);
        toast.error(t('staff.form.messages.load_failed'));
        navigate('/staff');
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, [isEdit, id, navigate, t]);

  useEffect(() => {
    if (!isEdit || !formData.branch_id) return;
    const match = branches.find(b => b.id === formData.branch_id);
    setCurrentBranchName(match?.name || '');
  }, [isEdit, formData.branch_id, branches]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const staffData = {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim() || '',
        role: formData.role
      };

      if (!isEdit) {
        staffData.email = formData.email.trim();
        staffData.password = formData.password || 'TempPass123!';
        staffData.branch_id = formData.branch_id;
      }

      if (isEdit) {
        await api.updateUser(id, staffData);
        toast.success(t('staff.form.messages.updated'));
      } else {
        await api.createUser(staffData);
        toast.success(t('staff.form.messages.added'));
      }

      navigate('/staff');
    } catch (error) {
      console.error('Error saving staff:', error);
      toast.error(error.response?.data?.error || t('staff.form.messages.save_failed'));
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { value: 'manager', labelKey: 'staff.roles.manager' },
    { value: 'cashier', labelKey: 'staff.roles.cashier' },
    { value: 'store_keeper', labelKey: 'staff.roles.store_keeper' },
    { value: 'sales_rep', labelKey: 'staff.roles.sales_rep' }
  ];

  if (loading && isEdit) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>{t('staff.form.loading')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>{isEdit ? t('staff.form.title_edit') : t('staff.form.title_add')}</h1>
        <p>{isEdit ? t('staff.form.subtitle_edit') : t('staff.form.subtitle_add')}</p>
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('staff.form.labels.full_name')}</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder={t('staff.form.placeholders.full_name')}
              required
            />
          </div>

          <div className="form-group">
            <label>{t('staff.form.labels.email')}</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t('staff.form.placeholders.email')}
              required
              disabled={isEdit}
              style={isEdit ? { backgroundColor: '#f3f4f6' } : {}}
            />
            {isEdit && (
              <small style={{ color: '#6b7280' }}>
                {t('staff.form.email_cannot_change')}
              </small>
            )}
          </div>

          <div className="form-group">
            <label>{t('staff.form.labels.phone')}</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder={t('staff.form.placeholders.phone')}
            />
          </div>

          <div className="form-group">
            <label>{t('staff.form.labels.role')}</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {t(role.labelKey)}
                </option>
              ))}
            </select>
          </div>

          {!isEdit && (
            <div className="form-group">
              <label>{t('staff.form.labels.branch')}</label>
              <select
                name="branch_id"
                value={formData.branch_id}
                onChange={handleChange}
                required
              >
                <option value="">{t('staff.form.select_branch')}</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
              <small style={{ color: '#6b7280' }}>
                {t('staff.form.branch_help')}
              </small>
            </div>
          )}

          {isEdit && (
            <div className="form-group">
              <label>{t('staff.form.labels.branch')}</label>
              <input
                type="text"
                value={currentBranchName || '-'}
                disabled
                style={{ backgroundColor: '#f3f4f6' }}
              />
              <small style={{ color: '#6b7280' }}>
                {t('staff.form.branch_lock_hint')}
              </small>
            </div>
          )}

          {!isEdit && (
            <div className="form-group">
              <label>{t('staff.form.labels.temp_password')}</label>
              <input
                type="text"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="TempPass123!"
                required
              />
              <small style={{ color: '#6b7280' }}>
                {t('staff.form.temp_password_hint')}
              </small>
            </div>
          )}

          <div className="flex" style={{ gap: '10px', marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading
                ? t('staff.form.buttons.saving')
                : (isEdit
                  ? t('staff.form.buttons.submit_edit')
                  : t('staff.form.buttons.submit_add'))}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/staff')}
            >
              {t('staff.form.buttons.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffForm;