// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Cancel Order Modal
// ============================================================

import React, { useState } from 'react';
import { FiX, FiAlertTriangle } from 'react-icons/fi';
import api from '../../api/client';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

const CancelOrderModal = ({ order, onClose, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = reason.trim().length >= 3 && reason.trim().length <= 100;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isValid) {
      toast.error('Reason must be between 3 and 100 characters');
      return;
    }

    setLoading(true);
    try {
      await api.cancelOrder(order.id, reason.trim());
      toast.success('Order cancelled successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Cancel order error:', error);
      toast.error(error.response?.data?.error || 'Failed to cancel order');
    } finally {
      setLoading(false);
    }
  };

  const hasPayment = (parseFloat(order.paid_amount) || 0) > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex-between" style={{ marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0 }}>Cancel Order</h2>
            <p style={{ fontSize: '13px', color: 'var(--gray)', marginTop: '2px' }}>
              {order.order_number}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-sm btn-secondary" aria-label="Close">
            <FiX size={18} />
          </button>
        </div>

        {/* Warning */}
        <div style={{
          padding: '12px 14px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start'
        }}>
          <FiAlertTriangle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '13px', color: '#991b1b', lineHeight: 1.5 }}>
            <strong>This action cannot be undone.</strong>
            <br />
            Cancelling this order will:
            <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
              <li>Restore stock for all items</li>
              <li>Remove it from sales and VAT totals</li>
              <li>Reverse the customer's stats</li>
              {hasPayment && <li><strong>Delete all recorded payments</strong></li>}
            </ul>
          </div>
        </div>

        {/* Summary */}
        <div className="payment-summary-card" style={{ marginBottom: '16px' }}>
          <div className="payment-summary-row">
            <span>Customer</span>
            <strong>{order.customers?.name || order.customer_name || 'Walk-in'}</strong>
          </div>
          <div className="payment-summary-row">
            <span>Order Total</span>
            <strong>{formatCurrency(parseFloat(order.total_amount) || 0)}</strong>
          </div>
          {hasPayment && (
            <div className="payment-summary-row">
              <span>Already Paid</span>
              <strong style={{ color: 'var(--success)' }}>
                {formatCurrency(parseFloat(order.paid_amount) || 0)}
              </strong>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Cancellation Reason *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this order being cancelled?"
              rows="3"
              maxLength={100}
              required
              autoFocus
            />
            <small style={{ color: 'var(--gray)', display: 'block', marginTop: '4px' }}>
              {reason.length} / 100 characters (minimum 3)
            </small>
          </div>

          <div className="flex" style={{ gap: '10px', marginTop: '20px' }}>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={loading || !isValid}
              style={{ flex: 1 }}
            >
              {loading ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Keep Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CancelOrderModal;