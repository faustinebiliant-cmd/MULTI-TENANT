// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Order Form (with Walk-in + Phone)
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiTrash2, FiUser, FiPhone, FiMail, FiMapPin } from 'react-icons/fi';
import api from '../../api/client';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

// ✅ Constants for customer types
const CUSTOMER_TYPES = {
  EXISTING: 'existing',
  WALK_IN: 'walk-in',
  QUICK_CREATE: 'quick-create'
};

const OrderForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchProduct, setSearchProduct] = useState('');
  
  const [order, setOrder] = useState({
    customer_id: '',
    items: [],
    notes: '',
    customer_type: CUSTOMER_TYPES.EXISTING
  });

  // ✅ Walk-in customer fields
  const [walkInData, setWalkInData] = useState({
    phone: '',
    name: '',
    email: '',
    address: ''
  });

  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  // ✅ VAT STATE
  const [vatEnabled, setVatEnabled] = useState(false);
  const [vatRate, setVatRate] = useState(18);
  const [tin, setTin] = useState('');
  const [vrn, setVrn] = useState('');

  // ✅ Existing customer data for display
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState(null);

  // Load customers, products AND VAT settings
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customersData, productsData, settingsData] = await Promise.all([
          api.getCustomers(),
          api.getProducts(),
          api.getSettings()
        ]);
        setCustomers(customersData || []);
        setProducts(productsData || []);
        
        // ✅ Set VAT settings
        setVatEnabled(settingsData?.vat_enabled === 'true' || settingsData?.vat_enabled === true || false);
        setVatRate(parseFloat(settingsData?.vat_rate) || 18);
        setTin(settingsData?.tin || '');
        setVrn(settingsData?.vrn || '');
        
        console.log('🛡️ VAT Enabled:', vatEnabled, '| Rate:', vatRate + '%');
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      }
    };

    fetchData();
  }, []);

  // ✅ Handle customer selection change
  const handleCustomerChange = (e) => {
    const value = e.target.value;
    
    if (value === 'walk-in') {
      // ✅ Walk-in customer selected
      setOrder({
        ...order,
        customer_id: '',
        customer_type: CUSTOMER_TYPES.WALK_IN
      });
      setSelectedCustomerDetails(null);
      // ✅ Pre-fill walk-in phone with default
      setWalkInData({
        phone: '',
        name: '',
        email: '',
        address: ''
      });
    } else if (value === 'quick-create') {
      // ✅ Quick create customer
      setOrder({
        ...order,
        customer_id: '',
        customer_type: CUSTOMER_TYPES.QUICK_CREATE
      });
      setSelectedCustomerDetails(null);
      setWalkInData({
        phone: '',
        name: '',
        email: '',
        address: ''
      });
    } else if (value) {
      // ✅ Existing customer selected
      const selected = customers.find(c => c.id === value);
      setOrder({
        ...order,
        customer_id: value,
        customer_type: CUSTOMER_TYPES.EXISTING
      });
      setSelectedCustomerDetails(selected);
      setWalkInData({
        phone: '',
        name: '',
        email: '',
        address: ''
      });
    } else {
      // ✅ No selection
      setOrder({
        ...order,
        customer_id: '',
        customer_type: CUSTOMER_TYPES.EXISTING
      });
      setSelectedCustomerDetails(null);
    }
  };

  // ✅ Handle walk-in form changes
  const handleWalkInChange = (e) => {
    const { name, value } = e.target;
    
    // ✅ Sanitize input to prevent XSS
    const sanitizedValue = value.replace(/[<>]/g, '');
    
    setWalkInData({
      ...walkInData,
      [name]: sanitizedValue
    });

    // ✅ Auto-generate name from phone
    if (name === 'phone' && sanitizedValue.length >= 7) {
      const lastFour = sanitizedValue.slice(-4);
      const autoName = `Customer ${lastFour}`;
      setWalkInData(prev => ({
        ...prev,
        name: prev.name || autoName
      }));
    }
  };

  // ✅ Validate phone number (Tanzania format)
  const isValidPhone = (phone) => {
    if (!phone) return true; // Allow empty for walk-in
    // Accepts: 0712345678, 0712-345-678, 0712 345 678
    const phoneRegex = /^(\+?255|0|255)?[0-9\-\s]{7,15}$/;
    return phoneRegex.test(phone);
  };

  // ✅ Create walk-in or quick customer
  const createCustomerFromWalkIn = async () => {
    try {
      // ✅ Validate phone if provided
      if (walkInData.phone && !isValidPhone(walkInData.phone)) {
        toast.error('Please enter a valid phone number (e.g., 0712345678)');
        return null;
      }

      // ✅ Generate name if empty
      let name = walkInData.name.trim();
      if (!name) {
        if (walkInData.phone) {
          const lastFour = walkInData.phone.replace(/\D/g, '').slice(-4);
          name = `Customer ${lastFour}`;
        } else {
          // ✅ Create time-based name for walk-in without phone
          const now = new Date();
          const timeStr = now.toLocaleTimeString('en-TZ', { hour: '2-digit', minute: '2-digit' });
          name = `Walk-in ${timeStr}`;
        }
      }

      // ✅ Sanitize all fields
      const customerData = {
        name: name.replace(/[<>]/g, ''),
        phone: walkInData.phone ? walkInData.phone.replace(/\D/g, '') : '0000000000',
        email: walkInData.email ? walkInData.email.replace(/[<>]/g, '') : '',
        address: walkInData.address ? walkInData.address.replace(/[<>]/g, '') : '',
        notes: 'Created during order'
      };

      // ✅ Check if customer with this phone already exists
      if (customerData.phone && customerData.phone !== '0000000000') {
        const existing = customers.find(c => c.phone === customerData.phone);
        if (existing) {
          // ✅ FIXED: Use toast.success instead of toast.info
          toast.success('Customer already exists! Using existing customer.', {
            icon: 'ℹ️',
            duration: 3000
          });
          return existing;
        }
      }

      // ✅ Create new customer
      const response = await api.createCustomer(customerData);
      toast.success('Customer created successfully!');
      
      // ✅ Refresh customer list
      const updatedCustomers = await api.getCustomers();
      setCustomers(updatedCustomers || []);
      
      return response.data || response;
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error(error.response?.data?.error || 'Failed to create customer');
      return null;
    }
  };

  const addItem = () => {
    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }
    
    const product = products.find(p => p.id === selectedProduct);
    if (!product) {
      toast.error('Product not found');
      return;
    }

    // Check if product already in order
    const existingItem = order.items.find(item => item.product_id === selectedProduct);
    
    if (existingItem) {
      // Update quantity
      setOrder({
        ...order,
        items: order.items.map(item =>
          item.product_id === selectedProduct
            ? { ...item, quantity: item.quantity + selectedQuantity }
            : item
        )
      });
    } else {
      // Add new item
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
    
    // Reset selection
    setSelectedProduct('');
    setSelectedQuantity(1);
    toast.success('Product added to order');
  };

  const removeItem = (index) => {
    setOrder({
      ...order,
      items: order.items.filter((_, i) => i !== index)
    });
  };

  const updateQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;
    
    const updatedItems = [...order.items];
    updatedItems[index].quantity = newQuantity;
    updatedItems[index].subtotal = updatedItems[index].unit_price * newQuantity;
    
    setOrder({
      ...order,
      items: updatedItems
    });
  };

  // ✅ CALCULATE SUBTOTAL, VAT, AND TOTAL
  const calculateTotals = () => {
    const subtotal = order.items.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = vatEnabled ? subtotal * (vatRate / 100) : 0;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  // ✅ Validate order before submission
  const validateOrder = async () => {
    // ✅ Check if items exist
    if (order.items.length === 0) {
      toast.error('Please add at least one product');
      return false;
    }

    // ✅ Handle customer based on type
    let customerId = order.customer_id;

    if (order.customer_type === CUSTOMER_TYPES.WALK_IN || order.customer_type === CUSTOMER_TYPES.QUICK_CREATE) {
      // ✅ Create customer from walk-in data
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
      // ✅ Validate and get customer ID
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

      console.log('📤 Sending order:', orderData);
      const response = await api.createOrder(orderData);
      console.log('✅ Order created:', response);
      
      toast.success('Order created successfully!');
      navigate('/orders');
    } catch (error) {
      console.error('❌ Error creating order:', error);
      toast.error(error.response?.data?.error || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  // Filter products by search
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchProduct.toLowerCase())
  );

  const { subtotal, tax, total } = calculateTotals();

  // ✅ Get customer display info
  const getCustomerDisplay = () => {
    if (order.customer_type === CUSTOMER_TYPES.WALK_IN) {
      return {
        icon: '🚶',
        label: 'Walk-in Customer',
        description: 'New walk-in customer'
      };
    }
    if (order.customer_type === CUSTOMER_TYPES.QUICK_CREATE) {
      return {
        icon: '⚡',
        label: 'Quick Create Customer',
        description: 'Create new customer with phone'
      };
    }
    if (selectedCustomerDetails) {
      return {
        icon: '👤',
        label: selectedCustomerDetails.name,
        description: `${selectedCustomerDetails.phone || 'No phone'}`
      };
    }
    return {
      icon: '👤',
      label: 'Select Customer',
      description: 'Choose an existing customer or create new'
    };
  };

  const customerDisplay = getCustomerDisplay();

  return (
    <div>
      <div className="page-header">
        <h1>Create Order</h1>
        <p>Create a new customer order</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Customer Selection */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="form-group">
            <label>Customer *</label>
            
            {/* Customer Dropdown */}
            <select
              value={order.customer_type === CUSTOMER_TYPES.WALK_IN ? 'walk-in' : 
                      order.customer_type === CUSTOMER_TYPES.QUICK_CREATE ? 'quick-create' : 
                      order.customer_id || ''}
              onChange={handleCustomerChange}
              className="form-control"
              required
            >
              <option value="">Select a customer</option>
              <option value="walk-in">🚶 Walk-in Customer</option>
              <option value="quick-create">⚡ Quick Create Customer</option>
              <optgroup label="Existing Customers">
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.phone || 'No phone'}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* ✅ Customer Details Display / Form */}
          <div style={{ marginTop: '12px' }}>
            {/* Existing Customer Details */}
            {selectedCustomerDetails && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#f0fdf4',
                borderRadius: '8px',
                border: '1px solid #bbf7d0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '18px' }}>👤</span>
                  <strong>{selectedCustomerDetails.name}</strong>
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: '#6b7280' }}>
                  {selectedCustomerDetails.phone && <span>📞 {selectedCustomerDetails.phone}</span>}
                  {selectedCustomerDetails.email && <span>✉️ {selectedCustomerDetails.email}</span>}
                  {selectedCustomerDetails.address && <span>📍 {selectedCustomerDetails.address}</span>}
                </div>
              </div>
            )}

            {/* ✅ Walk-in / Quick Create Form */}
            {(order.customer_type === CUSTOMER_TYPES.WALK_IN || order.customer_type === CUSTOMER_TYPES.QUICK_CREATE) && (
              <div style={{
                padding: '16px',
                backgroundColor: '#fefce8',
                borderRadius: '8px',
                border: '1px solid #fde68a',
                marginTop: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '18px' }}>
                    {order.customer_type === CUSTOMER_TYPES.WALK_IN ? '🚶' : '⚡'}
                  </span>
                  <strong>
                    {order.customer_type === CUSTOMER_TYPES.WALK_IN 
                      ? 'Walk-in Customer Details' 
                      : 'Quick Create Customer'}
                  </strong>
                  <span style={{ fontSize: '12px', color: '#92400e', marginLeft: '8px' }}>
                    {order.customer_type === CUSTOMER_TYPES.WALK_IN 
                      ? '(Optional - provide phone for follow-up)' 
                      : '(Enter phone number to create customer)'}
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
                      <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: '400' }}>
                        {' '}(auto-generated)
                      </span>
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
                  <div style={{ 
                    marginTop: '8px', 
                    fontSize: '12px', 
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    ⚠️ Please enter a valid phone number (e.g., 0712345678)
                  </div>
                )}

                {order.customer_type === CUSTOMER_TYPES.QUICK_CREATE && !walkInData.phone && (
                  <div style={{ 
                    marginTop: '8px', 
                    fontSize: '12px', 
                    color: '#92400e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    📱 Please enter a phone number to create customer
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Product Selection */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="form-group">
            <label>Add Products</label>
            <div className="flex" style={{ gap: '10px', flexWrap: 'wrap' }}>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="form-control"
                style={{ flex: 2, minWidth: '200px' }}
              >
                <option value="">Select a product</option>
                {filteredProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {formatCurrency(product.selling_price)} (Stock: {product.stock_quantity})
                  </option>
                ))}
              </select>
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

        {/* Order Items */}
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
                        <button type="button" onClick={() => removeItem(index)} className="btn btn-sm btn-danger">
                          <FiTrash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* ✅ TOTALS WITH VAT */}
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
            
            <div className="flex-between" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
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

        {/* Notes & Submit */}
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
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/orders')}>
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default OrderForm;