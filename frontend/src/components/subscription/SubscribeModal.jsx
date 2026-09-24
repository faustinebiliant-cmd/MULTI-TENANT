// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Subscribe Modal
// Shown to a Boss when they click Subscribe on the trial banner.
// ============================================================

import React, { useEffect, useState } from 'react';
import { FiX, FiCheck } from 'react-icons/fi';
import api from '../../api/client';
import { useBranch } from '../../contexts/BranchContext';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

const METHODS = [
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'tigo_pesa', label: 'Tigo Pesa' },
  { value: 'airtel_money', label: 'Airtel Money' },
  { value: 'bank', label: 'Bank transfer' }
];

const LIPA_NAMBA = '12345678';

const SubscribeModal = ({ onClose, onSuccess }) => {
  const { activeBusiness } = useBranch();

  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [method, setMethod] = useState('mpesa');
  const [transactionId, setTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.subscription.getPricing();
        setPlans(data || []);
      } catch (error) {
        console.error('Failed to load pricing:', error);
        toast.error('Failed to load pricing');
      } finally {
        setLoadingPlans(false);
      }
    };
    load();
  }, []);

  const selectedPlan = plans.find((p) => p.duration_months === selectedDuration);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedDuration) {
      toast.error('Please choose a plan');
      return;
    }
    if (!transactionId.trim() || transactionId.trim().length < 6) {
      toast.error('Please enter a valid transaction ID');
      return;
    }

    setSubmitting(true);
    try {
      await api.subscription.submitPayment({
        duration_months: selectedDuration,
        method,
        transaction_id: transactionId.trim()
      });
      toast.success('Payment submitted. Awaiting review.');
      onSuccess();
    } catch (error) {
      console.error('Submit payment error:', error);
      toast.error(error.response?.data?.error || 'Failed to submit payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Subscribe to OSWAGOTech</h2>
          <button type="button" style={styles.closeBtn} onClick={onClose} aria-label="Close">
            <FiX size={16} />
          </button>
        </div>

        <div style={styles.instructions}>
          <div style={styles.instructionsTitle}>How to pay</div>
          <div style={styles.instructionsLine}>
            Send payment to <strong>Lipa Namba {LIPA_NAMBA}</strong>.
          </div>
          <div style={styles.instructionsLine}>
            Use your business code <strong>{activeBusiness?.business_code || '—'}</strong> as the reference.
          </div>
          <div style={styles.instructionsLine}>
            Then enter the transaction ID below.
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.sectionLabel}>Choose a plan</div>
          {loadingPlans ? (
            <div style={styles.loadingText}>Loading plans...</div>
          ) : (
            <div style={styles.planList}>
              {plans.map((plan) => {
                const isSelected = selectedDuration === plan.duration_months;
                return (
                  <button
                    key={plan.duration_months}
                    type="button"
                    style={{
                      ...styles.planCard,
                      ...(isSelected ? styles.planCardSelected : {})
                    }}
                    onClick={() => setSelectedDuration(plan.duration_months)}
                  >
                    <div style={styles.planLeft}>
                      <div style={styles.planLabel}>{plan.label}</div>
                      <div style={styles.planAmount}>{formatCurrency(plan.amount)}</div>
                    </div>
                    {isSelected && (
                      <div style={styles.planCheck}>
                        <FiCheck size={16} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div style={styles.sectionLabel}>Payment method</div>
          <div style={styles.methodRow}>
            {METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                style={{
                  ...styles.methodBtn,
                  ...(method === m.value ? styles.methodBtnActive : {})
                }}
                onClick={() => setMethod(m.value)}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Transaction ID</label>
            <input
              type="text"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="e.g. 8HJK1234XY"
              style={styles.input}
              maxLength={100}
              autoComplete="off"
            />
          </div>

          {selectedPlan && (
            <div style={styles.summary}>
              You are paying <strong>{formatCurrency(selectedPlan.amount)}</strong> for {selectedPlan.label}.
            </div>
          )}

          <div style={styles.actions}>
            <button type="button" style={styles.cancelBtn} onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" style={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.5)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px'
  },
  modal: {
    background: '#fff',
    borderRadius: '14px',
    padding: '24px',
    width: '100%',
    maxWidth: '520px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.25)'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px'
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700,
    color: '#0f172a'
  },
  closeBtn: {
    background: '#f4f6f9',
    border: 'none',
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b'
  },
  instructions: {
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '10px',
    padding: '14px 16px',
    marginBottom: '20px'
  },
  instructionsTitle: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#92400e',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px'
  },
  instructionsLine: {
    fontSize: '13px',
    color: '#78350f',
    lineHeight: 1.55
  },
  sectionLabel: {
    fontSize: '11.5px',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    marginTop: '18px',
    marginBottom: '8px'
  },
  loadingText: {
    fontSize: '13px',
    color: '#64748b',
    padding: '12px 0'
  },
  planList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  planCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    background: '#fff',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'inherit'
  },
  planCardSelected: {
    borderColor: '#1a56db',
    background: '#eff6ff'
  },
  planLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  planLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#0f172a'
  },
  planAmount: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#1a56db'
  },
  planCheck: {
    color: '#1a56db'
  },
  methodRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px'
  },
  methodBtn: {
    padding: '9px 10px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '8px',
    background: '#fff',
    fontSize: '12.5px',
    fontWeight: 600,
    color: '#64748b',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  methodBtnActive: {
    borderColor: '#1a56db',
    background: '#eff6ff',
    color: '#1a56db'
  },
  formGroup: {
    marginTop: '18px'
  },
  label: {
    display: 'block',
    fontSize: '12.5px',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '6px'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '13.5px',
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  },
  summary: {
    marginTop: '16px',
    padding: '10px 14px',
    background: '#eff6ff',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#1e40af'
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '22px'
  },
  cancelBtn: {
    padding: '10px 18px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    background: '#fff',
    fontSize: '13.5px',
    fontWeight: 600,
    color: '#0f172a',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  submitBtn: {
    padding: '10px 22px',
    border: 'none',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #1a56db, #0a3b8a)',
    color: '#fff',
    fontSize: '13.5px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit'
  }
};

export default SubscribeModal;