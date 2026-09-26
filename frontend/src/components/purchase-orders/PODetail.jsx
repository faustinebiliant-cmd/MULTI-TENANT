// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Purchase Order Detail
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiEdit2, FiTrash2, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';
import api from '../../api/client';
import { formatCurrency, formatDate, formatDateOnly } from '../../utils/helpers';
import Loader from '../common/Loader';
import ConfirmDialog from '../common/ConfirmDialog';
import toast from 'react-hot-toast';

const PODetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [showReceive, setShowReceive] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    fetchPO();
  }, [id]);

  const fetchPO = async () => {
    try {
      setLoading(true);
      const data = await api.getPurchaseOrder(id);
      setPo(data);
    } catch (error) {
      console.error('Error fetching PO:', error);
      toast.error(t('purchase_orders.detail.messages.not_found'));
      navigate('/purchase-orders');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveConfirm = async () => {
    setProcessing(true);
    try {
      await api.receivePurchaseOrder(id);
      toast.success(t('purchase_orders.detail.messages.received'));
      setShowReceive(false);
      fetchPO();
    } catch (error) {
      console.error('Error receiving PO:', error);
      toast.error(error.response?.data?.error || t('purchase_orders.detail.messages.receive_failed'));
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setProcessing(true);
    try {
      await api.deletePurchaseOrder(id);
      toast.success(t('purchase_orders.detail.messages.deleted'));
      navigate('/purchase-orders');
    } catch (error) {
      console.error('Error deleting PO:', error);
      toast.error(error.response?.data?.error || t('purchase_orders.detail.messages.delete_failed'));
      setProcessing(false);
      setShowDelete(false);
    }
  };

  if (loading) return <Loader message={t('purchase_orders.detail.loading')} />;

  if (!po) {
    return (
      <div className="empty-state">
        <h3>{t('purchase_orders.detail.not_found')}</h3>
        <button onClick={() => navigate('/purchase-orders')} className="btn btn-primary">
          {t('purchase_orders.detail.back_to_pos')}
        </button>
      </div>
    );
  }

  const isPending = po.status === 'pending';
  const isReceived = po.status === 'received';
  const isCancelled = po.status === 'cancelled';

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <button onClick={() => navigate('/purchase-orders')} className="btn btn-sm btn-secondary">
            <FiArrowLeft size={16} /> {t('purchase_orders.detail.back')}
          </button>
          <h1>{t('purchase_orders.detail.order_number', { number: po.po_number })}</h1>
          <p>{t('purchase_orders.detail.created_on', { date: formatDate(po.created_at) })}</p>
        </div>
      </div>

      {isReceived && (
        <div style={{
          padding: '12px 16px',
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start'
        }}>
          <FiAlertTriangle size={18} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '13px', color: '#78350f', lineHeight: 1.5 }}>
            <strong>{t('purchase_orders.detail.received_banner_title')}</strong>
            <br />
            {t('purchase_orders.detail.received_banner_body')}
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <h3>{t('purchase_orders.detail.info_title')}</h3>
          <div className="detail-row">
            <span className="detail-label">{t('purchase_orders.detail.labels.po_number')}</span>
            <span className="detail-value"><strong>{po.po_number}</strong></span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('purchase_orders.detail.labels.supplier')}</span>
            <span className="detail-value">{po.supplier_name || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('purchase_orders.detail.labels.status')}</span>
            <span className="detail-value">
              <span className={`badge badge-${po.status}`}>
                {t('purchase_orders.status.' + (po.status || 'pending'))}
              </span>
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('purchase_orders.detail.labels.total_amount')}</span>
            <span className="detail-value" style={{ fontSize: '20px', fontWeight: '700', color: '#1a56db' }}>
              {formatCurrency(po.total_amount)}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('purchase_orders.detail.labels.order_date')}</span>
            <span className="detail-value">
              {po.order_date ? formatDateOnly(po.order_date) : formatDate(po.created_at)}
            </span>
          </div>
          {po.delivery_date && (
            <div className="detail-row">
              <span className="detail-label">{t('purchase_orders.detail.labels.delivery_date')}</span>
              <span className="detail-value">{formatDateOnly(po.delivery_date)}</span>
            </div>
          )}
          {po.notes && (
            <div className="detail-row">
              <span className="detail-label">{t('purchase_orders.detail.labels.notes')}</span>
              <span className="detail-value">{po.notes}</span>
            </div>
          )}
          <div className="detail-row">
            <span className="detail-label">{t('purchase_orders.detail.labels.created_by')}</span>
            <span className="detail-value">{po.created_by_name || 'System'}</span>
          </div>
        </div>

        <div className="card">
          <h3>{t('purchase_orders.detail.items_title')}</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('purchase_orders.detail.item_columns.product')}</th>
                  <th>{t('purchase_orders.detail.item_columns.quantity')}</th>
                  <th>{t('purchase_orders.detail.item_columns.cost_price')}</th>
                  <th>{t('purchase_orders.detail.item_columns.subtotal')}</th>
                </tr>
              </thead>
              <tbody>
                {po.purchase_order_items && po.purchase_order_items.length > 0 ? (
                  po.purchase_order_items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.product_name || 'Product'}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.cost_price)}</td>
                      <td>{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center">{t('purchase_orders.detail.no_items')}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold' }}>
                    {t('purchase_orders.detail.totals.total')}
                  </td>
                  <td style={{ fontWeight: 'bold', color: '#1a56db' }}>
                    {formatCurrency(po.total_amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="flex" style={{ gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {isPending && (
            <button onClick={() => setShowReceive(true)} className="btn btn-success">
              <FiCheckCircle size={18} /> {t('purchase_orders.detail.receive_button')}
            </button>
          )}
          {!isCancelled && (
            <Link to={`/purchase-orders/${id}/edit`} className="btn btn-primary">
              <FiEdit2 size={18} /> {t('purchase_orders.detail.edit_button')}
            </Link>
          )}
          {!isReceived && (
            <button onClick={() => setShowDelete(true)} className="btn btn-danger">
              <FiTrash2 size={18} /> {t('purchase_orders.detail.delete_button')}
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showReceive}
        title={t('purchase_orders.detail.receive_dialog.title')}
        message={t('purchase_orders.detail.receive_dialog.message')}
        confirmLabel={t('purchase_orders.detail.receive_dialog.confirm_button')}
        cancelLabel={t('common.cancel')}
        variant="primary"
        loading={processing}
        onConfirm={handleReceiveConfirm}
        onCancel={() => setShowReceive(false)}
      />

      <ConfirmDialog
        open={showDelete}
        title={t('purchase_orders.detail.delete_dialog.title')}
        message={t('purchase_orders.detail.delete_dialog.message', { number: po.po_number })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        loading={processing}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
};

export default PODetail;