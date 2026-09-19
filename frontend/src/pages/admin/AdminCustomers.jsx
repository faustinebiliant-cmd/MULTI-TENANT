import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import adminApi from '../../api/adminClient';
import Loader from '../../components/common/Loader';
import useDebouncedValue from '../../hooks/useDebouncedValue';

const AdminCustomers = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.customers({ page, limit: 25, search: debounced });
      setList(res.data || []);
      setPagination(res.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [debounced]);

  useEffect(() => { load(1); }, [load]);

  const goTo = (p) => {
    if (p < 1 || p > pagination.pages) return;
    load(p);
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Customers</h1>
        <p>{pagination.total} Boss{pagination.total === 1 ? '' : 'es'} on the platform</p>
      </div>

      <div className="admin-card">
        <div className="admin-toolbar">
          <div className="admin-search">
            <FiSearch size={16} />
            <input
              type="text"
              placeholder="Search by name, email, or account code"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Account Code</th>
                <th>Email</th>
                <th>Businesses</th>
                <th>Active</th>
                <th>Staff</th>
                <th>Branches</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9"><Loader message="Loading customers..." /></td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan="9" className="admin-table-empty">No customers found</td></tr>
              ) : list.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.full_name}</strong></td>
                  <td><code>{c.account_code || '—'}</code></td>
                  <td>{c.email}</td>
                  <td>{c.business_count}</td>
                  <td>{c.active_business_count}</td>
                  <td>{c.staff_count}</td>
                  <td>{c.branch_count}</td>
                  <td>{new Date(c.created_at).toLocaleDateString()}</td>
                  <td>
                    <Link to={`/admin/customers/${c.id}`} className="admin-btn admin-btn--sm">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="admin-pagination">
            <button className="admin-btn admin-btn--sm" onClick={() => goTo(pagination.page - 1)} disabled={pagination.page <= 1}>
              <FiChevronLeft size={14} /> Prev
            </button>
            <span>Page {pagination.page} of {pagination.pages}</span>
            <button className="admin-btn admin-btn--sm" onClick={() => goTo(pagination.page + 1)} disabled={pagination.page >= pagination.pages}>
              Next <FiChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCustomers;