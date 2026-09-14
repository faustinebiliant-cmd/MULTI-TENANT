// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Staff Detail
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft, FiEdit2, FiTrash2, FiUserCheck, FiUserX, FiKey
} from 'react-icons/fi';
import api from '../../api/client';
import { formatDate } from '../../utils/helpers';
import Loader from '../common/Loader';
import toast from 'react-hot-toast';

const StaffDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchStaff();
  }, [id]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const data = await api.getUser(id);
      setStaff(data);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Staff member not found');
      navigate('/staff');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!window.confirm(`${staff.is_active ? 'Deactivate' : 'Activate'} "${staff.full_name}"?`)) return;

    setProcessing(true);
    try {
      await api.updateUser(id, { is_active: !staff.is_active });
      toast.success(`${staff.full_name} ${staff.is_active ? 'deactivated' : 'activated'}`);
      fetchStaff();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.error || 'Failed to update status');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${staff?.full_name}"?`)) return;

    setProcessing(true);
    try {
      await api.deleteUser(id);
      toast.success('Staff deleted successfully');
      navigate('/staff');
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error(error.response?.data?.error || 'Failed to delete staff');
    } finally {
      setProcessing(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setProcessing(true);
    try {
      await api.resetUserPassword(id, { new_password: newPassword });
      toast.success('Password reset successfully');
      setShowResetModal(false);
      setNewPassword('');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error(error.response?.data?.error || 'Failed to reset password');
    } finally {
      setProcessing(false);
    }
  };

  const getRoleMeta = (role) => {
    const map = {
      boss: { color: '#ef4444', label: 'Boss' },
      manager: { color: '#3b82f6', label: 'Manager' },
      cashier: { color: '#f59e0b', label: 'Cashier' },
      store_keeper: { color: '#8b5cf6', label: 'Store Keeper' },
      sales_rep: { color: '#10b981', label: 'Sales Rep' }
    };
    return map[role] || { color: '#6b7280', label: role };
  };

  if (loading) return <Loader message="Loading staff..." />;

  if (!staff) {
    return (
      <div className="empty-state">
        <h3>Staff member not found</h3>
        <button onClick={() => navigate('/staff')} className="btn btn-primary">
          Back to Staff
        </button>
      </div>
    );
  }

  const isSelf = staff.id === currentUser.id;
  const isBoss = staff.role === 'boss';
  const roleMeta = getRoleMeta(staff.role);

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <button onClick={() => navigate('/staff')} className="btn btn-sm btn-secondary">
            <FiArrowLeft size={16} /> Back
          </button>
          <h1>{staff.full_name}</h1>
          <p>Staff member since {formatDate(staff.created_at)}</p>
          {isSelf && <span className="badge badge-info" style={{ marginLeft: '8px' }}>You</span>}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Personal Information</h3>
          <div className="detail-row">
            <span className="detail-label">Full Name</span>
            <span className="detail-value">{staff.full_name}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Email</span>
            <span className="detail-value">{staff.email}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Phone</span>
            <span className="detail-value">{staff.phone || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Role</span>
            <span className="detail-value">
              <span
                className="badge"
                style={{
                  backgroundColor: roleMeta.color + '20',
                  color: roleMeta.color
                }}
              >
                {roleMeta.label}
              </span>
            </span>
          </div>
        </div>

        <div className="card">
          <h3>Account Status</h3>
          <div className="detail-row">
            <span className="detail-label">Status</span>
            <span className="detail-value">
              <span className={`badge ${staff.is_active ? 'badge-success' : 'badge-danger'}`}>
                {staff.is_active ? 'Active' : 'Inactive'}
              </span>
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">First Login</span>
            <span className="detail-value">
              {staff.is_first_login ? 'Yes — will be prompted to change password' : 'No'}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Account Created</span>
            <span className="detail-value">{formatDate(staff.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="flex" style={{ gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to={`/staff/${id}/edit`} className="btn btn-primary">
            <FiEdit2 size={18} /> Edit Staff
          </Link>

          <button
            onClick={() => setShowResetModal(true)}
            className="btn btn-secondary"
          >
            <FiKey size={18} /> Reset Password
          </button>

          {!isSelf && !isBoss && (
            <>
              <button
                onClick={handleToggleStatus}
                className="btn btn-secondary"
                disabled={processing}
              >
                {staff.is_active ? <FiUserX size={18} /> : <FiUserCheck size={18} />}
                {staff.is_active ? ' Deactivate' : ' Activate'}
              </button>
              <button
                onClick={handleDelete}
                className="btn btn-danger"
                disabled={processing}
              >
                <FiTrash2 size={18} /> Delete Staff
              </button>
            </>
          )}
        </div>
      </div>

      {showResetModal && (
        <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Reset Password</h2>
            <p>Set a new password for <strong>{staff.full_name}</strong></p>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>New Password</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="form-control"
              />
              <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>
                Staff will be prompted to change password on next login
              </small>
            </div>

            <div className="flex" style={{ gap: '10px', marginTop: '16px' }}>
              <button
                onClick={handleResetPassword}
                className="btn btn-primary"
                disabled={processing}
              >
                {processing ? 'Resetting...' : 'Reset Password'}
              </button>
              <button
                onClick={() => { setShowResetModal(false); setNewPassword(''); }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDetail;