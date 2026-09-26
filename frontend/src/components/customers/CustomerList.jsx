// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Customer List
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiPlus, FiSearch, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import api from '../../api/client';
import { formatCurrency } from '../../utils/helpers';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import toast from 'react-hot-toast';

const PAGE_SIZE = 50;

const CustomerList = () => {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const fetchCustomers = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: PAGE_SIZE };
      if (debouncedSearch) params.search = debouncedSearch;

      const queryString = new URLSearchParams(params).toString();
      const response = await api.getCustomersPage(queryString);

      setCustomers(response.data || []);
      setPagination(response.pagination || { total: 0, page: 1, pages: 1 });
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error(t('customers.list.loading'));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, t]);

  useEffect(() => {
    fetchCustomers(1);
  }, [fetchCustomers]);

  const goToPage = (p) => {
    if (p < 1 || p > pagination.pages) return;
    fetchCustomers(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading && customers.length === 0) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>{t('customers.list.loading')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t('customers.list.title')}</h1>
          <p>{t('customers.list.subtitle')}</p>
        </div>
        <Link to="/customers/new" className="btn btn-primary">
          <FiPlus size={18} /> {t('customers.list.add_button')}
        </Link>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="flex" style={{ gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
            <FiSearch size={18} style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder={t('customers.list.search_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: '14px' }}
            />
          </div>

          {search && (
            <button
              onClick={() => setSearch('')}
              className="btn btn-sm btn-secondary"
              style={{ color: '#ef4444' }}
            >
              <FiX size={14} /> {t('customers.list.clear_button')}
            </button>
          )}

          <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>
            {t('customers.list.showing', { shown: customers.length, total: pagination.total })}
          </div>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{t('customers.list.columns.name')}</th>
              <th>{t('customers.list.columns.phone')}</th>
              <th>{t('customers.list.columns.email')}</th>
              <th>{t('customers.list.columns.orders')}</th>
              <th>{t('customers.list.columns.total_spent')}</th>
              <th>{t('customers.list.columns.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center" style={{ padding: '40px 20px', color: '#94a3b8' }}>
                  <h3 style={{ color: '#1e293b', marginBottom: '4px' }}>{t('customers.list.no_customers')}</h3>
                  <p style={{ fontSize: '14px' }}>
                    {search
                      ? t('customers.list.no_customers_filtered')
                      : t('customers.list.no_customers_empty')}
                  </p>
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <Link to={`/customers/${customer.id}`} className="customer-link">
                      {customer.name}
                    </Link>
                  </td>
                  <td>{customer.phone}</td>
                  <td>{customer.email || '-'}</td>
                  <td>{customer.total_orders || 0}</td>
                  <td>{formatCurrency(customer.total_spent || 0)}</td>
                  <td>
                    <Link to={`/customers/${customer.id}`} className="btn btn-sm btn-secondary">
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

export default CustomerList;