// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Expense Form
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../../utils/constants';
import toast from 'react-hot-toast';

const ExpenseForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: '',
    notes: ''
  });

  // ✅ Load expense data when editing
  useEffect(() => {
    if (isEdit && id) {
      const fetchExpense = async () => {
        try {
          setLoading(true);
          const data = await api.getExpense(id);
          setFormData({
            description: data.description || '',
            amount: data.amount || '',
            category: data.category || '',
            expense_date: data.expense_date || new Date().toISOString().split('T')[0],
            payment_method: data.payment_method || '',
            notes: data.notes || ''
          });
        } catch (error) {
          console.error('Error fetching expense:', error);
          toast.error('Failed to load expense');
          navigate('/expenses');
        } finally {
          setLoading(false);
        }
      };
      fetchExpense();
    }
  }, [isEdit, id, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const expenseData = {
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        category: formData.category || 'Other',
        expense_date: formData.expense_date,
        payment_method: formData.payment_method || '',
        notes: formData.notes || ''
      };

      if (isEdit) {
        await api.updateExpense(id, expenseData);
        toast.success('Expense updated successfully!');
      } else {
        await api.createExpense(expenseData);
        toast.success('Expense added successfully!');
      }
      navigate('/expenses');
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error(error.response?.data?.error || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Loading expense...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>{isEdit ? 'Edit Expense' : 'Add Expense'}</h1>
        <p>{isEdit ? 'Update expense details' : 'Record a new business expense'}</p>
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Description *</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="e.g., Monthly Rent, Salaries, Electricity Bill"
              required
            />
          </div>

          <div className="form-group">
            <label>Amount (TZS) *</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="Enter amount"
              required
              min="0"
              step="100"
            />
          </div>

          <div className="form-group">
            <label>Category *</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              <option value="">Select a category</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Expense Date</label>
            <input
              type="date"
              name="expense_date"
              value={formData.expense_date}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Payment Method</label>
            <select
              name="payment_method"
              value={formData.payment_method}
              onChange={handleChange}
            >
              <option value="">Select payment method</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.icon} {method.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Notes (Optional)</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any additional notes..."
              rows="2"
            />
          </div>

          <div className="flex" style={{ gap: '10px', marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (isEdit ? 'Update Expense' : 'Add Expense')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/expenses')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseForm;