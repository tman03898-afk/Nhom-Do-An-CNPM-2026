import { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, Megaphone, Search, SearchX, Send, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';

const FILTERS = [
  { id: 'UNREAD', label: 'Chưa đọc' },
  { id: 'READ', label: 'Đã đọc' },
  { id: 'ALL', label: 'Tất cả' },
];

export default function NotificationManagePage() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState('UNREAD');
  const [searchQuery, setSearchQuery] = useState('');

  const refresh = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await apiFetch('/admin/notifications', { token });
      setNotifications(data.notifications || []);
    } catch {
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const send = async () => {
    if (!token || !title.trim()) return;
    setIsSending(true);
    try {
      await apiFetch('/admin/notifications', {
        token,
        method: 'POST',
        body: { title: title.trim(), body: body.trim() || null },
      });
      setTitle('');
      setBody('');
      await refresh();
    } finally {
      setIsSending(false);
    }
  };

  const markAllRead = async () => {
    if (!token) return;
    try {
      await apiFetch('/admin/notifications/mark-all-read', { token, method: 'POST' });
    } catch {}
    window.dispatchEvent(new Event('admin-nav-badges-refresh'));
    await refresh();
  };

  const uiNotifs = useMemo(() => {
    return notifications.map((n) => ({
      id: n.notification_id,
      time: n.created_at ? new Date(n.created_at).toLocaleString('vi-VN') : '',
      audience: n.full_name || n.email || (n.user_id ? `User #${n.user_id}` : 'Tất cả'),
      title: n.title || 'Thông báo',
      content: n.body || '',
      isNew: !n.is_read,
    }));
  }, [notifications]);

  const unreadCount = uiNotifs.filter((n) => n.isNew).length;
  const readCount = uiNotifs.length - unreadCount;

  const filteredNotifs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return uiNotifs.filter((n) => {
      if (statusFilter === 'UNREAD' && !n.isNew) return false;
      if (statusFilter === 'READ' && n.isNew) return false;
      if (!q) return true;
      return `${n.title} ${n.content} ${n.audience}`.toLowerCase().includes(q);
    });
  }, [uiNotifs, searchQuery, statusFilter]);

  const countFor = (id) => {
    if (id === 'UNREAD') return unreadCount;
    if (id === 'READ') return readCount;
    return uiNotifs.length;
  };

  const refresh = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await apiFetch('/admin/notifications', { token });
      setNotifications(data.notifications || []);
    } catch (e) {
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  /** Vào trang thông báo → đánh dấu đã đọc (badge/chuông về 0) → làm mới danh sách. */
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        await apiFetch('/admin/notifications/mark-all-read', { token, method: 'POST' });
      } catch {
        /* ignore */
      }
      if (!cancelled) {
        window.dispatchEvent(new Event('admin-nav-badges-refresh'));
        await refresh();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const send = async () => {
    if (!token) return;
    if (!title.trim()) return;
    setIsSending(true);
    try {
      await apiFetch('/admin/notifications', { token, method: 'POST', body: { title: title.trim(), body: body.trim() || null } });
      setTitle('');
      setBody('');
      await refresh();
    } finally {
      setIsSending(false);
    }
  };

  const uiNotifs = useMemo(() => {
    return notifications.map((n) => ({
      id: n.notification_id,
      time: n.created_at ? new Date(n.created_at).toLocaleString('vi-VN') : '',
      audience: n.user_id ? `USER #${n.user_id}` : '—',
      title: n.title,
      content: n.body || '',
      status: n.is_read ? 'inactive' : 'active',
    }));
  }, [notifications]);

  return (
    <div className="w-full max-w-[1200px] mx-auto mt-2 px-4 pb-12 flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-[36px] font-sans font-bold text-[#0F3A40] tracking-tight leading-none">Thông báo</h1>
        <p className="text-[15px] font-medium text-[#4A787C] leading-relaxed max-w-[680px]">
          Gửi thông báo và quản lý danh sách theo trạng thái chưa đọc hoặc đã đọc.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-[#F2FCFD] rounded-[28px] p-6 shadow-sm flex flex-col gap-5 border border-transparent">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-[14px] bg-[#EBFDFB] text-[#14B8A6] flex items-center justify-center shadow-sm">
                <Megaphone className="w-5 h-5" />
              </div>
              <h2 className="text-[20px] font-bold text-[#0F3A40]">Tạo thông báo mới</h2>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#4A787C] uppercase tracking-widest mb-2">Tiêu đề</label>
                <input
                  type="text"
                  placeholder="Nhập tiêu đề ngắn gọn..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#D7F2F5]/40 rounded-2xl px-5 py-3.5 text-[#0F3A40] font-bold text-[14px] outline-none border border-transparent focus:border-[#14B8A6]/40 transition-colors placeholder-[#82ABB0]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#4A787C] uppercase tracking-widest mb-2">Nội dung</label>
                <textarea
                  rows={5}
                  placeholder="Viết nội dung thông báo..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full bg-[#D7F2F5]/40 rounded-3xl px-5 py-4 text-[#0F3A40] font-medium text-[14px] outline-none border border-transparent focus:border-[#14B8A6]/40 transition-colors placeholder-[#82ABB0] resize-none leading-relaxed"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={send}
              disabled={isSending || !title.trim()}
              className="w-full bg-[#0F3A40] hover:bg-[#1F545B] disabled:opacity-60 text-white py-3.5 rounded-full text-[14px] font-bold transition-all shadow-md flex items-center justify-center gap-3"
            >
              <Send className="w-4 h-4 text-[#14B8A6]" /> {isSending ? 'Đang gửi...' : 'Gửi thông báo'}
            </button>
          </div>
        </section>

        <section className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-white rounded-[28px] p-5 border border-[#BCE1E5]/30 shadow-sm">
            <div className="flex flex-col xl:flex-row justify-between gap-4 border-b border-[#BCE1E5]/30 pb-4 mb-3">
              <div>
                <h2 className="text-[21px] font-bold text-[#0F3A40]">Danh sách thông báo</h2>
                <p className="text-[12px] font-medium text-[#82ABB0] mt-1">
                  Chưa đọc: {unreadCount} • Đã đọc: {readCount}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 xl:items-center">
                <div className="flex gap-2 flex-wrap">
                  {FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setStatusFilter(filter.id)}
                      className={`px-4 py-2 rounded-full text-[12px] font-bold transition-all ${
                        statusFilter === filter.id
                          ? 'bg-[#0F3A40] text-white shadow-sm'
                          : 'bg-white text-[#4A787C] border border-[#BCE1E5]/40 hover:bg-[#F2FCFD]'
                      }`}
                    >
                      {filter.label} ({countFor(filter.id)})
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={unreadCount === 0}
                  className="px-4 py-2 rounded-full bg-[#14B8A6] text-white text-[12px] font-bold disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <CheckCheck className="w-4 h-4" /> Đã đọc hết
                </button>
              </div>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#82ABB0]" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tiêu đề, nội dung, người nhận..."
                className="w-full rounded-2xl bg-[#F2FCFD] border border-[#BCE1E5]/40 py-2.5 pl-11 pr-10 text-[13px] font-medium text-[#0F3A40] outline-none focus:border-[#14B8A6]/40"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#82ABB0] hover:text-[#0F3A40]"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : null}
            </div>

            <div className="max-h-[68vh] overflow-y-auto pr-1 space-y-1">
              {isLoading ? (
                <div className="rounded-2xl p-8 text-center text-[#4A787C] font-medium">Đang tải thông báo...</div>
              ) : filteredNotifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl p-12 text-center">
                  <div className="w-14 h-14 rounded-full bg-[#F2FCFD] text-[#82ABB0] flex items-center justify-center mb-3">
                    <SearchX className="w-7 h-7" />
                  </div>
                  <p className="text-[15px] font-bold text-[#0F3A40]">Không có thông báo phù hợp</p>
                </div>
              ) : (
                filteredNotifs.map((notif) => (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 rounded-2xl px-4 py-3 border transition-colors ${
                      notif.isNew ? 'bg-[#F8FDFD] border-[#14B8A6]/25' : 'bg-white border-slate-100 opacity-80'
                    }`}
                  >
                    <div className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${notif.isNew ? 'bg-[#EBFDFB] text-[#14B8A6]' : 'bg-slate-100 text-slate-500'}`}>
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="text-[14px] font-bold text-[#0F3A40] truncate">{notif.title}</h3>
                        {notif.isNew ? <span className="w-2 h-2 rounded-full bg-[#14B8A6] shrink-0" /> : null}
                      </div>
                      <p className="text-[12.5px] text-[#4A787C] font-medium line-clamp-1 mt-0.5">{notif.content || '—'}</p>
                      <p className="text-[10.5px] text-[#82ABB0] font-bold mt-1 truncate">{notif.time} • {notif.audience}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
