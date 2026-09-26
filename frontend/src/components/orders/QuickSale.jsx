// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Quick Sale
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FiPlus, FiTrash2, FiUser, FiPhone,
  FiDollarSign, FiSmartphone, FiCheck, FiShoppingCart
} from 'react-icons/fi';
import api from '../../api/client';
import { formatCurrency } from '../../utils/helpers';
import { useShop } from '../../contexts/ShopContext';
import SearchableSelect from '../common/SearchableSelect';
import Receipt from './Receipt';
import toast from 'react-hot-toast';

const QUICK_SALE_ROLES = ['boss', 'manager', 'cashier'];

const PAYMENT_METHODS = [
  { value: 'cash', labelKey: 'quick_sale.methods.cash', icon: FiDollarSign },
  { value: 'mpesa', labelKey: 'quick_sale.methods.mpesa', icon: FiSmartphone },
  { value: 'tigo_pesa', labelKey: 'quick_sale.methods.tigo_pesa', icon: FiSmartphone }
];

const QuickSale = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { quickSaleEnabled, vatEnabled, vatRate } = useShop();

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const roleAllowed = QUICK_SALE_ROLES.includes(currentUser.role);

  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [saveCustomer, setSaveCustomer] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [lastPickedProduct, setLastPickedProduct] = useState(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = vatEnabled ? subtotal * (vatRate / 100) : 0;
  const total = subtotal + tax;

  const fetchProductOptions = useCallback(async (term) => {
    const params = new URLSearchParams();
    params.set('page', '1');
    params.set('limit', '20');
    if (term && term.trim()) params.set('search', term.trim());
    const response = await api.getProductsPage(params.toString());
    return response.data || [];
  }, []);

  const handleProductSelect = (productId, product) => {
    setLastPickedProduct(product || null);
  };

  const addItem = () => {
    if (!lastPickedProduct) {
      toast.error(t('quick_sale.messages.select_product'));
      return;
    }

    const product = lastPickedProduct;
    const existing = cart.find((item) => item.product_id === product.id);

    if (existing) {
      setCart(cart.map((item) =>
        item.product_id === product.id
          ? {
              ...item,
              quantity: item.quantity + selectedQuantity,
              subtotal: item.unit_price * (item.quantity + selectedQuantity)
            }
          : item
      ));
    } else {
      setCart([
        ...cart,
        {
          product_id: product.id,
          name: product.name,
          quantity: selectedQuantity,
          unit_price: parseFloat(product.selling_price) || 0,
          cost_price: parseFloat(product.cost_price) || 0,
          subtotal: (parseFloat(product.selling_price) || 0) * selectedQuantity
        }
      ]);
    }

    setLastPickedProduct(null);
    setSelectedQuantity(1);
  };

  const removeItem = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const updateQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;
    const updated = [...cart];
    updated[index].quantity = newQuantity;
    updated[index].subtotal = updated[index].unit_price * newQuantity;
    setCart(updated);
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      toast.error(t('quick_sale.messages.add_one_item'));
      return;
    }

    if (paymentMethod !== 'cash' && !reference.trim()) {
      toast.error(t('quick_sale.messages.reference_required'));
      return;
    }

    if (saveCustomer) {
      if (!customerName.trim()) {
        toast.error(t('quick_sale.messages.customer_name_required'));
        return;
      }
      if (!customerPhone.trim()) {
        toast.error(t('quick_sale.messages.customer_phone_required'));
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        items: cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity
        })),
        payment: {
          method: paymentMethod,
          amount: total,
          reference_number: paymentMethod === 'cash' ? null : reference.trim()
        },
        notes: notes.trim() || ''
      };

      if (saveCustomer) {
        payload.new_customer = {
          name: customerName.trim(),
          phone: customerPhone.trim()
        };
      }

      const response = await api.createQuickSale(payload);

      const orderForReceipt = {
        ...response.data,
        customer: saveCustomer ? customerName.trim() : t('orders.list.walk_in'),
        items: cart.map((item) => ({
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal
        })),
        payment_method: paymentMethod
      };

      resetForm();
      setReceiptOrder(orderForReceipt);
      toast.success(t('quick_sale.messages.sale_completed'));

    } catch (error) {
      console.error('Quick sale error:', error);
      toast.error(error.response?.data?.error || t('quick_sale.messages.sale_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCart([]);
    setPaymentMethod('cash');
    setReference('');
    setSaveCustomer(false);
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
    setLastPickedProduct(null);
    setSelectedQuantity(1);
  };

  const handleCloseReceipt = () => {
    setReceiptOrder(null);
  };

  const roleBlocked = !roleAllowed;

  useEffect(() => {
    if (roleBlocked) {
      toast.error(t('quick_sale.messages.role_blocked'));
    }
  }, [roleBlocked, t]);

  if (roleBlocked) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!quickSaleEnabled) {
    return (
      <div className="card" style={{ maxWidth: '500px', margin: '40px auto' }}>
        <h3 style={{ marginTop: 0 }}>{t('quick_sale.disabled_title')}</h3>
        <p style={{ color: 'var(--gray)' }}>
          {t('quick_sale.disabled_message')}
        </p>
        <button onClick={() => navigate('/orders/new')} className="btn btn-primary">
          {t('quick_sale.go_to_new_order')}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t('quick_sale.title')}</h1>
          <p>{t('quick_sale.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="btn btn-secondary"
        >
          {t('quick_sale.cancel_button')}
        </button>
      </div>

      <div className="grid-2">
        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>{t('quick_sale.add_product_label')}</label>
              <div className="flex" style={{ gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ flex: 2, minWidth: '200px' }}>
                  <SearchableSelect
                    value={lastPickedProduct?.id || ''}
                    onChange={handleProductSelect}
                    placeholder={t('quick_sale.product_search_placeholder')}
                    searchPlaceholder={t('quick_sale.product_search_hint')}
                    fetchOptions={fetchProductOptions}
                    getOptionLabel={(p) => p.name}
                    getOptionValue={(p) => p.id}
                    getOptionMeta={(p) => `Stock: ${p.stock_quantity} · ${formatCurrency(p.selling_price)}`}
                  />
                </div>
                <input
                  type="number"
                  value={selectedQuantity}
                  onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 1)}
                  min="1"
                  className="form-control"
                  style={{ width: '80px' }}
                />
                <button
                  type="button"
                  onClick={addItem}
                  className="btn btn-primary"
                >
                  <FiPlus size={18} /> {t('quick_sale.add_button')}
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex-between" style={{ marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>{t('quick_sale.cart_title')}</h3>
              {cart.length > 0 && (
                <span className="badge badge-info">
                  {t('quick_sale.cart_items_badge', { count: cart.length })}
                </span>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 12px' }}>
                <FiShoppingCart size={28} />
                <p style={{ margin: '8px 0 0' }}>{t('quick_sale.cart_empty')}</p>
                <span>{t('quick_sale.cart_empty_hint')}</span>
              </div>
            ) : (
              <div className="table-container">
                <table className="cart-table">
                  <thead>
                    <tr>
                      <th>{t('quick_sale.cart_columns.product')}</th>
                      <th>{t('quick_sale.cart_columns.qty')}</th>
                      <th>{t('quick_sale.cart_columns.price')}</th>
                      <th>{t('quick_sale.cart_columns.subtotal')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item, index) => (
                      <tr key={item.product_id}>
                        <td style={{ fontWeight: 500 }}>{item.name}</td>
                        <td>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                            min="1"
                            className="form-control"
                            style={{ width: '70px' }}
                          />
                        </td>
                        <td>{formatCurrency(item.unit_price)}</td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(item.subtotal)}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="btn btn-sm btn-danger"
                            title="Remove"
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
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0 }}>{t('quick_sale.payment_title')}</h3>

            <div className="form-group">
              <label>{t('quick_sale.method_label')}</label>
              <div className="payment-methods">
                {PAYMENT_METHODS.map((pm) => {
                  const Icon = pm.icon;
                  return (
                    <button
                      key={pm.value}
                      type="button"
                      className={`payment-method-btn ${paymentMethod === pm.value ? 'active' : ''}`}
                      onClick={() => setPaymentMethod(pm.value)}
                    >
                      <Icon size={18} />
                      {t(pm.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>

            {paymentMethod !== 'cash' && (
              <div className="form-group">
                <label>{t('quick_sale.reference_label')}</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder={t('quick_sale.reference_placeholder')}
                  maxLength={50}
                />
              </div>
            )}
          </div>

          <div className="card" style={{ marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0 }}>{t('quick_sale.customer_title')}</h3>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={saveCustomer}
                  onChange={(e) => setSaveCustomer(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span>{t('quick_sale.save_customer')}</span>
              </label>
              <small style={{ color: 'var(--gray)', display: 'block', marginTop: '4px' }}>
                {t('quick_sale.save_customer_hint')}
              </small>
            </div>

            {saveCustomer && (
              <>
                <div className="form-group">
                  <label><FiUser size={13} /> {t('quick_sale.customer_name_label')}</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={t('quick_sale.customer_name_placeholder')}
                    maxLength={20}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label><FiPhone size={13} /> {t('quick_sale.customer_phone_label')}</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder={t('quick_sale.customer_phone_placeholder')}
                  />
                </div>
              </>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>{t('quick_sale.total_title')}</h3>

            <div className="detail-row">
              <span className="detail-label">{t('quick_sale.totals.subtotal')}</span>
              <span className="detail-value">{formatCurrency(subtotal)}</span>
            </div>

            {vatEnabled && (
              <div className="detail-row">
                <span className="detail-label">{t('quick_sale.totals.vat', { rate: vatRate })}</span>
                <span className="detail-value" style={{ color: '#f59e0b' }}>
                  {formatCurrency(tax)}
                </span>
              </div>
            )}

            <div className="detail-row" style={{ paddingTop: '14px', marginTop: '4px', borderTop: '2px solid var(--border)' }}>
              <span className="detail-label" style={{ fontWeight: 700, fontSize: '15px' }}>{t('quick_sale.totals.total')}</span>
              <span className="detail-value" style={{ fontWeight: 800, fontSize: '20px', color: 'var(--primary)' }}>
                {formatCurrency(total)}
              </span>
            </div>

            <div className="form-group" style={{ marginTop: '16px', marginBottom: 0 }}>
              <label>{t('quick_sale.notes_label')}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('quick_sale.notes_placeholder')}
                rows="2"
                maxLength={500}
              />
            </div>

            <button
              type="button"
              onClick={handleCompleteSale}
              className="btn btn-success btn-block"
              disabled={submitting || cart.length === 0}
              style={{ marginTop: '16px', padding: '14px', fontSize: '15px', fontWeight: 700 }}
            >
              <FiCheck size={18} />
              {submitting ? t('quick_sale.processing') : t('quick_sale.complete_button', { amount: formatCurrency(total) })}
            </button>
          </div>
        </div>
      </div>

      {receiptOrder && (
        <Receipt
          order={receiptOrder}
          onClose={handleCloseReceipt}
        />
      )}
    </div>
  );
};

export default QuickSale;