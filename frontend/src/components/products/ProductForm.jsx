// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Product Form
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { FALLBACK_PRODUCT_CATEGORIES } from '../../utils/constants';
import toast from 'react-hot-toast';

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
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
        } else {
          setCategories(FALLBACK_PRODUCT_CATEGORIES.map(name => ({ id: name, name })));
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories(FALLBACK_PRODUCT_CATEGORIES.map(name => ({ id: name, name })));
      }
    };
    fetchCategories();
  }, []);

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
        toast.error('Failed to load product');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [isEdit, id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    if (!formData.cost_price || parseFloat(formData.cost_price) <= 0) {
      toast.error('Please enter a valid cost price');
      return;
    }
    if (!formData.selling_price || parseFloat(formData.selling_price) <= 0) {
      toast.error('Please enter a valid selling price');
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
        toast.success('Product updated successfully');
      } else {
        await api.createProduct(productData);
        toast.success('Product added successfully');
      }

      navigate('/products');
    } catch (error) {
      console.error('Error saving product:', error);
      const errorMessage = error.response?.data?.error || 'Failed to save product';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Loading product...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>{isEdit ? 'Edit Product' : 'Add Product'}</h1>
        <p>Fill in the product details below</p>
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Product Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Cable 2.5mm"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Product description..."
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Category</label>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Cost Price (TZS) *</label>
              <input
                type="number"
                name="cost_price"
                value={formData.cost_price}
                onChange={handleChange}
                placeholder="0"
                required
                min="0"
                step="100"
              />
            </div>
            <div className="form-group">
              <label>Selling Price (TZS) *</label>
              <input
                type="number"
                name="selling_price"
                value={formData.selling_price}
                onChange={handleChange}
                placeholder="0"
                required
                min="0"
                step="100"
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Stock Quantity</label>
              <input
                type="number"
                name="stock_quantity"
                value={formData.stock_quantity}
                onChange={handleChange}
                placeholder="0"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Low Stock Threshold</label>
              <input
                type="number"
                name="low_stock_threshold"
                value={formData.low_stock_threshold}
                onChange={handleChange}
                placeholder="5"
                min="0"
              />
            </div>
          </div>

          <div className="flex" style={{ gap: '10px', marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (isEdit ? 'Update Product' : 'Add Product')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/products')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;