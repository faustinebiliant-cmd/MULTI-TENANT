// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Supplier Detail
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiEdit2, FiTrash2 } from 'react-icons/fi';
import api from '../../api/client';
import { formatDate } from '../../utils/helpers';
import Loader from '../common/Loader';
import ConfirmDialog from '../common/ConfirmDialog';
import toast from 'react-hot-toast';

const SupplierDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchSupplier();
  }, [id]);

  const fetchSupplier = async () => {
    try {
      setLoading(true);
      const data = await api.getSupplier(id);
      setSupplier(data);
    } catch (error) {
      console.error('Error fetching supplier:', error);
      toast.error(t('suppliers.detail.messages.not_found'));
      navigate('/suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await api.deleteSupplier(id);
      toast.success(t('suppliers.detail.messages.deleted'));
      navigate('/suppliers');
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error(error.response?.data?.error || t('suppliers.detail.messages.delete_failed'));
      setDeleting(false);
      setShowDelete(false);
    }
  };

  if (loading) return <Loader message={t('suppliers.detail.loading')} />;

  if (!supplier) {
    return (
      <div className="empty-state">
        <h3>{t('suppliers.detail.not_found')}</h3>
        <button onClick={() => navigate('/suppliers')} className="btn btn-primary">
          {t('suppliers.detail.back_to_suppliers')}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <button
            onClick={() => navigate('/suppliers')}
            className="btn btn-sm btn-secondary"
          >
            <FiArrowLeft size={16} /> {t('suppliers.detail.back')}
          </button>
          <h1>{supplier.name}</h1>
          <p>{t('suppliers.detail.subtitle')}</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>{t('suppliers.detail.info_title')}</h3>
          <div className="detail-row">
            <span className="detail-label">{t('suppliers.detail.labels.name')}</span>
            <span className="detail-value">{supplier.name}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('suppliers.detail.labels.contact_person')}</span>
            <span className="detail-value">{supplier.contact_person || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('suppliers.detail.labels.phone')}</span>
            <span className="detail-value">{supplier.phone}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('suppliers.detail.labels.email')}</span>
            <span className="detail-value">{supplier.email || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('suppliers.detail.labels.address')}</span>
            <span className="detail-value">{supplier.address || '-'}</span>
          </div>
        </div>

        <div className="card">
          <h3>{t('suppliers.detail.additional_info_title')}</h3>
          <div className="detail-row">
            <span className="detail-label">{t('suppliers.detail.labels.notes')}</span>
            <span className="detail-value">{supplier.notes || t('suppliers.detail.no_notes')}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('suppliers.detail.labels.created_at')}</span>
            <span className="detail-value">{formatDate(supplier.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="flex" style={{ gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to={`/suppliers/${id}/edit`} className="btn btn-primary">
            <FiEdit2 size={18} /> {t('suppliers.detail.edit_button')}
          </Link>
          <button onClick={() => setShowDelete(true)} className="btn btn-danger">
            <FiTrash2 size={18} /> {t('suppliers.detail.delete_button')}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        title={t('suppliers.detail.delete_dialog.title')}
        message={t('suppliers.detail.delete_dialog.message', { name: supplier.name })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
};

export default SupplierDetail;