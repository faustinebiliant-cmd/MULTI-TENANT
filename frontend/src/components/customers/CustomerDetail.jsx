// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Customer Detail
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
      toast.error('Customer not found');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await api.deleteCustomer(id);
      toast.success('Customer deleted successfully');
      navigate('/customers');
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error(error.response?.data?.error || 'Failed to delete customer');
      setDeleting(false);
      setShowDelete(false);
    }
  };

  if (loading) return <Loader message="Loading customer..." />;

  if (!customer) {
    return (
      <div className="empty-state">
        <h3>Customer not found</h3>
        <button onClick={() => navigate('/customers')} className="btn btn-primary">
          Back to Customers
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
        <FiArrowLeft size={16} /> Back
      </button>

      <div className="card customer-profile-header">
        <div className="customer-profile-avatar">{initials}</div>
        <div className="customer-profile-info">
          <h1 style={{ margin: 0 }}>{customer.name}</h1>
          <p style={{ margin: '2px 0 10px 0' }}>
            Customer since {formatDate(customer.created_at)}
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
            <FiEdit2 size={16} /> Edit
          </Link>
          <button onClick={() => setShowDelete(true)} className="btn btn-danger">
            <FiTrash2 size={16} /> Delete
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
            <p>Total Orders</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--tone-green-bg)', color: 'var(--tone-green-text)' }}>
            <FiDollarSign size={20} />
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(customer.total_spent || 0)}</h3>
            <p>Total Spent</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--tone-purple-bg)', color: 'var(--tone-purple-text)' }}>
            <FiTrendingUp size={20} />
          </div>
          <div className="stat-info">
            <h3>{avgOrder > 0 ? formatCurrency(avgOrder) : '-'}</h3>
            <p>Average Order</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h3>Additional Information</h3>
        <div className="detail-row">
          <span className="detail-label">Notes</span>
          <span className="detail-value">{customer.notes || '-'}</span>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        title="Delete Customer"
        message={`Are you sure you want to delete "${customer.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
};

export default CustomerDetail;