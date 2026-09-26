// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Payment List
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FiSearch, FiX, FiChevronLeft, FiChevronRight,
  FiCalendar, FiChevronDown, FiChevronUp
} from 'react-icons/fi';
import api from '../../api/client';
import { formatCurrency, formatDate } from '../../utils/helpers';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import Loader from '../common/Loader';
import toast from 'react-hot-toast';

const PAGE_SIZE = 50;

const PaymentList = () => {
  const { t } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [method, setMethod] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchPayments = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: PAGE_SIZE };
      if (debouncedSearch) params.search = debouncedSearch;
      if (method !== 'all') params.method = method;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const queryString = new URLSearchParams(params).toString();
      const response = await api.getPaymentsPage(queryString);

      setPayments(response.data || []);
      setPagination(response.pagination || { total: 0, page: 1, pages: 1 });
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error(t('payments.list.loading'));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, method, statusFilter, startDate, endDate, t]);

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

  const hasActiveFilters =
    search || method !== 'all' || statusFilter !== 'all' || startDate || endDate;

  const getPaymentStatus = (payment) => {
    if ((payment.status || '').toLowerCase() === 'voided') {
      return { text: t('payments.list.status.voided'), color: '#6b7280' };
    }
    const orderStatus = payment.order_payment_status || 'unpaid';
    if (orderStatus === 'paid') return { text: t('payments.list.status.completed'), color: '#10b981' };
    if (orderStatus === 'partial') return { text: t('status.partial'), color: '#f59e0b' };
    if (orderStatus === 'unpaid') return { text: t('status.unpaid'), color: '#ef4444' };
    return { text: t('payments.list.status.completed'), color: '#10b981' };
  };

  const pageTotal = payments
    .filter((p) => (p.status || '').toLowerCase() !== 'voided')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const pageVoidedTotal = payments
    .filter((p) => (p.status || '').toLowerCase() === 'voided')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  if (loading && payments.length === 0) {
    return <Loader message={t('payments.list.loading')} />;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t('payments.list.title')}</h1>
          <p>{t('payments.list.subtitle')}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="flex" style={{ gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
            <FiSearch size={18} style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder={t('payments.list.search_placeholder')}
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
            <option value="all">{t('payments.list.all_methods')}</option>
            <option value="cash">{t('payments.list.methods.cash')}</option>
            <option value="mpesa">{t('payments.list.methods.mpesa')}</option>
            <option value="tigo_pesa">{t('payments.list.methods.tigo_pesa')}</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-control"
            style={{ width: '150px', fontSize: '13px' }}
          >
            <option value="all">{t('payments.list.all_statuses')}</option>
            <option value="completed">{t('payments.list.status.completed')}</option>
            <option value="voided">{t('payments.list.status.voided')}</option>
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FiCalendar size={16} />
            {showFilters ? t('payments.list.hide_dates') : t('payments.list.show_dates')}
            {showFilters ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          </button>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearch('');
                setMethod('all');
                setStatusFilter('all');
                clearDateFilters();
              }}
              className="btn btn-sm btn-secondary"
              style={{ color: '#ef4444' }}
            >
              <FiX size={14} /> {t('payments.list.clear_all')}
            </button>
          )}
        </div>

        {showFilters && (
          <div className="flex" style={{
            gap: '12px',
            flexWrap: 'wrap',
            alignItems: 'center',
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid #e2e8f0'
          }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#64748b' }}>
              <FiCalendar size={14} style={{ marginRight: '4px' }} />
              {t('payments.list.show_dates')}:
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
                <FiX size={14} /> {t('common.cancel')}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{t('payments.list.columns.order')}</th>
              <th>{t('payments.list.columns.customer')}</th>
              <th>{t('payments.list.columns.amount')}</th>
              <th>{t('payments.list.columns.method')}</th>
              <th>{t('payments.list.columns.status')}</th>
              <th>{t('payments.list.columns.date')}</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center" style={{ padding: '40px 20px', color: '#94a3b8' }}>
                  <h3 style={{ color: '#1e293b', marginBottom: '4px' }}>{t('payments.list.no_payments')}</h3>
                  <p style={{ fontSize: '14px' }}>
                    {hasActiveFilters
                      ? t('payments.list.no_payments_filtered')
                      : t('payments.list.no_payments_empty')}
                  </p>
                </td>
              </tr>
            ) : (
              payments.map((payment) => {
                const statusInfo = getPaymentStatus(payment);
                const isVoided = (payment.status || '').toLowerCase() === 'voided';
                return (
                  <tr key={payment.id} style={isVoided ? { opacity: 0.6 } : {}}>
                    <td>
                      <Link to={`/orders/${payment.order_id}`} className="order-link">
                        {payment.order_number}
                      </Link>
                    </td>
                    <td>{payment.customer_name || '-'}</td>
                    <td style={{
                      fontWeight: '600',
                      color: isVoided ? '#6b7280' : '#10b981',
                      textDecoration: isVoided ? 'line-through' : 'none'
                    }}>
                      {formatCurrency(payment.amount)}
                    </td>
                    <td>{t('payments.list.methods.' + payment.method)}</td>
                    <td>
                      <span style={{
                        color: statusInfo.color,
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        fontSize: '13px'
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

      {pagination.pages > 1 && (
        <div className="audit-pagination" style={{ marginTop: '16px' }}>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => goToPage(pagination.page - 1)}
            disabled={pagination.page <= 1 || loading}
          >
            <FiChevronLeft size={16} /> Previous
          </button>
          <span className="pagination-status">
            {t('common.page')} {pagination.page} {t('common.of')} {pagination.pages}
          </span>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages || loading}
          >
            Next <FiChevronRight size={16} />
          </button>
        </div>
      )}

      {payments.length > 0 && (
        <div className="card" style={{
          marginTop: '16px',
          padding: '12px 20px',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0'
        }}>
          <div className="flex-between" style={{ fontSize: '13px', color: '#64748b' }}>
            <div>
              {t('payments.list.summary.showing', { shown: payments.length, total: pagination.total })}
              {pagination.pages > 1 && ` ${t('payments.list.summary.page_indicator', { page: pagination.page, pages: pagination.pages })}`}
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              {pageVoidedTotal > 0 && (
                <div>
                  {t('payments.list.summary.voided_label')}{' '}
                  <strong style={{ color: '#6b7280', textDecoration: 'line-through' }}>
                    {formatCurrency(pageVoidedTotal)}
                  </strong>
                </div>
              )}
              <div>
                {t('payments.list.summary.page_total_label')}{' '}
                <strong style={{ color: '#10b981' }}>
                  {formatCurrency(pageTotal)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentList;