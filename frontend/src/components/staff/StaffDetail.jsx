// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Staff Detail
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FiArrowLeft, FiEdit2, FiTrash2, FiUserCheck, FiUserX, FiKey
} from 'react-icons/fi';
import api from '../../api/client';
import { formatDate } from '../../utils/helpers';
import { ROLE_META } from '../../utils/constants';
import Loader from '../common/Loader';
import ConfirmDialog from '../common/ConfirmDialog';
import toast from 'react-hot-toast';

const StaffDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showToggleDialog, setShowToggleDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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
      toast.error(t('staff.detail.messages.not_found'));
      navigate('/staff');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleConfirm = async () => {
    setProcessing(true);
    try {
      await api.updateUser(id, { is_active: !staff.is_active });
      toast.success(
        staff.is_active
          ? t('staff.detail.messages.deactivated', { name: staff.full_name })
          : t('staff.detail.messages.activated', { name: staff.full_name })
      );
      setShowToggleDialog(false);
      fetchStaff();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.error || t('staff.detail.messages.status_failed'));
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setProcessing(true);
    try {
      await api.deleteUser(id);
      toast.success(t('staff.detail.messages.deleted'));
      navigate('/staff');
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error(error.response?.data?.error || t('staff.detail.messages.delete_failed'));
      setProcessing(false);
      setShowDeleteDialog(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error(t('staff.detail.messages.password_too_short'));
      return;
    }

    setProcessing(true);
    try {
      await api.resetUserPassword(id, { new_password: newPassword });
      toast.success(t('staff.detail.messages.password_reset'));
      setShowResetModal(false);
      setNewPassword('');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error(error.response?.data?.error || t('staff.detail.messages.password_reset_failed'));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <Loader message={t('staff.detail.loading')} />;

  if (!staff) {
    return (
      <div className="empty-state">
        <h3>{t('staff.detail.not_found')}</h3>
        <button onClick={() => navigate('/staff')} className="btn btn-primary">
          {t('staff.detail.back_to_staff')}
        </button>
      </div>
    );
  }

  const isSelf = staff.id === currentUser.id;
  const isBoss = staff.role === 'boss';
  const roleMeta = ROLE_META[staff.role] || { color: '#6b7280' };

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <button onClick={() => navigate('/staff')} className="btn btn-sm btn-secondary">
            <FiArrowLeft size={16} /> {t('staff.detail.back')}
          </button>
          <h1>{staff.full_name}</h1>
          <p>{t('staff.detail.since', { date: formatDate(staff.created_at) })}</p>
          {isSelf && (
            <span className="badge badge-info" style={{ marginLeft: '8px' }}>
              {t('staff.detail.you_badge')}
            </span>
          )}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>{t('staff.detail.personal_info_title')}</h3>
          <div className="detail-row">
            <span className="detail-label">{t('staff.detail.labels.full_name')}</span>
            <span className="detail-value">{staff.full_name}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('staff.detail.labels.email')}</span>
            <span className="detail-value">{staff.email}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('staff.detail.labels.phone')}</span>
            <span className="detail-value">{staff.phone || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('staff.detail.labels.role')}</span>
            <span className="detail-value">
              <span
                className="badge"
                style={{
                  backgroundColor: roleMeta.color + '20',
                  color: roleMeta.color
                }}
              >
                {t('staff.roles.' + staff.role)}
              </span>
            </span>
          </div>
        </div>

        <div className="card">
          <h3>{t('staff.detail.account_status_title')}</h3>
          <div className="detail-row">
            <span className="detail-label">{t('staff.detail.labels.status')}</span>
            <span className="detail-value">
              <span className={`badge ${staff.is_active ? 'badge-success' : 'badge-danger'}`}>
                {staff.is_active
                  ? t('staff.list.status_active')
                  : t('staff.list.status_inactive')}
              </span>
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('staff.detail.labels.first_login')}</span>
            <span className="detail-value">
              {staff.is_first_login
                ? t('staff.detail.first_login_yes')
                : t('staff.detail.first_login_no')}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('staff.detail.labels.account_created')}</span>
            <span className="detail-value">{formatDate(staff.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="flex" style={{ gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to={`/staff/${id}/edit`} className="btn btn-primary">
            <FiEdit2 size={18} /> {t('staff.detail.edit_button')}
          </Link>

          <button
            onClick={() => setShowResetModal(true)}
            className="btn btn-secondary"
          >
            <FiKey size={18} /> {t('staff.detail.reset_password_button')}
          </button>

          {!isSelf && !isBoss && (
            <>
              <button
                onClick={() => setShowToggleDialog(true)}
                className="btn btn-secondary"
              >
                {staff.is_active ? <FiUserX size={18} /> : <FiUserCheck size={18} />}
                {staff.is_active
                  ? ` ${t('staff.detail.deactivate_button')}`
                  : ` ${t('staff.detail.activate_button')}`}
              </button>
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="btn btn-danger"
              >
                <FiTrash2 size={18} /> {t('staff.detail.delete_button')}
              </button>
            </>
          )}
        </div>
      </div>

      {showResetModal && (
        <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{t('staff.detail.reset_modal.title')}</h2>
            <p>
              {t('staff.detail.reset_modal.message', { name: staff.full_name })}
            </p>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>{t('staff.detail.reset_modal.new_password_label')}</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('staff.detail.reset_modal.new_password_placeholder')}
                className="form-control"
              />
              <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>
                {t('staff.detail.reset_modal.hint')}
              </small>
            </div>

            <div className="flex" style={{ gap: '10px', marginTop: '16px' }}>
              <button
                onClick={handleResetPassword}
                className="btn btn-primary"
                disabled={processing}
              >
                {processing
                  ? t('staff.detail.reset_modal.submitting_button')
                  : t('staff.detail.reset_modal.submit_button')}
              </button>
              <button
                onClick={() => { setShowResetModal(false); setNewPassword(''); }}
                className="btn btn-secondary"
              >
                {t('staff.detail.reset_modal.cancel_button')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showToggleDialog}
        title={
          staff.is_active
            ? t('staff.detail.toggle_dialog.deactivate_title')
            : t('staff.detail.toggle_dialog.activate_title')
        }
        message={
          staff.is_active
            ? t('staff.detail.toggle_dialog.deactivate_message', { name: staff.full_name })
            : t('staff.detail.toggle_dialog.activate_message', { name: staff.full_name })
        }
        confirmLabel={
          staff.is_active
            ? t('staff.detail.toggle_dialog.deactivate_button')
            : t('staff.detail.toggle_dialog.activate_button')
        }
        cancelLabel={t('common.cancel')}
        variant={staff.is_active ? 'danger' : 'primary'}
        loading={processing}
        onConfirm={handleToggleConfirm}
        onCancel={() => setShowToggleDialog(false)}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        title={t('staff.detail.delete_dialog.title')}
        message={t('staff.detail.delete_dialog.message', { name: staff.full_name })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        loading={processing}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
};

export default StaffDetail;