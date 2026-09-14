// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Supplier Form
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import toast from 'react-hot-toast';

const SupplierForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });

  // Load supplier data if editing
  useEffect(() => {
    if (isEdit && id) {
      const fetchSupplier = async () => {
        try {
          setLoading(true);
          const data = await api.getSupplier(id);
          setFormData({
            name: data.name || '',
            contact_person: data.contact_person || '',
            phone: data.phone || '',
            email: data.email || '',
            address: data.address || '',
            notes: data.notes || ''
          });
        } catch (error) {
          console.error('Error fetching supplier:', error);
          toast.error('Failed to load supplier');
          navigate('/suppliers');
        } finally {
          setLoading(false);
        }
      };
      fetchSupplier();
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
    
    // Validate
    if (!formData.name.trim()) {
      toast.error('Supplier name is required');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    setLoading(true);

    try {
      const supplierData = {
        name: formData.name.trim(),
        contact_person: formData.contact_person.trim() || '',
        phone: formData.phone.trim(),
        email: formData.email.trim() || '',
        address: formData.address.trim() || '',
        notes: formData.notes.trim() || ''
      };

      if (isEdit) {
        await api.updateSupplier(id, supplierData);
        toast.success('Supplier updated successfully!');
      } else {
        await api.createSupplier(supplierData);
        toast.success('Supplier added successfully!');
      }
      navigate('/suppliers');
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error(error.response?.data?.error || 'Failed to save supplier');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Loading supplier...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>{isEdit ? 'Edit Supplier' : 'Add Supplier'}</h1>
        <p>{isEdit ? 'Update supplier details' : 'Add a new supplier to your network'}</p>
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Supplier Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Electric Supplies Ltd"
              required
            />
          </div>

          <div className="form-group">
            <label>Contact Person</label>
            <input
              type="text"
              name="contact_person"
              value={formData.contact_person}
              onChange={handleChange}
              placeholder="e.g., John Mwangi"
            />
          </div>

          <div className="form-group">
            <label>Phone *</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+255 712 345 678"
              required
            />
          </div>

          <div className="form-group">
            <label>Email (Optional)</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="supplier@example.com"
            />
          </div>

          <div className="form-group">
            <label>Address (Optional)</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Supplier address..."
              rows="2"
            />
          </div>

          <div className="form-group">
            <label>Notes (Optional)</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any notes about this supplier..."
              rows="2"
            />
          </div>

          <div className="flex" style={{ gap: '10px', marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (isEdit ? 'Update Supplier' : 'Add Supplier')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/suppliers')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupplierForm;