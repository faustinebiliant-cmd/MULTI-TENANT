// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Inventory Report
// ============================================================

import React, { useState } from 'react';
import { formatCurrency } from '../../utils/helpers';

const InventoryReport = () => {
  // Mock inventory data
  const [inventory] = useState([
    { name: 'Cable 2.5mm', stock: 50, cost_price: 15000, selling_price: 25000, category: 'Cables & Wires' },
    { name: 'Switch 16A', stock: 30, cost_price: 2000, selling_price: 3500, category: 'Switches' },
    { name: 'LED Bulb 9W', stock: 80, cost_price: 3000, selling_price: 5500, category: 'Lighting' },
    { name: 'MCB 20A', stock: 20, cost_price: 4000, selling_price: 7000, category: 'Circuit Protection' },
    { name: 'Socket 13A', stock: 45, cost_price: 2500, selling_price: 4500, category: 'Sockets' },
  ]);

  const totalValue = inventory.reduce((sum, item) => sum + (item.stock * item.cost_price), 0);
  const totalSellingValue = inventory.reduce((sum, item) => sum + (item.stock * item.selling_price), 0);
  const lowStockItems = inventory.filter(item => item.stock <= 5);

  return (
    <div>
      <div className="page-header">
        <h1>📦 Inventory Report</h1>
        <p>Stock valuation and inventory status</p>
      </div>

      <div className="grid-3">
        <div className="card">
          <h3>📦 Total Items</h3>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6' }}>
            {inventory.reduce((sum, item) => sum + item.stock, 0)}
          </p>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Units in stock</p>
        </div>
        <div className="card">
          <h3>💰 Cost Value</h3>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#ef4444' }}>
            {formatCurrency(totalValue)}
          </p>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Total cost of inventory</p>
        </div>
        <div className="card">
          <h3>💰 Selling Value</h3>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>
            {formatCurrency(totalSellingValue)}
          </p>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Potential revenue</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>⚠️ Low Stock Items ({lowStockItems.length})</h3>
          {lowStockItems.length === 0 ? (
            <p>✅ All items are well stocked</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Stock</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((item, index) => (
                    <tr key={index}>
                      <td>{item.name}</td>
                      <td>{item.stock}</td>
                      <td>
                        <span className="badge badge-danger">⚠️ Low Stock</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h3>📊 Inventory Summary</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Items</th>
                  <th>Total Value</th>
                </tr>
              </thead>
              <tbody>
                {['Cables & Wires', 'Switches', 'Lighting', 'Circuit Protection', 'Sockets'].map((category) => {
                  const items = inventory.filter(item => item.category === category);
                  const total = items.reduce((sum, item) => sum + (item.stock * item.cost_price), 0);
                  return (
                    <tr key={category}>
                      <td>{category}</td>
                      <td>{items.reduce((sum, item) => sum + item.stock, 0)}</td>
                      <td>{formatCurrency(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryReport;