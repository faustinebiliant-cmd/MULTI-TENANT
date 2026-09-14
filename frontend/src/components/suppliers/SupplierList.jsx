// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Supplier List
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiSearch, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import api from '../../api/client';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import toast from 'react-hot-toast';

const PAGE_SIZE = 50;

const SupplierList = () => {
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
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

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
        <p>Loading suppliers...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Suppliers</h1>
          <p>Manage your product suppliers</p>
        </div>
        <Link to="/suppliers/new" className="btn btn-primary">
          <FiPlus size={18} /> Add Supplier
        </Link>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="flex" style={{ gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
            <FiSearch size={18} style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search suppliers by name, contact, phone, or email..."
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
              <FiX size={14} /> Clear
            </button>
          )}

          <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>
            Showing <strong>{suppliers.length}</strong> of <strong>{pagination.total}</strong>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Supplier Name</th>
              <th>Contact Person</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center" style={{ padding: '40px 20px', color: '#94a3b8' }}>
                  <h3 style={{ color: '#1e293b', marginBottom: '4px' }}>No suppliers found</h3>
                  <p style={{ fontSize: '14px' }}>
                    {search ? 'Try adjusting or clearing your search.' : 'Add your first supplier.'}
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
                      View
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
            Page {pagination.page} of {pagination.pages}
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