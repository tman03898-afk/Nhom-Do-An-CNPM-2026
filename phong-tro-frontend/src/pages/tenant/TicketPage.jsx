import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  Upload,
  Send,
  PhoneCall,
  Image as ImageIcon,
  X,
  SearchX,
  Search,
  Loader2,
  ChevronRight,
  Pencil,
  Trash2,
  AlertCircle,
  Printer,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { apiFetch, API_BASE_URL, resolveBackendAssetUrl } from '../../lib/api';
import { canPrintTicketReceipt, printTicketReceipt } from '../../lib/ticketReceipt';
import { SUPPORT_HOTLINE, contactHotline, contactZalo } from '../../lib/supportContact';

const MAX_FILES = 5;
const MAX_MB = 5;

function parseAttachmentUrls(raw) {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p.map(String).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function statusVi(s) {
  const u = String(s || '').toUpperCase();
  if (u === 'OPEN') return 'CHỜ XỬ LÝ';
  if (u === 'IN_PROGRESS') return 'ĐANG XỬ LÝ';
  if (u === 'RESOLVED') return 'ĐÃ XỬ LÝ';
  if (u === 'CLOSED') return 'ĐÃ ĐÓNG';
  return u || '—';
}

function statusColor(s) {
  const u = String(s || '').toUpperCase();
  if (u === 'OPEN') return 'bg-[#F5F5F5] text-[#82ABB0]';
  if (u === 'IN_PROGRESS') return 'bg-[#FFF3E0] text-[#E68A00]';
  if (u === 'RESOLVED' || u === 'CLOSED') return 'bg-[#EBFDFB] text-[#14B8A6]';
  return 'bg-[#F5F5F5] text-[#82ABB0]';
}

function priorityVi(p) {
  const u = String(p || '').toUpperCase();
  if (u === 'HIGH') return 'Khẩn cấp';
  if (u === 'LOW') return 'Thấp';
  return 'Trung bình';
}

function moneyVi(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')}đ`;
}

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Thấp — không ảnh hưởng sinh hoạt ngay' },
  { value: 'MEDIUM', label: 'Trung bình — cần xử lý trong vài ngày' },
  { value: 'HIGH', label: 'Khẩn cấp — an toàn / mất điện nước / rò rỉ nghiêm trọng' },
];

const STATUS_TABS = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'OPEN', label: 'Chờ xử lý' },
  { id: 'IN_PROGRESS', label: 'Đang xử lý' },
  { id: 'DONE', label: 'Đã xử lý' },
];

