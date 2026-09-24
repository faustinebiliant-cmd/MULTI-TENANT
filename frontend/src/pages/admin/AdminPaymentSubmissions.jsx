// ============================================================
// OSWAGO - Admin Payment Submissions
// Review and approve/reject payment submissions from Bosses.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiCheck, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import adminApi from '../../api/adminClient';
import Loader from '../../components/common/Loader';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' }
];

const formatMoney = (n) => `TZS ${Number(n || 0).toLocaleString()}`;

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString();
};

const AdminPaymentSubmissions = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('pending');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const [approveModal, setApproveModal] = useState(null);
  const [approveMonths, setApproveMonths] = useState(2);

  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const [working, setWorking] = useState(false);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.paymentSubmissions({ page, limit: 25, status });
      setList(res.data || []);
      setPagination(res.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      console.error(err);
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(1); }, [load]);

  const goTo = (p) => {
    if (p < 1 || p > pagination.pages) return;
    load(p);
  };

  const openApprove = (submission) => {
    setApproveModal(submission);
    setApproveMonths(submission.duration_months);
  };

  const handleApprove = async () => {
    if (!approveModal) return;
    setWorking(true);
    try {
      await adminApi.approveSubmission(approveModal.id, approveMonths);
      toast.success('Submission approved');
      setApproveModal(null);
      await load(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve');
      setApproveModal(null);
    } finally {
      setWorking(false);
    }
  };

  const openReject = (submission) => {
    setRejectModal(submission);
    setRejectReason('');
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    if (rejectReason.trim().length < 5) {
      toast.error('Reason must be at least 5 characters');
      return;
    }
    setWorking(true);
    try {
      await adminApi.rejectSubmission(rejectModal.id, rejectReason.trim());
      toast.success('Submission rejected');
      setRejectModal(null);
      await load(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject');
      setRejectModal(null);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Payment Submissions</h1>
        <p>{pagination.total} submission{pagination.total === 1 ? '' : 's'}</p>
      </div>

      <div className="admin-card">
        <div className="admin-toolbar">
          <select
            className="admin-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Business</th>
                <th>Boss</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Plan</th>
                <th>Transaction ID</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9"><Loader message="Loading submissions..." /></td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan="9" className="admin-table-empty">No submissions</td></tr>
              ) : list.map((s) => (
                <tr key={s.id}>
                  <td>{formatDate(s.created_at)}</td>
                  <td>
                    {s.business ? (
                      <>
                        <Link to={`/admin/businesses/${s.business.id}`}>
                          {s.business.name}
                        </Link>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                          <code>{s.business.business_code || '—'}</code>
                        </div>
                      </>
                    ) : '—'}
                  </td>
                  <td>
                    <div>{s.submitted_by_name || '—'}</div>
                    {s.submitted_by_user?.account_code && (
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        <code>{s.submitted_by_user.account_code}</code>
                      </div>
                    )}
                  </td>
                  <td>{s.method}</td>
                  <td><strong>{formatMoney(s.amount)}</strong></td>
                  <td>{s.duration_months} mo</td>
                  <td><code>{s.transaction_id}</code></td>
                  <td>
                    <span className={`admin-badge admin-badge--${
                      s.status === 'approved' ? 'success'
                      : s.status === 'rejected' ? 'danger'
                      : 'warning'
                    }`}>
                      {s.status}
                    </span>
                    {s.status === 'rejected' && s.rejection_reason && (
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                        {s.rejection_reason}
                      </div>
                    )}
                  </td>
                  <td>
                    {s.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="admin-btn admin-btn--sm admin-btn--success"
                          onClick={() => openApprove(s)}
                        >
                          <FiCheck size={12} /> Approve
                        </button>
                        <button
                          className="admin-btn admin-btn--sm admin-btn--danger"
                          onClick={() => openReject(s)}
                        >
                          <FiX size={12} /> Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="admin-pagination">
            <button
              className="admin-btn admin-btn--sm"
              onClick={() => goTo(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <FiChevronLeft size={14} /> Prev
            </button>
            <span>Page {pagination.page} of {pagination.pages}</span>
            <button
              className="admin-btn admin-btn--sm"
              onClick={() => goTo(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
            >
              Next <FiChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {approveModal && (
        <Modal title="Approve submission" onClose={() => !working && setApproveModal(null)}>
          <p className="admin-modal-text">
            Approve <strong>{formatMoney(approveModal.amount)}</strong> from{' '}
            <strong>{approveModal.business?.name}</strong>?
          </p>
          <p className="admin-modal-text">
            Business code: <code>{approveModal.business?.business_code || '—'}</code>
          </p>
          <p className="admin-modal-text">
            This will set the business to <strong>active</strong> and extend access.
          </p>

          <div className="admin-form-group">
            <label>Extend by (months)</label>
            <select
              value={approveMonths}
              onChange={(e) => setApproveMonths(parseInt(e.target.value, 10))}
              disabled={working}
            >
              <option value={2}>2 months</option>
              <option value={6}>6 months</option>
              <option value={12}>12 months (1 year)</option>
            </select>
          </div>

          <div className="admin-form-group">
            <label>Or custom months (1-24)</label>
            <input
              type="number"
              min="1"
              max="24"
              value={approveMonths}
              onChange={(e) => setApproveMonths(parseInt(e.target.value, 10) || 1)}
              disabled={working}
            />
          </div>

          <div className="admin-modal-actions">
            <button className="admin-btn" onClick={() => setApproveModal(null)} disabled={working}>
              Cancel
            </button>
            <button className="admin-btn admin-btn--success" onClick={handleApprove} disabled={working}>
              {working ? 'Approving...' : 'Approve'}
            </button>
          </div>
        </Modal>
      )}

      {rejectModal && (
        <Modal title="Reject submission" onClose={() => !working && setRejectModal(null)}>
          <p className="admin-modal-text">
            Reject the submission from <strong>{rejectModal.business?.name}</strong>?
          </p>

          <div className="admin-form-group">
            <label>Reason (visible to admin only)</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Transaction ID not found in M-Pesa statement"
              rows={3}
              disabled={working}
            />
          </div>

          <div className="admin-modal-actions">
            <button className="admin-btn" onClick={() => setRejectModal(null)} disabled={working}>
              Cancel
            </button>
            <button className="admin-btn admin-btn--danger" onClick={handleReject} disabled={working}>
              {working ? 'Rejecting...' : 'Reject'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

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

export default AdminPaymentSubmissions;