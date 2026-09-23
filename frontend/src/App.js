// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Root Component
// ============================================================

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './App.css';
import { AuthProvider } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext';
import { AppProvider } from './contexts/AppContext';
import { ShopProvider } from './contexts/ShopContext';
import { BranchProvider } from './contexts/BranchContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { toastOptions } from './styles/toastConfig';

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
import QuickSale from './components/orders/QuickSale';
import PaymentList from './components/payments/PaymentList';
import ExpenseList from './components/expenses/ExpenseList';
import ExpenseForm from './components/expenses/ExpenseForm';
import ExpenseDetail from './components/expenses/ExpenseDetail';
import SupplierList from './components/suppliers/SupplierList';
import SupplierForm from './components/suppliers/SupplierForm';
import SupplierDetail from './components/suppliers/SupplierDetail';
import POList from './components/purchase-orders/POList';
import POForm from './components/purchase-orders/POForm';
import PODetail from './components/purchase-orders/PODetail';
import SalesReport from './components/reports/SalesReport';
import ProfitReport from './components/reports/ProfitReport';
import InventoryReport from './components/reports/InventoryReport';
import ExtractReports from './components/reports/ExtractReports';
import AuditLog from './components/audit/AuditLog';
import Settings from './components/settings/Settings';
import ProfileSettings from './components/settings/ProfileSettings';
import StaffList from './components/staff/StaffList';
import StaffForm from './components/staff/StaffForm';
import StaffDetail from './components/staff/StaffDetail';
import PrivateRoute from './components/common/PrivateRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import Signup from './components/auth/Signup';

// ---------- Admin ----------
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminBusinesses from './pages/admin/AdminBusinesses';
import AdminBusinessDetail from './pages/admin/AdminBusinessDetail';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminCustomerDetail from './pages/admin/AdminCustomerDetail';
import AdminPaymentSubmissions from './pages/admin/AdminPaymentSubmissions';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AdminProvider>
          <BranchProvider>
            <SubscriptionProvider>
              <AppProvider>
                <ShopProvider>
                  <BrowserRouter>
                    <Toaster position="top-right" toastOptions={toastOptions} />

                    <Routes>
                      <Route path="/login" element={<Login />} />
                      <Route path="/signup" element={<Signup />} />

                      {/* ---------- Admin login (no shell) ---------- */}
                      <Route path="/admin/login" element={<AdminLogin />} />

                      {/* ---------- Admin (with shell) ---------- */}
                      <Route path="/admin" element={<AdminLayout />}>
                        <Route index element={<Navigate to="/admin/dashboard" replace />} />
                        <Route path="dashboard" element={<AdminDashboard />} />
                        <Route path="businesses" element={<AdminBusinesses />} />
                        <Route path="businesses/:id" element={<AdminBusinessDetail />} />
                        <Route path="customers" element={<AdminCustomers />} />
                        <Route path="customers/:id" element={<AdminCustomerDetail />} />
                        <Route path="audit-logs" element={<AdminAuditLogs />} />
                        <Route path="payment-submissions" element={<AdminPaymentSubmissions />} />
                      </Route>

                      {/* ---------- Customer app ---------- */}
                      <Route
                        path="/"
                        element={
                          <PrivateRoute>
                            <Layout />
                          </PrivateRoute>
                        }
                      >
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard" element={<Dashboard />} />

                        <Route path="products" element={<ProductList />} />
                        <Route path="products/new" element={<ProductForm />} />
                        <Route path="products/:id" element={<ProductDetail />} />
                        <Route path="products/:id/edit" element={<ProductForm />} />

                        <Route path="categories" element={<CategoryManager />} />

                        <Route path="customers" element={<CustomerList />} />
                        <Route path="customers/new" element={<CustomerForm />} />
                        <Route path="customers/:id" element={<CustomerDetail />} />
                        <Route path="customers/:id/edit" element={<CustomerForm />} />

                        <Route path="orders" element={<OrderList />} />
                        <Route path="orders/new" element={<OrderForm />} />
                        <Route path="orders/quick" element={<QuickSale />} />
                        <Route path="orders/:id" element={<OrderDetail />} />

                        <Route path="payments" element={<PaymentList />} />

                        <Route path="expenses" element={<ExpenseList />} />
                        <Route path="expenses/new" element={<ExpenseForm />} />
                        <Route path="expenses/:id" element={<ExpenseDetail />} />
                        <Route path="expenses/:id/edit" element={<ExpenseForm />} />

                        <Route path="suppliers" element={<SupplierList />} />
                        <Route path="suppliers/new" element={<SupplierForm />} />
                        <Route path="suppliers/:id" element={<SupplierDetail />} />
                        <Route path="suppliers/:id/edit" element={<SupplierForm />} />

                        <Route path="purchase-orders" element={<POList />} />
                        <Route path="purchase-orders/new" element={<POForm />} />
                        <Route path="purchase-orders/:id" element={<PODetail />} />
                        <Route path="purchase-orders/:id/edit" element={<POForm />} />

                        <Route path="reports/sales" element={<SalesReport />} />
                        <Route path="reports/profit" element={<ProfitReport />} />
                        <Route path="reports/inventory" element={<InventoryReport />} />
                        <Route path="reports/extract" element={<ExtractReports />} />

                        <Route path="audit-log" element={<AuditLog />} />

                        <Route path="settings" element={<Settings />} />
                        <Route path="settings/profile" element={<ProfileSettings />} />

                        <Route path="staff" element={<StaffList />} />
                        <Route path="staff/new" element={<StaffForm />} />
                        <Route path="staff/:id" element={<StaffDetail />} />
                        <Route path="staff/:id/edit" element={<StaffForm />} />
                      </Route>
                    </Routes>
                  </BrowserRouter>
                </ShopProvider>
              </AppProvider>
            </SubscriptionProvider>
          </BranchProvider>
        </AdminProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;