// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Payment Modal
// ============================================================

import React, { useState } from 'react';
import { FiX, FiDollarSign, FiSmartphone } from 'react-icons/fi';
import api from '../../api/client';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

const PaymentModal = ({ order, onClose, onSuccess }) => {
  // ✅ USE order.total_amount (includes VAT) instead of subtotal
  const [amount, setAmount] = useState(order?.total_amount || 0);
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);

  const paymentMethods = [
    { value: 'cash', label: 'Cash', icon: FiDollarSign },
    { value: 'mpesa', label: 'M-Pesa', icon: FiSmartphone },
    { value: 'tigo_pesa', label: 'Tigo Pesa', icon: FiSmartphone }
  ];

  // ✅ REMAINING BALANCE = total_amount - paid_amount
  const remaining = (parseFloat(order.total_amount) || 0) - (parseFloat(order.paid_amount) || 0);

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
        method: method,
        reference_number: reference || null
      };

      const response = await api.recordPayment(order.id, paymentData);

      toast.success(`Payment of ${formatCurrency(amount)} recorded successfully!`);
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
        <div className="flex-between" style={{ marginBottom: '18px' }}>
          <div>
            <h2 style={{ margin: 0 }}>Record Payment</h2>
            <p style={{ fontSize: '13px', color: 'var(--gray)', marginTop: '2px' }}>
              Order #{order.order_number}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-sm btn-secondary" aria-label="Close">
            <FiX size={18} />
          </button>
        </div>

        {/* Summary card */}
        <div className="payment-summary-card">
          <div className="payment-summary-row">
            <span>Customer</span>
            <strong>{order.customers?.name || order.customer_name || 'Walk-in'}</strong>
          </div>
          <div className="payment-summary-row">
            <span>Total Amount (incl. VAT)</span>
            <strong>{formatCurrency(parseFloat(order.total_amount) || 0)}</strong>
          </div>
          {parseFloat(order.tax_amount) > 0 && (
            <div className="payment-summary-row">
              <span>VAT Included</span>
              <strong style={{ color: '#b45309' }}>{formatCurrency(parseFloat(order.tax_amount) || 0)}</strong>
            </div>
          )}
          {parseFloat(order.paid_amount) > 0 && (
            <div className="payment-summary-row">
              <span>Already Paid</span>
              <strong style={{ color: 'var(--success)' }}>{formatCurrency(parseFloat(order.paid_amount) || 0)}</strong>
            </div>
          )}
          <div className="payment-summary-row remaining">
            <span>Remaining Balance</span>
            <strong style={{ color: remaining > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {formatCurrency(remaining)}
            </strong>
          </div>
        </div>

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
            <label>Amount (TZS)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              min="1"
              max={remaining}
              step="1"
              required
            />
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

          <div className="flex" style={{ gap: '10px', marginTop: '22px' }}>
            <button type="submit" className="btn btn-success btn-block" disabled={loading}>
              {loading ? 'Recording...' : `Record ${formatCurrency(amount)}`}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;