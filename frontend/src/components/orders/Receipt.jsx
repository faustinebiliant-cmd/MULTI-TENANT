// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Receipt
// ============================================================

import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { FiPrinter, FiDownload } from 'react-icons/fi';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { useShop } from '../../contexts/ShopContext';
import toast from 'react-hot-toast';

// Change these three values to control the top title on the receipt.
// fontSize accepts any CSS unit: '20px', '1.5rem', '18pt', etc.
// fontWeight accepts: 'normal', 'bold', '600', '700', '800', '900', etc.
// color accepts any CSS color: '#000000', '#1a56db', 'black', 'rgb(0,0,0)'.
const TITLE_STYLE = {
  fontSize: '15px',
  fontWeight: '800',
  color: '#0f172a'
};

const Receipt = ({ order, onClose }) => {
  const receiptRef = useRef(null);

  const {
    location,
    phone,
    tin: shopTin,
    vrn: shopVrn,
    vatEnabled,
    vatRate
  } = useShop();

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    try {
      const receiptElement = receiptRef.current;
      const canvas = await html2canvas(receiptElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true
      });

      const link = document.createElement('a');
      link.download = `receipt-${order.order_number || 'order'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error('Failed to download receipt');
    }
  };

  const subtotal = parseFloat(order.subtotal) || 0;
  const taxAmount = parseFloat(order.tax_amount) || 0;
  const totalAmount = parseFloat(order.total_amount) || 0;
  const paidAmount = parseFloat(order.paid_amount) || 0;
  const hasVAT = taxAmount > 0;
  const isCancelled = order.order_status === 'cancelled';

  const items = order.order_items || order.items || [];

  const displayTin = order.tin || shopTin;
  const displayVrn = order.vrn || shopVrn;

  return (
    <div className="receipt-container">
      <div className="receipt" id="receipt" ref={receiptRef}>
        {isCancelled && (
          <div style={{
            background: '#fef2f2',
            border: '2px solid #dc2626',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '20px',
              fontWeight: '800',
              color: '#dc2626',
              letterSpacing: '2px',
              marginBottom: '4px'
            }}>
              CANCELLED
            </div>
            {order.cancellation_reason && (
              <div style={{
                fontSize: '11px',
                color: '#7f1d1d',
                marginTop: '8px',
                fontStyle: 'italic'
              }}>
                Reason: {order.cancellation_reason}
              </div>
            )}
            {order.cancelled_by_name && (
              <div style={{ fontSize: '10px', color: '#991b1b', marginTop: '4px' }}>
                Cancelled by {order.cancelled_by_name}
                {order.cancelled_at && ` on ${formatDate(order.cancelled_at)}`}
              </div>
            )}
          </div>
        )}

        <div className="receipt-header">
          <h2 style={TITLE_STYLE}>Oswago Electrical Equipment</h2>
          {location && <p style={{ fontSize: '12px', color: '#6b7280' }}>{location}</p>}
          {phone && <p style={{ fontSize: '12px', color: '#6b7280' }}>{phone}</p>}
          {displayTin && <p style={{ fontSize: '11px', color: '#6b7280' }}>TIN: {displayTin}</p>}
          {displayVrn && <p style={{ fontSize: '11px', color: '#6b7280' }}>VRN: {displayVrn}</p>}
          <hr />
        </div>

        <div className="receipt-body">
          <div className="receipt-order-info">
            <p><strong>Order #:</strong> {order.order_number}</p>
            <p><strong>Date:</strong> {formatDate(order.created_at)}</p>
            <p><strong>Customer:</strong> {order.customer || order.customer_name || 'Walk-in'}</p>
            <p>
              <strong>Status:</strong>{' '}
              <span style={{ color: isCancelled ? '#dc2626' : '#059669', fontWeight: 600 }}>
                {isCancelled ? 'CANCELLED' : (order.order_status || 'pending').toUpperCase()}
              </span>
            </p>
          </div>

          <hr />

          <div className="receipt-items">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? (
                  items.map((item, index) => {
                    const unitPrice = parseFloat(item.unit_price || item.price) || 0;
                    const qty = parseInt(item.quantity) || 0;
                    const lineTotal = unitPrice * qty;

                    return (
                      <tr
                        key={index}
                        style={isCancelled ? { textDecoration: 'line-through', opacity: 0.6 } : {}}
                      >
                        <td>{item.product_name || item.name || item.product || 'Product'}</td>
                        <td>{qty}</td>
                        <td>{formatCurrency(unitPrice)}</td>
                        <td>{formatCurrency(lineTotal)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: '#6b7280' }}>
                      No items found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <hr />

          <div className="receipt-total">
            {isCancelled ? (
              <>
                <div className="flex-between">
                  <span>Original Subtotal</span>
                  <span style={{ textDecoration: 'line-through', color: '#6b7280' }}>
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                <div className="flex-between">
                  <span>Original VAT</span>
                  <span style={{ textDecoration: 'line-through', color: '#6b7280' }}>
                    {formatCurrency(taxAmount)}
                  </span>
                </div>
                <div className="flex-between" style={{ marginTop: '8px' }}>
                  <span style={{ fontWeight: 700 }}>Current Total</span>
                  <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#dc2626' }}>
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
                <div className="flex-between" style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                  <span>Paid</span>
                  <span style={{ color: '#dc2626' }}>{formatCurrency(paidAmount)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>

                {hasVAT && (
                  <div className="flex-between">
                    <span>VAT{vatEnabled && vatRate ? ` (${vatRate}%)` : ''}</span>
                    <span style={{ color: '#f59e0b' }}>{formatCurrency(taxAmount)}</span>
                  </div>
                )}

                <div className="flex-between">
                  <span>Total</span>
                  <span style={{ fontWeight: 'bold', fontSize: '18px' }}>
                    {formatCurrency(totalAmount)}
                  </span>
                </div>

                {paidAmount > 0 && (
                  <>
                    <div className="flex-between" style={{ fontSize: '14px', color: '#059669' }}>
                      <span>Paid</span>
                      <span>{formatCurrency(paidAmount)}</span>
                    </div>
                    <div className="flex-between" style={{ fontSize: '14px' }}>
                      <span>Balance Due</span>
                      <span style={{ color: totalAmount - paidAmount > 0 ? '#dc2626' : '#059669' }}>
                        {formatCurrency(Math.max(0, totalAmount - paidAmount))}
                      </span>
                    </div>
                  </>
                )}

                <div className="flex-between" style={{ fontSize: '14px', color: '#6b7280' }}>
                  <span>Payment Status</span>
                  <span>{order.payment_status || 'Unpaid'}</span>
                </div>
              </>
            )}
          </div>

          <hr />

          <div className="receipt-footer">
            {isCancelled ? (
              <>
                <p style={{ textAlign: 'center', fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                  Order cancelled - no payment is due
                </p>
                <p style={{ textAlign: 'center', fontSize: '10px', color: '#6b7280' }}>
                  Keep this receipt for your records
                </p>
              </>
            ) : (
              <>
                <p style={{ textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>
                  Thank you for shopping with us.
                </p>
                <p style={{ textAlign: 'center', fontSize: '10px', color: '#6b7280' }}>
                  Items sold are not returnable unless defective
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="receipt-actions">
        <button onClick={handlePrint} className="btn btn-primary">
          <FiPrinter size={16} /> Print Receipt
        </button>
        <button onClick={handleDownload} className="btn btn-success">
          <FiDownload size={16} /> Download
        </button>
        <button onClick={onClose} className="btn btn-secondary">
          Close
        </button>
      </div>
    </div>
  );
};

export default Receipt;