// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Customer Detail
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FiArrowLeft, FiEdit2, FiTrash2, FiPhone, FiMail, FiMapPin,
  FiShoppingBag, FiDollarSign, FiTrendingUp
} from 'react-icons/fi';
import api from '../../api/client';
import { formatCurrency, formatDate } from '../../utils/helpers';
import Loader from '../common/Loader';
import ConfirmDialog from '../common/ConfirmDialog';
import toast from 'react-hot-toast';

const CustomerDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const data = await api.getCustomer(id);
      setCustomer(data);
    } catch (error) {
      console.error('Error fetching customer:', error);
      toast.error(t('customers.detail.messages.not_found'));
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await api.deleteCustomer(id);
      toast.success(t('customers.detail.messages.deleted'));
      navigate('/customers');
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error(error.response?.data?.error || t('customers.detail.messages.delete_failed'));
      setDeleting(false);
      setShowDelete(false);
    }
  };

  if (loading) return <Loader message={t('customers.detail.loading')} />;

  if (!customer) {
    return (
      <div className="empty-state">
        <h3>{t('customers.detail.not_found')}</h3>
        <button onClick={() => navigate('/customers')} className="btn btn-primary">
          {t('customers.detail.back_to_customers')}
        </button>
      </div>
    );
  }

  const initials = customer.name
    ? customer.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const avgOrder = customer.total_orders > 0
    ? (customer.total_spent || 0) / customer.total_orders
    : 0;

  return (
    <div>
      <button
        onClick={() => navigate('/customers')}
        className="btn btn-sm btn-secondary"
        style={{ marginBottom: '16px' }}
      >
        <FiArrowLeft size={16} /> {t('customers.detail.back')}
      </button>

      <div className="card customer-profile-header">
        <div className="customer-profile-avatar">{initials}</div>
        <div className="customer-profile-info">
          <h1 style={{ margin: 0 }}>{customer.name}</h1>
          <p style={{ margin: '2px 0 10px 0' }}>
            {t('customers.detail.customer_since', { date: formatDate(customer.created_at) })}
          </p>
          <div className="customer-profile-contacts">
            {customer.phone && (
              <span className="customer-contact-pill">
                <FiPhone size={13} /> {customer.phone}
              </span>
            )}
            {customer.email && (
              <span className="customer-contact-pill">
                <FiMail size={13} /> {customer.email}
              </span>
            )}
            {customer.address && (
              <span className="customer-contact-pill">
                <FiMapPin size={13} /> {customer.address}
              </span>
            )}
          </div>
        </div>
        <div className="customer-profile-actions">
          <Link to={`/customers/${id}/edit`} className="btn btn-secondary">
            <FiEdit2 size={16} /> {t('customers.detail.edit_button')}
          </Link>
          <button onClick={() => setShowDelete(true)} className="btn btn-danger">
            <FiTrash2 size={16} /> {t('customers.detail.delete_button')}
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ marginTop: '20px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--tone-blue-bg)', color: 'var(--tone-blue-text)' }}>
            <FiShoppingBag size={20} />
          </div>
          <div className="stat-info">
            <h3>{customer.total_orders || 0}</h3>
            <p>{t('customers.detail.stats.total_orders')}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--tone-green-bg)', color: 'var(--tone-green-text)' }}>
            <FiDollarSign size={20} />
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(customer.total_spent || 0)}</h3>
            <p>{t('customers.detail.stats.total_spent')}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--tone-purple-bg)', color: 'var(--tone-purple-text)' }}>
            <FiTrendingUp size={20} />
          </div>
          <div className="stat-info">
            <h3>{avgOrder > 0 ? formatCurrency(avgOrder) : '-'}</h3>
            <p>{t('customers.detail.stats.average_order')}</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h3>{t('customers.detail.additional_info_title')}</h3>
        <div className="detail-row">
          <span className="detail-label">{t('customers.detail.labels.notes')}</span>
          <span className="detail-value">{customer.notes || '-'}</span>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        title={t('customers.detail.delete_confirm_title')}
        message={t('customers.detail.delete_confirm_message', { name: customer.name })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
};

export default CustomerDetail;