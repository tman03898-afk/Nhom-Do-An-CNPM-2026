import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Home, Users, FileText, 
  Settings, AlertTriangle, Bell, FileSignature
} from 'lucide-react';

export default function Sidebar({ role }) {
  const location = useLocation();
  
  const tenantLinks = [
    { name: 'Dashboard', path: '/tenant/dashboard', icon: LayoutDashboard },
    { name: 'Cá nhân & Hợp đồng', path: '/tenant/contract', icon: FileSignature },
    { name: 'Hóa đơn', path: '/tenant/invoices', icon: FileText },
    { name: 'Thanh toán', path: '/tenant/payment', icon: FileText },
    { name: 'Báo sự cố', path: '/tenant/tickets', icon: AlertTriangle },
    { name: 'Thông báo', path: '/tenant/notifications', icon: Bell },
  ];

  const adminLinks = [
    { name: 'Tổng quan', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Quản lý Phòng', path: '/admin/rooms', icon: Home },
    { name: 'Quản lý Khách thuê', path: '/admin/tenants', icon: Users },
    { name: 'Quản lý Hóa đơn', path: '/admin/invoices', icon: FileText },
    { name: 'Dịch vụ', path: '/admin/services', icon: Settings },
    { name: 'Bảo trì & Sự cố', path: '/admin/tickets', icon: AlertTriangle },
    { name: 'Thông báo', path: '/admin/notifications', icon: Bell },
  ];

  const links = role === 'admin' ? adminLinks : tenantLinks;

  return (
    <aside className="w-64 glass-card my-4 ml-4 flex flex-col p-4 mr-0 border-r border-nest-primary/10">
      <div className="font-sans font-bold text-nest-text-primary text-xl mb-8 mt-2 px-2 flex items-center gap-2 uppercase tracking-tight">
        <span>{role === 'admin' ? 'Admin Dashboard' : 'Tenant Dashboard'}</span>
      </div>
      <nav className="flex flex-col gap-2 flex-1">
        {links.map(link => {
          const isActive = location.pathname.startsWith(link.path);
          return (
            <Link 
              key={link.path} 
              to={link.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-gradient-to-r from-nest-primary/10 to-transparent border-l-4 border-nest-primary text-nest-primary font-bold' : 'text-nest-text-secondary border-l-4 border-transparent hover:bg-nest-surface hover:text-nest-text-primary'}`}
            >
              <link.icon className="w-5 h-5" />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
