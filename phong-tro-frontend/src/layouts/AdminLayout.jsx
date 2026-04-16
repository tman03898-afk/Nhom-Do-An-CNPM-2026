import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Home, Users, Receipt,
  Wallet, Zap, Hammer, Bell, Leaf, ChevronLeft, ChevronRight, Package
} from 'lucide-react';
import { useState } from 'react';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const links = [
    { name: 'Bảng điều khiển', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Phòng', path: '/admin/rooms', icon: Home },
    { name: 'Khách thuê', path: '/admin/tenants', icon: Users },
    { name: 'Tài sản', path: '/admin/assets', icon: Package },
    { name: 'Hóa đơn', path: '/admin/invoices', icon: Receipt },
    { name: 'Thanh toán', path: '/admin/payments', icon: Wallet },
    { name: 'Dịch vụ', path: '/admin/services', icon: Zap },
    { name: 'Bảo trì', path: '/admin/tickets', icon: Hammer },
    { name: 'Thông báo', path: '/admin/notifications', icon: Bell },
  ];

  return (
    <div className="flex min-h-screen bg-[#DDF5F7] overflow-hidden text-[#0F3A40] font-sans">
      {/* Sidebar */}
      <aside className={`flex flex-col pt-8 pb-6 bg-[#1E4D54] border-r border-[#1E4D54]/20 shadow-2xl z-30 relative transition-all duration-300 ${isCollapsed ? 'w-[88px] px-3' : 'w-[280px] px-6'}`}>
        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-10 w-6 h-6 bg-[#14B8A6] text-white rounded-full flex items-center justify-center shadow-lg border-2 border-[#1E4D54] z-50 hover:scale-110 transition-transform cursor-pointer"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Decorative background element for sidebar */}
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-[#14B8A6]/10 to-transparent pointer-events-none"></div>

        {/* Logo */}
        <div className={`relative flex flex-col mb-12 ${isCollapsed ? 'items-center px-0' : 'px-2'}`}>
          <Link to="/" className="flex items-center gap-3 font-bold text-xl text-white tracking-tight overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#1E4D54] shrink-0 shadow-inner">
              <Leaf className="w-6 h-6 fill-current" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col transition-opacity duration-300">
                <span className="whitespace-nowrap leading-none">The Nest Living</span>
                <span className="text-[10px] opacity-70 mt-1 font-medium tracking-wide">ADMIN DASHBOARD</span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="relative flex flex-col gap-1.5 flex-1">
          {links.map((link) => {
            const isActive = location.pathname.startsWith(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-4 rounded-2xl transition-all duration-300 h-12 overflow-hidden ${isCollapsed ? 'justify-center px-0' : 'px-5'} ${isActive
                  ? 'bg-[#14B8A6] text-white font-bold shadow-lg shadow-[#14B8A6]/20'
                  : 'text-white/70 hover:bg-white/5 hover:text-white font-medium'
                  }`}
              >
                <link.icon className={`w-[18px] h-[18px] transition-colors shrink-0 ${isActive ? 'text-white' : 'text-[#14B8A6]'}`} />
                {!isCollapsed && <span className="text-[13.5px] tracking-wide whitespace-nowrap transition-opacity duration-300">{link.name}</span>}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative transition-all duration-300">
        {/* Top Navbar */}
        <header className="h-[90px] flex items-center justify-between px-10 shrink-0 bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-[0_1px_20px_rgba(0,0,0,0.03)] z-10 relative">
          {/* Top nav links */}
          <div className="flex items-center gap-8 font-bold text-[#4A787C] text-[13.5px]">
            <Link to="/admin/dashboard" className={`pb-[2px] border-b-[3px] transition-all hover:opacity-80 ${location.pathname === '/admin/dashboard' ? 'text-[#0F3A40] border-[#14B8A6]' : 'border-transparent hover:border-[#14B8A6]/30'}`}>Bảng điều khiển</Link>
            <Link to="/admin/assets" className={`pb-[2px] border-b-[3px] transition-all hover:opacity-80 ${location.pathname === '/admin/assets' ? 'text-[#0F3A40] border-[#14B8A6]' : 'border-transparent hover:border-[#14B8A6]/30'}`}>Tài sản</Link>
            <Link to="/admin/analytics" className={`pb-[2px] border-b-[3px] transition-all hover:opacity-80 ${location.pathname === '/admin/analytics' ? 'text-[#0F3A40] border-[#14B8A6]' : 'border-transparent hover:border-[#14B8A6]/30'}`}>Phân tích</Link>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-6">

            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end justify-center">
                <span className="font-bold text-[#0F3A40] text-sm leading-tight tracking-tight">{user?.name || 'Quản trị viên'}</span>
                <button onClick={logout} className="text-[#14B8A6] text-[10px] font-bold hover:text-[#D14D4D] uppercase tracking-wider transition-colors mt-0.5">
                  Đăng xuất
                </button>
              </div>
              <div className="w-11 h-11 rounded-full p-[2px] border-2 border-[#14B8A6]/20 bg-white shadow-sm hover:border-[#14B8A6]/40 transition-all cursor-pointer">
                <div className="w-full h-full rounded-full overflow-hidden">
                  <img src="https://ui-avatars.com/api/?name=Admin&background=14B8A6&color=fff" alt="Admin" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-10 pb-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
