// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Receipt
// ============================================================

import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { useTranslation } from 'react-i18next';
import { FiPrinter, FiDownload } from 'react-icons/fi';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { useShop } from '../../contexts/ShopContext';
import toast from 'react-hot-toast';

const TITLE_STYLE = {
  fontSize: '15px',
  fontWeight: '800',
  color: '#0f172a'
};

const Receipt = ({ order, onClose }) => {
  const { t } = useTranslation();
  const receiptRef = useRef(null);

  const {
    appName,
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
      toast.error(t('receipt.messages.download_failed'));
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

  const displayShopName = appName || 'Oswagotech';

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
              {t('receipt.cancelled_badge')}
            </div>
            {order.cancellation_reason && (
              <div style={{
                fontSize: '11px',
                color: '#7f1d1d',
                marginTop: '8px',
                fontStyle: 'italic'
              }}>
                {t('receipt.cancelled_reason', { reason: order.cancellation_reason })}
              </div>
            )}
            {order.cancelled_by_name && (
              <div style={{ fontSize: '10px', color: '#991b1b', marginTop: '4px' }}>
                {t('receipt.cancelled_by_line', {
                  name: order.cancelled_by_name,
                  date: order.cancelled_at ? formatDate(order.cancelled_at) : ''
                })}
              </div>
            )}
          </div>
        )}

        <div className="receipt-header">
          <h2 style={TITLE_STYLE}>{displayShopName}</h2>
          {location && <p style={{ fontSize: '12px', color: '#6b7280' }}>{location}</p>}
          {phone && <p style={{ fontSize: '12px', color: '#6b7280' }}>{phone}</p>}
          {displayTin && <p style={{ fontSize: '11px', color: '#6b7280' }}>TIN: {displayTin}</p>}
          {displayVrn && <p style={{ fontSize: '11px', color: '#6b7280' }}>VRN: {displayVrn}</p>}
          <hr />
        </div>

        <div className="receipt-body">
          <div className="receipt-order-info">
            <p><strong>{t('receipt.order_info.order_number')}</strong> {order.order_number}</p>
            <p><strong>{t('receipt.order_info.date')}</strong> {formatDate(order.created_at)}</p>
            <p><strong>{t('receipt.order_info.customer')}</strong> {order.customer || order.customer_name || t('orders.list.walk_in')}</p>
            <p>
              <strong>{t('receipt.order_info.status')}</strong>{' '}
              <span style={{ color: isCancelled ? '#dc2626' : '#059669', fontWeight: 600 }}>
                {isCancelled
                  ? t('status.cancelled').toUpperCase()
                  : t('status.' + (order.order_status || 'pending')).toUpperCase()}
              </span>
            </p>
          </div>

          <hr />

          <div className="receipt-items">
            <table>
              <thead>
                <tr>
                  <th>{t('receipt.item_columns.item')}</th>
                  <th>{t('receipt.item_columns.qty')}</th>
                  <th>{t('receipt.item_columns.price')}</th>
                  <th>{t('receipt.item_columns.total')}</th>
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
                      {t('receipt.no_items')}
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
                  <span>{t('receipt.cancelled_totals.original_subtotal')}</span>
                  <span style={{ textDecoration: 'line-through', color: '#6b7280' }}>
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                <div className="flex-between">
                  <span>{t('receipt.cancelled_totals.original_vat')}</span>
                  <span style={{ textDecoration: 'line-through', color: '#6b7280' }}>
                    {formatCurrency(taxAmount)}
                  </span>
                </div>
                <div className="flex-between" style={{ marginTop: '8px' }}>
                  <span style={{ fontWeight: 700 }}>{t('receipt.cancelled_totals.current_total')}</span>
                  <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#dc2626' }}>
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
                <div className="flex-between" style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                  <span>{t('receipt.cancelled_totals.paid')}</span>
                  <span style={{ color: '#dc2626' }}>{formatCurrency(paidAmount)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex-between">
                  <span>{t('receipt.totals.subtotal')}</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>

                {hasVAT && (
                  <div className="flex-between">
                    <span>
                      {vatEnabled && vatRate
                        ? t('receipt.totals.vat_rate', { rate: vatRate })
                        : t('receipt.totals.vat')}
                    </span>
                    <span style={{ color: '#f59e0b' }}>{formatCurrency(taxAmount)}</span>
                  </div>
                )}

                <div className="flex-between">
                  <span>{t('receipt.totals.total')}</span>
                  <span style={{ fontWeight: 'bold', fontSize: '18px' }}>
                    {formatCurrency(totalAmount)}
                  </span>
                </div>

                {paidAmount > 0 && (
                  <>
                    <div className="flex-between" style={{ fontSize: '14px', color: '#059669' }}>
                      <span>{t('receipt.totals.paid')}</span>
                      <span>{formatCurrency(paidAmount)}</span>
                    </div>
                    <div className="flex-between" style={{ fontSize: '14px' }}>
                      <span>{t('receipt.totals.balance_due')}</span>
                      <span style={{ color: totalAmount - paidAmount > 0 ? '#dc2626' : '#059669' }}>
                        {formatCurrency(Math.max(0, totalAmount - paidAmount))}
                      </span>
                    </div>
                  </>
                )}

                <div className="flex-between" style={{ fontSize: '14px', color: '#6b7280' }}>
                  <span>{t('receipt.totals.payment_status')}</span>
                  <span>{t('status.' + (order.payment_status || 'unpaid'))}</span>
                </div>
              </>
            )}
          </div>

          <hr />

          <div className="receipt-footer">
            {isCancelled ? (
              <>
                <p style={{ textAlign: 'center', fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                  {t('receipt.footer.cancelled_line1')}
                </p>
                <p style={{ textAlign: 'center', fontSize: '10px', color: '#6b7280' }}>
                  {t('receipt.footer.cancelled_line2')}
                </p>
              </>
            ) : (
              <>
                <p style={{ textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>
                  {t('receipt.footer.thanks')}
                </p>
                <p style={{ textAlign: 'center', fontSize: '10px', color: '#6b7280' }}>
                  {t('receipt.footer.return_policy')}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="receipt-actions">
        <button onClick={handlePrint} className="btn btn-primary">
          <FiPrinter size={16} /> {t('receipt.buttons.print')}
        </button>
        <button onClick={handleDownload} className="btn btn-success">
          <FiDownload size={16} /> {t('receipt.buttons.download')}
        </button>
        <button onClick={onClose} className="btn btn-secondary">
          {t('receipt.buttons.close')}
        </button>
      </div>
    </div>
  );
};

export default Receipt;