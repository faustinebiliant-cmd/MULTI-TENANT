// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Payment Modal
// ============================================================

import React, { useState } from 'react';
import { FiX, FiDollarSign, FiSmartphone } from 'react-icons/fi';
import api from '../../api/client';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

const PaymentModal = ({ order, onClose, onSuccess }) => {
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
    { value: 'cash', label: 'Cash', icon: FiDollarSign },
    { value: 'mpesa', label: 'M-Pesa', icon: FiSmartphone },
    { value: 'tigo_pesa', label: 'Tigo Pesa', icon: FiSmartphone }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > remaining) {
      toast.error('Amount cannot exceed remaining balance');
      return;
    }

    if ((method === 'mpesa' || method === 'tigo_pesa') && !reference) {
      toast.error('Please enter the reference number');
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

      toast.success(`Payment of ${formatCurrency(amount)} recorded`);
      onSuccess(response.data);
      onClose();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error(error.response?.data?.error || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="payment-modal-header">
          <div>
            <h2>Record Payment</h2>
            <p className="order-ref">
              Order #{order.order_number} · {order.customers?.name || order.customer_name || 'Walk-in'}
            </p>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close">
            <FiX size={16} />
          </button>
        </div>

        {/* Balance summary */}
        <div className="payment-balance-hero">
          <div className="balance-label">{isSettled ? 'Fully Paid' : 'Balance Due'}</div>
          <div className={`balance-amount ${isSettled ? 'is-settled' : ''}`}>
            {formatCurrency(isSettled ? 0 : remaining)}
          </div>
          <div className="payment-balance-details">
            <span className="detail">Total<strong>{formatCurrency(total)}</strong></span>
            {tax > 0 && <span className="detail">VAT<strong>{formatCurrency(tax)}</strong></span>}
            {paid > 0 && <span className="detail">Paid<strong>{formatCurrency(paid)}</strong></span>}
          </div>
        </div>

        {!isSettled && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Payment Method</label>
              <div className="payment-methods">
                {paymentMethods.map((pm) => (
                  <button
                    key={pm.value}
                    type="button"
                    className={`payment-method-btn ${method === pm.value ? 'active' : ''}`}
                    onClick={() => setMethod(pm.value)}
                  >
                    <pm.icon size={18} />
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Amount</label>
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
                  Half — {formatCurrency(Math.round(remaining / 2))}
                </button>
                <button
                  type="button"
                  className="quick-amount-btn"
                  onClick={() => setAmount(remaining)}
                >
                  Full — {formatCurrency(remaining)}
                </button>
              </div>
            </div>

            {(method === 'mpesa' || method === 'tigo_pesa') && (
              <div className="form-group">
                <label>Reference Number</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Enter M-Pesa/Tigo reference number"
                  required
                />
              </div>
            )}

            <div className="modal-footer-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-success btn-block" disabled={loading}>
                {loading ? 'Recording…' : `Record ${formatCurrency(amount)}`}
              </button>
            </div>
          </form>
        )}

        {isSettled && (
          <button type="button" className="btn btn-secondary btn-block" onClick={onClose}>
            Close
          </button>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;
