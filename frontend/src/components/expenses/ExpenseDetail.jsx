// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Expense Detail
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiEdit2, FiTrash2 } from 'react-icons/fi';
import api from '../../api/client';
import { formatCurrency, formatDateOnly } from '../../utils/helpers';
import Loader from '../common/Loader';
import ConfirmDialog from '../common/ConfirmDialog';
import toast from 'react-hot-toast';

const ExpenseDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchExpense();
  }, [id]);

  const fetchExpense = async () => {
    try {
      setLoading(true);
      const data = await api.getExpense(id);
      setExpense(data);
    } catch (error) {
      console.error('Error fetching expense:', error);
      toast.error(t('expenses.detail.messages.not_found'));
      navigate('/expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await api.deleteExpense(id);
      toast.success(t('expenses.detail.messages.deleted'));
      navigate('/expenses');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error(error.response?.data?.error || t('expenses.detail.messages.delete_failed'));
      setDeleting(false);
      setShowDelete(false);
    }
  };

  if (loading) return <Loader message={t('expenses.detail.loading')} />;

  if (!expense) {
    return (
      <div className="empty-state">
        <h3>{t('expenses.detail.not_found')}</h3>
        <button onClick={() => navigate('/expenses')} className="btn btn-primary">
          {t('expenses.detail.back_to_expenses')}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <button onClick={() => navigate('/expenses')} className="btn btn-sm btn-secondary">
            <FiArrowLeft size={16} /> {t('expenses.detail.back')}
          </button>
          <h1>{expense.description}</h1>
          <p>{t('expenses.detail.recorded_on', { date: formatDateOnly(expense.expense_date) })}</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>{t('expenses.detail.details_title')}</h3>
          <div className="detail-row">
            <span className="detail-label">{t('expenses.detail.labels.description')}</span>
            <span className="detail-value">{expense.description}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('expenses.detail.labels.category')}</span>
            <span className="detail-value">
              <span className="badge badge-info">{expense.category || 'Other'}</span>
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('expenses.detail.labels.amount')}</span>
            <span className="detail-value" style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '20px' }}>
              {formatCurrency(expense.amount)}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('expenses.detail.labels.date')}</span>
            <span className="detail-value">{formatDateOnly(expense.expense_date)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('expenses.detail.labels.payment_method')}</span>
            <span className="detail-value">{expense.payment_method || '-'}</span>
          </div>
        </div>

        <div className="card">
          <h3>{t('expenses.detail.additional_info_title')}</h3>
          <div className="detail-row">
            <span className="detail-label">{t('expenses.detail.labels.notes')}</span>
            <span className="detail-value">{expense.notes || t('expenses.detail.no_notes')}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('expenses.detail.labels.created_by')}</span>
            <span className="detail-value">{expense.created_by_name || 'System'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('expenses.detail.labels.created_at')}</span>
            <span className="detail-value">{formatDateOnly(expense.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="flex" style={{ gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link
            to={`/expenses/${id}/edit`}
            className="btn btn-primary"
            state={{ expense }}
          >
            <FiEdit2 size={18} /> {t('expenses.detail.edit_button')}
          </Link>
          <button
            onClick={() => setShowDelete(true)}
            className="btn btn-danger"
          >
            <FiTrash2 size={18} /> {t('expenses.detail.delete_button')}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        title={t('expenses.detail.delete_dialog.title')}
        message={t('expenses.detail.delete_dialog.message', { description: expense.description })}
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

export default ExpenseDetail;