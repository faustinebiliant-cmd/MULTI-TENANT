// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Route Definitions
// ============================================================

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/common/Layout';
import Login from './components/auth/Login';
import Dashboard from './components/dashboard/Dashboard';
import ProductList from './components/products/ProductList';
import ProductForm from './components/products/ProductForm';
import ProductDetail from './components/products/ProductDetail';
import CategoryManager from './components/categories/CategoryManager';
import CustomerList from './components/customers/CustomerList';
import CustomerForm from './components/customers/CustomerForm';
import CustomerDetail from './components/customers/CustomerDetail';
import OrderList from './components/orders/OrderList';
import OrderForm from './components/orders/OrderForm';
import OrderDetail from './components/orders/OrderDetail';
import ExpenseList from './components/expenses/ExpenseList';
import ExpenseForm from './components/expenses/ExpenseForm';
import SupplierList from './components/suppliers/SupplierList';
import SupplierForm from './components/suppliers/SupplierForm';
import POList from './components/purchase-orders/POList';
import POForm from './components/purchase-orders/POForm';
import SalesReport from './components/reports/SalesReport';
import ProfitReport from './components/reports/ProfitReport';
import InventoryReport from './components/reports/InventoryReport';
import Settings from './components/settings/Settings';
import ProfileSettings from './components/settings/ProfileSettings';
import UserManagement from './components/settings/UserManagement';
import StaffList from './components/staff/StaffList';
import StaffForm from './components/staff/StaffForm';
import StaffDetail from './components/staff/StaffDetail';
import PrivateRoute from './components/common/PrivateRoute';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<Login />} />
      
      {/* Protected Routes */}
      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        
        {/* Products */}
        <Route path="products" element={<ProductList />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="products/:id/edit" element={<ProductForm />} />
        
        {/* Categories */}
        <Route path="categories" element={<CategoryManager />} />
        
        {/* Customers */}
        <Route path="customers" element={<CustomerList />} />
        <Route path="customers/new" element={<CustomerForm />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="customers/:id/edit" element={<CustomerForm />} />
        
        {/* Orders */}
        <Route path="orders" element={<OrderList />} />
        <Route path="orders/new" element={<OrderForm />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        
        {/* Expenses */}
        <Route path="expenses" element={<ExpenseList />} />
        <Route path="expenses/new" element={<ExpenseForm />} />
        
        {/* Suppliers */}
        <Route path="suppliers" element={<SupplierList />} />
        <Route path="suppliers/new" element={<SupplierForm />} />
        
        {/* Purchase Orders */}
        <Route path="purchase-orders" element={<POList />} />
        <Route path="purchase-orders/new" element={<POForm />} />
        
        {/* Reports */}
        <Route path="reports/sales" element={<SalesReport />} />
        <Route path="reports/profit" element={<ProfitReport />} />
        <Route path="reports/inventory" element={<InventoryReport />} />
        
        {/* Settings */}
        <Route path="settings" element={<Settings />} />
        <Route path="settings/profile" element={<ProfileSettings />} />
        <Route path="settings/users" element={<UserManagement />} />
        
        {/* Staff */}
        <Route path="staff" element={<StaffList />} />
        <Route path="staff/new" element={<StaffForm />} />
        <Route path="staff/:id" element={<StaffDetail />} />
        <Route path="staff/:id/edit" element={<StaffForm />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;