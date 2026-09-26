// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Product Detail
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiEdit2, FiArrowLeft, FiTrash2 } from 'react-icons/fi';
import api from '../../api/client';
import { formatCurrency } from '../../utils/helpers';
import Loader from '../common/Loader';
import ConfirmDialog from '../common/ConfirmDialog';
import StockAdjustment from './StockAdjustment';
import toast from 'react-hot-toast';

const ProductDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
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
      toast.error(t('products.detail.messages.not_found'));
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await api.deleteProduct(id);
      toast.success(t('products.detail.messages.deleted'));
      navigate('/products');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error(error.response?.data?.error || t('products.detail.messages.delete_failed'));
      setDeleting(false);
      setShowDelete(false);
    }
  };

  if (loading) return <Loader message={t('products.detail.loading')} />;

  if (!product) {
    return (
      <div className="empty-state">
        <h3>{t('products.detail.not_found')}</h3>
        <button onClick={() => navigate('/products')} className="btn btn-primary">
          {t('products.detail.back_to_products')}
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
            <FiArrowLeft size={16} /> {t('products.detail.back')}
          </button>
          <h1>{product.name}</h1>
          <p>{product.description || t('products.detail.no_description')}</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>{t('products.detail.details_title')}</h3>
          <div className="detail-row">
            <span className="detail-label">{t('products.detail.labels.name')}</span>
            <span className="detail-value">{product.name}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('products.detail.labels.description')}</span>
            <span className="detail-value">{product.description || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('products.detail.labels.category')}</span>
            <span className="detail-value">{product.category_name || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('products.detail.labels.sku')}</span>
            <span className="detail-value">{product.sku || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('products.detail.labels.supplier')}</span>
            <span className="detail-value">{product.supplier_name || '-'}</span>
          </div>
        </div>

        <div className="card">
          <h3>{t('products.detail.pricing_title')}</h3>
          <div className="detail-row">
            <span className="detail-label">{t('products.detail.labels.cost_price')}</span>
            <span className="detail-value">{formatCurrency(product.cost_price)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('products.detail.labels.selling_price')}</span>
            <span className="detail-value">{formatCurrency(product.selling_price)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('products.detail.labels.profit_margin')}</span>
            <span className="detail-value" style={{ color: '#10b981' }}>
              {formatCurrency(product.selling_price - product.cost_price)}
            </span>
          </div>
        </div>

        <div className="card">
          <h3>{t('products.detail.inventory_title')}</h3>
          <div className="detail-row">
            <span className="detail-label">{t('products.detail.labels.current_stock')}</span>
            <span className="detail-value">
              <span className={isLowStock ? 'badge badge-danger' : 'badge badge-success'}>
                {t('products.detail.units', { count: product.stock_quantity })}
              </span>
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('products.detail.labels.low_stock_threshold')}</span>
            <span className="detail-value">
              {t('products.detail.units', { count: product.low_stock_threshold || 5 })}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('products.detail.labels.status')}</span>
            <span className="detail-value">
              {isLowStock ? (
                <span className="badge badge-danger">{t('products.detail.badge_low_stock')}</span>
              ) : (
                <span className="badge badge-success">{t('products.detail.badge_in_stock')}</span>
              )}
            </span>
          </div>
        </div>

        <div className="card">
          <h3>{t('products.detail.actions_title')}</h3>
          <div className="flex" style={{ gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowStockAdjustment(true)}
              className="btn btn-secondary"
            >
              {t('products.detail.adjust_stock_button')}
            </button>
            <Link to={`/products/${id}/edit`} className="btn btn-primary">
              <FiEdit2 size={18} /> {t('products.detail.edit_button')}
            </Link>
            <button
              onClick={() => setShowDelete(true)}
              className="btn btn-danger"
            >
              <FiTrash2 size={18} /> {t('products.detail.delete_button')}
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

      <ConfirmDialog
        open={showDelete}
        title={t('products.detail.delete_confirm_title')}
        message={t('products.detail.delete_confirm_message', { name: product.name })}
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

export default ProductDetail;