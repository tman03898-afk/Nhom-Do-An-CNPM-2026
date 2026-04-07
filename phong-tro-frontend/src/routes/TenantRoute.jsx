import { Navigate, Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import { useAuth } from '../context/AuthContext';

export default function TenantRoute() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'TENANT') return <Navigate to="/" replace />; // Role mismatch

  return (
    <div className="flex min-h-screen bg-nest-bg">
      <Sidebar role="tenant" />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="glass-card max-w-6xl mx-auto min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
