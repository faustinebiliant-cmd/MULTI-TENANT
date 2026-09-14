// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Customer List (Paginated)
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiSearch, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import api from '../../api/client';
import { formatCurrency } from '../../utils/helpers';
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

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  // ─── Fetch page ──────────────────────────────────────────
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
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

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
        <p>Loading customers...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p>Manage your customer database</p>
        </div>
        <Link to="/customers/new" className="btn btn-primary">
          <FiPlus size={18} /> Add Customer
        </Link>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="flex" style={{ gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
            <FiSearch size={18} style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search customers by name, phone, or email..."
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
            Showing <strong>{customers.length}</strong> of <strong>{pagination.total}</strong>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Orders</th>
              <th>Total Spent</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center" style={{ padding: '40px 20px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                  <h3 style={{ color: '#1e293b', marginBottom: '4px' }}>No customers found</h3>
                  <p style={{ fontSize: '14px' }}>
                    {search ? 'Try adjusting or clearing your search.' : 'Add your first customer!'}
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
      {customers.length > 0 && (
        <div className="card" style={{
          marginTop: '16px', padding: '12px 20px',
          backgroundColor: '#f8fafc', border: '1px solid #e2e8f0'
        }}>
          <div className="flex-between" style={{ fontSize: '13px', color: '#64748b' }}>
            <div>
              Showing <strong>{customers.length}</strong> of <strong>{pagination.total}</strong> customers
              {pagination.pages > 1 && ` (page ${pagination.page} of ${pagination.pages})`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerList;