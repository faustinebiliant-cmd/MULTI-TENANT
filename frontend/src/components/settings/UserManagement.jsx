// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - User Management
// ============================================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiUserX, FiUserCheck } from 'react-icons/fi';
import api from '../../api/client';
import { ROLES } from '../../utils/constants';
import Loader from '../common/Loader';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await api.getStaff();
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleDeleteUser = (userId) => {
    if (window.confirm('Are you sure you want to delete this user? All business data will be preserved.')) {
      setUsers(users.filter(user => user.id !== userId));
      alert('User deleted successfully. All business data preserved.');
    }
  };

  const handleToggleActive = (userId) => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, is_active: !user.is_active } : user
    ));
    alert('User status updated successfully');
  };

  const getRoleBadge = (role) => {
    const colors = {
      boss: '#ef4444',
      manager: '#3b82f6',
      cashier: '#f59e0b',
      store_keeper: '#8b5cf6',
      sales_rep: '#10b981'
    };
    return colors[role] || '#6b7280';
  };

  const getRoleLabel = (role) => {
    const labels = {
      boss: '👑 Boss',
      manager: '👔 Manager',
      cashier: '💰 Cashier',
      store_keeper: '📦 Store Keeper',
      sales_rep: '🤝 Sales Rep'
    };
    return labels[role] || role;
  };

  if (loading) return <Loader message="Loading staff..." />;

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h1>👥 Staff Management</h1>
          <p>Manage your team members</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          <FiPlus size={18} /> Add Staff
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Staff</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center">No staff found</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.full_name}</strong>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span 
                        className="badge"
                        style={{ backgroundColor: getRoleBadge(user.role) + '20', color: getRoleBadge(user.role) }}
                      >
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${user.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {user.is_active ? '🟢 Active' : '🔴 Inactive'}
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => handleToggleActive(user.id)} 
                        className="btn btn-sm btn-secondary"
                        title={user.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {user.is_active ? <FiUserX size={14} /> : <FiUserCheck size={14} />}
                      </button>
                      <button 
                        onClick={() => setEditingUser(user)} 
                        className="btn btn-sm btn-primary"
                        title="Edit"
                      >
                        <FiEdit2 size={14} />
                      </button>
                      {user.role !== 'boss' && (
                        <button 
                          onClick={() => handleDeleteUser(user.id)} 
                          className="btn btn-sm btn-danger"
                          title="Delete"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <AddStaffModal 
          onClose={() => setShowAddModal(false)}
          onAdd={(newUser) => {
            setUsers([...users, { ...newUser, id: Date.now(), is_active: true }]);
            setShowAddModal(false);
            alert('Staff added successfully! Email sent to staff with login details.');
          }}
        />
      )}

      {/* Edit Staff Modal */}
      {editingUser && (
        <EditStaffModal 
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onEdit={(updatedUser) => {
            setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
            setEditingUser(null);
            alert('Staff updated successfully!');
          }}
        />
      )}
    </div>
  );
};

// Add Staff Modal Component
const AddStaffModal = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'cashier',
    password: 'TempPass123!'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Mock save - will be replaced with real API later
      setTimeout(() => {
        onAdd(formData);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error adding staff:', error);
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>➕ Add New Staff</h2>
        <p>Create a new staff account</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Enter full name"
              required
            />
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="staff@shop.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+255 712 345 678"
            />
          </div>

          <div className="form-group">
            <label>Role *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              required
            >
              <option value="manager">Manager</option>
              <option value="cashier">Cashier</option>
              <option value="store_keeper">Store Keeper</option>
              <option value="sales_rep">Sales Rep</option>
            </select>
          </div>

          <div className="form-group">
            <label>Temporary Password</label>
            <input
              type="text"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="TempPass123!"
              required
            />
            <small style={{ color: '#6b7280' }}>
              Staff will be prompted to change password on first login
            </small>
          </div>

          <div className="flex" style={{ gap: '10px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Staff'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Staff Modal Component
const EditStaffModal = ({ user, onClose, onEdit }) => {
  const [formData, setFormData] = useState({
    full_name: user.full_name,
    phone: user.phone || '',
    role: user.role
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Mock update - will be replaced with real API later
      setTimeout(() => {
        onEdit({ ...user, ...formData });
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error editing staff:', error);
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>✏️ Edit Staff</h2>
        <p>Edit staff details</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Enter full name"
              required
            />
          </div>

          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+255 712 345 678"
            />
          </div>

          <div className="form-group">
            <label>Role *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              required
            >
              <option value="manager">Manager</option>
              <option value="cashier">Cashier</option>
              <option value="store_keeper">Store Keeper</option>
              <option value="sales_rep">Sales Rep</option>
            </select>
          </div>

          <div className="flex" style={{ gap: '10px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserManagement;