// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Low Stock Alerts
// ============================================================

import React from 'react';
import { Link } from 'react-router-dom';

const LowStockAlerts = ({ items }) => {
  if (!items || items.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3>Low Stock Alerts</h3>
          <span className="badge badge-success">All items well stocked</span>
        </div>
        <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
          <p>No low stock items found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>Low Stock Alerts</h3>
        <span className="badge badge-danger">{items.length} items</span>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Current Stock</th>
              <th>Threshold</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td><strong>{item.name}</strong></td>
                <td>{item.stock}</td>
                <td>{item.threshold || 5}</td>
                <td>
                  <span className="badge badge-danger">Low Stock</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
        <Link to="/products" className="btn btn-sm btn-primary">
          View All Products
        </Link>
      </div>
    </div>
  );
};

export default LowStockAlerts;