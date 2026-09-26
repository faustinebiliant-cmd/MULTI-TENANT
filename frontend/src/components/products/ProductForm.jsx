// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Product Form
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import toast from 'react-hot-toast';

const ProductForm = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [noCategories, setNoCategories] = useState(false);
  const [nameConflict, setNameConflict] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    cost_price: '',
    selling_price: '',
    stock_quantity: '',
    low_stock_threshold: '5'
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.getCategories();
        if (response && response.length > 0) {
          setCategories(response);
          setNoCategories(false);
        } else {
          setCategories([]);
          setNoCategories(true);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories([]);
        setNoCategories(true);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (isEdit) return;
    const name = formData.name.trim();
    if (!name || name.length < 2) {
      setNameConflict(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('limit', '5');
        params.set('search', name);
        const response = await api.getProductsPage(params.toString());
        const list = response.data || [];
        const match = list.find(p => p.name.toLowerCase() === name.toLowerCase());
        setNameConflict(match || null);
      } catch (err) {
        setNameConflict(null);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.name, isEdit]);

  useEffect(() => {
    if (!isEdit || !id) return;

    const fetchProduct = async () => {
      try {
        setLoading(true);
        const product = await api.getProduct(id);
        setFormData({
          name: product.name || '',
          description: product.description || '',
          category_id: product.category_id || '',
          cost_price: product.cost_price || '',
          selling_price: product.selling_price || '',
          stock_quantity: product.stock_quantity || '',
          low_stock_threshold: product.low_stock_threshold || '5'
        });
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error(t('products.form.messages.load_failed'));
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [isEdit, id, t]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error(t('products.form.messages.name_required'));
      return;
    }
    if (!formData.cost_price || parseFloat(formData.cost_price) <= 0) {
      toast.error(t('products.form.messages.cost_required'));
      return;
    }
    if (!formData.selling_price || parseFloat(formData.selling_price) <= 0) {
      toast.error(t('products.form.messages.selling_required'));
      return;
    }

    setLoading(true);

    try {
      const productData = {
        name: formData.name.trim(),
        description: formData.description ? formData.description.trim() : '',
        cost_price: parseFloat(formData.cost_price),
        selling_price: parseFloat(formData.selling_price),
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        low_stock_threshold: parseInt(formData.low_stock_threshold) || 5
      };

      if (formData.category_id && formData.category_id !== '') {
        productData.category_id = formData.category_id;
      }

      if (isEdit) {
        await api.updateProduct(id, productData);
        toast.success(t('products.form.messages.updated'));
      } else {
        await api.createProduct(productData);
        toast.success(t('products.form.messages.added'));
      }

      navigate('/products');
    } catch (error) {
      console.error('Error saving product:', error);
      const errorMessage = error.response?.data?.error || t('products.form.messages.save_failed');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>{t('products.form.loading')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>{isEdit ? t('products.form.title_edit') : t('products.form.title_add')}</h1>
        <p>{isEdit ? t('products.form.subtitle_edit') : t('products.form.subtitle_add')}</p>
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('products.form.labels.name')}</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={t('products.form.placeholders.name')}
              required
              style={nameConflict ? { borderColor: '#ef4444' } : undefined}
            />
            {nameConflict && (
              <small style={{ color: '#dc2626', display: 'block', marginTop: '4px' }}>
                {t('products.form.name_conflict', { name: nameConflict.name })}
              </small>
            )}
          </div>

          <div className="form-group">
            <label>{t('products.form.labels.description')}</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder={t('products.form.placeholders.description')}
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>{t('products.form.labels.category')}</label>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              disabled={noCategories}
            >
              {noCategories ? (
                <option value="">{t('products.form.no_categories')}</option>
              ) : (
                <>
                  <option value="">{t('products.form.category_select')}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </>
              )}
            </select>
            {noCategories && (
              <small style={{ color: '#b45309', display: 'block', marginTop: '4px' }}>
                {t('products.form.no_categories_hint')}
              </small>
            )}
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>{t('products.form.labels.cost_price')}</label>
              <input
                type="number"
                name="cost_price"
                value={formData.cost_price}
                onChange={handleChange}
                placeholder={t('products.form.placeholders.cost_price')}
                required
                min="0"
                step="100"
              />
            </div>
            <div className="form-group">
              <label>{t('products.form.labels.selling_price')}</label>
              <input
                type="number"
                name="selling_price"
                value={formData.selling_price}
                onChange={handleChange}
                placeholder={t('products.form.placeholders.selling_price')}
                required
                min="0"
                step="100"
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>{t('products.form.labels.stock_quantity')}</label>
              <input
                type="number"
                name="stock_quantity"
                value={formData.stock_quantity}
                onChange={handleChange}
                placeholder={t('products.form.placeholders.stock_quantity')}
                min="0"
              />
            </div>
            <div className="form-group">
              <label>{t('products.form.labels.low_stock_threshold')}</label>
              <input
                type="number"
                name="low_stock_threshold"
                value={formData.low_stock_threshold}
                onChange={handleChange}
                placeholder={t('products.form.placeholders.low_stock_threshold')}
                min="0"
              />
            </div>
          </div>

          <div className="flex" style={{ gap: '10px', marginTop: '20px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || (!isEdit && nameConflict) || noCategories}
            >
              {loading
                ? t('products.form.buttons.saving')
                : (isEdit ? t('products.form.buttons.submit_edit') : t('products.form.buttons.submit_add'))}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/products')}>
              {t('products.form.buttons.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;