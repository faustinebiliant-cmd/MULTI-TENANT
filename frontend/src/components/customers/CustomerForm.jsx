// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Customer Form
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import toast from 'react-hot-toast';

const CustomerForm = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });

  useEffect(() => {
    if (!isEdit || !id) return;

    const fetchCustomer = async () => {
      try {
        setLoading(true);
        const customer = await api.getCustomer(id);
        setFormData({
          name: customer.name || '',
          phone: customer.phone || '',
          email: customer.email || '',
          address: customer.address || '',
          notes: customer.notes || ''
        });
      } catch (error) {
        console.error('Error fetching customer:', error);
        toast.error(t('customers.form.messages.load_failed'));
        navigate('/customers');
      } finally {
        setLoading(false);
      }
    };
    fetchCustomer();
  }, [isEdit, id, navigate, t]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const customerData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || '',
        address: formData.address.trim() || '',
        notes: formData.notes.trim() || ''
      };

      if (isEdit) {
        await api.updateCustomer(id, customerData);
        toast.success(t('customers.form.messages.updated'));
      } else {
        await api.createCustomer(customerData);
        toast.success(t('customers.form.messages.added'));
      }

      navigate('/customers');
    } catch (error) {
      console.error('Error saving customer:', error);
      const errorMessage = error.response?.data?.error || t('customers.form.messages.save_failed');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>{t('customers.form.loading')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>{isEdit ? t('customers.form.title_edit') : t('customers.form.title_add')}</h1>
        <p>{t('customers.form.subtitle')}</p>
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('customers.form.labels.name')}</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={t('customers.form.placeholders.name')}
              required
            />
          </div>

          <div className="form-group">
            <label>{t('customers.form.labels.phone')}</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder={t('customers.form.placeholders.phone')}
              required
            />
          </div>

          <div className="form-group">
            <label>{t('customers.form.labels.email')}</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t('customers.form.placeholders.email')}
            />
          </div>

          <div className="form-group">
            <label>{t('customers.form.labels.address')}</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder={t('customers.form.placeholders.address')}
              rows="2"
            />
          </div>

          <div className="form-group">
            <label>{t('customers.form.labels.notes')}</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder={t('customers.form.placeholders.notes')}
              rows="2"
            />
          </div>

          <div className="flex" style={{ gap: '10px', marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading
                ? t('customers.form.buttons.saving')
                : (isEdit ? t('customers.form.buttons.submit_edit') : t('customers.form.buttons.submit_add'))}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/customers')}
            >
              {t('customers.form.buttons.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerForm;