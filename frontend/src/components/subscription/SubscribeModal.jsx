// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Subscribe Modal
// ============================================================

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX, FiCheck } from 'react-icons/fi';
import api from '../../api/client';
import { useBranch } from '../../contexts/BranchContext';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

const METHODS = [
  { value: 'mpesa', labelKey: 'subscribe_modal.methods.mpesa' },
  { value: 'tigo_pesa', labelKey: 'subscribe_modal.methods.tigo_pesa' },
  { value: 'airtel_money', labelKey: 'subscribe_modal.methods.airtel_money' },
  { value: 'bank', labelKey: 'subscribe_modal.methods.bank' }
];

const LIPA_NAMBA = '12345678';

const SubscribeModal = ({ onClose, onSuccess }) => {
  const { t } = useTranslation();
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
        toast.error(t('subscribe_modal.messages.pricing_failed'));
      } finally {
        setLoadingPlans(false);
      }
    };
    load();
  }, [t]);

  const selectedPlan = plans.find((p) => p.duration_months === selectedDuration);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedDuration) {
      toast.error(t('subscribe_modal.messages.plan_required'));
      return;
    }
    if (!transactionId.trim() || transactionId.trim().length < 6) {
      toast.error(t('subscribe_modal.messages.transaction_required'));
      return;
    }

    setSubmitting(true);
    try {
      await api.subscription.submitPayment({
        duration_months: selectedDuration,
        method,
        transaction_id: transactionId.trim()
      });
      toast.success(t('subscribe_modal.messages.success'));
      onSuccess();
    } catch (error) {
      console.error('Submit payment error:', error);
      toast.error(error.response?.data?.error || t('subscribe_modal.messages.submit_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>{t('subscribe_modal.title')}</h2>
          <button type="button" style={styles.closeBtn} onClick={onClose} aria-label={t('common.close')}>
            <FiX size={16} />
          </button>
        </div>

        <div style={styles.instructions}>
          <div style={styles.instructionsTitle}>{t('subscribe_modal.instructions_title')}</div>
          <div style={styles.instructionsLine}>
            {t('subscribe_modal.instructions_line1', { number: LIPA_NAMBA })}
          </div>
          <div style={styles.instructionsLine}>
            {t('subscribe_modal.instructions_line2', { code: activeBusiness?.business_code || '-' })}
          </div>
          <div style={styles.instructionsLine}>
            {t('subscribe_modal.instructions_line3')}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.sectionLabel}>{t('subscribe_modal.choose_plan_label')}</div>
          {loadingPlans ? (
            <div style={styles.loadingText}>{t('subscribe_modal.loading_plans')}</div>
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

          <div style={styles.sectionLabel}>{t('subscribe_modal.method_label')}</div>
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
                {t(m.labelKey)}
              </button>
            ))}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>{t('subscribe_modal.transaction_id_label')}</label>
            <input
              type="text"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder={t('subscribe_modal.transaction_id_placeholder')}
              style={styles.input}
              maxLength={100}
              autoComplete="off"
            />
          </div>

          {selectedPlan && (
            <div style={styles.summary}>
              {t('subscribe_modal.summary_line', {
                amount: formatCurrency(selectedPlan.amount),
                label: selectedPlan.label
              })}
            </div>
          )}

          <div style={styles.actions}>
            <button type="button" style={styles.cancelBtn} onClick={onClose} disabled={submitting}>
              {t('subscribe_modal.cancel_button')}
            </button>
            <button type="submit" style={styles.submitBtn} disabled={submitting}>
              {submitting ? t('subscribe_modal.submitting_button') : t('subscribe_modal.submit_button')}
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