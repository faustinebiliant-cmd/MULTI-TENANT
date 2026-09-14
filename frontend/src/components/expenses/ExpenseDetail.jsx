// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Expense Detail
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiEdit2, FiTrash2 } from 'react-icons/fi';
import api from '../../api/client';
import { formatCurrency, formatDateOnly } from '../../utils/helpers';
import Loader from '../common/Loader';
import toast from 'react-hot-toast';

const ExpenseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
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
      toast.error('Expense not found');
      navigate('/expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${expense?.description}"?`)) return;

    setDeleting(true);
    try {
      await api.deleteExpense(id);
      toast.success('Expense deleted successfully');
      navigate('/expenses');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error(error.response?.data?.error || 'Failed to delete expense');
      setDeleting(false);
    }
  };

  if (loading) return <Loader message="Loading expense..." />;

  if (!expense) {
    return (
      <div className="empty-state">
        <h3>Expense not found</h3>
        <button onClick={() => navigate('/expenses')} className="btn btn-primary">
          Back to Expenses
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <button onClick={() => navigate('/expenses')} className="btn btn-sm btn-secondary">
            <FiArrowLeft size={16} /> Back
          </button>
          <h1>{expense.description}</h1>
          <p>Expense recorded on {formatDateOnly(expense.expense_date)}</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Expense Details</h3>
          <div className="detail-row">
            <span className="detail-label">Description</span>
            <span className="detail-value">{expense.description}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Category</span>
            <span className="detail-value">
              <span className="badge badge-info">{expense.category || 'Other'}</span>
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Amount</span>
            <span className="detail-value" style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '20px' }}>
              {formatCurrency(expense.amount)}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Date</span>
            <span className="detail-value">{formatDateOnly(expense.expense_date)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Payment Method</span>
            <span className="detail-value">{expense.payment_method || '-'}</span>
          </div>
        </div>

        <div className="card">
          <h3>Additional Information</h3>
          <div className="detail-row">
            <span className="detail-label">Notes</span>
            <span className="detail-value">{expense.notes || 'No notes'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Created By</span>
            <span className="detail-value">{expense.created_by_name || 'System'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Created At</span>
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
            <FiEdit2 size={18} /> Edit Expense
          </Link>
          <button
            onClick={handleDelete}
            className="btn btn-danger"
            disabled={deleting}
          >
            <FiTrash2 size={18} /> {deleting ? 'Deleting...' : 'Delete Expense'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDetail;