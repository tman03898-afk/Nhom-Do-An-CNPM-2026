import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Home, Receipt, ClipboardList, AlertTriangle, Bell, User,
  Bird, ChevronLeft, ChevronRight, X, Menu
} from 'lucide-react';
import { useState } from 'react';

export default function TenantLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const links = [
    { name: 'Trang chủ', path: '/tenant/dashboard', icon: Home },
    { name: 'Hóa đơn', path: '/tenant/invoices', icon: Receipt },
    { name: 'Hợp đồng', path: '/tenant/contract', icon: ClipboardList },
    { name: 'Hỗ trợ', path: '/tenant/tickets', icon: AlertTriangle },
    { name: 'Thông báo', path: '/tenant/notifications', icon: Bell },
    { name: 'Tài khoản', path: '/tenant/profile', icon: User },
  ];

  return (
    <div className="flex min-h-screen bg-[#DDF5F7] overflow-hidden text-[#0F3A40] font-sans relative">
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[40] lg:hidden transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 lg:relative z-[50]
        flex flex-col pt-8 pb-6 bg-[#1E4D54] border-r border-[#1E4D54]/20 shadow-2xl transition-all duration-300
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'w-[280px] lg:w-[88px] lg:px-3' : 'w-[280px] px-6'}
      `}>
        {/* Toggle Button (Desktop Only) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-10 w-6 h-6 bg-[#14B8A6] text-white rounded-full items-center justify-center shadow-lg border-2 border-[#1E4D54] z-50 hover:scale-110 transition-transform cursor-pointer"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Close Button (Mobile Only) */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden absolute right-4 top-8 w-8 h-8 flex items-center justify-center text-white/70 hover:text-white"
        >
          <X size={24} />
        </button>

        {/* Logo */}
        <div className={`relative flex flex-col mb-12 ${isCollapsed ? 'lg:items-center lg:px-0' : 'px-2'}`}>
          <Link to="/" className="flex items-center gap-3 group overflow-hidden">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-nest-primary shadow-lg shadow-black/20 shrink-0 group-hover:scale-110 group-hover:rotate-6`}>
              <Bird className="w-6 h-6 text-white" />
            </div>
            {(!isCollapsed || isMobileMenuOpen) && (
              <div className="flex flex-col">
                <span className="text-white whitespace-nowrap leading-none font-bold">The Nest Living</span>
                <span className="text-white/60 text-[10px] opacity-70 mt-1.5 font-bold tracking-[1px] uppercase whitespace-nowrap">TENANT DASHBOARD</span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="relative flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar">
          {links.map((link) => {
            const isActive = location.pathname.startsWith(link.path);
            const showLabel = !isCollapsed || isMobileMenuOpen;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-4 rounded-2xl transition-all duration-300 h-12 overflow-hidden ${(isCollapsed && !isMobileMenuOpen) ? 'justify-center px-0' : 'px-5'} ${isActive
                  ? 'bg-white/15 text-white font-bold shadow-lg shadow-black/5'
                  : 'text-white/70 hover:bg-white/5 hover:text-white font-medium'
                  }`}
              >
                <link.icon className={`w-[19px] h-[19px] transition-colors shrink-0 ${isActive ? 'text-[#14B8A6]' : 'text-white/60'}`} />
                {showLabel && <span className="text-[14px] tracking-wide whitespace-nowrap transition-opacity duration-300">{link.name}</span>}
                {isActive && showLabel && <div className="ml-auto w-1.5 h-6 bg-[#14B8A6] rounded-full mr-[-4px]"></div>}
              </Link>
            )
          })}
        </nav>

        {/* User Profile at Bottom */}
        <div className={`mt-auto pt-6 border-t border-white/10 ${isCollapsed ? 'lg:items-center' : 'px-2'}`}>
          <div className={`flex items-center gap-3 bg-white/5 p-3 rounded-2xl ${isCollapsed ? 'lg:justify-center lg:p-2' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-[#14B8A6]/20 border border-[#14B8A6]/30 overflow-hidden shrink-0 flex items-center justify-center">
              <img src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=14B8A6&color=fff`} className="w-full h-full object-cover" />
            </div>
            {(!isCollapsed || isMobileMenuOpen) && (
              <div className="flex flex-col min-w-0">
                <span className="text-white text-[13px] font-bold truncate">{user?.name || 'Khách thuê'}</span>
                <span className="text-white/50 text-[11px] truncate mt-0.5 whitespace-nowrap">Phòng 301 - Building A</span>
              </div>
            )}
          </div>
          {(!isCollapsed || isMobileMenuOpen) && (
            <button onClick={logout} className="w-full mt-4 text-[#D14D4D] text-[11px] font-bold uppercase tracking-wider hover:opacity-80 transition-opacity">
              Đăng xuất
            </button>
          )}
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative transition-all duration-300">
        {/* Top Header */}
        <header className="h-[72px] lg:h-[88px] flex items-center justify-between px-4 lg:px-10 shrink-0 bg-white/90 backdrop-blur-2xl border-b border-nest-primary/10 shadow-[0_8px_30px_rgba(15,58,64,0.06)] z-20 relative">
          <div className="flex items-center gap-4 lg:gap-6 flex-1">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-nest-bg text-nest-primary hover:bg-nest-primary hover:text-white transition-colors border border-nest-primary/10"
            >
              <Menu size={20} />
            </button>

            <h2 className="text-[18px] lg:text-[22px] font-sans font-extrabold text-[#0F3A40] tracking-tight truncate">
              {links.find(l => location.pathname.startsWith(l.path))?.name || 'Tổng quan'}
            </h2>

            {/* Context Pill */}
            <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-nest-bg/80 backdrop-blur-md rounded-full border border-nest-primary/20 shadow-sm ml-0 lg:ml-4">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] lg:text-[12px] font-bold text-[#4A787C] whitespace-nowrap">Phòng 301 - Building A</span>
            </div>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-3 lg:gap-5">
            <Link to="/tenant/notifications" className="relative w-10 h-10 lg:w-11 lg:h-11 rounded-xl lg:rounded-2xl bg-white/80 backdrop-blur-md flex items-center justify-center text-[#4A787C] hover:text-[#14B8A6] hover:bg-white hover:shadow-lg hover:shadow-nest-primary/10 transition-all border border-transparent hover:border-nest-primary/10 group">
              <Bell size={18} className="group-hover:rotate-12 transition-transform lg:size-[20px]" />
              <span className="absolute top-2.5 right-2.5 lg:top-3 lg:right-3 w-1.5 lg:w-2 h-1.5 lg:h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
            </Link>
            <Link to="/tenant/profile" className="w-9 h-9 lg:w-10 lg:h-10 rounded-full overflow-hidden border-2 border-white shadow-md cursor-pointer hover:border-[#14B8A6]/50 hover:scale-110 transition-all">
              <img src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=14B8A6&color=fff`} className="w-full h-full object-cover" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-4 lg:px-10 pt-6 lg:pt-10 pb-10 scroll-smooth">
          <div className="max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
