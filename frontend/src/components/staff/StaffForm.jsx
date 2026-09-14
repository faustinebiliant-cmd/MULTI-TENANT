// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Staff Form
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import toast from 'react-hot-toast';

const StaffForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'cashier',
    password: 'TempPass123!'
  });

  useEffect(() => {
    if (isEdit && id) {
      const fetchStaff = async () => {
        try {
          setLoading(true);
          const data = await api.getUser(id);
          setFormData({
            full_name: data.full_name || '',
            email: data.email || '',
            phone: data.phone || '',
            role: data.role || 'cashier',
            password: ''
          });
        } catch (error) {
          console.error('Error fetching staff:', error);
          toast.error('Failed to load staff');
          navigate('/staff');
        } finally {
          setLoading(false);
        }
      };
      fetchStaff();
    }
  }, [isEdit, id, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const staffData = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || '',
        role: formData.role
      };

      if (!isEdit) {
        staffData.password = formData.password || 'TempPass123!';
      }

      if (isEdit) {
        await api.updateUser(id, staffData);
        toast.success('Staff updated successfully!');
      } else {
        await api.createUser(staffData);
        toast.success('Staff added successfully! Email sent with login details.');
      }

      navigate('/staff');
    } catch (error) {
      console.error('Error saving staff:', error);
      toast.error(error.response?.data?.error || 'Failed to save staff');
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { value: 'manager', label: 'Manager' },
    { value: 'cashier', label: 'Cashier' },
    { value: 'store_keeper', label: 'Store Keeper' },
    { value: 'sales_rep', label: 'Sales Rep' }
  ];

  if (loading && isEdit) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Loading staff...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>{isEdit ? 'Edit Staff' : 'Add Staff'}</h1>
        <p>{isEdit ? 'Update staff details' : 'Add a new team member'}</p>
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Enter full name"
              required
            />
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="staff@shop.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+255 712 345 678"
            />
          </div>

          <div className="form-group">
            <label>Role *</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {!isEdit && (
            <div className="form-group">
              <label>Temporary Password</label>
              <input
                type="text"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="TempPass123!"
                required
              />
              <small style={{ color: '#6b7280' }}>
                Staff will be prompted to change password on first login
              </small>
            </div>
          )}

          <div className="flex" style={{ gap: '10px', marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (isEdit ? 'Update Staff' : 'Add Staff')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/staff')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffForm;