import { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, Megaphone, Search, SearchX, Send, X, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

const FILTERS = [
  { id: 'UNREAD', label: 'Chưa đọc' },
  { id: 'READ', label: 'Đã đọc' },
  { id: 'ALL', label: 'Tất cả' },
];

export default function NotificationManagePage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteDeleting, setDeleteDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState('UNREAD');
  const [searchQuery, setSearchQuery] = useState('');

  const refresh = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await apiFetch('/admin/notifications?mode=sent', { token });
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
      const data = await apiFetch('/admin/notifications', {
        token,
        method: 'POST',
        body: { title: title.trim(), body: body.trim() || null },
      });
      const skipped = Number(data?.skipped_duplicates || 0);
      if (skipped > 0) {
        addToast(`Đã gửi ${data.recipients ?? 0} người; bỏ qua ${skipped} người đã nhận cùng nội dung trong 24h.`, 'success');
      } else {
        addToast('Đã gửi thông báo.', 'success');
      }
      setTitle('');
      setBody('');
      await refresh();
    } catch (e) {
      if (String(e?.message || '').includes('duplicate')) {
        addToast('Người nhận đã có thông báo giống hệt trong 24 giờ qua.', 'error');
      } else {
        addToast(e?.message || 'Không gửi được thông báo.', 'error');
      }
    } finally {
      setIsSending(false);
    }
  };

  const openDeleteModal = (notif) => {
    setDeleteError('');
    setDeleteModal(notif);
  };

  const closeDeleteModal = () => {
    if (deleteDeleting) return;
    setDeleteModal(null);
    setDeleteError('');
  };

  const confirmDeleteNotification = async () => {
    if (!token || !deleteModal) return;
    setDeleteDeleting(true);
    setDeleteError('');
    try {
      await apiFetch(`/admin/notifications/${deleteModal.id}`, { token, method: 'DELETE' });
      addToast('Đã xóa thông báo.', 'success');
      window.dispatchEvent(new Event('admin-nav-badges-refresh'));
      setDeleteModal(null);
      await refresh();
    } catch (e) {
      setDeleteError(e?.message || 'Không xóa được thông báo.');
    } finally {
      setDeleteDeleting(false);
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
      audience:
        Number(n.recipient_count) > 1
          ? `${n.recipient_count} người nhận${n.recipients_label ? `: ${n.recipients_label}` : ''}`
          : n.full_name || n.email || (n.user_id ? `User #${n.user_id}` : 'Tất cả'),
      recipientCount: Number(n.recipient_count) || 1,
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

  return (
    <div className="w-full max-w-[1200px] mx-auto mt-2 px-4 pb-12 flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-[36px] font-sans font-bold text-[#0F3A40] tracking-tight leading-none">Thông báo</h1>
        <p className="text-[15px] font-medium text-[#4A787C] leading-relaxed max-w-[680px]">
          Gửi thông báo và quản lý danh sách đã gửi (gom theo nội dung, không trùng dòng). Cùng nội dung gửi lại trong 24h
          sẽ được bỏ qua; nhắc nợ mỗi hóa đơn chỉ gửi một lần cho đến khi bạn xóa thông báo cũ.
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
                    <button
                      type="button"
                      onClick={() => openDeleteModal(notif)}
                      className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors shrink-0"
                      title="Xóa thông báo"
                      aria-label={`Xóa thông báo ${notif.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      {deleteModal && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm"
          onClick={() => !deleteDeleting && closeDeleteModal()}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-[28px] shadow-2xl border border-slate-200 p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-notification-title"
          >
            <h3 id="delete-notification-title" className="text-xl font-bold text-[#0F3A40] pr-8">
              Xác nhận xóa thông báo
            </h3>
            <p className="mt-2 text-[13px] font-medium text-[#4A787C] leading-relaxed">
              {deleteModal.recipientCount > 1 ? (
                <>
                  Sẽ xóa <span className="font-bold text-[#0F3A40]">{deleteModal.recipientCount} bản gửi</span> cùng
                  nội dung (broadcast).
                </>
              ) : (
                <>
                  Thông báo sẽ bị gỡ khỏi hộp thư của{' '}
                  <span className="font-bold text-[#0F3A40]">{deleteModal.audience}</span>.
                </>
              )}{' '}
              Khách thuê sẽ không còn thấy mục này.
            </p>
            <div className="mt-4 rounded-2xl bg-[#F8FAFB] border border-slate-100 p-4">
              <p className="text-[14px] font-bold text-[#0F3A40]">{deleteModal.title}</p>
              <p className="text-[12px] text-[#4A787C] mt-1 line-clamp-2">{deleteModal.content || '—'}</p>
              <p className="text-[11px] text-[#82ABB0] font-bold mt-2">{deleteModal.time}</p>
            </div>
            <div className="flex gap-3 rounded-2xl bg-amber-50 border border-amber-100/80 p-4 text-[13px] text-amber-900 mt-5">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              <p className="font-medium leading-relaxed">Thao tác không hoàn tác.</p>
            </div>
            {deleteError ? <p className="mt-4 text-sm font-medium text-red-600">{deleteError}</p> : null}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleteDeleting}
                className="w-full sm:w-auto px-6 py-3 rounded-full font-bold text-[#4A787C] hover:bg-slate-100 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmDeleteNotification}
                disabled={deleteDeleting}
                className="w-full sm:w-auto px-6 py-3 rounded-full font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60"
              >
                {deleteDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
            <button
              type="button"
              onClick={closeDeleteModal}
              disabled={deleteDeleting}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
