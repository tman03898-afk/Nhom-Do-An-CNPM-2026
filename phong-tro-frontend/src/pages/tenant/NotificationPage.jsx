import { useEffect, useMemo, useState } from 'react';
import { CheckCheck, ChevronRight, Search, SearchX, X, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';

const FILTERS = [
  { id: 'UNREAD', label: 'Chưa đọc' },
  { id: 'READ', label: 'Đã đọc' },
  { id: 'ALL', label: 'Tất cả' },
];

export default function TenantNotificationPage() {
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('UNREAD');
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await apiFetch('/tenant/notifications', { token });
      setNotifications(data.notifications || []);
    } catch {
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const notificationItems = useMemo(() => {
    return notifications.map((n) => ({
      id: n.notification_id,
      title: n.title || 'Thông báo',
      desc: n.body || '',
      time: n.created_at ? new Date(n.created_at).toLocaleString('vi-VN') : '',
      isNew: !n.is_read,
    }));
  }, [notifications]);

  const unreadCount = notificationItems.filter((n) => n.isNew).length;
  const readCount = notificationItems.length - unreadCount;

  const filteredNotifications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notificationItems.filter((n) => {
      if (statusFilter === 'UNREAD' && !n.isNew) return false;
      if (statusFilter === 'READ' && n.isNew) return false;
      if (!q) return true;
      return n.title.toLowerCase().includes(q) || n.desc.toLowerCase().includes(q);
    });
  }, [notificationItems, searchQuery, statusFilter]);

  const countFor = (id) => {
    if (id === 'UNREAD') return unreadCount;
    if (id === 'READ') return readCount;
    return notificationItems.length;
  };

  const markRead = async (id) => {
    if (!token) return;
    try {
      await apiFetch(`/tenant/notifications/${id}/read`, { token, method: 'POST' });
    } catch {}
    await fetchNotifications();
    window.dispatchEvent(new Event('tenant-notifications-refresh'));
  };

  const markAllRead = async () => {
    if (!token || unreadCount === 0) return;
    try {
      await apiFetch('/tenant/notifications/mark-all-read', { token, method: 'POST' });
    } catch {}
    await fetchNotifications();
    window.dispatchEvent(new Event('tenant-notifications-refresh'));
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-[34px] font-sans font-bold text-[#0F3A40] tracking-tight">Thông báo</h1>
        <p className="text-[14.5px] text-[#4A787C] font-medium mt-2">
          Theo dõi cập nhật từ ban quản lý, tách rõ mục chưa đọc và đã đọc.
        </p>
      </div>

      <div className="bg-white/60 backdrop-blur-md rounded-[28px] p-5 border border-white shadow-sm overflow-hidden">
        <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 p-2 border-b border-[#BCE1E5]/30 mb-3">
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatusFilter(filter.id)}
                className={`px-4 py-2 rounded-full text-[12px] font-bold transition-all ${
                  statusFilter === filter.id
                    ? 'bg-[#0F3A40] text-white shadow-sm'
                    : 'bg-white/70 text-[#4A787C] border border-[#BCE1E5]/40 hover:bg-[#F2FCFD]'
                }`}
              >
                {filter.label} ({countFor(filter.id)})
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 xl:items-center">
            <div className="relative w-full sm:w-[300px] group">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#82ABB0] group-focus-within:text-[#14B8A6] transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm thông báo..."
                className="w-full bg-[#F2FCFD] border border-[#BCE1E5]/40 rounded-2xl pl-10 pr-10 py-2.5 text-[13px] outline-none focus:border-[#14B8A6]/30 transition-all font-bold text-[#0F3A40]"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#82ABB0] hover:text-[#D14D4D] transition-colors"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="shrink-0 px-4 py-2.5 rounded-2xl bg-[#14B8A6] text-white text-[12px] font-bold disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <CheckCheck size={15} /> Đánh dấu đã đọc
            </button>
          </div>
        </div>

        <div className="space-y-1 max-h-[68vh] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="py-10 text-center text-[13px] font-medium text-[#4A787C]">Đang tải thông báo...</div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => n.isNew && markRead(n.id)}
                className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group ${
                  n.isNew
                    ? 'bg-white border border-[#BCE1E5]/50 cursor-pointer'
                    : 'hover:bg-[#F2FCFD]/40 opacity-80'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.isNew ? 'bg-[#EBFDFB] text-[#14B8A6]' : 'bg-slate-100 text-slate-500'}`}>
                  <Zap size={17} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 min-w-0">
                    <h4 className={`text-[14px] font-bold text-[#0F3A40] truncate ${n.isNew ? '' : 'opacity-70'}`}>{n.title}</h4>
                    {n.isNew ? <div className="w-2 h-2 rounded-full bg-[#14B8A6] shadow-[0_0_8px_rgba(20,184,166,0.5)]" /> : null}
                  </div>
                  <p className="text-[12.5px] text-[#4A787C] font-medium line-clamp-1">{n.desc || '—'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10.5px] font-bold text-[#82ABB0] uppercase tracking-tighter mb-1">{n.time}</p>
                  <ChevronRight size={16} className="text-[#BCE1E5] group-hover:text-[#14B8A6] group-hover:translate-x-1 transition-all inline-block" />
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-[#F2FCFD] flex items-center justify-center text-[#82ABB0] mb-4">
                <SearchX size={32} />
              </div>
              <p className="text-[15px] font-bold text-[#0F3A40]">Không có thông báo phù hợp</p>
              <p className="text-[13px] text-[#82ABB0] mt-1">Thử đổi bộ lọc hoặc từ khóa tìm kiếm</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
