import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import adminApi from '../../api/adminClient';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import Loader from '../../components/common/Loader';

const AdminBusinesses = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const [status, setStatus] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.businesses({ page, limit: 25, search: debounced, status });
      setList(res.data || []);
      setPagination(res.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [debounced, status]);

  useEffect(() => { load(1); }, [load]);

  const goTo = (p) => {
    if (p < 1 || p > pagination.pages) return;
    load(p);
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Businesses</h1>
        <p>{pagination.total} total</p>
      </div>

      <div className="admin-card">
        <div className="admin-toolbar">
          <div className="admin-search">
            <FiSearch size={16} />
            <input
              type="text"
              placeholder="Search by name, code, or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="admin-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active only</option>
            <option value="suspended">Suspended only</option>
          </select>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Owner</th>
                <th>Branches</th>
                <th>Staff</th>
                <th>Status</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8"><Loader message="Loading businesses..." /></td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan="8" className="admin-table-empty">No businesses found</td></tr>
              ) : list.map(b => (
                <tr key={b.id}>
                  <td><strong>{b.name}</strong></td>
                  <td><code>{b.business_code || '—'}</code></td>
                  <td>{b.owner?.email || '—'}</td>
                  <td>{b.branch_count ?? 0}</td>
                  <td>{b.staff_count ?? 0}</td>
                  <td>
                    <span className={`admin-badge ${b.is_active ? 'admin-badge--success' : 'admin-badge--danger'}`}>
                      {b.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td>{new Date(b.created_at).toLocaleDateString()}</td>
                  <td>
                    <Link to={`/admin/businesses/${b.id}`} className="admin-btn admin-btn--sm">Manage</Link>
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

export default AdminBusinesses;