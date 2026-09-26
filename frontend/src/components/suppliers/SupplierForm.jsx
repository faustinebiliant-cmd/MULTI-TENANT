// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Supplier Form
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import toast from 'react-hot-toast';

const SupplierForm = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });

  useEffect(() => {
    if (!isEdit || !id) return;

    const fetchSupplier = async () => {
      try {
        setLoading(true);
        const data = await api.getSupplier(id);
        setFormData({
          name: data.name || '',
          contact_person: data.contact_person || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          notes: data.notes || ''
        });
      } catch (error) {
        console.error('Error fetching supplier:', error);
        toast.error(t('suppliers.form.messages.load_failed'));
        navigate('/suppliers');
      } finally {
        setLoading(false);
      }
    };
    fetchSupplier();
  }, [isEdit, id, navigate, t]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error(t('suppliers.form.messages.name_required'));
      return;
    }
    if (!formData.phone.trim()) {
      toast.error(t('suppliers.form.messages.phone_required'));
      return;
    }

    setLoading(true);

    try {
      const supplierData = {
        name: formData.name.trim(),
        contact_person: formData.contact_person.trim() || '',
        phone: formData.phone.trim(),
        email: formData.email.trim() || '',
        address: formData.address.trim() || '',
        notes: formData.notes.trim() || ''
      };

      if (isEdit) {
        await api.updateSupplier(id, supplierData);
        toast.success(t('suppliers.form.messages.updated'));
      } else {
        await api.createSupplier(supplierData);
        toast.success(t('suppliers.form.messages.added'));
      }
      navigate('/suppliers');
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error(error.response?.data?.error || t('suppliers.form.messages.save_failed'));
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>{t('suppliers.form.loading')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>{isEdit ? t('suppliers.form.title_edit') : t('suppliers.form.title_add')}</h1>
        <p>{isEdit ? t('suppliers.form.subtitle_edit') : t('suppliers.form.subtitle_add')}</p>
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('suppliers.form.labels.name')}</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={t('suppliers.form.placeholders.name')}
              required
            />
          </div>

          <div className="form-group">
            <label>{t('suppliers.form.labels.contact_person')}</label>
            <input
              type="text"
              name="contact_person"
              value={formData.contact_person}
              onChange={handleChange}
              placeholder={t('suppliers.form.placeholders.contact_person')}
            />
          </div>

          <div className="form-group">
            <label>{t('suppliers.form.labels.phone')}</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder={t('suppliers.form.placeholders.phone')}
              required
            />
          </div>

          <div className="form-group">
            <label>{t('suppliers.form.labels.email')}</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t('suppliers.form.placeholders.email')}
            />
          </div>

          <div className="form-group">
            <label>{t('suppliers.form.labels.address')}</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder={t('suppliers.form.placeholders.address')}
              rows="2"
            />
          </div>

          <div className="form-group">
            <label>{t('suppliers.form.labels.notes')}</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder={t('suppliers.form.placeholders.notes')}
              rows="2"
            />
          </div>

          <div className="flex" style={{ gap: '10px', marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading
                ? t('suppliers.form.buttons.saving')
                : (isEdit
                  ? t('suppliers.form.buttons.submit_edit')
                  : t('suppliers.form.buttons.submit_add'))}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/suppliers')}
            >
              {t('suppliers.form.buttons.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupplierForm;