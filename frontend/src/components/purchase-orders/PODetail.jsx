// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Purchase Order Detail
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiEdit2, FiTrash2, FiCheckCircle } from 'react-icons/fi';
import api from '../../api/client';
import { formatCurrency, formatDate } from '../../utils/helpers';
import Loader from '../common/Loader';
import toast from 'react-hot-toast';

const PODetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

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

  const handleReceive = async () => {
    if (!window.confirm('Receive this purchase order? This will update your inventory.')) return;

    setProcessing(true);
    try {
      await api.receivePurchaseOrder(id);
      toast.success('Purchase order received. Stock updated.');
      fetchPO();
    } catch (error) {
      console.error('Error receiving PO:', error);
      toast.error(error.response?.data?.error || 'Failed to receive PO');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete purchase order "${po?.po_number}"?`)) return;

    setProcessing(true);
    try {
      await api.deletePurchaseOrder(id);
      toast.success('Purchase order deleted successfully');
      navigate('/purchase-orders');
    } catch (error) {
      console.error('Error deleting PO:', error);
      toast.error(error.response?.data?.error || 'Failed to delete PO');
    } finally {
      setProcessing(false);
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
            <span className="detail-value">{formatDate(po.order_date)}</span>
          </div>
          {po.delivery_date && (
            <div className="detail-row">
              <span className="detail-label">Delivery Date</span>
              <span className="detail-value">{formatDate(po.delivery_date)}</span>
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
            <button onClick={handleReceive} className="btn btn-success" disabled={processing}>
              <FiCheckCircle size={18} /> {processing ? 'Processing...' : 'Receive Stock'}
            </button>
          )}
          {!isCancelled && (
            <Link to={`/purchase-orders/${id}/edit`} className="btn btn-primary">
              <FiEdit2 size={18} /> Edit
            </Link>
          )}
          {!isReceived && (
            <button onClick={handleDelete} className="btn btn-danger" disabled={processing}>
              <FiTrash2 size={18} /> Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PODetail;