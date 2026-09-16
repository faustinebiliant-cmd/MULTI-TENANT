// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Purchase Order Detail
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiEdit2, FiTrash2, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';
import api from '../../api/client';
import { formatCurrency, formatDate, formatDateOnly } from '../../utils/helpers';
import Loader from '../common/Loader';
import ConfirmDialog from '../common/ConfirmDialog';
import toast from 'react-hot-toast';

const PODetail = () => {
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
      toast.error('Purchase order not found');
      navigate('/purchase-orders');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveConfirm = async () => {
    setProcessing(true);
    try {
      await api.receivePurchaseOrder(id);
      toast.success('Purchase order received. Stock updated.');
      setShowReceive(false);
      fetchPO();
    } catch (error) {
      console.error('Error receiving PO:', error);
      toast.error(error.response?.data?.error || 'Failed to receive PO');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setProcessing(true);
    try {
      await api.deletePurchaseOrder(id);
      toast.success('Purchase order deleted successfully');
      navigate('/purchase-orders');
    } catch (error) {
      console.error('Error deleting PO:', error);
      toast.error(error.response?.data?.error || 'Failed to delete PO');
      setProcessing(false);
      setShowDelete(false);
    }
  };

  if (loading) return <Loader message="Loading purchase order..." />;

  if (!po) {
    return (
      <div className="empty-state">
        <h3>Purchase order not found</h3>
        <button onClick={() => navigate('/purchase-orders')} className="btn btn-primary">
          Back to Purchase Orders
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
            <FiArrowLeft size={16} /> Back
          </button>
          <h1>Purchase Order #{po.po_number}</h1>
          <p>Created on {formatDate(po.created_at)}</p>
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
            <strong>This purchase order has been received.</strong>
            <br />
            Editing the items will adjust product stock by the difference between what was originally received and the new quantities.
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <h3>Purchase Order Information</h3>
          <div className="detail-row">
            <span className="detail-label">PO Number</span>
            <span className="detail-value"><strong>{po.po_number}</strong></span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Supplier</span>
            <span className="detail-value">{po.supplier_name || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Status</span>
            <span className="detail-value">
              <span className={`badge badge-${po.status}`}>
                {po.status?.toUpperCase() || 'PENDING'}
              </span>
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Total Amount</span>
            <span className="detail-value" style={{ fontSize: '20px', fontWeight: '700', color: '#1a56db' }}>
              {formatCurrency(po.total_amount)}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Order Date</span>
            <span className="detail-value">
              {po.order_date ? formatDateOnly(po.order_date) : formatDate(po.created_at)}
            </span>
          </div>
          {po.delivery_date && (
            <div className="detail-row">
              <span className="detail-label">Delivery Date</span>
              <span className="detail-value">{formatDateOnly(po.delivery_date)}</span>
            </div>
          )}
          {po.notes && (
            <div className="detail-row">
              <span className="detail-label">Notes</span>
              <span className="detail-value">{po.notes}</span>
            </div>
          )}
          <div className="detail-row">
            <span className="detail-label">Created By</span>
            <span className="detail-value">{po.created_by_name || 'System'}</span>
          </div>
        </div>

        <div className="card">
          <h3>Order Items</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Cost Price</th>
                  <th>Subtotal</th>
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
                    <td colSpan="4" className="text-center">No items found</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold' }}>Total</td>
                  <td style={{ fontWeight: 'bold', color: '#1a56db' }}>{formatCurrency(po.total_amount)}</td>
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
              <FiCheckCircle size={18} /> Receive Stock
            </button>
          )}
          {!isCancelled && (
            <Link to={`/purchase-orders/${id}/edit`} className="btn btn-primary">
              <FiEdit2 size={18} /> Edit
            </Link>
          )}
          {!isReceived && (
            <button onClick={() => setShowDelete(true)} className="btn btn-danger">
              <FiTrash2 size={18} /> Delete
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showReceive}
        title="Receive Purchase Order"
        message="Receiving this PO will add all items to your inventory. Continue?"
        confirmLabel="Receive"
        cancelLabel="Cancel"
        variant="primary"
        loading={processing}
        onConfirm={handleReceiveConfirm}
        onCancel={() => setShowReceive(false)}
      />

      <ConfirmDialog
        open={showDelete}
        title="Delete Purchase Order"
        message={`Are you sure you want to delete "${po.po_number}"? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={processing}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
};

export default PODetail;