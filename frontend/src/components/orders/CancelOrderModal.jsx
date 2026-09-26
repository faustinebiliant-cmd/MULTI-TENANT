// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Cancel Order Modal
// ============================================================

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX, FiAlertTriangle } from 'react-icons/fi';
import api from '../../api/client';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

const CancelOrderModal = ({ order, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = reason.trim().length >= 3 && reason.trim().length <= 100;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isValid) {
      toast.error(t('cancel_modal.messages.reason_length'));
      return;
    }

    setLoading(true);
    try {
      await api.cancelOrder(order.id, reason.trim());
      toast.success(t('cancel_modal.messages.success'));
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Cancel order error:', error);
      toast.error(error.response?.data?.error || t('cancel_modal.messages.failed'));
      onClose();
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
            <h2 style={{ margin: 0 }}>{t('cancel_modal.title')}</h2>
            <p style={{ fontSize: '13px', color: 'var(--gray)', marginTop: '2px' }}>
              {order.order_number}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-sm btn-secondary" aria-label={t('common.close')}>
            <FiX size={18} />
          </button>
        </div>

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
            <strong>{t('cancel_modal.warning_title')}</strong>
            <br />
            {t('cancel_modal.warning_intro')}
            <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
              <li>{t('cancel_modal.warning_restore_stock')}</li>
              <li>{t('cancel_modal.warning_remove_totals')}</li>
              <li>{t('cancel_modal.warning_reverse_customer')}</li>
              {hasPayment && <li><strong>{t('cancel_modal.warning_delete_payments')}</strong></li>}
            </ul>
          </div>
        </div>

        <div className="payment-summary-card" style={{ marginBottom: '16px' }}>
          <div className="payment-summary-row">
            <span>{t('cancel_modal.summary.customer')}</span>
            <strong>{order.customers?.name || order.customer_name || t('cancel_modal.walk_in')}</strong>
          </div>
          <div className="payment-summary-row">
            <span>{t('cancel_modal.summary.order_total')}</span>
            <strong>{formatCurrency(parseFloat(order.total_amount) || 0)}</strong>
          </div>
          {hasPayment && (
            <div className="payment-summary-row">
              <span>{t('cancel_modal.summary.already_paid')}</span>
              <strong style={{ color: 'var(--success)' }}>
                {formatCurrency(parseFloat(order.paid_amount) || 0)}
              </strong>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('cancel_modal.reason_label')}</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('cancel_modal.reason_placeholder')}
              rows="3"
              maxLength={100}
              required
              autoFocus
            />
            <small style={{ color: 'var(--gray)', display: 'block', marginTop: '4px' }}>
              {t('cancel_modal.reason_hint', { count: reason.length })}
            </small>
          </div>

          <div className="flex" style={{ gap: '10px', marginTop: '20px' }}>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={loading || !isValid}
              style={{ flex: 1 }}
            >
              {loading ? t('cancel_modal.cancelling') : t('cancel_modal.confirm_button')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t('cancel_modal.keep_button')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CancelOrderModal;