export default function TenantTicketPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState('ALL');
  const [priority, setPriority] = useState('MEDIUM');
  const { addToast } = useToast();
  const { token } = useAuth();
  const [tenantProfile, setTenantProfile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);

  const [modalId, setModalId] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalTicket, setModalTicket] = useState(null);
  const [modalEdit, setModalEdit] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState('MEDIUM');
  const [editExistingUrls, setEditExistingUrls] = useState([]);
  const [editNewFiles, setEditNewFiles] = useState([]);
  const [editSaving, setEditSaving] = useState(false);
  const editFileInputRef = useRef(null);
  const editExistingUrlsLenRef = useRef(0);
  editExistingUrlsLenRef.current = editExistingUrls.length;

  const refreshHistory = useCallback(async () => {
    if (!token) return;
    setLoadingHistory(true);
    try {
      const data = await apiFetch('/tenant/tickets', { token });
      setHistory(data.tickets || []);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [token]);

  useEffect(() => {
    const fetchTenant = async () => {
      if (!token) return;
      try {
        const data = await apiFetch('/tenant/me', { token });
        setTenantProfile(data.tenant || null);
      } catch {
        setTenantProfile(null);
      }
    };
    fetchTenant();
  }, [token]);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  useEffect(() => {
    return () => {
      attachments.forEach((a) => {
        if (a.preview?.startsWith('blob:')) URL.revokeObjectURL(a.preview);
      });
      editNewFiles.forEach((a) => {
        if (a.preview?.startsWith('blob:')) URL.revokeObjectURL(a.preview);
      });
    };
  }, [attachments, editNewFiles]);

  const loadModalTicket = useCallback(
    async (id) => {
      if (!token || !id) return;
      setModalLoading(true);
      try {
        const data = await apiFetch(`/tenant/tickets/${id}`, { token });
        const t = data.ticket;
        setModalTicket(t);
        setEditTitle(t?.title || '');
        setEditDesc(t?.description || '');
        setEditPriority(t?.priority || 'MEDIUM');
        setEditExistingUrls(parseAttachmentUrls(t?.attachment_urls));
        setEditNewFiles((prev) => {
          prev.forEach((a) => {
            if (a.preview?.startsWith('blob:')) URL.revokeObjectURL(a.preview);
          });
          return [];
        });
        setModalEdit(false);
      } catch {
        setModalTicket(null);
        addToast('Không tải được chi tiết phiếu.', 'error');
      } finally {
        setModalLoading(false);
      }
    },
    [token, addToast]
  );

  useEffect(() => {
    if (modalId != null) loadModalTicket(modalId);
  }, [modalId, loadModalTicket]);

  const closeModal = () => {
    setModalId(null);
    setModalTicket(null);
    setModalEdit(false);
    editNewFiles.forEach((a) => {
      if (a.preview?.startsWith('blob:')) URL.revokeObjectURL(a.preview);
    });
    setEditNewFiles([]);
  };

  const roomLabel = useMemo(() => {
    if (tenantProfile?.room_number) return `Phòng ${tenantProfile.room_number}`;
    return '—';
  }, [tenantProfile]);

  const ticketCounts = useMemo(() => {
    const open = history.filter((t) => String(t.status).toUpperCase() === 'OPEN').length;
    const prog = history.filter((t) => String(t.status).toUpperCase() === 'IN_PROGRESS').length;
    const done = history.filter((t) => {
      const u = String(t.status).toUpperCase();
      return u === 'RESOLVED' || u === 'CLOSED';
    }).length;
    return { open, prog, done, total: history.length };
  }, [history]);

  const filteredHistory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return history.filter((item) => {
      const st = String(item.status || '').toUpperCase();
      if (statusTab === 'OPEN' && st !== 'OPEN') return false;
      if (statusTab === 'IN_PROGRESS' && st !== 'IN_PROGRESS') return false;
      if (statusTab === 'DONE' && st !== 'RESOLVED' && st !== 'CLOSED') return false;
      if (!q) return true;
      const hay = `${item.title || ''} ${item.description || ''} ${statusVi(item.status)} ${priorityVi(item.priority)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [history, searchQuery, statusTab]);

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []).filter((f) => String(f.type || '').startsWith('image/'));
    if (!incoming.length) {
      addToast('Chỉ chấp nhận file ảnh (JPG, PNG…)', 'error');
      return;
    }
    setAttachments((prev) => {
      const next = [...prev];
      for (const file of incoming) {
        if (next.length >= MAX_FILES) {
          addToast(`Tối đa ${MAX_FILES} ảnh.`, 'error');
          break;
        }
        if (file.size > MAX_MB * 1024 * 1024) {
          addToast(`Ảnh "${file.name}" vượt quá ${MAX_MB}MB.`, 'error');
          continue;
        }
        next.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          preview: URL.createObjectURL(file),
        });
      }
      return next;
    });
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => {
      const item = prev.find((a) => a.id === id);
      if (item?.preview?.startsWith('blob:')) URL.revokeObjectURL(item.preview);
      return prev.filter((a) => a.id !== id);
    });
  };

  const addEditFiles = (fileList) => {
    const incoming = Array.from(fileList || []).filter((f) => String(f.type || '').startsWith('image/'));
    if (!incoming.length) {
      addToast('Chỉ chấp nhận file ảnh.', 'error');
      return;
    }
    setEditNewFiles((prev) => {
      const next = [...prev];
      const existLen = editExistingUrlsLenRef.current;
      for (const file of incoming) {
        if (existLen + next.length >= MAX_FILES) {
          addToast(`Tối đa ${MAX_FILES} ảnh (gồm ảnh đã lưu).`, 'error');
          break;
        }
        if (file.size > MAX_MB * 1024 * 1024) {
          addToast(`Ảnh "${file.name}" vượt quá ${MAX_MB}MB.`, 'error');
          continue;
        }
        next.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          preview: URL.createObjectURL(file),
        });
      }
      return next;
    });
  };

  const removeEditNew = (id) => {
    setEditNewFiles((prev) => {
      const item = prev.find((a) => a.id === id);
      if (item?.preview?.startsWith('blob:')) URL.revokeObjectURL(item.preview);
      return prev.filter((a) => a.id !== id);
    });
  };

  const removeEditExisting = (url) => {
    setEditExistingUrls((prev) => prev.filter((u) => u !== url));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    if (!title.trim() || !desc.trim()) {
      addToast('Vui lòng điền đầy đủ tiêu đề và mô tả!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      let attachment_urls = [];
      if (attachments.length > 0) {
        const formData = new FormData();
        attachments.forEach((a) => formData.append('images', a.file));
        const uploadRes = await fetch(`${API_BASE_URL}/tenant/tickets/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const uploadJson = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok || !uploadJson?.ok) {
          throw new Error(uploadJson?.message || 'Không thể tải ảnh lên');
        }
        attachment_urls = uploadJson.file_urls || [];
      }

      await apiFetch('/tenant/tickets', {
        token,
        method: 'POST',
        body: {
          title: title.trim(),
          description: desc.trim(),
          room_id: tenantProfile?.room_id ?? null,
          priority,
          attachment_urls,
        },
      });

      attachments.forEach((a) => {
        if (a.preview?.startsWith('blob:')) URL.revokeObjectURL(a.preview);
      });
      setAttachments([]);
      setTitle('');
      setDesc('');
      setPriority('MEDIUM');
      addToast('Gửi yêu cầu thành công! Đội ngũ kỹ thuật sẽ sớm phản hồi.');
      await refreshHistory();
    } catch (err) {
      addToast(err?.message || 'Gửi yêu cầu thất bại.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!token || !modalTicket?.incident_id) return;
    if (!editTitle.trim()) {
      addToast('Tiêu đề không được để trống.', 'error');
      return;
    }
    const totalSlots = editExistingUrls.length + editNewFiles.length;
    if (totalSlots > MAX_FILES) {
      addToast(`Tối đa ${MAX_FILES} ảnh.`, 'error');
      return;
    }

    setEditSaving(true);
    try {
      let merged = [...editExistingUrls];
      if (editNewFiles.length > 0) {
        const formData = new FormData();
        editNewFiles.forEach((a) => formData.append('images', a.file));
        const uploadRes = await fetch(`${API_BASE_URL}/tenant/tickets/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const uploadJson = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok || !uploadJson?.ok) {
          throw new Error(uploadJson?.message || 'Không thể tải ảnh lên');
        }
        merged = [...merged, ...(uploadJson.file_urls || [])];
      }

      await apiFetch(`/tenant/tickets/${modalTicket.incident_id}`, {
        token,
        method: 'PUT',
        body: {
          title: editTitle.trim(),
          description: editDesc.trim() || null,
          priority: editPriority,
          attachment_urls: merged,
        },
      });

      editNewFiles.forEach((a) => {
        if (a.preview?.startsWith('blob:')) URL.revokeObjectURL(a.preview);
      });
      setEditNewFiles([]);
      setModalEdit(false);
      addToast('Đã cập nhật yêu cầu.');
      await refreshHistory();
      await loadModalTicket(modalTicket.incident_id);
    } catch (err) {
      addToast(err?.message || 'Lưu thất bại.', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!token || !modalTicket?.incident_id) return;
    if (!window.confirm('Hủy yêu cầu này? Ban quản lý sẽ không nhận được phiếu nữa.')) return;
    try {
      await apiFetch(`/tenant/tickets/${modalTicket.incident_id}`, { token, method: 'DELETE' });
      addToast('Đã hủy yêu cầu.');
      closeModal();
      await refreshHistory();
    } catch (err) {
      addToast(err?.message || 'Không thể hủy phiếu (chỉ phiếu đang chờ xử lý mới hủy được).', 'error');
    }
  };

  const handlePrintReceipt = async () => {
    if (!token || !modalTicket?.incident_id) return;
    if (!canPrintTicketReceipt(modalTicket)) {
      addToast('Biên nhận chỉ có sau khi yêu cầu đã hoàn thành.', 'error');
      return;
    }
    try {
      const data = await apiFetch(`/tenant/tickets/${modalTicket.incident_id}/receipt`, { token });
      const ok = printTicketReceipt(data.receipt?.ticket || modalTicket, tenantProfile || {});
      if (ok) addToast('Đã tải biên lai PDF.');
      else addToast('Không tạo được biên lai PDF.', 'error');
    } catch (err) {
      addToast(err?.message || 'Không mở được biên nhận.', 'error');
    }
  };

  const callHotline = () => contactHotline(addToast);
  const openZalo = () => contactZalo(addToast);

  const isOpen = (t) => String(t?.status || '').toUpperCase() === 'OPEN';

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div>
        <h1 className="text-[34px] font-sans font-bold text-[#0F3A40] tracking-tight">Yêu cầu sửa chữa</h1>
        <p className="text-[14.5px] text-[#4A787C] font-medium mt-2 max-w-[600px]">
          Gửi mô tả sự cố kèm ảnh; theo dõi trạng thái xử lý. Bạn có thể chỉnh sửa hoặc hủy khi phiếu còn{' '}
          <strong className="font-bold text-[#0F3A40]">chờ xử lý</strong>.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 px-1">
        <div className="flex items-center gap-2 rounded-2xl bg-white/70 border border-white px-4 py-2 text-[12px] font-bold text-[#4A787C]">
          <span className="text-[#82ABB0]">Tổng</span>
          <span className="text-[#0F3A40]">{ticketCounts.total}</span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-white/70 border border-white px-4 py-2 text-[12px] font-bold text-[#4A787C]">
          <span className="text-[#82ABB0]">Chờ xử lý</span>
          <span className="text-[#E68A00]">{ticketCounts.open}</span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-white/70 border border-white px-4 py-2 text-[12px] font-bold text-[#4A787C]">
          <span className="text-[#82ABB0]">Đang xử lý</span>
          <span className="text-[#3B82F6]">{ticketCounts.prog}</span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-white/70 border border-white px-4 py-2 text-[12px] font-bold text-[#4A787C]">
          <span className="text-[#82ABB0]">Đã xử lý</span>
          <span className="text-[#14B8A6]">{ticketCounts.done}</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        <div className="flex-1 bg-white/60 backdrop-blur-md rounded-[40px] p-10 border border-white shadow-sm h-fit">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-widest pl-2">Mức độ ưu tiên</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-[#F2FCFD] border border-[#BCE1E5]/40 rounded-2xl px-6 py-4 text-[14px] outline-none focus:border-[#14B8A6]/30 transition-all text-[#0F3A40] font-medium"
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-widest pl-2">TIÊU ĐỀ SỰ CỐ</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Vòi nước bị rò rỉ"
                maxLength={200}
                className="w-full bg-[#F2FCFD] border border-[#BCE1E5]/40 rounded-2xl px-6 py-4 text-[14px] outline-none focus:border-[#14B8A6]/30 transition-all text-[#0F3A40] font-medium"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-widest pl-2">MÔ TẢ CHI TIẾT</label>
              <textarea
                rows={5}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Mô tả cụ thể tình trạng và vị trí sự cố..."
                className="w-full bg-[#F2FCFD] border border-[#BCE1E5]/40 rounded-3xl px-6 py-4 text-[14px] outline-none focus:border-[#14B8A6]/30 transition-all text-[#0F3A40] font-medium resize-none"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-widest pl-2">
                HÌNH ẢNH ĐÍNH KÈM ({attachments.length}/{MAX_FILES})
              </label>
              <div
                className={`relative min-h-[160px] rounded-[32px] border-2 border-dashed transition-all flex flex-col items-center justify-center bg-[#F2FCFD]/40 p-4 ${
                  dragActive ? 'border-[#14B8A6] bg-[#EAF7F8]' : 'border-[#BCE1E5]/50 hover:border-[#14B8A6]/50'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  addFiles(e.dataTransfer.files);
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
                {attachments.length === 0 ? (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-[#14B8A6] shadow-sm mb-4 pointer-events-none">
                      <Upload size={24} />
                    </div>
                    <p className="text-[14px] font-bold text-[#0F3A40] mb-1 pointer-events-none">
                      Kéo thả ảnh hoặc <span className="text-[#14B8A6] underline">chọn tệp</span>
                    </p>
                    <p className="text-[11px] text-[#82ABB0] font-medium pointer-events-none">
                      JPG, PNG, GIF, WebP — tối đa {MAX_FILES} ảnh, mỗi ảnh ≤ {MAX_MB}MB
                    </p>
                  </>
                ) : (
                  <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    {attachments.map((a) => (
                      <div key={a.id} className="relative aspect-square rounded-2xl overflow-hidden border border-[#BCE1E5]/50 bg-white group/img">
                        <img src={a.preview} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.preventDefault();
                            ev.stopPropagation();
                            removeAttachment(a.id);
                          }}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-500 transition-colors z-20"
                          aria-label="Xóa ảnh"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    {attachments.length < MAX_FILES ? (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-2xl border-2 border-dashed border-[#BCE1E5] flex flex-col items-center justify-center text-[#82ABB0] hover:border-[#14B8A6] hover:text-[#14B8A6] transition-colors text-[12px] font-bold gap-1 z-20"
                      >
                        <ImageIcon size={22} /> Thêm ảnh
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-5 rounded-[24px] bg-[#0F3A40] hover:bg-[#1F545B] disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold text-[16px] shadow-xl shadow-[#0F3A40]/10 transition-all flex items-center justify-center gap-3"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {isSubmitting ? 'Đang gửi…' : 'Gửi yêu cầu'}
            </button>
          </form>
        </div>

        <div className="w-full lg:w-[420px] flex flex-col gap-10">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 px-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-xl font-bold text-[#0F3A40]">Lịch sử báo cáo</h3>
                <div className="relative w-full md:w-[200px] group">
                  <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#82ABB0] group-focus-within:text-[#14B8A6] transition-colors" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm sự cố..."
                    className="w-full bg-white/80 border border-[#BCE1E5]/40 rounded-2xl pl-10 pr-8 py-2 text-[12px] outline-none focus:border-[#14B8A6]/30 transition-all font-bold text-[#0F3A40]"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#82ABB0] hover:text-[#D14D4D] transition-colors"
                    >
                      <X size={12} />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {STATUS_TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setStatusTab(t.id)}
                    className={`px-4 py-2 rounded-full text-[11px] font-extrabold tracking-wide transition-all ${
                      statusTab === t.id
                        ? 'bg-[#0F3A40] text-white shadow-md'
                        : 'bg-white/80 text-[#4A787C] border border-[#BCE1E5]/40 hover:border-[#14B8A6]/40'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {loadingHistory ? (
                <p className="text-[13px] text-[#82ABB0] font-medium py-8 text-center">Đang tải lịch sử…</p>
              ) : filteredHistory.length > 0 ? (
                filteredHistory.map((item) => {
                  const imgs = parseAttachmentUrls(item.attachment_urls).slice(0, 3);
                  return (
                    <button
                      key={item.incident_id}
                      type="button"
                      onClick={() => setModalId(item.incident_id)}
                      className="w-full text-left bg-white/60 backdrop-blur-md p-6 rounded-[32px] border border-white shadow-sm group hover:scale-[1.02] transition-all cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-4 gap-2">
                        <h4 className="text-[15px] font-bold text-[#0F3A40] leading-snug">{item.title}</h4>
                        <span
                          className={`shrink-0 ${statusColor(item.status)} text-[9px] font-extrabold px-3 py-1 rounded-full tracking-wider uppercase`}
                        >
                          {statusVi(item.status)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#82ABB0] font-medium mb-2">
                        <span className="rounded-lg bg-[#F2FCFD] px-2 py-0.5 text-[10px] font-bold text-[#0F3A40]">
                          {priorityVi(item.priority)}
                        </span>
                        <span>{item.room_number ? `Phòng ${item.room_number}` : roomLabel}</span>
                        <span className="text-[#BCE1E5]">·</span>
                        <span>
                          {item.created_at ? new Date(item.created_at).toLocaleDateString('vi-VN') : '—'}
                        </span>
                      </div>
                      <p className="text-[13px] text-[#4A787C] font-medium leading-relaxed line-clamp-2 mb-3">{item.description || '—'}</p>
                      <div className="flex items-center justify-between gap-2">
                        {imgs.length > 0 ? (
                          <div className="flex gap-2 flex-wrap">
                            {imgs.map((u, i) => (
                              <img
                                key={i}
                                src={resolveBackendAssetUrl(u)}
                                alt=""
                                className="w-16 h-16 rounded-xl object-cover border border-[#BCE1E5]/40"
                              />
                            ))}
                          </div>
                        ) : (
                          <span />
                        )}
                        <ChevronRight className="w-5 h-5 text-[#14B8A6] opacity-60 group-hover:opacity-100 shrink-0" />
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-10 bg-white/40 rounded-[32px] border border-white/50 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#F2FCFD] flex items-center justify-center text-[#82ABB0] mb-4">
                    <SearchX size={32} />
                  </div>
                  <p className="text-[15px] font-bold text-[#0F3A40]">
                    {history.length === 0 ? 'Chưa có báo cáo nào' : 'Không có báo cáo nào khớp bộ lọc'}
                  </p>
                  <p className="text-[13px] text-[#82ABB0] mt-1">Thử đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#0F3A40] rounded-[40px] overflow-hidden shadow-xl">
            <div className="h-[220px] relative bg-gradient-to-br from-[#1F545B] to-[#14B8A6] flex flex-col justify-end p-8">
              <h3 className="text-[22px] font-bold text-white mb-2">Hỗ trợ gấp</h3>
              <p className="text-white/80 text-[13px] leading-relaxed">
                Gọi trực tiếp: <span className="text-white font-bold">{SUPPORT_HOTLINE}</span>
                {' '}hoặc nhắn Zalo ban quản lý.
              </p>
            </div>
            <div className="p-8 pt-0 flex flex-col gap-3">
              <button
                type="button"
                onClick={callHotline}
                className="w-full py-4 rounded-3xl bg-[#14B8A6] hover:bg-[#109284] text-white font-bold text-[14px] shadow-lg shadow-[#14B8A6]/20 transition-all flex items-center justify-center gap-3"
              >
                <PhoneCall size={18} className="fill-current" /> Gọi hỗ trợ gấp
              </button>
              <button
                type="button"
                onClick={openZalo}
                className="w-full py-4 rounded-3xl bg-white/15 hover:bg-white/25 text-white font-bold text-[14px] border border-white/25 transition-all flex items-center justify-center gap-3"
              >
                Nhắn Zalo ban quản lý
              </button>
            </div>
          </div>
        </div>
      </div>

      {modalId != null && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[32px] bg-white shadow-2xl border border-slate-200">
            <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-slate-100 bg-white/95 px-6 py-4 backdrop-blur z-10">
              <h3 className="text-lg font-bold text-[#0F3A40]">Chi tiết phiếu</h3>
              <button type="button" onClick={closeModal} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Đóng">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {modalLoading || !modalTicket ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin text-[#14B8A6]" size={28} />
                </div>
              ) : modalEdit ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#82ABB0] uppercase">Ưu tiên</label>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-[14px] font-medium outline-none focus:border-[#14B8A6]"
                    >
                      {PRIORITY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#82ABB0] uppercase">Tiêu đề</label>
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      maxLength={200}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-[14px] font-medium outline-none focus:border-[#14B8A6]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#82ABB0] uppercase">Mô tả</label>
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={4}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-[14px] font-medium outline-none focus:border-[#14B8A6] resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#82ABB0] uppercase">
                      Ảnh ({editExistingUrls.length + editNewFiles.length}/{MAX_FILES})
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {editExistingUrls.map((u) => (
                        <div key={u} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200">
                          <img src={resolveBackendAssetUrl(u)} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeEditExisting(u)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-500"
                            aria-label="Bỏ ảnh"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {editNewFiles.map((a) => (
                        <div key={a.id} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200">
                          <img src={a.preview} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeEditNew(a.id)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-500"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {editExistingUrls.length + editNewFiles.length < MAX_FILES ? (
                        <>
                          <input
                            ref={editFileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              addEditFiles(e.target.files);
                              e.target.value = '';
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => editFileInputRef.current?.click()}
                            className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-[10px] font-bold text-[#82ABB0] hover:border-[#14B8A6]"
                          >
                            <ImageIcon size={18} /> Thêm
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      disabled={editSaving}
                      onClick={() => {
                        setModalEdit(false);
                        loadModalTicket(modalTicket.incident_id);
                      }}
                      className="flex-1 min-w-[120px] py-3 rounded-2xl border border-slate-200 font-bold text-[#4A787C] hover:bg-slate-50"
                    >
                      Hủy chỉnh sửa
                    </button>
                    <button
                      type="button"
                      disabled={editSaving || !editTitle.trim()}
                      onClick={handleSaveEdit}
                      className="flex-1 min-w-[120px] py-3 rounded-2xl bg-[#14B8A6] text-white font-bold hover:bg-[#109284] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {editSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                      Lưu thay đổi
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${statusColor(modalTicket.status)}`}>
                      {statusVi(modalTicket.status)}
                    </span>
                    <span className="text-[11px] font-bold text-[#82ABB0] rounded-lg bg-slate-100 px-2 py-1">{priorityVi(modalTicket.priority)}</span>
                  </div>
                  <h4 className="text-xl font-bold text-[#0F3A40] leading-snug">{modalTicket.title}</h4>
                  <div className="text-[12px] font-medium text-[#82ABB0] flex flex-wrap gap-x-3 gap-y-1">
                    <span>{modalTicket.room_number ? `Phòng ${modalTicket.room_number}` : roomLabel}</span>
                    <span>
                      Tạo:{' '}
                      {modalTicket.created_at ? new Date(modalTicket.created_at).toLocaleString('vi-VN') : '—'}
                    </span>
                    {modalTicket.updated_at && modalTicket.updated_at !== modalTicket.created_at ? (
                      <span>Cập nhật: {new Date(modalTicket.updated_at).toLocaleString('vi-VN')}</span>
                    ) : null}
                    {canPrintTicketReceipt(modalTicket) ? (
                      <span>Chi phí sửa chữa: {moneyVi(modalTicket.repair_cost)}</span>
                    ) : null}
                  </div>
                  <p className="text-[14px] text-[#4A787C] font-medium leading-relaxed whitespace-pre-wrap">{modalTicket.description || '—'}</p>
                  {parseAttachmentUrls(modalTicket.attachment_urls).length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-[#82ABB0] uppercase">Hình ảnh</p>
                      <div className="grid grid-cols-3 gap-2">
                        {parseAttachmentUrls(modalTicket.attachment_urls).map((u, i) => (
                          <a
                            key={i}
                            href={resolveBackendAssetUrl(u)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="aspect-square rounded-xl overflow-hidden border border-slate-200 block hover:ring-2 ring-[#14B8A6]"
                          >
                            <img src={resolveBackendAssetUrl(u)} alt="" className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {!isOpen(modalTicket) ? (
                    <div className="flex items-start gap-2 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 text-[12px] text-amber-900">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Phiếu đã được ban quản lý xử lý. Nếu cần báo thêm, hãy gửi yêu cầu mới bên trái.</span>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2 pt-2">
                    {isOpen(modalTicket) ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setModalEdit(true)}
                          className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 rounded-2xl border border-[#14B8A6] text-[#14B8A6] font-bold hover:bg-[#F2FCFD]"
                        >
                          <Pencil size={16} /> Sửa
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteTicket}
                          className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 rounded-2xl border border-rose-200 text-rose-600 font-bold hover:bg-rose-50"
                        >
                          <Trash2 size={16} /> Hủy phiếu
                        </button>
                      </>
                    ) : null}
                    {canPrintTicketReceipt(modalTicket) ? (
                      <button
                        type="button"
                        onClick={handlePrintReceipt}
                        className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 rounded-2xl border border-[#14B8A6] text-[#0F3A40] font-bold hover:bg-[#EBFDFB]"
                      >
                        <Printer size={16} /> Tải biên lai
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 min-w-[100px] py-3 rounded-2xl bg-[#0F3A40] text-white font-bold hover:bg-[#1F545B]"
                    >
                      Đóng
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
