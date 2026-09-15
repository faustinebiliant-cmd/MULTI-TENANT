// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Order Detail
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiPrinter, FiCreditCard, FiCheck, FiTruck, FiXCircle
} from 'react-icons/fi';
import api from '../../api/client';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../utils/helpers';
import Loader from '../common/Loader';
import ConfirmDialog from '../common/ConfirmDialog';
import toast from 'react-hot-toast';
import PaymentModal from '../payments/PaymentModal';
import Receipt from './Receipt';
import CancelOrderModal from './CancelOrderModal';

const ORDER_STEPS = [
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'delivered', label: 'Delivered' }
];

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // Confirmation state for status change
  const [pendingStatus, setPendingStatus] = useState(null);

  const initialReceiptShownRef = useRef(false);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchOrder(true);
  }, [id]);

  const fetchOrder = async (isInitial = false) => {
    try {
      setLoading(true);
      const data = await api.getOrder(id);
      setOrder(data);

      if (
        isInitial &&
        !initialReceiptShownRef.current &&
        data.payment_status === 'paid' &&
        data.order_status !== 'cancelled'
      ) {
        initialReceiptShownRef.current = true;
        setReceiptData(data);
        setShowReceipt(true);
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Order not found');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    toast.success('Payment recorded successfully');
    setShowPaymentModal(false);
    await fetchOrder();
  };

  const handleCancelSuccess = async () => {
    await fetchOrder();
  };

  // Ask for confirmation before applying the status change
  const requestStatusUpdate = (newStatus) => {
    setPendingStatus(newStatus);
  };

  const handleStatusUpdate = async () => {
    if (!pendingStatus) return;

    setUpdating(true);
    try {
      const response = await api.updateOrderStatus(id, pendingStatus);
      setOrder(response.data);
      toast.success(`Order status updated to ${pendingStatus}`);
      setPendingStatus(null);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <Loader message="Loading order..." />;

  if (!order) {
    return (
      <div className="empty-state">
        <h3>Order not found</h3>
        <button onClick={() => navigate('/orders')} className="btn btn-primary">
          Back to Orders
        </button>
      </div>
    );
  }

  const isPaid = order.payment_status === 'paid';
  const isConfirmed = order.order_status === 'confirmed';
  const isDelivered = order.order_status === 'delivered';
  const isCancelled = order.order_status === 'cancelled';

  const balanceDue = (order.total_amount || 0) - (order.paid_amount || 0);
  const currentStepIndex = ORDER_STEPS.findIndex((s) => s.key === order.order_status);

  const subtotal = parseFloat(order.subtotal) || 0;
  const taxAmount = parseFloat(order.tax_amount) || 0;
  const totalAmount = parseFloat(order.total_amount) || 0;
  const hasVAT = taxAmount > 0;

  const paidAmount = parseFloat(order.paid_amount) || 0;
  const roleAllowedToCancel = ['boss', 'manager', 'store_keeper'].includes(currentUser.role);
  const paidAndNotBoss = paidAmount > 0 && currentUser.role !== 'boss';
  const canCancel = !isCancelled && roleAllowedToCancel && !paidAndNotBoss;

  // Text shown in the confirmation dialog, based on the pending status
  const pendingStatusMessages = {
    confirmed: {
      title: 'Confirm Order',
      message: 'Mark this order as confirmed? This should be done when payment is complete.',
      confirmLabel: 'Confirm',
      variant: 'primary'
    },
    delivered: {
      title: 'Mark Delivered',
      message: 'Mark this order as delivered? The customer has received the goods.',
      confirmLabel: 'Mark Delivered',
      variant: 'primary'
    }
  };

  const pendingMeta = pendingStatus ? pendingStatusMessages[pendingStatus] : null;

  return (
    <div>
      <div className="page-header flex-between" style={{ alignItems: 'flex-start' }}>
        <div>
          <button
            onClick={() => navigate('/orders')}
            className="btn btn-sm btn-secondary"
            style={{ marginBottom: '10px' }}
          >
            <FiArrowLeft size={16} /> Back
          </button>
          <h1 className="flex" style={{ alignItems: 'center', gap: '10px' }}>
            Order #{order.order_number}
          </h1>
          <p>Created on {formatDate(order.created_at)}</p>
          {isPaid && (
            <span className="badge badge-success" style={{ marginTop: '4px', fontSize: '13px' }}>
              Payment Complete
            </span>
          )}
        </div>
        <div className="flex" style={{ gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {!isPaid && !isCancelled && (
            <button onClick={() => setShowPaymentModal(true)} className="btn btn-success">
              <FiCreditCard size={16} /> Record Payment
            </button>
          )}
          {!isConfirmed && !isCancelled && isPaid && (
            <button
              onClick={() => requestStatusUpdate('confirmed')}
              className="btn btn-primary"
              disabled={updating}
            >
              <FiCheck size={16} /> Confirm Order
            </button>
          )}
          {isConfirmed && !isDelivered && !isCancelled && (
            <button
              onClick={() => requestStatusUpdate('delivered')}
              className="btn btn-success"
              disabled={updating}
            >
              <FiTruck size={16} /> Mark Delivered
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="btn btn-danger"
              disabled={updating}
            >
              <FiXCircle size={16} /> Cancel Order
            </button>
          )}
          <button
            onClick={() => {
              setReceiptData(order);
              setShowReceipt(true);
            }}
            className="btn btn-secondary"
          >
            <FiPrinter size={16} /> View Receipt
          </button>
        </div>
      </div>

      {/* Status progress */}
      <div className="card" style={{ marginBottom: '20px' }}>
        {isCancelled ? (
          <div className="flex" style={{ alignItems: 'center', gap: '10px' }}>
            <span
              className="badge"
              style={{ backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '12px', padding: '6px 14px' }}
            >
              CANCELLED
            </span>
            {order.cancellation_reason && (
              <span style={{ fontSize: '13px', color: 'var(--gray)' }}>
                Reason: {order.cancellation_reason}
              </span>
            )}
          </div>
        ) : (
          <div className="order-progress">
            {ORDER_STEPS.map((step, i) => {
              const isDone = i <= currentStepIndex;
              const isActive = i === currentStepIndex;
              return (
                <React.Fragment key={step.key}>
                  <div className="order-progress-step">
                    <div className={`order-progress-dot ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                      {isDone ? <FiCheck size={13} /> : i + 1}
                    </div>
                    <span className={`order-progress-label ${isActive ? 'active' : ''}`}>
                      {step.label}
                    </span>
                  </div>
                  {i < ORDER_STEPS.length - 1 && (
                    <div className={`order-progress-line ${i < currentStepIndex ? 'done' : ''}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Order Information</h3>
          <div className="detail-row">
            <span className="detail-label">Order Number</span>
            <span className="detail-value">{order.order_number}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Customer</span>
            <span className="detail-value">
              {order.customers?.name || order.customer_name || 'Walk-in'}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Status</span>
            <span className="detail-value">
              <span
                className="badge"
                style={{
                  backgroundColor: getStatusColor(order.order_status) + '20',
                  color: getStatusColor(order.order_status)
                }}
              >
                {getStatusLabel(order.order_status)}
              </span>
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Payment Status</span>
            <span className="detail-value">
              <span className={`badge badge-${order.payment_status}`}>
                {order.payment_status?.toUpperCase() || 'UNPAID'}
              </span>
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Created By</span>
            <span className="detail-value">{order.created_by_name || 'System'}</span>
          </div>
          {order.notes && (
            <div className="detail-row">
              <span className="detail-label">Notes</span>
              <span className="detail-value">{order.notes}</span>
            </div>
          )}
        </div>

        <div className="card">
          <h3>Payment Summary</h3>
          {hasVAT && (
            <>
              <div className="detail-row">
                <span className="detail-label">Subtotal</span>
                <span className="detail-value">{formatCurrency(subtotal)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">VAT</span>
                <span className="detail-value" style={{ color: '#f59e0b' }}>
                  {formatCurrency(taxAmount)}
                </span>
              </div>
            </>
          )}
          <div className="detail-row">
            <span className="detail-label">Order Total</span>
            <span className="detail-value" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)' }}>
              {formatCurrency(totalAmount)}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Paid Amount</span>
            <span className="detail-value" style={{ color: 'var(--success)', fontWeight: '600' }}>
              {formatCurrency(order.paid_amount || 0)}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Balance Due</span>
            <span
              className="detail-value"
              style={{ fontWeight: '700', color: balanceDue > 0 ? 'var(--danger)' : 'var(--success)' }}
            >
              {formatCurrency(balanceDue > 0 ? balanceDue : 0)}
            </span>
          </div>
          {order.payment_recorded_by_name && (
            <div className="detail-row">
              <span className="detail-label">Payment Recorded By</span>
              <span className="detail-value">{order.payment_recorded_by_name}</span>
            </div>
          )}
          {order.payment_recorded_at && (
            <div className="detail-row">
              <span className="detail-label">Payment Recorded At</span>
              <span className="detail-value">{formatDate(order.payment_recorded_at)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Audit trail */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h3>Audit Trail</h3>
        <div className="grid-2">
          <div>
            <div className="detail-row">
              <span className="detail-label">Created By</span>
              <span className="detail-value">{order.created_by_name || 'System'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Created At</span>
              <span className="detail-value">{formatDate(order.created_at)}</span>
            </div>
            {order.confirmed_by_name && (
              <div className="detail-row">
                <span className="detail-label">Confirmed By</span>
                <span className="detail-value">{order.confirmed_by_name}</span>
              </div>
            )}
            {order.confirmed_at && (
              <div className="detail-row">
                <span className="detail-label">Confirmed At</span>
                <span className="detail-value">{formatDate(order.confirmed_at)}</span>
              </div>
            )}
          </div>
          <div>
            {order.cancelled_by_name && (
              <div className="detail-row">
                <span className="detail-label">Cancelled By</span>
                <span className="detail-value">{order.cancelled_by_name}</span>
              </div>
            )}
            {order.cancelled_at && (
              <div className="detail-row">
                <span className="detail-label">Cancelled At</span>
                <span className="detail-value">{formatDate(order.cancelled_at)}</span>
              </div>
            )}
            {order.cancellation_reason && (
              <div className="detail-row">
                <span className="detail-label">Cancellation Reason</span>
                <span className="detail-value">{order.cancellation_reason}</span>
              </div>
            )}
            {!order.confirmed_by_name && !order.cancelled_by_name && (
              <p style={{ color: 'var(--gray-light)', fontSize: '13px' }}>No further activity yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Order items */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h3>Order Items</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th style={{ textAlign: 'right' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.order_items && order.order_items.length > 0 ? (
                order.order_items.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500 }}>{item.product_name || item.name || 'Product'}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.unit_price)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center">No items found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="order-summary-box">
          <div className="order-summary-row">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {hasVAT && (
            <div className="order-summary-row">
              <span>VAT</span>
              <span style={{ color: '#f59e0b' }}>{formatCurrency(taxAmount)}</span>
            </div>
          )}
          <div className="order-summary-row">
            <span>Paid</span>
            <span style={{ color: 'var(--success)' }}>- {formatCurrency(order.paid_amount || 0)}</span>
          </div>
          <div className="order-summary-row total">
            <span>Balance Due</span>
            <span style={{ color: balanceDue > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {formatCurrency(balanceDue > 0 ? balanceDue : 0)}
            </span>
          </div>
        </div>
      </div>

      {showPaymentModal && (
        <PaymentModal
          order={order}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {showCancelModal && (
        <CancelOrderModal
          order={order}
          onClose={() => setShowCancelModal(false)}
          onSuccess={handleCancelSuccess}
        />
      )}

      {showReceipt && receiptData && (
        <Receipt
          order={{
            ...receiptData,
            customer: receiptData.customers?.name || receiptData.customer_name || 'Walk-in',
            items: receiptData.order_items || [],
            tin: receiptData.tin,
            vrn: receiptData.vrn
          }}
          onClose={() => setShowReceipt(false)}
        />
      )}

      {/* Status change confirmation */}
      {pendingMeta && (
        <ConfirmDialog
          open={!!pendingStatus}
          title={pendingMeta.title}
          message={pendingMeta.message}
          confirmLabel={pendingMeta.confirmLabel}
          cancelLabel="Cancel"
          variant={pendingMeta.variant}
          loading={updating}
          onConfirm={handleStatusUpdate}
          onCancel={() => setPendingStatus(null)}
        />
      )}
    </div>
  );
};

export default OrderDetail;