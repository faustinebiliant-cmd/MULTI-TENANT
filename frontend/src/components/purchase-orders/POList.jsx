// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Purchase Order List
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FiPlus, FiSearch, FiX, FiCalendar,
  FiChevronLeft, FiChevronRight, FiChevronDown, FiChevronUp
} from 'react-icons/fi';
import api from '../../api/client';
import { formatCurrency, formatDate } from '../../utils/helpers';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import toast from 'react-hot-toast';

const PAGE_SIZE = 50;

const POList = () => {
  const { t } = useTranslation();
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [filter, setFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchPOs = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: PAGE_SIZE };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filter !== 'all') params.status = filter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const queryString = new URLSearchParams(params).toString();
      const response = await api.getPurchaseOrdersPage(queryString);

      setPos(response.data || []);
      setPagination(response.pagination || { total: 0, page: 1, pages: 1 });
    } catch (error) {
      console.error('Error fetching POs:', error);
      toast.error(t('purchase_orders.form.messages.load_failed'));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filter, startDate, endDate, t]);

  useEffect(() => {
    fetchPOs(1);
  }, [fetchPOs]);

  const goToPage = (p) => {
    if (p < 1 || p > pagination.pages) return;
    fetchPOs(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearDateFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = search || filter !== 'all' || startDate || endDate;

  if (loading && pos.length === 0) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>{t('purchase_orders.list.loading')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t('purchase_orders.list.title')}</h1>
          <p>{t('purchase_orders.list.subtitle')}</p>
        </div>
        <Link to="/purchase-orders/new" className="btn btn-primary">
          <FiPlus size={18} /> {t('purchase_orders.list.create_button')}
        </Link>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="flex" style={{ gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
            <FiSearch size={18} style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder={t('purchase_orders.list.search_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: '14px' }}
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="form-control"
            style={{ width: '150px', fontSize: '13px' }}
          >
            <option value="all">{t('purchase_orders.list.all_pos')}</option>
            <option value="pending">{t('purchase_orders.status.pending')}</option>
            <option value="received">{t('purchase_orders.status.received')}</option>
            <option value="cancelled">{t('purchase_orders.status.cancelled')}</option>
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FiCalendar size={16} />
            {showFilters ? t('purchase_orders.list.hide_dates') : t('purchase_orders.list.show_dates')}
            {showFilters ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          </button>

          {hasActiveFilters && (
            <button
              onClick={() => { setSearch(''); setFilter('all'); clearDateFilters(); }}
              className="btn btn-sm btn-secondary"
              style={{ color: '#ef4444' }}
            >
              <FiX size={14} /> {t('purchase_orders.list.clear_all')}
            </button>
          )}

          <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>
            {t('purchase_orders.list.showing', { shown: pos.length, total: pagination.total })}
          </div>
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
              {t('purchase_orders.list.show_dates')}:
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
                <FiX size={14} /> {t('purchase_orders.list.clear_dates')}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{t('purchase_orders.list.columns.po_number')}</th>
              <th>{t('purchase_orders.list.columns.supplier')}</th>
              <th>{t('purchase_orders.list.columns.total')}</th>
              <th>{t('purchase_orders.list.columns.status')}</th>
              <th>{t('purchase_orders.list.columns.date')}</th>
              <th>{t('purchase_orders.list.columns.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {pos.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center" style={{ padding: '40px 20px', color: '#94a3b8' }}>
                  <h3 style={{ color: '#1e293b', marginBottom: '4px' }}>{t('purchase_orders.list.no_pos')}</h3>
                  <p style={{ fontSize: '14px' }}>
                    {hasActiveFilters
                      ? t('purchase_orders.list.no_pos_filtered')
                      : t('purchase_orders.list.no_pos_empty')}
                  </p>
                </td>
              </tr>
            ) : (
              pos.map((po) => (
                <tr key={po.id}>
                  <td><strong>{po.po_number}</strong></td>
                  <td>{po.supplier_name || '-'}</td>
                  <td>{formatCurrency(po.total_amount)}</td>
                  <td>
                    <span className={`badge badge-${po.status}`}>
                      {t('purchase_orders.status.' + (po.status || 'pending'))}
                    </span>
                  </td>
                  <td>{formatDate(po.created_at)}</td>
                  <td>
                    <Link to={`/purchase-orders/${po.id}`} className="btn btn-sm btn-secondary">
                      {t('common.view')}
                    </Link>
                  </td>
                </tr>
              ))
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
    </div>
  );
};

export default POList;