// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Inventory Report
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  FiPackage, FiDollarSign, FiTrendingUp, FiAlertTriangle
} from 'react-icons/fi';
import { formatCurrency } from '../../utils/helpers';
import api from '../../api/client';
import Loader from '../common/Loader';
import toast from 'react-hot-toast';

const InventoryReport = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await api.getInventoryReport();
      setData(response.data);
    } catch (error) {
      console.error('Error fetching inventory report:', error);
      toast.error('Failed to load inventory report');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader message="Loading inventory report..." />;

  if (!data) {
    return (
      <div className="empty-state">
        <h3>No inventory data</h3>
        <p>Add products to see inventory statistics</p>
      </div>
    );
  }

  const { summary, lowStockItems, categoryBreakdown, products } = data;

  return (
    <div>
      <div className="page-header">
        <h1>Inventory Report</h1>
        <p>Stock valuation and inventory status</p>
      </div>

      {/* Summary cards */}
      <div className="grid-3">
        <div className="card">
          <div className="flex" style={{ alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
              <FiPackage size={20} />
            </div>
            <h3 style={{ margin: 0 }}>Total Products</h3>
          </div>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6' }}>
            {summary.totalProducts}
          </p>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Active products</p>
        </div>

        <div className="card">
          <div className="flex" style={{ alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div className="stat-icon" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
              <FiDollarSign size={20} />
            </div>
            <h3 style={{ margin: 0 }}>Cost Value</h3>
          </div>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#ef4444' }}>
            {formatCurrency(summary.totalCostValue)}
          </p>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Total cost of inventory</p>
        </div>

        <div className="card">
          <div className="flex" style={{ alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
              <FiTrendingUp size={20} />
            </div>
            <h3 style={{ margin: 0 }}>Selling Value</h3>
          </div>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>
            {formatCurrency(summary.totalSellingValue)}
          </p>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Potential revenue</p>
        </div>
      </div>

      {/* Profit potential */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="flex-between">
          <div>
            <h3 style={{ margin: 0 }}>Potential Profit</h3>
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
              Difference between selling and cost value of current stock
            </p>
          </div>
          <h2 style={{ margin: 0, color: '#7c3aed' }}>
            {formatCurrency(summary.potentialProfit)}
          </h2>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: '20px' }}>
        {/* Low stock */}
        <div className="card">
          <div className="card-header">
            <div className="flex" style={{ alignItems: 'center', gap: '8px' }}>
              <FiAlertTriangle size={18} color="#dc2626" />
              <h3 style={{ margin: 0 }}>Low Stock Items ({lowStockItems.length})</h3>
            </div>
          </div>
          {lowStockItems.length === 0 ? (
            <p style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
              All items are well stocked
            </p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Stock</th>
                    <th>Threshold</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((item, index) => (
                    <tr key={index}>
                      <td>{item.name}</td>
                      <td>
                        <span className="badge badge-danger">{item.stock}</span>
                      </td>
                      <td>{item.threshold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Category breakdown */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ margin: 0 }}>Inventory by Category</h3>
          </div>
          {categoryBreakdown.length === 0 ? (
            <p style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
              No categories with products
            </p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Items</th>
                    <th>Cost Value</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryBreakdown.map((cat) => (
                    <tr key={cat.name}>
                      <td>{cat.name}</td>
                      <td>{cat.items}</td>
                      <td>{formatCurrency(cat.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Full product list */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <h3 style={{ margin: 0 }}>All Products ({products.length})</h3>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Cost Price</th>
                <th>Selling Price</th>
                <th>Stock Value</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const stockValue = (parseFloat(p.selling_price) || 0) * (parseInt(p.stock_quantity) || 0);
                const isLow = (p.stock_quantity || 0) <= (p.low_stock_threshold || 5);
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td>{p.category_name || 'Uncategorized'}</td>
                    <td>
                      <span className={isLow ? 'badge badge-danger' : 'badge badge-success'}>
                        {p.stock_quantity || 0}
                      </span>
                    </td>
                    <td>{formatCurrency(p.cost_price)}</td>
                    <td>{formatCurrency(p.selling_price)}</td>
                    <td>{formatCurrency(stockValue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryReport;