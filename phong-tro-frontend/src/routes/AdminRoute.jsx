import { Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  
  // Kiểm tra quyền Admin (không phân biệt hoa thường)
  if (user.role?.toUpperCase() !== 'ADMIN') return <Navigate to="/" replace />;

  return <AdminLayout />;
}
