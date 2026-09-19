import React, { useState, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import adminApi from '../../api/adminClient';
import Loader from '../../components/common/Loader';

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.auditLogs({ page, limit: 50 });
      setLogs(res.data || []);
      setPagination(res.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, []);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Audit Log</h1>
        <p>Every admin action ever taken</p>
      </div>

      <div className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Target</th>
                <th>Reason</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6"><Loader message="Loading audit logs..." /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="6" className="admin-table-empty">No actions yet</td></tr>
              ) : logs.map(l => (
                <tr key={l.id}>
                  <td>{new Date(l.created_at).toLocaleString()}</td>
                  <td>{l.admin_email}</td>
                  <td><strong>{l.action}</strong></td>
                  <td>{l.target_label || '—'}</td>
                  <td className="admin-reason">{l.reason || '—'}</td>
                  <td><code>{l.ip_address}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="admin-pagination">
            <button className="admin-btn admin-btn--sm" onClick={() => load(pagination.page - 1)} disabled={pagination.page <= 1}>
              <FiChevronLeft size={14} /> Prev
            </button>
            <span>Page {pagination.page} of {pagination.pages}</span>
            <button className="admin-btn admin-btn--sm" onClick={() => load(pagination.page + 1)} disabled={pagination.page >= pagination.pages}>
              Next <FiChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLogs;