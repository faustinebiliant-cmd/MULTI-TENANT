// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Order Form
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiTrash2, FiUser, FiPhone, FiMail, FiMapPin } from 'react-icons/fi';
import api from '../../api/client';
import { formatCurrency } from '../../utils/helpers';
import SearchableSelect from '../common/SearchableSelect';
import toast from 'react-hot-toast';

const CUSTOMER_TYPES = {
  EXISTING: 'existing',
  WALK_IN: 'walk-in',
  QUICK_CREATE: 'quick-create'
};

const OrderForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searchProduct, setSearchProduct] = useState('');

  const [order, setOrder] = useState({
    customer_id: '',
    items: [],
    notes: '',
    customer_type: CUSTOMER_TYPES.EXISTING
  });

  const [walkInData, setWalkInData] = useState({
    phone: '',
    name: '',
    email: '',
    address: ''
  });

  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const [vatEnabled, setVatEnabled] = useState(false);
  const [vatRate, setVatRate] = useState(18);
  const [tin, setTin] = useState('');
  const [vrn, setVrn] = useState('');

  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsData = await api.getSettings();
        setVatEnabled(settingsData?.vat_enabled === 'true' || settingsData?.vat_enabled === true);
        setVatRate(parseFloat(settingsData?.vat_rate) || 18);
        setTin(settingsData?.tin || '');
        setVrn(settingsData?.vrn || '');
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    fetchSettings();
  }, []);

  // Backend search for products
  const fetchProductOptions = useCallback(async (term) => {
    const params = new URLSearchParams();
    params.set('page', '1');
    params.set('limit', '20');
    if (term && term.trim()) params.set('search', term.trim());
    const response = await api.getProductsPage(params.toString());
    return response.data || [];
  }, []);

  // Backend search for customers
  const fetchCustomerOptions = useCallback(async (term) => {
    const params = new URLSearchParams();
    params.set('page', '1');
    params.set('limit', '20');
    if (term && term.trim()) params.set('search', term.trim());
    const response = await api.getCustomersPage(params.toString());
    return response.data || [];
  }, []);

  const handleCustomerSelect = (customerId) => {
    if (!customerId) {
      setOrder({ ...order, customer_id: '', customer_type: CUSTOMER_TYPES.EXISTING });
      setSelectedCustomerDetails(null);
      return;
    }
    setOrder({ ...order, customer_id: customerId, customer_type: CUSTOMER_TYPES.EXISTING });
    // Details will be resolved when picked; store minimal data
    setSelectedCustomerDetails({ id: customerId });
  };

  const handleCustomerTypeChange = (e) => {
    const value = e.target.value;
    setOrder({ ...order, customer_id: '', customer_type: value });
    setSelectedCustomerDetails(null);
    setWalkInData({ phone: '', name: '', email: '', address: '' });
  };

  const handleWalkInChange = (e) => {
    const { name, value } = e.target;
    const sanitizedValue = value.replace(/[<>]/g, '');
    setWalkInData({ ...walkInData, [name]: sanitizedValue });

    if (name === 'phone' && sanitizedValue.length >= 7) {
      const lastFour = sanitizedValue.slice(-4);
      const autoName = `Customer ${lastFour}`;
      setWalkInData(prev => ({ ...prev, name: prev.name || autoName }));
    }
  };

  const isValidPhone = (phone) => {
    if (!phone) return true;
    return /^(\+?255|0|255)?[0-9\-\s]{7,15}$/.test(phone);
  };

  const createCustomerFromWalkIn = async () => {
    try {
      if (walkInData.phone && !isValidPhone(walkInData.phone)) {
        toast.error('Please enter a valid phone number (e.g., 0712345678)');
        return null;
      }

      let name = walkInData.name.trim();
      if (!name) {
        if (walkInData.phone) {
          const lastFour = walkInData.phone.replace(/\D/g, '').slice(-4);
          name = `Customer ${lastFour}`;
        } else {
          const now = new Date();
          const timeStr = now.toLocaleTimeString('en-TZ', { hour: '2-digit', minute: '2-digit' });
          name = `Walk-in ${timeStr}`;
        }
      }

      const customerData = {
        name: name.replace(/[<>]/g, ''),
        phone: walkInData.phone ? walkInData.phone.replace(/\D/g, '') : '0000000000',
        email: walkInData.email ? walkInData.email.replace(/[<>]/g, '') : '',
        address: walkInData.address ? walkInData.address.replace(/[<>]/g, '') : '',
        notes: 'Created during order'
      };

      // Check for existing by phone (backend search)
      if (customerData.phone && customerData.phone !== '0000000000') {
        const existing = await fetchCustomerOptions(customerData.phone);
        const match = existing.find(c => c.phone === customerData.phone);
        if (match) {
          toast.success('Existing customer matched by phone');
          return match;
        }
      }

      const response = await api.createCustomer(customerData);
      toast.success('Customer created successfully');
      return response.data || response;
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error(error.response?.data?.error || 'Failed to create customer');
      return null;
    }
  };

  const handleProductSelect = (productId, product) => {
    if (!productId) return;
    // product is not passed by SearchableSelect directly; we re-fetch
    // Actually we store the picked product in a ref via a callback.
    // Simpler: keep last picked product in state.
    setLastPickedProduct(product || null);
  };

  const [lastPickedProduct, setLastPickedProduct] = useState(null);

  const addItem = () => {
    if (!lastPickedProduct) {
      toast.error('Please select a product');
      return;
    }

    const product = lastPickedProduct;
    const existingItem = order.items.find(item => item.product_id === product.id);

    if (existingItem) {
      setOrder({
        ...order,
        items: order.items.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + selectedQuantity }
            : item
        )
      });
    } else {
      setOrder({
        ...order,
        items: [
          ...order.items,
          {
            product_id: product.id,
            name: product.name,
            quantity: selectedQuantity,
            unit_price: product.selling_price,
            cost_price: product.cost_price || 0,
            subtotal: product.selling_price * selectedQuantity
          }
        ]
      });
    }

    setLastPickedProduct(null);
    setSelectedQuantity(1);
    toast.success('Product added to order');
  };

  const removeItem = (index) => {
    setOrder({ ...order, items: order.items.filter((_, i) => i !== index) });
  };

  const updateQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;
    const updatedItems = [...order.items];
    updatedItems[index].quantity = newQuantity;
    updatedItems[index].subtotal = updatedItems[index].unit_price * newQuantity;
    setOrder({ ...order, items: updatedItems });
  };

  const calculateTotals = () => {
    const subtotal = order.items.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = vatEnabled ? subtotal * (vatRate / 100) : 0;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const validateOrder = async () => {
    if (order.items.length === 0) {
      toast.error('Please add at least one product');
      return false;
    }

    let customerId = order.customer_id;

    if (order.customer_type === CUSTOMER_TYPES.WALK_IN ||
        order.customer_type === CUSTOMER_TYPES.QUICK_CREATE) {
      const newCustomer = await createCustomerFromWalkIn();
      if (!newCustomer) {
        toast.error('Please fill in customer details');
        return false;
      }
      customerId = newCustomer.id;
      setOrder(prev => ({ ...prev, customer_id: customerId }));
    } else if (!customerId) {
      toast.error('Please select or create a customer');
      return false;
    }

    return customerId;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const customerId = await validateOrder();
      if (!customerId) {
        setLoading(false);
        return;
      }

      const orderData = {
        customer_id: customerId,
        items: order.items.map(item => ({
          product_id: item.product_id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          cost_price: item.cost_price || 0
        })),
        notes: order.notes || ''
      };

      await api.createOrder(orderData);
      toast.success('Order created successfully');
      navigate('/orders');
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(error.response?.data?.error || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, tax, total } = calculateTotals();

  const isWalkInOrQuick =
    order.customer_type === CUSTOMER_TYPES.WALK_IN ||
    order.customer_type === CUSTOMER_TYPES.QUICK_CREATE;

  const isQuickCreate = order.customer_type === CUSTOMER_TYPES.QUICK_CREATE;

  return (
    <div>
      <div className="page-header">
        <h1>Create Order</h1>
        <p>Create a new customer order</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Customer */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="form-group">
            <label>Customer Type</label>
            <select
              value={order.customer_type}
              onChange={handleCustomerTypeChange}
              className="form-control"
            >
              <option value={CUSTOMER_TYPES.EXISTING}>Existing Customer</option>
              <option value={CUSTOMER_TYPES.WALK_IN}>Walk-in Customer</option>
              <option value={CUSTOMER_TYPES.QUICK_CREATE}>Quick Create Customer</option>
            </select>
          </div>

          {order.customer_type === CUSTOMER_TYPES.EXISTING && (
            <div className="form-group">
              <label>Customer *</label>
              <SearchableSelect
                value={order.customer_id}
                onChange={handleCustomerSelect}
                placeholder="Search and select customer..."
                searchPlaceholder="Type customer name, phone, or email..."
                fetchOptions={fetchCustomerOptions}
                getOptionLabel={(c) => c.name}
                getOptionValue={(c) => c.id}
                getOptionMeta={(c) => c.phone || c.email || ''}
                required
              />
            </div>
          )}

          {selectedCustomerDetails && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#f0fdf4',
              borderRadius: '8px',
              border: '1px solid #bbf7d0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <FiUser size={16} />
                <strong>Customer selected</strong>
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                {selectedCustomerDetails.id && `ID: ${selectedCustomerDetails.id.slice(0, 8)}...`}
              </div>
            </div>
          )}

          {isWalkInOrQuick && (
            <div style={{
              padding: '16px',
              backgroundColor: '#fefce8',
              borderRadius: '8px',
              border: '1px solid #fde68a',
              marginTop: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <FiUser size={16} />
                <strong>
                  {isQuickCreate ? 'Quick Create Customer' : 'Walk-in Customer Details'}
                </strong>
                <span style={{ fontSize: '12px', color: '#92400e', marginLeft: '8px' }}>
                  {isQuickCreate ? '(Enter phone number to create customer)' : '(Optional)'}
                </span>
              </div>

              <div className="grid-2" style={{ gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600' }}>
                    <FiPhone size={14} style={{ marginRight: '4px' }} />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={walkInData.phone}
                    onChange={handleWalkInChange}
                    placeholder="0712 345 678"
                    className="form-control"
                    style={{ fontSize: '14px' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600' }}>
                    <FiUser size={14} style={{ marginRight: '4px' }} />
                    Customer Name
                    <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: '400' }}> (auto-generated)</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={walkInData.name}
                    onChange={handleWalkInChange}
                    placeholder="Auto-generated from phone"
                    className="form-control"
                    style={{ fontSize: '14px' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600' }}>
                    <FiMail size={14} style={{ marginRight: '4px' }} />
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={walkInData.email}
                    onChange={handleWalkInChange}
                    placeholder="customer@example.com"
                    className="form-control"
                    style={{ fontSize: '14px' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600' }}>
                    <FiMapPin size={14} style={{ marginRight: '4px' }} />
                    Address (Optional)
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={walkInData.address}
                    onChange={handleWalkInChange}
                    placeholder="Customer address"
                    className="form-control"
                    style={{ fontSize: '14px' }}
                  />
                </div>
              </div>

              {walkInData.phone && !isValidPhone(walkInData.phone) && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#dc2626' }}>
                  Please enter a valid phone number (e.g., 0712345678)
                </div>
              )}

              {isQuickCreate && !walkInData.phone && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#92400e' }}>
                  Please enter a phone number to create customer
                </div>
              )}
            </div>
          )}
        </div>

        {/* Product selection */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="form-group">
            <label>Add Products</label>
            <div className="flex" style={{ gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ flex: 2, minWidth: '240px' }}>
                <SearchableSelect
                  value={lastPickedProduct?.id || ''}
                  onChange={(productId, meta) => handleProductSelect(productId, meta)}
                  placeholder="Search and select a product..."
                  searchPlaceholder="Type product name or SKU..."
                  fetchOptions={async (term) => {
                    const results = await fetchProductOptions(term);
                    return results;
                  }}
                  getOptionLabel={(p) => p.name}
                  getOptionValue={(p) => p.id}
                  getOptionMeta={(p) => `Stock: ${p.stock_quantity} | ${formatCurrency(p.selling_price)}`}
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
              <button type="button" onClick={addItem} className="btn btn-primary">
                <FiPlus size={18} /> Add
              </button>
            </div>
          </div>
        </div>

        {/* Order items */}
        <div className="card">
          <h3>Order Items</h3>
          {order.items.length === 0 ? (
            <div className="empty-state">
              <p>No items added yet</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Subtotal</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.name}</td>
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

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '2px solid #e5e7eb' }}>
            <div className="flex-between" style={{ marginBottom: '8px' }}>
              <span style={{ color: '#6b7280' }}>Subtotal</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>

            {vatEnabled && (
              <div className="flex-between" style={{ marginBottom: '8px' }}>
                <span style={{ color: '#f59e0b' }}>VAT ({vatRate}%)</span>
                <strong style={{ color: '#f59e0b' }}>{formatCurrency(tax)}</strong>
              </div>
            )}

            <div className="flex-between" style={{
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <h3 style={{ margin: 0 }}>Total</h3>
              <h3 style={{ color: '#1a56db', margin: 0 }}>{formatCurrency(total)}</h3>
            </div>

            {vatEnabled && (tin || vrn) && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                {tin && <span>TIN: {tin}</span>}
                {vrn && <span style={{ marginLeft: '12px' }}>VRN: {vrn}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Notes + Submit */}
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="form-group">
            <label>Notes (Optional)</label>
            <textarea
              value={order.notes}
              onChange={(e) => setOrder({ ...order, notes: e.target.value })}
              placeholder="Any special instructions or notes..."
              rows="2"
              className="form-control"
            />
          </div>

          <div className="flex" style={{ gap: '10px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : `Create Order - ${formatCurrency(total)}`}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/orders')}
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default OrderForm;