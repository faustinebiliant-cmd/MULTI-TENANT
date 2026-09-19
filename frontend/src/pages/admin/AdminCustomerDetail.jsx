import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiBriefcase, FiUsers, FiMapPin,
  FiKey, FiEye, FiCheck, FiX, FiAlertTriangle, FiMail, FiPhone
} from 'react-icons/fi';
import adminApi from '../../api/adminClient';
import toast from 'react-hot-toast';

const AdminCustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [impersonateModal, setImpersonateModal] = useState(null); // business object
  const [impersonateReason, setImpersonateReason] = useState('');

  const [resetModal, setResetModal] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetReason, setResetReason] = useState('');

  const [working, setWorking] = useState(false);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const detail = await adminApi.customerDetail(id);
      setData(detail);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load customer');
      navigate('/admin/customers');
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async () => {
    if (impersonateReason.trim().length < 10) {
      toast.error('Reason must be at least 10 characters');
      return;
    }
    setWorking(true);
    try {
      const res = await adminApi.startImpersonation(
        id,
        impersonateModal.id,
        impersonateReason.trim()
      );
      localStorage.setItem('impersonation', JSON.stringify(res.impersonation));
      localStorage.setItem('impersonationToken', res.token);
      localStorage.setItem('token', res.token);
      window.location.href = '/dashboard';
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start impersonation');
      setWorking(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPassword || resetPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (resetReason.trim().length < 5) {
      toast.error('Reason must be at least 5 characters');
      return;
    }
    setWorking(true);
    try {
      await adminApi.resetUserPassword(resetModal.id, resetPassword, resetReason.trim());
      toast.success('Password reset. User will change it on next login.');
      setResetModal(null);
      setResetPassword('');
      setResetReason('');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <div className="admin-page"><div className="admin-loading">Loading...</div></div>;
  if (!data) return null;

  const { boss, businesses, staff, counts, recentAdminActions } = data;

  return (
    <div className="admin-page">
      <Link to="/admin/customers" className="admin-back">
        <FiArrowLeft size={14} /> All customers
      </Link>

      <div className="admin-page-header">
        <div>
          <h1>{boss.full_name}</h1>
          <p>
            <code>{boss.account_code || '—'}</code>
            {boss.is_active === false && ' · Suspended'}
          </p>
        </div>
        <div className="admin-page-header-actions">
          <button
            className="admin-btn admin-btn--primary"
            onClick={() => setResetModal(boss)}
          >
            <FiKey size={16} /> Reset password
          </button>
        </div>
      </div>

      {/* Profile card */}
      <div className="admin-card">
        <h3>Profile</h3>
        <div className="admin-kv">
          <div>
            <span><FiMail size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Email:</span>
            {boss.email}
          </div>
          {boss.phone && (
            <div>
              <span><FiPhone size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Phone:</span>
              {boss.phone}
            </div>
          )}
          <div><span>Account code:</span> <code>{boss.account_code || '—'}</code></div>
          <div><span>User ID:</span> <code>{boss.id}</code></div>
          <div><span>Joined:</span> {new Date(boss.created_at).toLocaleString()}</div>
        </div>
      </div>

      {/* Aggregate stats */}
      <div className="admin-stats-grid">
        <StatCard icon={<FiBriefcase />} label="Businesses" value={counts.business_count} />
        <StatCard icon={<FiCheck />} label="Active" value={counts.active_business_count} tone="green" />
        <StatCard icon={<FiMapPin />} label="Branches" value={counts.branch_count} />
        <StatCard icon={<FiUsers />} label="Staff" value={counts.staff_count} />
        <StatCard icon={<FiUsers />} label="Orders" value={counts.orders} />
        <StatCard icon={<FiUsers />} label="Customers" value={counts.customers} />
      </div>

      {/* Businesses */}
      <div className="admin-card">
        <h3>Businesses ({businesses.length})</h3>
        {businesses.length === 0 ? (
          <p className="admin-muted">No businesses yet.</p>
        ) : (
          <div className="admin-business-grid">
            {businesses.map(b => (
              <div key={b.id} className="admin-business-card">
                <div className="admin-business-card-header">
                  <div>
                    <div className="admin-business-card-name">{b.name}</div>
                    <div className="admin-business-card-code">
                      <code>{b.business_code || '—'}</code>
                    </div>
                  </div>
                  <span className={`admin-badge ${b.is_active ? 'admin-badge--success' : 'admin-badge--danger'}`}>
                    {b.is_active ? 'Active' : 'Suspended'}
                  </span>
                </div>
                <div className="admin-business-card-meta">
                  {(b.branches || []).length} branches
                  {b.location && ` · ${b.location}`}
                </div>
                <div className="admin-business-card-actions">
                  <Link to={`/admin/businesses/${b.id}`} className="admin-btn admin-btn--sm">
                    Open
                  </Link>
                  <button
                    className="admin-btn admin-btn--sm admin-btn--warning"
                    onClick={() => setImpersonateModal(b)}
                    disabled={!b.is_active}
                  >
                    <FiEye size={12} /> Impersonate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Staff */}
      <div className="admin-card">
        <h3>Staff ({staff.length})</h3>
        {staff.length === 0 ? (
          <p className="admin-muted">No staff accounts yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.id}>
                    <td>{s.full_name}</td>
                    <td>{s.email}</td>
                    <td>{s.role}</td>
                    <td>
                      <span className={`admin-badge ${s.is_active ? 'admin-badge--success' : 'admin-badge--danger'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="admin-btn admin-btn--sm"
                        onClick={() => setResetModal(s)}
                      >
                        <FiKey size={12} /> Reset
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent admin actions */}
      {recentAdminActions.length > 0 && (
        <div className="admin-card">
          <h3>Recent Admin Actions</h3>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Action</th><th>By</th><th>Reason</th><th>When</th></tr>
              </thead>
              <tbody>
                {recentAdminActions.map(a => (
                  <tr key={a.id}>
                    <td>{a.action}</td>
                    <td>{a.admin_email}</td>
                    <td className="admin-reason">{a.reason || '—'}</td>
                    <td>{new Date(a.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Impersonate modal */}
      {impersonateModal && (
        <Modal title={`Impersonate — ${impersonateModal.name}`} onClose={() => setImpersonateModal(null)}>
          <div className="admin-alert admin-alert--warning">
            <FiAlertTriangle size={16} /> You will see the app as <strong>{boss.full_name}</strong> in <strong>{impersonateModal.name}</strong>. Every action is logged.
          </div>
          <div className="admin-form-group">
            <label>Why are you impersonating? * (min 10 chars)</label>
            <textarea
              value={impersonateReason}
              onChange={(e) => setImpersonateReason(e.target.value)}
              placeholder="e.g. Client reported order #1234 shows wrong total"
              rows={3}
            />
          </div>
          <div className="admin-modal-actions">
            <button className="admin-btn" onClick={() => setImpersonateModal(null)}>Cancel</button>
            <button className="admin-btn admin-btn--warning" onClick={handleImpersonate} disabled={working}>
              {working ? 'Starting...' : 'Start impersonation'}
            </button>
          </div>
        </Modal>
      )}

      {/* Reset password modal */}
      {resetModal && (
        <Modal title={`Reset password for ${resetModal.full_name}`} onClose={() => setResetModal(null)}>
          <div className="admin-form-group">
            <label>New temporary password *</label>
            <input
              type="text"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="Min 6 characters, 1 number"
            />
          </div>
          <div className="admin-form-group">
            <label>Reason * (min 5 chars)</label>
            <textarea
              value={resetReason}
              onChange={(e) => setResetReason(e.target.value)}
              placeholder="e.g. User called, forgot password"
              rows={2}
            />
          </div>
          <div className="admin-modal-actions">
            <button className="admin-btn" onClick={() => setResetModal(null)}>Cancel</button>
            <button className="admin-btn admin-btn--primary" onClick={handleResetPassword} disabled={working}>
              {working ? 'Resetting...' : 'Reset password'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value, tone }) => (
  <div className="admin-stat-card">
    <div className={`admin-stat-icon ${tone ? 'admin-stat-icon--' + tone : ''}`}>{icon}</div>
    <div>
      <div className="admin-stat-value">{value ?? 0}</div>
      <div className="admin-stat-label">{label}</div>
    </div>
  </div>
);

const Modal = ({ title, onClose, children }) => (
  <div className="admin-modal-overlay" onClick={onClose}>
    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
      <div className="admin-modal-header">
        <h3>{title}</h3>
        <button className="admin-modal-close" onClick={onClose}><FiX size={16} /></button>
      </div>
      {children}
    </div>
  </div>
);

export default AdminCustomerDetail;