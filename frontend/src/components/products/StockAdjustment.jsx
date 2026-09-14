// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Stock Adjustment Modal
// ============================================================

import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';
import api from '../../api/client';
import toast from 'react-hot-toast';

const StockAdjustment = ({ product, onClose, onSuccess }) => {
  const [type, setType] = useState('add');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!quantity || quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (!reason.trim()) {
      toast.error('Please enter a reason for adjustment');
      return;
    }

    setLoading(true);

    try {
      await api.adjustStock(product.id, {
        quantity: parseInt(quantity),
        reason: reason.trim(),
        type: type
      });

      toast.success(`Stock ${type === 'add' ? 'added' : 'removed'} successfully!`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error(error.response?.data?.error || 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex-between" style={{ marginBottom: '16px' }}>
          <h2>Adjust Stock</h2>
          <button onClick={onClose} className="btn btn-sm btn-secondary">
            <FiX size={18} />
          </button>
        </div>

        <div className="product-info" style={{ marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
          <p><strong>Product:</strong> {product.name}</p>
          <p><strong>Current Stock:</strong> {product.stock_quantity} units</p>
          <p><strong>Low Stock Threshold:</strong> {product.low_stock_threshold || 5} units</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Adjustment Type *</label>
            <div className="flex" style={{ gap: '10px' }}>
              <button
                type="button"
                className={`btn ${type === 'add' ? 'btn-success' : 'btn-secondary'}`}
                onClick={() => setType('add')}
                style={{ flex: 1 }}
              >
                ➕ Add Stock
              </button>
              <button
                type="button"
                className={`btn ${type === 'remove' ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => setType('remove')}
                style={{ flex: 1 }}
              >
                ➖ Remove Stock
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Quantity *</label>
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
            <label>Reason *</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., New shipment received, Damaged items, Return from customer"
              className="form-control"
              required
            />
          </div>

          <div className="flex" style={{ gap: '10px', marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Processing...' : `Confirm ${type === 'add' ? 'Add' : 'Remove'}`}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockAdjustment;