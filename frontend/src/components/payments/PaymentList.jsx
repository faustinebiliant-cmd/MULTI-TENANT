// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Payment List (Paginated)
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiX, FiChevronLeft, FiChevronRight, FiCalendar, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import api from '../../api/client';
import { formatCurrency, formatDate } from '../../utils/helpers';
import Loader from '../common/Loader';
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

const PaymentList = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [method, setMethod] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ─── Fetch page ──────────────────────────────────────────
  const fetchPayments = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: PAGE_SIZE };

      if (debouncedSearch) params.search = debouncedSearch;
      if (method !== 'all') params.method = method;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const queryString = new URLSearchParams(params).toString();
      const response = await api.getPaymentsPage(queryString);

      setPayments(response.data || []);
      setPagination(response.pagination || { total: 0, page: 1, pages: 1 });
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, method, startDate, endDate]);

  useEffect(() => {
    fetchPayments(1);
  }, [fetchPayments]);

  const goToPage = (p) => {
    if (p < 1 || p > pagination.pages) return;
    fetchPayments(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearDateFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = search || method !== 'all' || startDate || endDate;

  const getMethodLabel = (m) => {
    const labels = {
      cash: 'Cash',
      mpesa: 'M-Pesa',
      tigo_pesa: 'Tigo Pesa'
    };
    return labels[m] || m;
  };

  const getPaymentStatus = (payment) => {
    const orderStatus = payment.order_payment_status || 'unpaid';

    if (orderStatus === 'paid') return { text: 'COMPLETED', color: '#10b981' };
    if (orderStatus === 'partial') return { text: 'PARTIAL', color: '#f59e0b' };
    if (orderStatus === 'unpaid') return { text: 'UNPAID', color: '#ef4444' };
    return { text: 'COMPLETED', color: '#10b981' };
  };

  // Page totals
  const pageTotal = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  if (loading && payments.length === 0) {
    return <Loader message="Loading payments..." />;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Payments</h1>
          <p>View all payment transactions</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="flex" style={{ gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
            <FiSearch size={18} style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search payments by order number or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: '14px' }}
            />
          </div>

          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="form-control"
            style={{ width: '140px', fontSize: '13px' }}
          >
            <option value="all">All Methods</option>
            <option value="cash">Cash</option>
            <option value="mpesa">M-Pesa</option>
            <option value="tigo_pesa">Tigo Pesa</option>
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
              onClick={() => { setSearch(''); setMethod('all'); clearDateFilters(); }}
              className="btn btn-sm btn-secondary"
              style={{ color: '#ef4444' }}
            >
              <FiX size={14} /> Clear All
            </button>
          )}
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
              <th>Order</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center" style={{ padding: '40px 20px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                  <h3 style={{ color: '#1e293b', marginBottom: '4px' }}>No payments found</h3>
                  <p style={{ fontSize: '14px' }}>
                    {hasActiveFilters
                      ? 'Try adjusting or clearing your filters.'
                      : 'Payments will appear here once recorded.'}
                  </p>
                </td>
              </tr>
            ) : (
              payments.map((payment) => {
                const statusInfo = getPaymentStatus(payment);
                return (
                  <tr key={payment.id}>
                    <td>
                      <Link to={`/orders/${payment.order_id}`} className="order-link">
                        {payment.order_number}
                      </Link>
                    </td>
                    <td>{payment.customer_name || '-'}</td>
                    <td style={{ fontWeight: '600', color: '#10b981' }}>
                      {formatCurrency(payment.amount)}
                    </td>
                    <td>{getMethodLabel(payment.method)}</td>
                    <td>
                      <span style={{
                        color: statusInfo.color, fontWeight: '700',
                        textTransform: 'uppercase', fontSize: '13px'
                      }}>
                        {statusInfo.text}
                      </span>
                    </td>
                    <td>{formatDate(payment.payment_date || payment.created_at)}</td>
                  </tr>
                );
              })
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
      {payments.length > 0 && (
        <div className="card" style={{
          marginTop: '16px', padding: '12px 20px',
          backgroundColor: '#f8fafc', border: '1px solid #e2e8f0'
        }}>
          <div className="flex-between" style={{ fontSize: '13px', color: '#64748b' }}>
            <div>
              Showing <strong>{payments.length}</strong> of <strong>{pagination.total}</strong> payments
              {pagination.pages > 1 && ` (page ${pagination.page} of ${pagination.pages})`}
            </div>
            <div>
              Page total: <strong style={{ color: '#10b981' }}>{formatCurrency(pageTotal)}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentList;