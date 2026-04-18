import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Home, Users, Receipt,
  Wallet, Zap, Hammer, Bell, Bird, ChevronLeft, ChevronRight, Package, ClipboardList
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
    { name: 'Hợp đồng', path: '/admin/contracts', icon: ClipboardList },
    { name: 'Hóa đơn', path: '/admin/invoices', icon: Receipt },
    { name: 'Thanh toán', path: '/admin/payments', icon: Wallet },
    { name: 'Dịch vụ và tiện ích', path: '/admin/services', icon: Zap },
    { name: 'Trang thiết bị', path: '/admin/assets', icon: Package },
    { name: 'Bảo trì', path: '/admin/tickets', icon: Hammer },
    { name: 'Thông báo', path: '/admin/notifications', icon: Bell },
  ];

  return (
    <div className="flex min-h-screen bg-nest-bg overflow-hidden text-[#0F3A40] font-sans">
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
          <Link to="/" className="flex items-center gap-3 group overflow-hidden">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-nest-primary shadow-lg shadow-black/20 shrink-0 group-hover:scale-110 group-hover:rotate-6`}>
              <Bird className="w-6 h-6 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col -gap-1 transition-opacity duration-300">
                <span className="text-[17px] font-black tracking-[-0.5px] text-white font-playfair leading-none">THE NEST</span>
                <span className="text-[9px] font-bold tracking-[2px] uppercase text-white/70 mt-1">Living Space</span>
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
        <header className="h-[88px] flex items-center justify-between px-10 shrink-0 bg-white/90 backdrop-blur-2xl border-b border-nest-primary/10 shadow-[0_8px_30px_rgba(15,58,64,0.06)] z-20 relative">
          {/* Top nav links / Breadcrumbs style */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-1.5 py-1.5 bg-nest-bg/80 backdrop-blur-md rounded-[20px] border border-nest-primary/20 shadow-sm">
               <Link to="/admin/dashboard" className={`text-[13px] font-bold transition-all px-4 py-2 rounded-[14px] ${location.pathname === '/admin/dashboard' ? 'bg-nest-primary text-white shadow-md shadow-nest-primary/20' : 'text-nest-text-secondary hover:text-nest-primary hover:bg-white/50'}`}>
                  Bảng điều khiển
               </Link>
               <div className="w-[1px] h-3 bg-nest-text-primary/5 mx-1"></div>
               <Link to="/admin/analytics" className={`text-[13px] font-bold transition-all px-4 py-2 rounded-[14px] ${location.pathname === '/admin/analytics' ? 'bg-nest-primary text-white shadow-md shadow-nest-primary/20' : 'text-nest-text-secondary hover:text-nest-primary hover:bg-white/50'}`}>
                  Phân tích
               </Link>
            </div>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-7">
            {/* Notification Bell */}
            <button className="relative w-11 h-11 rounded-2xl bg-white flex items-center justify-center text-nest-text-secondary hover:text-nest-primary hover:shadow-lg hover:shadow-nest-primary/10 transition-all border border-transparent hover:border-nest-primary/10 group">
               <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
               <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
            </button>

            {/* Profile Section */}
            <div className="flex items-center gap-4 pl-6 border-l border-nest-text-primary/10">
              <div className="flex flex-col items-end justify-center">
                <span className="font-bold text-nest-text-primary text-[14px] leading-none tracking-tight">{user?.name || 'Administrator'}</span>
                <button onClick={logout} className="text-nest-primary text-[10px] font-extrabold hover:text-red-500 uppercase tracking-[1px] transition-colors mt-1.5 opacity-70 hover:opacity-100">
                   Sign Out
                </button>
              </div>
              <div className="relative group cursor-pointer">
                <div className="w-12 h-12 rounded-2xl p-[3px] bg-gradient-to-tr from-nest-primary to-nest-bg shadow-md group-hover:shadow-nest-primary/30 transition-all group-hover:scale-105">
                  <div className="w-full h-full rounded-[13px] overflow-hidden border-2 border-white">
                    <img src="https://ui-avatars.com/api/?name=Admin&background=14B8A6&color=fff" alt="Admin" className="w-full h-full object-cover" />
                  </div>
                </div>
                {/* Active Status Dot */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-[3px] border-white shadow-sm ring-1 ring-black/5"></div>
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
