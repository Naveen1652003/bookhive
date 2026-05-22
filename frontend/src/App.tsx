import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Public Pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Protected Pages
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import BookForm from './pages/BookForm';
import Orders from './pages/Orders';
import PurchaseOrders from './pages/PurchaseOrders';
import Suppliers from './pages/Suppliers';
import Categories from './pages/Categories';
import Users from './pages/Users';
import Logs from './pages/Logs';

// Route Guards
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected Dashboard Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          
          {/* Inventory Abstractions */}
          <Route path="inventory" element={<Inventory />} />
          <Route path="inventory/add" element={<BookForm />} />
          <Route path="inventory/edit/:id" element={<BookForm />} />
          
          {/* Sourcing & Logistics */}
          <Route path="orders" element={<Orders />} />
          <Route path="purchase-orders" element={<PurchaseOrders />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="categories" element={<Categories />} />

          {/* Admin Management */}
          <Route
            path="users"
            element={
              <ProtectedRoute allowedRoles={['Super Admin', 'Admin']}>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="logs"
            element={
              <ProtectedRoute allowedRoles={['Super Admin', 'Admin']}>
                <Logs />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Fallback Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
