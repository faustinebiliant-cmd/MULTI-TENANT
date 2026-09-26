// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Supplier List
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiPlus, FiSearch, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import api from '../../api/client';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import toast from 'react-hot-toast';

const PAGE_SIZE = 50;

const SupplierList = () => {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const fetchSuppliers = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: PAGE_SIZE };
      if (debouncedSearch) params.search = debouncedSearch;

      const queryString = new URLSearchParams(params).toString();
      const response = await api.getSuppliersPage(queryString);

      setSuppliers(response.data || []);
      setPagination(response.pagination || { total: 0, page: 1, pages: 1 });
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error(t('suppliers.form.messages.load_failed'));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, t]);

  useEffect(() => {
    fetchSuppliers(1);
  }, [fetchSuppliers]);

  const goToPage = (p) => {
    if (p < 1 || p > pagination.pages) return;
    fetchSuppliers(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading && suppliers.length === 0) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>{t('suppliers.list.loading')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t('suppliers.list.title')}</h1>
          <p>{t('suppliers.list.subtitle')}</p>
        </div>
        <Link to="/suppliers/new" className="btn btn-primary">
          <FiPlus size={18} /> {t('suppliers.list.add_button')}
        </Link>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="flex" style={{ gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
            <FiSearch size={18} style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder={t('suppliers.list.search_placeholder')}
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
              <FiX size={14} /> {t('suppliers.list.clear_button')}
            </button>
          )}

          <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>
            {t('suppliers.list.showing', { shown: suppliers.length, total: pagination.total })}
          </div>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{t('suppliers.list.columns.name')}</th>
              <th>{t('suppliers.list.columns.contact_person')}</th>
              <th>{t('suppliers.list.columns.phone')}</th>
              <th>{t('suppliers.list.columns.email')}</th>
              <th>{t('suppliers.list.columns.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center" style={{ padding: '40px 20px', color: '#94a3b8' }}>
                  <h3 style={{ color: '#1e293b', marginBottom: '4px' }}>{t('suppliers.list.no_suppliers')}</h3>
                  <p style={{ fontSize: '14px' }}>
                    {search
                      ? t('suppliers.list.no_suppliers_filtered')
                      : t('suppliers.list.no_suppliers_empty')}
                  </p>
                </td>
              </tr>
            ) : (
              suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td><strong>{supplier.name}</strong></td>
                  <td>{supplier.contact_person || '-'}</td>
                  <td>{supplier.phone}</td>
                  <td>{supplier.email || '-'}</td>
                  <td>
                    <Link to={`/suppliers/${supplier.id}`} className="btn btn-sm btn-secondary">
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

export default SupplierList;