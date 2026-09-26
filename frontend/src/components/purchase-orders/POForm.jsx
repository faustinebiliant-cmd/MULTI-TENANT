// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Purchase Order Form
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import api from '../../api/client';
import { formatCurrency } from '../../utils/helpers';
import SearchableSelect from '../common/SearchableSelect';
import toast from 'react-hot-toast';

const POForm = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);

  const [po, setPo] = useState({
    supplier_id: '',
    items: [],
    notes: ''
  });

  const [lastPickedProduct, setLastPickedProduct] = useState(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const fetchSupplierOptions = useCallback(async (term) => {
    const params = new URLSearchParams();
    params.set('page', '1');
    params.set('limit', '20');
    if (term && term.trim()) params.set('search', term.trim());
    const response = await api.getSuppliersPage(params.toString());
    return response.data || [];
  }, []);

  const fetchProductOptions = useCallback(async (term) => {
    const params = new URLSearchParams();
    params.set('page', '1');
    params.set('limit', '20');
    if (term && term.trim()) params.set('search', term.trim());
    const response = await api.getProductsPage(params.toString());
    return response.data || [];
  }, []);

  useEffect(() => {
    if (!isEdit || !id) return;

    const fetchPO = async () => {
      try {
        setLoading(true);
        const data = await api.getPurchaseOrder(id);

        setPo({
          supplier_id: data.supplier_id || '',
          items: data.purchase_order_items?.map(item => ({
            product_id: item.product_id,
            name: item.product_name || 'Product',
            quantity: item.quantity,
            cost_price: item.cost_price,
            subtotal: item.subtotal
          })) || [],
          notes: data.notes || ''
        });
      } catch (error) {
        console.error('Error fetching PO:', error);
        toast.error(t('purchase_orders.form.messages.load_failed'));
        navigate('/purchase-orders');
      } finally {
        setLoading(false);
      }
    };
    fetchPO();
  }, [isEdit, id, navigate, t]);

  const handleProductSelect = (productId, product) => {
    setLastPickedProduct(product || null);
  };

  const addItem = () => {
    if (!lastPickedProduct) {
      toast.error(t('orders.form.messages.select_product'));
      return;
    }

    const product = lastPickedProduct;
    const existingItem = po.items.find(item => item.product_id === product.id);

    if (existingItem) {
      setPo({
        ...po,
        items: po.items.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + selectedQuantity }
            : item
        )
      });
    } else {
      setPo({
        ...po,
        items: [
          ...po.items,
          {
            product_id: product.id,
            name: product.name,
            quantity: selectedQuantity,
            cost_price: product.cost_price || 0,
            subtotal: (product.cost_price || 0) * selectedQuantity
          }
        ]
      });
    }

    setLastPickedProduct(null);
    setSelectedQuantity(1);
    toast.success(t('purchase_orders.form.messages.added'));
  };

  const removeItem = (index) => {
    setPo({ ...po, items: po.items.filter((_, i) => i !== index) });
  };

  const updateQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;
    const updatedItems = [...po.items];
    updatedItems[index].quantity = newQuantity;
    updatedItems[index].subtotal = updatedItems[index].cost_price * newQuantity;
    setPo({ ...po, items: updatedItems });
  };

  const calculateTotal = () => {
    return po.items.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!po.supplier_id) {
      toast.error(t('purchase_orders.form.messages.supplier_required'));
      return;
    }

    if (po.items.length === 0) {
      toast.error(t('purchase_orders.form.messages.add_one_item'));
      return;
    }

    setLoading(true);

    try {
      const poData = {
        supplier_id: po.supplier_id,
        items: po.items.map(item => ({
          product_id: item.product_id,
          name: item.name,
          quantity: item.quantity,
          cost_price: item.cost_price
        })),
        notes: po.notes || ''
      };

      if (isEdit) {
        await api.updatePurchaseOrder(id, poData);
        toast.success(t('purchase_orders.form.messages.updated'));
      } else {
        await api.createPurchaseOrder(poData);
        toast.success(t('purchase_orders.form.messages.created'));
      }

      navigate('/purchase-orders');
    } catch (error) {
      console.error('Error saving PO:', error);
      toast.error(error.response?.data?.error || t('purchase_orders.form.messages.save_failed'));
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>{t('purchase_orders.form.loading')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>{isEdit ? t('purchase_orders.form.title_edit') : t('purchase_orders.form.title_add')}</h1>
        <p>{isEdit ? t('purchase_orders.form.subtitle_edit') : t('purchase_orders.form.subtitle_add')}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="form-group">
            <label>{t('purchase_orders.form.labels.supplier')}</label>
            <SearchableSelect
              value={po.supplier_id}
              onChange={(supplierId) => setPo({ ...po, supplier_id: supplierId })}
              placeholder={t('purchase_orders.form.supplier_search_placeholder')}
              searchPlaceholder={t('purchase_orders.form.supplier_search_hint')}
              fetchOptions={fetchSupplierOptions}
              getOptionLabel={(s) => s.name}
              getOptionValue={(s) => s.id}
              getOptionMeta={(s) => s.phone || s.email || ''}
              required
            />
          </div>

          <div className="form-group">
            <label>{t('purchase_orders.form.labels.add_products')}</label>
            <div className="flex" style={{ gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ flex: 2, minWidth: '240px' }}>
                <SearchableSelect
                  value={lastPickedProduct?.id || ''}
                  onChange={handleProductSelect}
                  placeholder={t('purchase_orders.form.product_search_placeholder')}
                  searchPlaceholder={t('purchase_orders.form.product_search_hint')}
                  fetchOptions={fetchProductOptions}
                  getOptionLabel={(p) => p.name}
                  getOptionValue={(p) => p.id}
                  getOptionMeta={(p) => `Stock: ${p.stock_quantity} | Cost: ${formatCurrency(p.cost_price)}`}
                />
              </div>
              <input
                type="number"
                value={selectedQuantity}
                onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 1)}
                min="1"
                style={{ width: '80px' }}
                className="form-control"
              />
              <button type="button" onClick={addItem} className="btn btn-primary">
                <FiPlus size={18} /> {t('purchase_orders.form.product_add_button')}
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>{t('purchase_orders.form.order_items_title')}</h3>
          {po.items.length === 0 ? (
            <div className="empty-state">
              <p>{t('purchase_orders.form.no_items')}</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>{t('purchase_orders.form.item_columns.product')}</th>
                    <th>{t('purchase_orders.form.item_columns.quantity')}</th>
                    <th>{t('purchase_orders.form.item_columns.cost_price')}</th>
                    <th>{t('purchase_orders.form.item_columns.subtotal')}</th>
                    <th>{t('purchase_orders.form.item_columns.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {po.items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.name}</td>
                      <td>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                          min="1"
                          style={{ width: '70px' }}
                          className="form-control"
                        />
                      </td>
                      <td>{formatCurrency(item.cost_price)}</td>
                      <td>{formatCurrency(item.subtotal)}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="btn btn-sm btn-danger"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex-between" style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '2px solid #e5e7eb'
          }}>
            <h3>{t('purchase_orders.form.totals.total')}</h3>
            <h3 style={{ color: '#1a56db' }}>{formatCurrency(calculateTotal())}</h3>
          </div>
        </div>

        <div className="card">
          <div className="form-group">
            <label>{t('purchase_orders.form.labels.notes')}</label>
            <textarea
              value={po.notes}
              onChange={(e) => setPo({ ...po, notes: e.target.value })}
              placeholder={t('purchase_orders.form.notes_placeholder')}
              rows="2"
              className="form-control"
            />
          </div>

          <div className="flex" style={{ gap: '10px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading
                ? t('purchase_orders.form.buttons.saving')
                : (isEdit
                  ? t('purchase_orders.form.buttons.submit_edit')
                  : t('purchase_orders.form.buttons.submit_add'))}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/purchase-orders')}
            >
              {t('purchase_orders.form.buttons.cancel')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default POForm;