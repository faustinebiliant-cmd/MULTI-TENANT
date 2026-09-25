// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Quick Sale
// One-screen sale: cart, VAT, payment, optional customer.
// Role-gated to boss, manager, cashier.
// Only visible when quick_sale_enabled is true on the business.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  FiPlus, FiTrash2, FiUser, FiPhone, FiX,
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
  { value: 'cash', label: 'Cash', icon: FiDollarSign },
  { value: 'mpesa', label: 'M-Pesa', icon: FiSmartphone },
  { value: 'tigo_pesa', label: 'Tigo Pesa', icon: FiSmartphone }
];

const QuickSale = () => {
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

  // Compute totals from the cart
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = vatEnabled ? subtotal * (vatRate / 100) : 0;
  const total = subtotal + tax;

  // Product search — same pattern as OrderForm
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
      toast.error('Please select a product');
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
      toast.error('Add at least one product');
      return;
    }

    if (paymentMethod !== 'cash' && !reference.trim()) {
      toast.error('Reference number is required for mobile money');
      return;
    }

    if (saveCustomer) {
      if (!customerName.trim()) {
        toast.error('Customer name is required');
        return;
      }
      if (!customerPhone.trim()) {
        toast.error('Customer phone is required');
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

      // Build the receipt shape the Receipt component expects
      const orderForReceipt = {
        ...response.data,
        customer: saveCustomer ? customerName.trim() : 'Walk-in',
        items: cart.map((item) => ({
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal
        })),
        payment_method: paymentMethod
      };

      // Reset the form, then show the receipt
      resetForm();
      setReceiptOrder(orderForReceipt);
      toast.success('Sale completed');

    } catch (error) {
      console.error('Quick sale error:', error);
      toast.error(error.response?.data?.error || 'Failed to complete sale');
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

  // ---------- Guard rails ----------
  // Role check — hide the page from anyone who shouldn't be here.
  // The toast is inside a useEffect so it runs once per mount,
  // not once per render. React StrictMode double-renders in dev,
  // which would otherwise queue two identical toasts.
  const roleBlocked = !roleAllowed;

  useEffect(() => {
    if (roleBlocked) {
      toast.error('Your role cannot use Quick Sale');
    }
  }, [roleBlocked]);

  if (roleBlocked) {
    return <Navigate to="/dashboard" replace />;
  }

  // Setting check — the Boss may have turned it off after this user logged in
  if (!quickSaleEnabled) {
    return (
      <div className="card" style={{ maxWidth: '500px', margin: '40px auto' }}>
        <h3 style={{ marginTop: 0 }}>Quick Sale is disabled</h3>
        <p style={{ color: 'var(--gray)' }}>
          Your business owner has turned off Quick Sale. You can still create
          orders through the standard flow.
        </p>
        <button onClick={() => navigate('/orders/new')} className="btn btn-primary">
          Go to New Order
        </button>
      </div>
    );
  }

  // ---------- Render ----------
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Quick Sale</h1>
          <p>One screen. Sell, take payment, done.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="btn btn-secondary"
        >
          Cancel
        </button>
      </div>

      <div className="grid-2">
        {/* ---------- Left: product search + cart ---------- */}
        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Add Product</label>
              <div className="flex" style={{ gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ flex: 2, minWidth: '200px' }}>
                  <SearchableSelect
                    value={lastPickedProduct?.id || ''}
                    onChange={handleProductSelect}
                    placeholder="Search product by name or SKU..."
                    searchPlaceholder="Type to search..."
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
                  <FiPlus size={18} /> Add
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex-between" style={{ marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>Cart</h3>
              {cart.length > 0 && (
                <span className="badge badge-info">
                  {cart.length} item{cart.length === 1 ? '' : 's'}
                </span>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 12px' }}>
                <FiShoppingCart size={28} />
                <p style={{ margin: '8px 0 0' }}>No items yet</p>
                <span>Search above to add products</span>
              </div>
            ) : (
              <div className="table-container">
                <table className="cart-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Subtotal</th>
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

        {/* ---------- Right: payment + customer + total ---------- */}
        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0 }}>Payment</h3>

            <div className="form-group">
              <label>Method</label>
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
                      {pm.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {paymentMethod !== 'cash' && (
              <div className="form-group">
                <label>Reference Number *</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. 8HJK1234XY"
                  maxLength={50}
                />
              </div>
            )}
          </div>

          <div className="card" style={{ marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0 }}>Customer (optional)</h3>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={saveCustomer}
                  onChange={(e) => setSaveCustomer(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span>Save customer details</span>
              </label>
              <small style={{ color: 'var(--gray)', display: 'block', marginTop: '4px' }}>
                Leave unchecked for a walk-in sale.
              </small>
            </div>

            {saveCustomer && (
              <>
                <div className="form-group">
                  <label><FiUser size={13} /> Customer Name *</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. John Mwangi"
                    maxLength={20}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label><FiPhone size={13} /> Phone Number *</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0712 345 678"
                  />
                </div>
              </>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Total</h3>

            <div className="detail-row">
              <span className="detail-label">Subtotal</span>
              <span className="detail-value">{formatCurrency(subtotal)}</span>
            </div>

            {vatEnabled && (
              <div className="detail-row">
                <span className="detail-label">VAT ({vatRate}%)</span>
                <span className="detail-value" style={{ color: '#f59e0b' }}>
                  {formatCurrency(tax)}
                </span>
              </div>
            )}

            <div className="detail-row" style={{ paddingTop: '14px', marginTop: '4px', borderTop: '2px solid var(--border)' }}>
              <span className="detail-label" style={{ fontWeight: 700, fontSize: '15px' }}>Total</span>
              <span className="detail-value" style={{ fontWeight: 800, fontSize: '20px', color: 'var(--primary)' }}>
                {formatCurrency(total)}
              </span>
            </div>

            <div className="form-group" style={{ marginTop: '16px', marginBottom: 0 }}>
              <label>Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes for this sale..."
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
              {submitting ? 'Processing...' : `Complete Sale — ${formatCurrency(total)}`}
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