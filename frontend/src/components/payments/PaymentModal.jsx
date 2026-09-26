// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Payment Modal
// ============================================================

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX, FiDollarSign, FiSmartphone } from 'react-icons/fi';
import api from '../../api/client';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

const PaymentModal = ({ order, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const total = parseFloat(order.total_amount) || 0;
  const paid = parseFloat(order.paid_amount) || 0;
  const tax = parseFloat(order.tax_amount) || 0;
  const remaining = total - paid;
  const isSettled = remaining <= 0;

  const [amount, setAmount] = useState(remaining > 0 ? remaining : 0);
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);

  const paymentMethods = [
    { value: 'cash', labelKey: 'payment_modal.methods.cash', icon: FiDollarSign },
    { value: 'mpesa', labelKey: 'payment_modal.methods.mpesa', icon: FiSmartphone },
    { value: 'tigo_pesa', labelKey: 'payment_modal.methods.tigo_pesa', icon: FiSmartphone }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!amount || amount <= 0) {
      toast.error(t('payment_modal.messages.invalid_amount'));
      return;
    }

    if (amount > remaining) {
      toast.error(t('payment_modal.messages.exceeds_balance'));
      return;
    }

    if ((method === 'mpesa' || method === 'tigo_pesa') && !reference) {
      toast.error(t('payment_modal.messages.reference_required'));
      return;
    }

    setLoading(true);

    try {
      const paymentData = {
        amount: parseFloat(amount),
        method,
        reference_number: reference || null
      };

      const response = await api.recordPayment(order.id, paymentData);

      toast.success(t('payment_modal.messages.success', { amount: formatCurrency(amount) }));
      onSuccess(response.data);
      onClose();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error(error.response?.data?.error || t('payment_modal.messages.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="payment-modal-header">
          <div>
            <h2>{t('payment_modal.title')}</h2>
            <p className="order-ref">
              {t('payment_modal.order_ref', {
                number: order.order_number,
                customer: order.customers?.name || order.customer_name || t('orders.list.walk_in')
              })}
            </p>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label={t('common.close')}>
            <FiX size={16} />
          </button>
        </div>

        <div className="payment-balance-hero">
          <div className="balance-label">
            {isSettled ? t('payment_modal.fully_paid') : t('payment_modal.balance_due')}
          </div>
          <div className={`balance-amount ${isSettled ? 'is-settled' : ''}`}>
            {formatCurrency(isSettled ? 0 : remaining)}
          </div>
          <div className="payment-balance-details">
            <span className="detail">
              {t('payment_modal.summary.total')}<strong>{formatCurrency(total)}</strong>
            </span>
            {tax > 0 && (
              <span className="detail">
                {t('payment_modal.summary.vat')}<strong>{formatCurrency(tax)}</strong>
              </span>
            )}
            {paid > 0 && (
              <span className="detail">
                {t('payment_modal.summary.paid')}<strong>{formatCurrency(paid)}</strong>
              </span>
            )}
          </div>
        </div>

        {!isSettled && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t('payment_modal.method_label')}</label>
              <div className="payment-methods">
                {paymentMethods.map((pm) => {
                  const Icon = pm.icon;
                  return (
                    <button
                      key={pm.value}
                      type="button"
                      className={`payment-method-btn ${method === pm.value ? 'active' : ''}`}
                      onClick={() => setMethod(pm.value)}
                    >
                      <Icon size={18} />
                      {t(pm.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label>{t('payment_modal.amount_label')}</label>
              <div className="amount-input-wrapper">
                <span className="currency-prefix">TZS</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  min="1"
                  max={remaining}
                  step="1"
                  required
                />
              </div>
              <div className="payment-quick-amounts">
                <button
                  type="button"
                  className="quick-amount-btn"
                  onClick={() => setAmount(Math.round(remaining / 2))}
                >
                  {t('payment_modal.quick_amounts.half', { amount: formatCurrency(Math.round(remaining / 2)) })}
                </button>
                <button
                  type="button"
                  className="quick-amount-btn"
                  onClick={() => setAmount(remaining)}
                >
                  {t('payment_modal.quick_amounts.full', { amount: formatCurrency(remaining) })}
                </button>
              </div>
            </div>

            {(method === 'mpesa' || method === 'tigo_pesa') && (
              <div className="form-group">
                <label>{t('payment_modal.reference_label')}</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder={t('payment_modal.reference_placeholder')}
                  required
                />
              </div>
            )}

            <div className="modal-footer-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                {t('payment_modal.buttons.cancel')}
              </button>
              <button type="submit" className="btn btn-success btn-block" disabled={loading}>
                {loading
                  ? t('payment_modal.buttons.recording')
                  : t('payment_modal.buttons.record', { amount: formatCurrency(amount) })}
              </button>
            </div>
          </form>
        )}

        {isSettled && (
          <button type="button" className="btn btn-secondary btn-block" onClick={onClose}>
            {t('payment_modal.buttons.close')}
          </button>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;