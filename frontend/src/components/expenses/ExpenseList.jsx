// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Expense List (Paginated)
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FiPlus, FiSearch, FiX, FiCalendar,
  FiChevronLeft, FiChevronRight, FiChevronDown, FiChevronUp
} from 'react-icons/fi';
import api from '../../api/client';
import { formatCurrency, formatDateOnly } from '../../utils/helpers';
import { EXPENSE_CATEGORIES } from '../../utils/constants';
import toast from 'react-hot-toast';

const PAGE_SIZE = 50;

const useDebouncedValue = (value, delay = 400) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

const ExpenseList = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [filter, setFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ─── Fetch page ──────────────────────────────────────────
  const fetchExpenses = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: PAGE_SIZE };

      if (debouncedSearch) params.search = debouncedSearch;
      if (filter !== 'all') params.category = filter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const queryString = new URLSearchParams(params).toString();
      const response = await api.getExpensesPage(queryString);

      setExpenses(response.data || []);
      setPagination(response.pagination || { total: 0, page: 1, pages: 1 });
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filter, startDate, endDate]);

  useEffect(() => {
    fetchExpenses(1);
  }, [fetchExpenses]);

  const goToPage = (p) => {
    if (p < 1 || p > pagination.pages) return;
    fetchExpenses(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearDateFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = search || filter !== 'all' || startDate || endDate;

  // Page totals
  const pageTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  if (loading && expenses.length === 0) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Loading expenses...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Expenses</h1>
          <p>Track all business expenses</p>
        </div>
        <Link to="/expenses/new" className="btn btn-primary">
          <FiPlus size={18} /> Add Expense
        </Link>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="flex" style={{ gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '180px' }}>
            <FiSearch size={18} style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search expenses by description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: '14px' }}
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="form-control"
            style={{ width: '160px', fontSize: '13px' }}
          >
            <option value="all">All Categories</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FiCalendar size={16} />
            {showFilters ? 'Hide Dates' : 'Show Dates'}
            {showFilters ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          </button>

          {hasActiveFilters && (
            <button
              onClick={() => { setSearch(''); setFilter('all'); clearDateFilters(); }}
              className="btn btn-sm btn-secondary"
              style={{ color: '#ef4444' }}
            >
              <FiX size={14} /> Clear All
            </button>
          )}

          <div style={{ marginLeft: 'auto', fontWeight: 'bold', fontSize: '16px', whiteSpace: 'nowrap' }}>
            Page total: <span style={{ color: '#ef4444' }}>{formatCurrency(pageTotal)}</span>
          </div>
        </div>

        {showFilters && (
          <div className="flex" style={{
            gap: '12px', flexWrap: 'wrap', alignItems: 'center',
            marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0'
          }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#64748b' }}>
              <FiCalendar size={14} style={{ marginRight: '4px' }} />
              Date Range:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="form-control"
              style={{ width: '150px', padding: '6px 10px', fontSize: '13px' }}
            />
            <span style={{ color: '#64748b', fontSize: '13px' }}>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="form-control"
              style={{ width: '150px', padding: '6px 10px', fontSize: '13px' }}
            />
            {(startDate || endDate) && (
              <button
                onClick={clearDateFilters}
                className="btn btn-sm btn-secondary"
                style={{ color: '#64748b' }}
              >
                <FiX size={14} /> Clear
              </button>
            )}
          </div>
        )}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center" style={{ padding: '40px 20px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                  <h3 style={{ color: '#1e293b', marginBottom: '4px' }}>No expenses found</h3>
                  <p style={{ fontSize: '14px' }}>
                    {hasActiveFilters
                      ? 'Try adjusting or clearing your filters.'
                      : 'Add your first expense!'}
                  </p>
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{expense.description}</td>
                  <td>
                    <span className="badge badge-info">{expense.category || 'Other'}</span>
                  </td>
                  <td style={{ color: '#ef4444', fontWeight: '600' }}>
                    {formatCurrency(expense.amount)}
                  </td>
                  <td>{formatDateOnly(expense.expense_date)}</td>
                  <td>
                    <Link to={`/expenses/${expense.id}`} className="btn btn-sm btn-secondary">
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="audit-pagination" style={{ marginTop: '16px' }}>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => goToPage(pagination.page - 1)}
            disabled={pagination.page <= 1 || loading}
          >
            <FiChevronLeft size={16} />
            Previous
          </button>
          <span className="pagination-status">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages || loading}
          >
            Next
            <FiChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Footer summary */}
      {expenses.length > 0 && (
        <div className="card" style={{
          marginTop: '16px', padding: '12px 20px',
          backgroundColor: '#f8fafc', border: '1px solid #e2e8f0'
        }}>
          <div className="flex-between" style={{ fontSize: '13px', color: '#64748b' }}>
            <div>
              Showing <strong>{expenses.length}</strong> of <strong>{pagination.total}</strong> expenses
              {pagination.pages > 1 && ` (page ${pagination.page} of ${pagination.pages})`}
            </div>
            <div>
              Page total: <strong style={{ color: '#ef4444' }}>{formatCurrency(pageTotal)}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseList;