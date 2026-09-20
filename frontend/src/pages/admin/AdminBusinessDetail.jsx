import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiPower, FiUserCheck, FiAlertTriangle,
  FiKey, FiEye, FiCheck, FiX
} from 'react-icons/fi';
import adminApi from '../../api/adminClient';
import Loader from '../../components/common/Loader';
import toast from 'react-hot-toast';

const AdminBusinessDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Action modals
  const [suspendModal, setSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  const [impersonateModal, setImpersonateModal] = useState(false);
  const [impersonateReason, setImpersonateReason] = useState('');

  const [resetModal, setResetModal] = useState(null); // holds user object
  const [resetPassword, setResetPassword] = useState('');
  const [resetReason, setResetReason] = useState('');

  const [working, setWorking] = useState(false);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const detail = await adminApi.businessDetail(id);
      setData(detail);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load');
      navigate('/admin/businesses');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (suspendReason.trim().length < 5) {
      toast.error('Reason must be at least 5 characters');
      return;
    }
    setWorking(true);
    try {
      await adminApi.suspendBusiness(id, suspendReason.trim());
      toast.success('Business suspended');
      setSuspendModal(false);
      setSuspendReason('');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to suspend');
    } finally {
      setWorking(false);
    }
  };

  const handleUnsuspend = async () => {
    const reason = window.prompt('Reason for unsuspending:');
    if (!reason || reason.trim().length < 5) {
      toast.error('Reason required (min 5 chars)');
      return;
    }
    try {
      await adminApi.unsuspendBusiness(id, reason.trim());
      toast.success('Business unsuspended');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to unsuspend');
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
        data.business.owner_id,
        id,
        impersonateReason.trim()
      );

      localStorage.setItem('impersonation', JSON.stringify(res.impersonation));
      localStorage.setItem('impersonationToken', res.token);
      // Remember where to return after impersonation ends
      localStorage.setItem('impersonationReturnTo', `/admin/businesses/${id}`);

      // Hand off to customer app: token AND user must both be set,
      // otherwise PrivateRoute will bounce to /login before
      // AuthContext can populate the user from the API.
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify({
        id: data.business.owner_id,
        full_name: data.business.owner?.full_name || 'Impersonated Boss',
        email: data.business.owner?.email || '',
        role: 'boss',
        is_boss: true,
        is_first_login: false,
        business_id: null,
        branch_id: null,
        account_code: data.business.owner?.account_code || null
      }));

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
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <Loader message="Loading business..." />;
  if (!data) return null;

  const { business, branches, staff, counts, recentAdminActions } = data;
  const isSuspended = !business.is_active;

  return (
    <div className="admin-page">
      <Link to="/admin/businesses" className="admin-back">
        <FiArrowLeft size={14} /> All businesses
      </Link>

      <div className="admin-page-header">
        <div>
          <h1>{business.name}</h1>
          <p>
            <code>{business.business_code || '—'}</code>
            {business.location ? ` · ${business.location}` : ''}
          </p>
        </div>
        <div className="admin-page-header-actions">
          {isSuspended ? (
            <button className="admin-btn admin-btn--success" onClick={handleUnsuspend}>
              <FiCheck size={16} /> Unsuspend
            </button>
          ) : (
            <button className="admin-btn admin-btn--danger" onClick={() => setSuspendModal(true)}>
              <FiPower size={16} /> Suspend
            </button>
          )}
          <button
            className="admin-btn admin-btn--warning"
            onClick={() => setImpersonateModal(true)}
            disabled={isSuspended}
          >
            <FiEye size={16} /> Impersonate
          </button>
        </div>
      </div>

      {isSuspended && (
        <div className="admin-alert admin-alert--warning">
          <FiAlertTriangle size={16} /> This business is suspended. Staff cannot log in. Boss can log in to fix billing.
        </div>
      )}

      <div className="admin-stats-grid">
        <StatCard label="Branches" value={branches.length} />
        <StatCard label="Staff" value={staff.filter(s => !s.is_deleted).length} />
        <StatCard label="Products" value={counts.products} />
        <StatCard label="Customers" value={counts.customers} />
        <StatCard label="Orders" value={counts.orders} />
      </div>

      <div className="admin-card">
        <h3>Owner</h3>
        <div className="admin-kv">
          <div><span>Name:</span> {business.owner?.full_name || '—'}</div>
          <div><span>Email:</span> {business.owner?.email || '—'}</div>
          <div><span>Account code:</span> <code>{business.owner?.account_code || '—'}</code></div>
          <div><span>User ID:</span> <code>{business.owner?.id}</code></div>
        </div>
      </div>

      <div className="admin-card">
        <h3>Branches ({branches.length})</h3>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Name</th><th>Status</th><th>Created</th></tr>
            </thead>
            <tbody>
              {branches.map(b => (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td>
                    <span className={`admin-badge ${b.is_active ? 'admin-badge--success' : 'admin-badge--muted'}`}>
                      {b.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{new Date(b.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-card">
        <h3>Staff ({staff.filter(s => !s.is_deleted).length})</h3>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {staff.filter(s => !s.is_deleted).map(s => (
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
                      <FiKey size={12} /> Reset password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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

      {/* Suspend modal */}
      {suspendModal && (
        <Modal title="Suspend business" onClose={() => setSuspendModal(false)}>
          <p className="admin-modal-text">
            Suspending <strong>{business.name}</strong> will:
          </p>
          <ul className="admin-modal-list">
            <li>Block all staff from logging in</li>
            <li>Still allow the Boss to log in (to fix billing)</li>
            <li>Keep all data intact</li>
          </ul>
          <div className="admin-form-group">
            <label>Reason *</label>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="e.g. Payment overdue for October"
              rows={3}
            />
          </div>
          <div className="admin-modal-actions">
            <button className="admin-btn" onClick={() => setSuspendModal(false)}>Cancel</button>
            <button className="admin-btn admin-btn--danger" onClick={handleSuspend} disabled={working}>
              {working ? 'Suspending...' : 'Suspend'}
            </button>
          </div>
        </Modal>
      )}

      {/* Impersonate modal */}
      {impersonateModal && (
        <Modal title="Impersonate Boss" onClose={() => setImpersonateModal(false)}>
          <div className="admin-alert admin-alert--warning">
            <FiAlertTriangle size={16} /> You will see the app as <strong>{business.owner?.full_name}</strong>. Every action is logged.
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
            <button className="admin-btn" onClick={() => setImpersonateModal(false)}>Cancel</button>
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

const StatCard = ({ label, value }) => (
  <div className="admin-stat-card">
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

export default AdminBusinessDetail;