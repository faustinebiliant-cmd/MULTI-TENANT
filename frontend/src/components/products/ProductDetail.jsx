// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Product Detail
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiEdit, FiArrowLeft, FiTrash2 } from 'react-icons/fi';
import api from '../../api/client';
import { formatCurrency } from '../../utils/helpers';
import Loader from '../common/Loader';
import toast from 'react-hot-toast';
import StockAdjustment from './StockAdjustment';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showStockAdjustment, setShowStockAdjustment] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const data = await api.getProduct(id);
      setProduct(data);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Product not found');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${product?.name}"?`)) return;

    setDeleting(true);
    try {
      await api.deleteProduct(id);
      toast.success(`"${product.name}" deleted successfully!`);
      navigate('/products');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error(error.response?.data?.error || 'Failed to delete product');
      setDeleting(false);
    }
  };

  if (loading) {
    return <Loader message="Loading product..." />;
  }

  if (!product) {
    return (
      <div className="empty-state">
        <h3>Product not found</h3>
        <button onClick={() => navigate('/products')} className="btn btn-primary">
          Back to Products
        </button>
      </div>
    );
  }

  const isLowStock = product.stock_quantity <= product.low_stock_threshold;

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <button onClick={() => navigate('/products')} className="btn btn-sm btn-secondary">
            <FiArrowLeft size={16} /> Back
          </button>
          <h1>{product.name}</h1>
          <p>{product.description || 'No description provided'}</p>
        </div>
        {/* ✅ NO Edit/Delete buttons in header */}
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Product Details</h3>
          <div className="detail-row">
            <span className="detail-label">Name</span>
            <span className="detail-value">{product.name}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Description</span>
            <span className="detail-value">{product.description || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Category</span>
            <span className="detail-value">{product.category_name || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">SKU</span>
            <span className="detail-value">{product.sku || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Supplier</span>
            <span className="detail-value">{product.supplier_name || '-'}</span>
          </div>
        </div>

        <div className="card">
          <h3>Pricing</h3>
          <div className="detail-row">
            <span className="detail-label">Cost Price</span>
            <span className="detail-value">{formatCurrency(product.cost_price)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Selling Price</span>
            <span className="detail-value">{formatCurrency(product.selling_price)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Profit Margin</span>
            <span className="detail-value" style={{ color: '#10b981' }}>
              {formatCurrency(product.selling_price - product.cost_price)}
            </span>
          </div>
        </div>

        <div className="card">
          <h3>Inventory</h3>
          <div className="detail-row">
            <span className="detail-label">Current Stock</span>
            <span className="detail-value">
              <span className={isLowStock ? 'badge badge-danger' : 'badge badge-success'}>
                {product.stock_quantity} units
              </span>
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Low Stock Threshold</span>
            <span className="detail-value">{product.low_stock_threshold || 5} units</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Status</span>
            <span className="detail-value">
              {isLowStock ? (
                <span className="badge badge-danger">⚠️ Low Stock</span>
              ) : (
                <span className="badge badge-success">✅ In Stock</span>
              )}
            </span>
          </div>
        </div>

        <div className="card">
          <h3>Actions</h3>
          <div className="flex" style={{ gap: '10px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setShowStockAdjustment(true)} 
              className="btn btn-secondary"
            >
              📦 Adjust Stock
            </button>
            <Link to={`/products/${id}/edit`} className="btn btn-primary">
              <FiEdit size={18} /> Edit Product
            </Link>
            <button 
              onClick={handleDelete} 
              className="btn btn-danger"
              disabled={deleting}
            >
              <FiTrash2 size={18} /> {deleting ? 'Deleting...' : 'Delete Product'}
            </button>
          </div>
        </div>
      </div>

      {showStockAdjustment && (
        <StockAdjustment
          product={product}
          onClose={() => setShowStockAdjustment(false)}
          onSuccess={fetchProduct}
        />
      )}
    </div>
  );
};

export default ProductDetail;