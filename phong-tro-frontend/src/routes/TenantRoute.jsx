import { Navigate, Outlet } from 'react-router-dom';
import TenantLayout from '../layouts/TenantLayout';
import { useAuth } from '../context/AuthContext';

export default function TenantRoute() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'TENANT') return <Navigate to="/" replace />; // Role mismatch

  return (
    <TenantLayout>
      <Outlet />
    </TenantLayout>
  );
}
