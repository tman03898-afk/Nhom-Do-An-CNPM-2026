import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Home, Users, Receipt,
  ClipboardList, AlertTriangle, Bell, User,
  Leaf, ChevronLeft, ChevronRight, Search, Settings, X
} from 'lucide-react';
import { useState } from 'react';

export default function TenantLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const links = [
    { name: 'Trang chủ', path: '/tenant/dashboard', icon: Home },
    { name: 'Hóa đơn', path: '/tenant/invoices', icon: Receipt },
    { name: 'Hợp đồng', path: '/tenant/contract', icon: ClipboardList },
    { name: 'Yêu cầu sửa chữa', path: '/tenant/tickets', icon: AlertTriangle },
    { name: 'Thông báo', path: '/tenant/notifications', icon: Bell },
    { name: 'Tài khoản', path: '/tenant/profile', icon: User },
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

        {/* Logo */}
        <div className={`relative flex flex-col mb-12 ${isCollapsed ? 'items-center px-0' : 'px-2'}`}>
          <Link to="/" className="flex items-center gap-3 font-bold text-xl text-white tracking-tight overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#1E4D54] shrink-0 shadow-inner">
              <Leaf className="w-6 h-6 fill-current" />
            </div>
            {!isCollapsed && <div className="flex flex-col"><span className="whitespace-nowrap leading-none">The Nest Living</span><span className="text-[10px] opacity-70 mt-1 font-medium tracking-wide">TENANT DASHBOARD</span></div>}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="relative flex flex-col gap-2 flex-1">
          {links.map((link) => {
            const isActive = location.pathname.startsWith(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-4 rounded-2xl transition-all duration-300 h-12 overflow-hidden ${isCollapsed ? 'justify-center px-0' : 'px-5'} ${isActive
                  ? 'bg-white/15 text-white font-bold shadow-lg shadow-black/5'
                  : 'text-white/70 hover:bg-white/5 hover:text-white font-medium'
                  }`}
              >
                <link.icon className={`w-[19px] h-[19px] transition-colors shrink-0 ${isActive ? 'text-[#14B8A6]' : 'text-white/60'}`} />
                {!isCollapsed && <span className="text-[14px] tracking-wide whitespace-nowrap transition-opacity duration-300">{link.name}</span>}
                {isActive && !isCollapsed && <div className="ml-auto w-1.5 h-6 bg-[#14B8A6] rounded-full mr-[-4px]"></div>}
              </Link>
            )
          })}
        </nav>

        {/* User Profile at Bottom */}
        <div className={`mt-auto pt-6 border-t border-white/10 ${isCollapsed ? 'items-center' : 'px-2'}`}>
          <div className={`flex items-center gap-3 bg-white/5 p-3 rounded-2xl ${isCollapsed ? 'justify-center p-2' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-[#14B8A6]/20 border border-[#14B8A6]/30 overflow-hidden shrink-0 flex items-center justify-center">
              <img src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=14B8A6&color=fff`} className="w-full h-full object-cover" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-white text-[13px] font-bold truncate">{user?.name || 'Khách thuê'}</span>
                <span className="text-white/50 text-[11px] truncate mt-0.5">Phòng 301 - Building A</span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button onClick={logout} className="w-full mt-4 text-[#D14D4D] text-[11px] font-bold uppercase tracking-wider hover:opacity-80 transition-opacity">
              Đăng xuất
            </button>
          )}
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative transition-all duration-300">
        {/* Top Header */}
        <header className="h-[90px] flex items-center justify-between px-10 shrink-0 bg-transparent z-10 relative">
          <div className="flex-1"></div>

          {/* User Actions */}
          <div className="flex items-center gap-5">
            <Link to="/tenant/notifications" className="w-10 h-10 rounded-full bg-white/60 backdrop-blur-md flex items-center justify-center text-[#4A787C] hover:text-[#14B8A6] hover:bg-white hover:scale-110 transition-all shadow-sm group">
              <Bell size={18} className="group-hover:rotate-12 transition-transform" />
            </Link>
            <Link to="/tenant/profile" className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md cursor-pointer hover:border-[#14B8A6]/50 hover:scale-110 transition-all">
              <img src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=14B8A6&color=fff`} className="w-full h-full object-cover" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-10 pb-10 scroll-smooth">
          <div className="max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
