// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Expense Form
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import { useShop } from '../../contexts/ShopContext';
import { PAYMENT_METHODS } from '../../utils/constants';
import toast from 'react-hot-toast';

const ExpenseForm = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const { expenseCategories } = useShop();

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: '',
    notes: ''
  });

  useEffect(() => {
    if (!isEdit || !id) return;

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
        toast.error(t('expenses.form.messages.load_failed'));
        navigate('/expenses');
      } finally {
        setLoading(false);
      }
    };
    fetchExpense();
  }, [isEdit, id, navigate, t]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
        toast.success(t('expenses.form.messages.updated'));
      } else {
        await api.createExpense(expenseData);
        toast.success(t('expenses.form.messages.added'));
      }
      navigate('/expenses');
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error(error.response?.data?.error || t('expenses.form.messages.save_failed'));
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>{t('expenses.form.loading')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>{isEdit ? t('expenses.form.title_edit') : t('expenses.form.title_add')}</h1>
        <p>{isEdit ? t('expenses.form.subtitle_edit') : t('expenses.form.subtitle_add')}</p>
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('expenses.form.labels.description')}</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder={t('expenses.form.placeholders.description')}
              required
            />
          </div>

          <div className="form-group">
            <label>{t('expenses.form.labels.amount')}</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder={t('expenses.form.placeholders.amount')}
              required
              min="0"
              step="100"
            />
          </div>

          <div className="form-group">
            <label>{t('expenses.form.labels.category')}</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              <option value="">{t('expenses.form.category_select')}</option>
              {expenseCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>{t('expenses.form.labels.date')}</label>
            <input
              type="date"
              name="expense_date"
              value={formData.expense_date}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>{t('expenses.form.labels.payment_method')}</label>
            <select
              name="payment_method"
              value={formData.payment_method}
              onChange={handleChange}
            >
              <option value="">{t('expenses.form.payment_select')}</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>{t('expenses.form.labels.notes')}</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder={t('expenses.form.placeholders.notes')}
              rows="2"
            />
          </div>

          <div className="flex" style={{ gap: '10px', marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading
                ? t('expenses.form.buttons.saving')
                : (isEdit
                  ? t('expenses.form.buttons.submit_edit')
                  : t('expenses.form.buttons.submit_add'))}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/expenses')}
            >
              {t('expenses.form.buttons.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseForm;