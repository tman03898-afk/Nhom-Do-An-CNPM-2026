import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Home, Receipt, ClipboardList, AlertTriangle, Bell, User,
  Sun, ChevronLeft, ChevronRight, X, Menu, Sparkles
} from 'lucide-react';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { cachedApiFetch, invalidateApiCache } from '../lib/apiCache';

export default function TenantLayout() {
  const { user, token, logout } = useAuth();
  const location = useLocation();
  const routePrefix = location.pathname.startsWith('/app') ? '/app' : '/tenant';
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [roomLabel, setRoomLabel] = useState('---');
  const [unreadCount, setUnreadCount] = useState(0);
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const tenantAvatarSrc = useMemo(() => {
    const raw = user?.avatar_url;
    const name = user?.full_name || user?.name || 'User';
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=14B8A6&color=fff`;
    if (!raw) return fallback;
    if (String(raw).startsWith('http')) return raw;
    const origin = API_BASE_URL.replace(/\/api\/?$/, '');
    return `${origin}${String(raw).startsWith('/') ? raw : `/${raw}`}`;
  }, [API_BASE_URL, user?.avatar_url, user?.full_name, user?.name]);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setRoomLabel('---');
        return;
      }
      try {
        const data = await cachedApiFetch('/tenant/me', { token }, 120_000);
        const roomNumber = data?.tenant?.room_number;
        setRoomLabel(data?.ok && roomNumber ? `Phòng ${roomNumber}` : '---');
      } catch {
        setRoomLabel('---');
      }
    };
    run();
  }, [token]);

  const loadUnread = useCallback(async () => {
    if (!token) {
      setUnreadCount(0);
      return;
    }
    try {
      const data = await cachedApiFetch('/tenant/notifications/unread-count', { token }, 20_000);
      setUnreadCount(Number(data.unread_count) || 0);
    } catch {
      setUnreadCount(0);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- poll unread notifications after layout mount
    loadUnread();
  }, [loadUnread]);

  useEffect(() => {
    const interval = setInterval(loadUnread, 45000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadUnread();
    };
    const onRefresh = () => {
      invalidateApiCache('/tenant/notifications');
      loadUnread();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('tenant-notifications-refresh', onRefresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('tenant-notifications-refresh', onRefresh);
    };
  }, [loadUnread]);

  const links = [
    { name: 'Trang chủ', path: `${routePrefix}/dashboard`, icon: Home },
    { name: 'Hóa đơn', path: `${routePrefix}/invoices`, icon: Receipt },
    { name: 'Dịch vụ', path: `${routePrefix}/services`, icon: Sparkles },
    { name: 'Hợp đồng', path: `${routePrefix}/contract`, icon: ClipboardList },
    { name: 'Hỗ trợ', path: `${routePrefix}/tickets`, icon: AlertTriangle },
    { name: 'Thông báo', path: `${routePrefix}/notifications`, icon: Bell },
    { name: 'Tài khoản', path: `${routePrefix}/profile`, icon: User },
  ];

  const bottomLinks = links.filter((link) =>
    ['dashboard', 'invoices', 'services', 'tickets', 'profile'].some((slug) => link.path.endsWith(slug))
  );

  const currentTitle = links.find((link) => location.pathname.startsWith(link.path))?.name || 'Tổng quan';

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#DDF5F7] font-sans text-[#0F3A40]">
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-[40] bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-[50] flex flex-col bg-[#1E4D54] pb-6 pt-8 shadow-2xl transition-all duration-300 lg:relative
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'w-[280px] lg:w-[88px] lg:px-3' : 'w-[280px] px-6'}
      `}>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-10 z-50 hidden h-6 w-6 items-center justify-center rounded-full border-2 border-[#1E4D54] bg-[#14B8A6] text-white shadow-lg transition-transform hover:scale-110 lg:flex"
          aria-label={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="absolute right-4 top-8 flex h-8 w-8 items-center justify-center text-white/70 hover:text-white lg:hidden"
          aria-label="Đóng menu"
        >
          <X size={24} />
        </button>

        <div className={`relative mb-12 flex flex-col ${isCollapsed ? 'lg:items-center lg:px-0' : 'px-2'}`}>
          <Link to="/" className="group flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-nest-primary shadow-lg shadow-black/20 transition-all group-hover:scale-110 group-hover:rotate-6">
              <Sun className="h-6 w-6 text-white" />
            </div>
            {(!isCollapsed || isMobileMenuOpen) && (
              <div className="flex flex-col">
                <span className="whitespace-nowrap font-bold leading-none text-white">The Sun</span>
                <span className="mt-1.5 whitespace-nowrap text-[10px] font-bold uppercase tracking-[1px] text-white/60">TENANT APP</span>
              </div>
            )}
          </Link>
        </div>

        <nav className="custom-scrollbar relative flex flex-1 flex-col gap-2 overflow-y-auto">
          {links.map((link) => {
            const isActive = location.pathname.startsWith(link.path);
            const showLabel = !isCollapsed || isMobileMenuOpen;
            const isNotif = link.path.endsWith('/notifications');
            const badgeText = isNotif && unreadCount > 0 ? (unreadCount > 99 ? '99+' : String(unreadCount)) : null;
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex h-12 items-center gap-4 overflow-visible rounded-2xl transition-all duration-300 ${(isCollapsed && !isMobileMenuOpen) ? 'justify-center px-0' : 'px-5'} ${
                  isActive ? 'bg-white/15 font-bold text-white shadow-lg shadow-black/5' : 'font-medium text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="relative inline-flex h-[19px] w-[19px] shrink-0 items-center justify-center">
                  <Icon className={`h-[19px] w-[19px] transition-colors ${isActive ? 'text-[#14B8A6]' : 'text-white/60'}`} />
                  {isNotif && badgeText && !showLabel ? (
                    <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-[#1E4D54] bg-red-500 px-0.5 text-[9px] font-extrabold leading-none text-white shadow-md">
                      {badgeText}
                    </span>
                  ) : null}
                </span>
                {showLabel && (
                  <>
                    <span className="flex-1 whitespace-nowrap text-[14px] tracking-wide transition-opacity duration-300">{link.name}</span>
                    {isNotif && badgeText ? (
                      <span className="flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-extrabold leading-none text-white">
                        {badgeText}
                      </span>
                    ) : null}
                    {isActive && <div className="ml-auto mr-[-4px] h-6 w-1.5 rounded-full bg-[#14B8A6]" />}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        <div className={`mt-auto border-t border-white/10 pt-6 ${isCollapsed ? 'lg:items-center' : 'px-2'}`}>
          <div className={`flex items-center gap-3 rounded-2xl bg-white/5 p-3 ${isCollapsed ? 'lg:justify-center lg:p-2' : ''}`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#14B8A6]/30 bg-[#14B8A6]/20">
              <img key={user?.avatar_url || 'av'} src={tenantAvatarSrc} alt="" className="h-full w-full object-cover" />
            </div>
            {(!isCollapsed || isMobileMenuOpen) && (
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[13px] font-bold text-white">{user?.full_name || user?.name || 'Khách thuê'}</span>
                <span className="mt-0.5 truncate whitespace-nowrap text-[11px] text-white/50">{roomLabel}</span>
              </div>
            )}
          </div>
          {(!isCollapsed || isMobileMenuOpen) && (
            <button onClick={logout} className="mt-4 w-full text-[11px] font-bold uppercase tracking-wider text-[#D14D4D] transition-opacity hover:opacity-80">
              Đăng xuất
            </button>
          )}
        </div>
      </aside>

      <div className="relative flex h-screen flex-1 flex-col overflow-hidden transition-all duration-300">
        <header className="relative z-20 flex h-[72px] shrink-0 items-center justify-between border-b border-nest-primary/10 bg-white/90 px-4 shadow-[0_8px_30px_rgba(15,58,64,0.06)] backdrop-blur-2xl lg:h-[88px] lg:px-10">
          <div className="flex min-w-0 flex-1 items-center gap-4 lg:gap-6">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-nest-primary/10 bg-nest-bg text-nest-primary transition-colors hover:bg-nest-primary hover:text-white lg:hidden"
              aria-label="Mở menu"
            >
              <Menu size={20} />
            </button>

            <div className="min-w-0">
              <h2 className="truncate text-[18px] font-extrabold tracking-tight text-[#0F3A40] lg:text-[22px]">
                {currentTitle}
              </h2>
              <p className="truncate text-[11px] font-semibold text-[#5A8B91] sm:hidden">{roomLabel}</p>
            </div>

            <div className="ml-0 hidden items-center gap-2 rounded-full border border-nest-primary/20 bg-nest-bg/80 px-4 py-1.5 shadow-sm backdrop-blur-md sm:flex lg:ml-4">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              <span className="whitespace-nowrap text-[10px] font-bold text-[#4A787C] lg:text-[12px]">{roomLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-5">
            <Link to={`${routePrefix}/notifications`} className="group relative flex h-10 w-10 items-center justify-center rounded-xl border border-transparent bg-white/80 text-[#4A787C] backdrop-blur-md transition-all hover:border-nest-primary/10 hover:bg-white hover:text-[#14B8A6] hover:shadow-lg hover:shadow-nest-primary/10 lg:h-11 lg:w-11 lg:rounded-2xl">
              <Bell size={18} className="transition-transform group-hover:rotate-12" />
              {unreadCount > 0 ? (
                <span className="absolute right-1.5 top-1.5 flex h-5 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white lg:right-2 lg:top-2">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null}
            </Link>
            <Link to={`${routePrefix}/profile`} className="h-9 w-9 cursor-pointer overflow-hidden rounded-full border-2 border-white shadow-md transition-all hover:scale-110 hover:border-[#14B8A6]/50 lg:h-10 lg:w-10">
              <img key={user?.avatar_url || 'av2'} src={tenantAvatarSrc} alt="" className="h-full w-full object-cover" />
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-[104px] pt-4 scroll-smooth lg:px-10 lg:pb-10 lg:pt-10">
          <div className="mx-auto max-w-[1400px]">
            <Outlet />
          </div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-nest-primary/15 bg-white/95 px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_28px_rgba(15,58,64,0.12)] backdrop-blur-xl lg:hidden">
          <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
            {bottomLinks.map((link) => {
              const isActive = location.pathname.startsWith(link.path);
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex h-[58px] flex-col items-center justify-center rounded-xl text-[10px] font-bold transition-colors ${
                    isActive ? 'bg-nest-primary text-white shadow-md shadow-nest-primary/20' : 'text-[#5A8B91] hover:bg-nest-surface'
                  }`}
                  aria-label={link.name}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="mt-1 max-w-full truncate px-1 leading-none">{link.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
