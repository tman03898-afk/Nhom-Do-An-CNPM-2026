import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import {
  LayoutDashboard, Home, Users, Receipt,
  Wallet, Zap, Hammer, Bell, Bird, ChevronLeft, ChevronRight, Package, ClipboardList, Menu, X, History
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';

/** Khóa badge khớp GET /admin/nav-badges → badges */
const BADGE_BY_PATH = {
  '/admin/contracts': 'contracts',
  '/admin/invoices': 'invoices',
  '/admin/payments': 'payments',
  '/admin/tickets': 'tickets',
  '/admin/notifications': 'notifications',
};

function formatBadgeCount(n) {
  const x = Number(n) || 0;
  if (x <= 0) return null;
  return x > 99 ? '99+' : String(x);
}

/** Số server − mốc đã vào trang; baseline undefined = chưa “xóa đỏ” → hiện full. */
function deltaNavBadge(serverCount, baselineVal) {
  const s = Number(serverCount) || 0;
  if (baselineVal === undefined || baselineVal === null) return s;
  const b = Number(baselineVal);
  if (Number.isNaN(b)) return s;
  return Math.max(0, s - b);
}

const BASELINE_STORAGE_KEY = 'admin-nav-badge-baseline';

export default function AdminLayout() {
  const { user, logout, token } = useAuth();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [badges, setBadges] = useState({});
  const [baseline, setBaseline] = useState(() => {
    try {
      const raw = sessionStorage.getItem(BASELINE_STORAGE_KEY);
      if (!raw) return {};
      const o = JSON.parse(raw);
      return typeof o === 'object' && o && !Array.isArray(o) ? o : {};
    } catch {
      return {};
    }
  });
  /** Tránh snap lại khi chỉ polling trong cùng route */
  const lastSnappedPathRef = useRef('');

  const loadBadges = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch('/admin/nav-badges', { token });
      setBadges(data.badges || {});
    } catch {
      setBadges({});
    }
  }, [token]);

  /** Mỗi lần đổi trang: cập nhật số badge ngay (kèm lần đầu vào layout). */
  useEffect(() => {
    loadBadges();
  }, [loadBadges, location.pathname]);

  /** Polling + tab hiện lại + sự kiện sau khi đánh dấu đã đọc thông báo… */
  useEffect(() => {
    const interval = setInterval(loadBadges, 30000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadBadges();
    };
    const onRefresh = () => loadBadges();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('admin-nav-badges-refresh', onRefresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('admin-nav-badges-refresh', onRefresh);
    };
  }, [loadBadges]);

  useEffect(() => {
    try {
      sessionStorage.setItem(BASELINE_STORAGE_KEY, JSON.stringify(baseline));
    } catch {
      /* ignore */
    }
  }, [baseline]);

  /** Hàng đợi giảm (đã xử lý) → hạ mốc để không bị âm / kẹt số. */
  useEffect(() => {
    setBaseline((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const k of Object.keys(badges)) {
        const s = Number(badges[k]) || 0;
        const b = next[k];
        if (b !== undefined && s < b) {
          next[k] = s;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [badges]);

  /** Mỗi lần vào đúng route có badge: coi như đã xem → ẩn đỏ cho mức hiện tại. */
  useEffect(() => {
    const key = BADGE_BY_PATH[location.pathname];
    if (!key || !token) return;
    if (Object.keys(badges).length === 0) return;

    if (lastSnappedPathRef.current !== location.pathname) {
      lastSnappedPathRef.current = location.pathname;
      const s = Number(badges[key]) || 0;
      setBaseline((prev) => ({ ...prev, [key]: s }));
    }
  }, [location.pathname, token, badges]);

  const notificationBellDelta = deltaNavBadge(badges.notifications, baseline.notifications);

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
    { name: 'Lịch sử xóa', path: '/admin/removal-log', icon: History },
  ];

  return (
    <div className="flex min-h-screen bg-nest-bg overflow-hidden text-[#0F3A40] font-sans relative">
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

        {/* Decorative background element for sidebar */}
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-[#14B8A6]/10 to-transparent pointer-events-none"></div>

        {/* Logo */}
        <div className={`relative flex flex-col mb-12 ${isCollapsed ? 'lg:items-center lg:px-0' : 'px-2'}`}>
          <Link to="/" className="flex items-center gap-3 group overflow-hidden">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-nest-primary shadow-lg shadow-black/20 shrink-0 group-hover:scale-110 group-hover:rotate-6`}>
              <Bird className="w-6 h-6 text-white" />
            </div>
            {(!isCollapsed || isMobileMenuOpen) && (
              <div className="flex flex-col -gap-1 transition-opacity duration-300">
                <span className="text-[17px] font-black tracking-[-0.5px] text-white font-playfair leading-none uppercase">THE NEST</span>
                <span className="text-[9px] font-bold tracking-[2px] uppercase text-white/70 mt-1">Living Space</span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="relative flex flex-col gap-1.5 flex-1 overflow-y-auto custom-scrollbar">
          {links.map((link) => {
            const isActive = location.pathname.startsWith(link.path);
            const showLabel = !isCollapsed || isMobileMenuOpen;
            const badgeKey = BADGE_BY_PATH[link.path];
            const rawCount = badgeKey
              ? deltaNavBadge(badges[badgeKey], baseline[badgeKey])
              : 0;
            const badgeText = formatBadgeCount(rawCount);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`relative flex items-center gap-4 rounded-2xl transition-all duration-300 min-h-12 overflow-visible ${(!showLabel) ? 'justify-center px-0' : 'px-5'} ${isActive
                  ? 'bg-[#14B8A6] text-white font-bold shadow-lg shadow-[#14B8A6]/20'
                  : 'text-white/70 hover:bg-white/5 hover:text-white font-medium'
                  }`}
              >
                <span className="relative inline-flex items-center justify-center shrink-0 w-[18px] h-[18px]">
                  <link.icon className={`w-[18px] h-[18px] transition-colors ${isActive ? 'text-white' : 'text-[#14B8A6]'}`} />
                  {!showLabel && badgeText ? (
                    <span className="absolute -right-2 -top-2 min-w-[18px] h-[18px] px-0.5 rounded-full bg-red-500 text-white text-[9px] font-extrabold flex items-center justify-center leading-none shadow-md border border-[#1E4D54]">
                      {badgeText}
                    </span>
                  ) : null}
                </span>
                {showLabel && (
                  <>
                    <span className="flex-1 text-[13.5px] tracking-wide whitespace-nowrap transition-opacity duration-300">{link.name}</span>
                    {badgeText ? (
                      <span className="min-w-[22px] h-[22px] px-1 rounded-full bg-red-500 text-white text-[11px] font-extrabold flex items-center justify-center leading-none shadow-sm shrink-0">
                        {badgeText}
                      </span>
                    ) : null}
                  </>
                )}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative transition-all duration-300">
        {/* Top Navbar */}
        <header className="h-[72px] lg:h-[88px] flex items-center justify-between px-4 lg:px-10 shrink-0 bg-white/90 backdrop-blur-2xl border-b border-nest-primary/10 shadow-[0_8px_30px_rgba(15,58,64,0.06)] z-20 relative">
          <div className="flex items-center gap-4">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-nest-bg text-nest-primary hover:bg-nest-primary hover:text-white transition-colors border border-nest-primary/10"
            >
              <Menu size={20} />
            </button>

            {/* Top nav links / Breadcrumbs style - Hidden on Mobile */}
            <div className="hidden md:flex items-center gap-2">
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
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-3 lg:gap-7">
            <Link
              to="/admin/notifications"
              className="relative w-10 h-10 lg:w-11 lg:h-11 rounded-xl lg:rounded-2xl bg-white flex items-center justify-center text-nest-text-secondary hover:text-nest-primary hover:shadow-lg hover:shadow-nest-primary/10 transition-all border border-transparent hover:border-nest-primary/10 group"
              aria-label="Thông báo"
            >
               <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
               {formatBadgeCount(notificationBellDelta) ? (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center leading-none border-2 border-white shadow-sm">
                     {formatBadgeCount(notificationBellDelta)}
                  </span>
               ) : null}
            </Link>

            {/* Profile Section */}
            <div className="flex items-center gap-2 lg:gap-4 pl-3 lg:pl-6 border-l border-nest-text-primary/10">
              <div className="hidden sm:flex flex-col items-end justify-center">
                <span className="font-bold text-nest-text-primary text-[13px] lg:text-[14px] leading-none tracking-tight">{user?.name || 'Administrator'}</span>
                <button onClick={logout} className="text-nest-primary text-[10px] font-extrabold hover:text-red-500 uppercase tracking-[1px] transition-colors mt-1.5 opacity-70 hover:opacity-100">
                   Sign Out
                </button>
              </div>
              <div className="relative group cursor-pointer">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl p-[2px] lg:p-[3px] bg-gradient-to-tr from-nest-primary to-nest-bg shadow-md group-hover:shadow-nest-primary/30 transition-all group-hover:scale-105">
                  <div className="w-full h-full rounded-[9px] lg:rounded-[13px] overflow-hidden border-2 border-white">
                    <img src="https://ui-avatars.com/api/?name=Admin&background=14B8A6&color=fff" alt="Admin" className="w-full h-full object-cover" />
                  </div>
                </div>
                {/* Active Status Dot */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 lg:w-3.5 lg:h-3.5 bg-green-500 rounded-full border-[2.5px] lg:border-[3px] border-white shadow-sm ring-1 ring-black/5"></div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-4 lg:px-10 pb-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
