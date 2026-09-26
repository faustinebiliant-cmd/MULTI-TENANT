// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Stock Adjustment
// ============================================================

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX } from 'react-icons/fi';
import api from '../../api/client';
import toast from 'react-hot-toast';

const StockAdjustment = ({ product, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [type, setType] = useState('add');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!quantity || quantity <= 0) {
      toast.error(t('products.stock.messages.invalid_quantity'));
      return;
    }

    if (!reason.trim()) {
      toast.error(t('products.stock.messages.reason_required'));
      return;
    }

    setLoading(true);

    try {
      await api.adjustStock(product.id, {
        quantity: parseInt(quantity),
        reason: reason.trim(),
        type
      });

      toast.success(type === 'add' ? t('products.stock.messages.added') : t('products.stock.messages.removed'));
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error(error.response?.data?.error || t('products.stock.messages.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex-between" style={{ marginBottom: '16px' }}>
          <h2>{t('products.stock.title')}</h2>
          <button onClick={onClose} className="btn btn-sm btn-secondary" aria-label={t('common.close')}>
            <FiX size={18} />
          </button>
        </div>

        <div className="product-info" style={{
          marginBottom: '16px',
          padding: '12px',
          background: '#f8fafc',
          borderRadius: '8px'
        }}>
          <p><strong>{t('products.stock.product_label')}</strong> {product.name}</p>
          <p>
            <strong>{t('products.stock.current_stock_label')}</strong>{' '}
            {t('products.stock.units', { count: product.stock_quantity })}
          </p>
          <p>
            <strong>{t('products.stock.threshold_label')}</strong>{' '}
            {t('products.stock.units', { count: product.low_stock_threshold || 5 })}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('products.stock.type_label')}</label>
            <div className="flex" style={{ gap: '10px' }}>
              <button
                type="button"
                className={`btn ${type === 'add' ? 'btn-success' : 'btn-secondary'}`}
                onClick={() => setType('add')}
                style={{ flex: 1 }}
              >
                {t('products.stock.type_add')}
              </button>
              <button
                type="button"
                className={`btn ${type === 'remove' ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => setType('remove')}
                style={{ flex: 1 }}
              >
                {t('products.stock.type_remove')}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>{t('products.stock.quantity_label')}</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              min="1"
              className="form-control"
              required
            />
          </div>

          <div className="form-group">
            <label>{t('products.stock.reason_label')}</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('products.stock.reason_placeholder')}
              className="form-control"
              required
            />
          </div>

          <div className="flex" style={{ gap: '10px', marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading
                ? t('products.stock.processing')
                : (type === 'add' ? t('products.stock.confirm_add') : t('products.stock.confirm_remove'))}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t('products.stock.cancel_button')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockAdjustment;