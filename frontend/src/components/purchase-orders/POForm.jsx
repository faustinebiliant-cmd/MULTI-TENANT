// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Purchase Order Form
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import api from '../../api/client';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

const POForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  const [po, setPo] = useState({
    supplier_id: '',
    items: [],
    notes: ''
  });

  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  // Load reference data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [suppliersData, productsData] = await Promise.all([
          api.getSuppliers(),
          api.getProducts()
        ]);
        setSuppliers(suppliersData || []);
        setProducts(productsData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      }
    };
    fetchData();
  }, []);

  // Load existing PO when editing
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
        toast.error('Failed to load purchase order');
        navigate('/purchase-orders');
      } finally {
        setLoading(false);
      }
    };
    fetchPO();
  }, [isEdit, id, navigate]);

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

    const existingItem = po.items.find(item => item.product_id === selectedProduct);

    if (existingItem) {
      setPo({
        ...po,
        items: po.items.map(item =>
          item.product_id === selectedProduct
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

    setSelectedProduct('');
    setSelectedQuantity(1);
    toast.success('Product added to PO');
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
      toast.error('Please select a supplier');
      return;
    }

    if (po.items.length === 0) {
      toast.error('Please add at least one product');
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
        toast.success('Purchase Order updated successfully');
      } else {
        await api.createPurchaseOrder(poData);
        toast.success('Purchase Order created successfully');
      }

      navigate('/purchase-orders');
    } catch (error) {
      console.error('Error saving PO:', error);
      toast.error(error.response?.data?.error || 'Failed to save PO');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Loading purchase order...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>{isEdit ? 'Edit Purchase Order' : 'Create Purchase Order'}</h1>
        <p>{isEdit ? 'Update purchase order details' : 'Order products from suppliers'}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="form-group">
            <label>Supplier *</label>
            <select
              value={po.supplier_id}
              onChange={(e) => setPo({ ...po, supplier_id: e.target.value })}
              required
            >
              <option value="">Select a supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Add Products</label>
            <div className="flex" style={{ gap: '10px', flexWrap: 'wrap' }}>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                style={{ flex: 2, minWidth: '200px' }}
                className="form-control"
              >
                <option value="">Select a product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {formatCurrency(product.cost_price)} (Stock: {product.stock_quantity})
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={selectedQuantity}
                onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 1)}
                min="1"
                style={{ width: '80px' }}
                className="form-control"
              />
              <button type="button" onClick={addItem} className="btn btn-primary">
                <FiPlus size={18} /> Add
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Order Items</h3>
          {po.items.length === 0 ? (
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
                    <th>Cost Price</th>
                    <th>Subtotal</th>
                    <th>Actions</th>
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
            <h3>Total</h3>
            <h3 style={{ color: '#1a56db' }}>{formatCurrency(calculateTotal())}</h3>
          </div>
        </div>

        <div className="card">
          <div className="form-group">
            <label>Notes (Optional)</label>
            <textarea
              value={po.notes}
              onChange={(e) => setPo({ ...po, notes: e.target.value })}
              placeholder="Any special instructions..."
              rows="2"
              className="form-control"
            />
          </div>

          <div className="flex" style={{ gap: '10px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (isEdit ? 'Update Purchase Order' : 'Create Purchase Order')}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/purchase-orders')}
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default POForm;