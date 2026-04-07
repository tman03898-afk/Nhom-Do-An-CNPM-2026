import { Routes, Route, Navigate } from 'react-router-dom';
import GuestRoute from './GuestRoute';
import TenantRoute from './TenantRoute';
import AdminRoute from './AdminRoute';

import HomePage from '../pages/guest/HomePage';
import RoomDetailPage from '../pages/guest/RoomDetailPage';
import LoginPage from '../pages/auth/LoginPage';

import TenantDashboard from '../pages/tenant/DashboardPage';
import ContractPage from '../pages/tenant/ContractPage';
import TenantInvoicePage from '../pages/tenant/InvoicePage';
import PaymentPage from '../pages/tenant/PaymentPage';
import TenantTicketPage from '../pages/tenant/TicketPage';
import TenantNotificationPage from '../pages/tenant/NotificationPage';

import AdminDashboard from '../pages/admin/DashboardPage';
import RoomManagePage from '../pages/admin/RoomManagePage';
import TenantManagePage from '../pages/admin/TenantManagePage';
import AdminInvoicePage from '../pages/admin/InvoiceManagePage';
import AdminPaymentPage from '../pages/admin/PaymentManagePage';
import ServiceManagePage from '../pages/admin/ServiceManagePage';
import AdminTicketPage from '../pages/admin/TicketManagePage';
import AdminNotificationPage from '../pages/admin/NotificationManagePage';

export default function AppRouter() {
  return (
    <Routes>
      {/* Root/Guest Routes */}
      <Route path="/" element={<GuestRoute />}>
        <Route index element={<HomePage />} />
        <Route path="rooms/:id" element={<RoomDetailPage />} />
      </Route>

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />

      {/* Tenant Routes */}
      <Route path="/tenant" element={<TenantRoute />}>
        <Route path="dashboard" element={<TenantDashboard />} />
        <Route path="contract" element={<ContractPage />} />
        <Route path="invoices" element={<TenantInvoicePage />} />
        <Route path="payment" element={<PaymentPage />} />
        <Route path="tickets" element={<TenantTicketPage />} />
        <Route path="notifications" element={<TenantNotificationPage />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={<AdminRoute />}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="rooms" element={<RoomManagePage />} />
        <Route path="tenants" element={<TenantManagePage />} />
        <Route path="invoices" element={<AdminInvoicePage />} />
        <Route path="payments" element={<AdminPaymentPage />} />
        <Route path="services" element={<ServiceManagePage />} />
        <Route path="tickets" element={<AdminTicketPage />} />
        <Route path="notifications" element={<AdminNotificationPage />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
