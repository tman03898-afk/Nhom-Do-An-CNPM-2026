import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  BarChart3,
  ClipboardList,
  PenTool,
  CheckCircle2,
  Filter,
  Lightbulb,
  MoreVertical,
  PhoneCall,
  Trash2,
  Eye,
  Clock,
  Search,
  X,
  Loader2,
  User,
  Image as ImageIcon,
  Upload,
  Printer,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { apiFetch, API_BASE_URL, resolveBackendAssetUrl } from '../../lib/api';
import { canPrintTicketReceipt, printTicketReceipt } from '../../lib/ticketReceipt';

const PAGE_SIZE = 10;
const HOTLINE = String(import.meta.env.VITE_SUPPORT_HOTLINE || '').trim();
const CREATE_MAX_FILES = 5;
const CREATE_MAX_MB = 5;

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

function statusLabelVi(api) {
  const s = String(api || '').toUpperCase();
  if (s === 'OPEN') return 'CHỜ XỬ LÝ';
  if (s === 'IN_PROGRESS') return 'ĐANG XỬ LÝ';
  if (s === 'RESOLVED') return 'ĐÃ XỬ LÝ';
  if (s === 'CLOSED') return 'ĐÃ ĐÓNG';
  return s || '—';
}

function statusBadgeClass(api) {
  const s = String(api || '').toUpperCase();
  if (s === 'OPEN') return 'bg-[#F5F5F5] text-[#82ABB0]';
  if (s === 'IN_PROGRESS') return 'bg-[#EBF4FF] text-[#3B82F6]';
  if (s === 'RESOLVED') return 'bg-[#EBFDFB] text-[#14B8A6]';
  if (s === 'CLOSED') return 'bg-slate-100 text-slate-600';
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

const FILTER_STATUSES = [
  { id: 'OPEN', label: 'Chờ xử lý' },
  { id: 'IN_PROGRESS', label: 'Đang xử lý' },
  { id: 'RESOLVED', label: 'Đã xử lý' },
  { id: 'CLOSED', label: 'Đã đóng' },
];

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Thấp' },
  { value: 'MEDIUM', label: 'Trung bình' },
  { value: 'HIGH', label: 'Khẩn cấp' },
];

const ALL_TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export default function TicketManagePage() {
  const { addToast } = useToast();
  const { token } = useAuth();
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);

  const menuRef = useRef(null);
  const filterRef = useRef(null);

  const [rawTickets, setRawTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);

  const [detailId, setDetailId] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTicket, setDetailTicket] = useState(null);
  const [detailSaving, setDetailSaving] = useState(false);
  const [assignDraft, setAssignDraft] = useState('');
  const [repairCostDraft, setRepairCostDraft] = useState('0');
  const [staff, setStaff] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [createForm, setCreateForm] = useState({
    reported_by: '',
    room_id: '',
    title: '',
    description: '',
    priority: 'MEDIUM',
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createAttachments, setCreateAttachments] = useState([]);
  const [createDragActive, setCreateDragActive] = useState(false);
  const createFileInputRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await apiFetch('/admin/tickets', { token });
      setRawTickets(data.tickets || []);
    } catch (e) {
      setRawTickets([]);
      addToast(e?.message || 'Không tải được danh sách phiếu. Kiểm tra đăng nhập admin và API.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [token, addToast]);

  const loadStaff = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch('/admin/tickets/staff', { token });
      setStaff(data.staff || []);
    } catch {
      setStaff([]);
    }
  }, [token]);

  const loadTenants = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch('/admin/tenants', { token });
      setTenants(data.tenants || []);
    } catch {
      setTenants([]);
    }
  }, [token]);

  useEffect(() => {
    refresh();
    loadStaff();
  }, [refresh, loadStaff]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refresh]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null);
      }
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedStatuses]);

  const selectAllFilters = () => setSelectedStatuses([...ALL_TICKET_STATUSES]);

  const allFilterTabsActive =
    selectedStatuses.length === ALL_TICKET_STATUSES.length &&
    ALL_TICKET_STATUSES.every((s) => selectedStatuses.includes(s));

  const stats = useMemo(() => {
    const total = rawTickets.length;
    const open = rawTickets.filter((t) => String(t.status).toUpperCase() === 'OPEN').length;
    const prog = rawTickets.filter((t) => String(t.status).toUpperCase() === 'IN_PROGRESS').length;
    const done = rawTickets.filter((t) => {
      const u = String(t.status).toUpperCase();
      return u === 'RESOLVED' || u === 'CLOSED';
    }).length;
    return [
      { label: 'Tổng phiếu', value: String(total), icon: <BarChart3 className="w-4 h-4 text-[#14B8A6]" />, border: 'border-[#14B8A6]/30', bg: 'bg-white' },
      { label: 'Chờ xử lý', value: String(open), icon: <ClipboardList className="w-4 h-4 text-[#E68A00]" />, border: 'border-[#E68A00]', bg: 'bg-white' },
      { label: 'Đang xử lý', value: String(prog), icon: <PenTool className="w-4 h-4 text-[#3B82F6]" />, border: 'border-[#3B82F6]', bg: 'bg-white' },
      { label: 'Kết thúc', value: String(done), icon: <CheckCircle2 className="w-4 h-4 text-[#14B8A6]" />, border: 'border-[#14B8A6]', bg: 'bg-white' },
    ];
  }, [rawTickets]);

  const filteredTickets = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return rawTickets.filter((t) => {
      const st = String(t.status || '').toUpperCase();
      if (!selectedStatuses.includes(st)) return false;
      if (!q) return true;
      const hay = `${t.title || ''} ${t.description || ''} ${t.room_number || ''} ${t.reported_by_full_name || ''} ${t.reported_by_email || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rawTickets, searchTerm, selectedStatuses]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredTickets.slice(start, start + PAGE_SIZE);
  }, [filteredTickets, safePage]);

  const openDetail = async (id) => {
    setActiveMenuId(null);
    setDetailId(id);
    setDetailLoading(true);
    setDetailTicket(null);
    setAssignDraft('');
    setRepairCostDraft('0');
    if (!token) return;
    try {
      const data = await apiFetch(`/admin/tickets/${id}`, { token });
      const t = data.ticket;
      setDetailTicket(t);
      setAssignDraft(t?.assigned_to_user_id != null ? String(t.assigned_to_user_id) : '');
      setRepairCostDraft(String(Number(t?.repair_cost || 0)));
    } catch {
      addToast('Không tải được chi tiết phiếu.', 'error');
      setDetailId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailId(null);
    setDetailTicket(null);
  };

  const patchTicket = async (id, body, msg) => {
    if (!token) return;
    setDetailSaving(true);
    try {
      await apiFetch(`/admin/tickets/${id}`, { token, method: 'PUT', body });
      addToast(msg || 'Đã cập nhật.', 'success');
      await refresh();
      if (detailId === id) {
        const data = await apiFetch(`/admin/tickets/${id}`, { token });
        setDetailTicket(data.ticket);
        setAssignDraft(data.ticket?.assigned_to_user_id != null ? String(data.ticket.assigned_to_user_id) : '');
        setRepairCostDraft(String(Number(data.ticket?.repair_cost || 0)));
      }
      setActiveMenuId(null);
    } catch (e) {
      addToast(e?.message || 'Cập nhật thất bại.', 'error');
    } finally {
      setDetailSaving(false);
    }
  };

  const handleAssignSave = () => {
    if (!detailTicket?.incident_id) return;
    const v = assignDraft === '' ? null : Number(assignDraft);
    if (v != null && !Number.isInteger(v)) {
      addToast('Người phụ trách không hợp lệ.', 'error');
      return;
    }
    patchTicket(detailTicket.incident_id, { assigned_to: v }, 'Đã cập nhật người phụ trách.');
  };

  const handleRepairCostSave = () => {
    if (!detailTicket?.incident_id) return;
    const normalized = repairCostDraft === '' ? 0 : Number(repairCostDraft);
    if (!Number.isFinite(normalized) || normalized < 0) {
      addToast('Chi phí sửa chữa phải là số từ 0 trở lên.', 'error');
      return;
    }
    patchTicket(detailTicket.incident_id, { repair_cost: normalized }, 'Đã cập nhật chi phí sửa chữa.');
  };

  const handlePrintReceipt = async (ticket) => {
    if (!token || !ticket?.incident_id) return;
    if (!canPrintTicketReceipt(ticket)) {
      addToast('Biên nhận chỉ có sau khi phiếu đã hoàn thành hoặc đã đóng.', 'error');
      return;
    }
    try {
      const data = await apiFetch(`/admin/tickets/${ticket.incident_id}/receipt`, { token });
      const ok = printTicketReceipt(data.receipt?.ticket || ticket);
      if (ok) addToast('Đã tải biên lai PDF.');
      else addToast('Không tạo được biên lai PDF.', 'error');
    } catch (e) {
      addToast(e?.message || 'Không mở được biên nhận.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!token) return;
    if (!window.confirm('Xóa vĩnh viễn phiếu này? Hành động không hoàn tác.')) {
      setActiveMenuId(null);
      return;
    }
    try {
      await apiFetch(`/admin/tickets/${id}`, { token, method: 'DELETE' });
      addToast('Đã xóa phiếu.');
      if (detailId === id) closeDetail();
      setActiveMenuId(null);
      await refresh();
    } catch (e) {
      addToast(e?.message || 'Xóa thất bại.', 'error');
    }
  };

  const toggleStatusFilter = (status) => {
    if (selectedStatuses.includes(status)) {
      const next = selectedStatuses.filter((s) => s !== status);
      setSelectedStatuses(next.length > 0 ? next : [...ALL_TICKET_STATUSES]);
    } else {
      setSelectedStatuses([...selectedStatuses, status]);
    }
  };

  const clearCreateAttachments = () => {
    setCreateAttachments((prev) => {
      prev.forEach((a) => {
        if (a.preview?.startsWith('blob:')) URL.revokeObjectURL(a.preview);
      });
      return [];
    });
  };

  const openCreateModal = () => {
    clearCreateAttachments();
    setCreateForm({ reported_by: '', room_id: '', title: '', description: '', priority: 'MEDIUM' });
    setCreateOpen(true);
    loadTenants();
  };

  const closeCreateModal = () => {
    clearCreateAttachments();
    setCreateOpen(false);
  };

  const addCreateFiles = (fileList) => {
    const incoming = Array.from(fileList || []).filter((f) => String(f.type || '').startsWith('image/'));
    if (!incoming.length) {
      addToast('Chỉ chấp nhận file ảnh (JPG, PNG…)', 'error');
      return;
    }
    setCreateAttachments((prev) => {
      const next = [...prev];
      for (const file of incoming) {
        if (next.length >= CREATE_MAX_FILES) {
          addToast(`Tối đa ${CREATE_MAX_FILES} ảnh.`, 'error');
          break;
        }
        if (file.size > CREATE_MAX_MB * 1024 * 1024) {
          addToast(`Ảnh "${file.name}" vượt quá ${CREATE_MAX_MB}MB.`, 'error');
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

  const removeCreateAttachment = (id) => {
    setCreateAttachments((prev) => {
      const item = prev.find((a) => a.id === id);
      if (item?.preview?.startsWith('blob:')) URL.revokeObjectURL(item.preview);
      return prev.filter((a) => a.id !== id);
    });
  };

  const onCreateTenantChange = (userId) => {
    const t = tenants.find((x) => String(x.user_id) === String(userId));
    setCreateForm((p) => ({
      ...p,
      reported_by: userId,
      room_id: t?.room_id != null ? String(t.room_id) : '',
    }));
  };

  const submitCreate = async () => {
    if (!token) return;
    if (!createForm.reported_by || !createForm.title?.trim()) {
      addToast('Chọn người thuê và nhập tiêu đề.', 'error');
      return;
    }
    setCreateSubmitting(true);
    try {
      let attachment_urls = [];
      if (createAttachments.length > 0) {
        const formData = new FormData();
        createAttachments.forEach((a) => formData.append('images', a.file));
        const uploadRes = await fetch(`${API_BASE_URL}/admin/tickets/upload`, {
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

      await apiFetch('/admin/tickets', {
        token,
        method: 'POST',
        body: {
          reported_by: Number(createForm.reported_by),
          title: createForm.title.trim(),
          description: createForm.description?.trim() || null,
          room_id: createForm.room_id ? Number(createForm.room_id) : null,
          priority: createForm.priority,
          attachment_urls,
        },
      });
      addToast('Đã tạo phiếu.');
      clearCreateAttachments();
      setCreateOpen(false);
      await refresh();
    } catch (e) {
      addToast(e?.message || 'Tạo phiếu thất bại.', 'error');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const callHotline = () => {
    if (!HOTLINE) {
      addToast('Thiết lập VITE_SUPPORT_HOTLINE trong env frontend để gọi nhanh.', 'error');
      return;
    }
    window.location.href = `tel:${HOTLINE.replace(/\s/g, '')}`;
  };

  const pageButtons = useMemo(() => {
    const n = totalPages;
    const p = safePage;
    if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1);
    const out = [1];
    if (p > 3) out.push('…');
    for (let i = Math.max(2, p - 1); i <= Math.min(n - 1, p + 1); i++) out.push(i);
    if (p < n - 2) out.push('…');
    if (n > 1) out.push(n);
    return out;
  }, [totalPages, safePage]);

  const rangeStart = filteredTickets.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filteredTickets.length);

  return (
    <div className="w-full max-w-[1200px] mx-auto mt-2 px-4 pb-12 relative flex flex-col h-full gap-8">
      <div className="flex justify-between items-end relative z-10 flex-wrap gap-4">
        <div>
          <h1 className="text-[32px] font-sans font-bold text-[#0F3A40] tracking-tight leading-none mb-3">Yêu cầu bảo trì</h1>
          <p className="text-[14px] text-[#4A787C] font-medium">Theo dõi, phân công và cập nhật trạng thái phiếu từ người thuê.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="bg-[#0F3A40] hover:bg-[#1F545B] border border-[#BCE1E5]/20 text-white px-6 py-3 rounded-full text-[14px] font-bold transition-colors shadow-xl flex items-center gap-2"
        >
          <Plus className="w-[18px] h-[18px]" /> Tạo phiếu mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className={`rounded-[24px] p-6 shadow-sm border-2 ${stat.border} ${stat.bg} flex justify-between items-end min-h-[120px]`}>
            <div className="flex flex-col justify-between h-full w-full">
              <span className="text-[12px] font-bold text-[#4A787C] mb-2">{stat.label}</span>
              <div className="flex justify-between items-end w-full">
                <span className="text-4xl font-bold text-[#0F3A40] leading-none">{stat.value}</span>
                <div className="bg-[#F2FCFD] p-1.5 rounded-lg border border-[#BCE1E5]/30">{stat.icon}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[32px] p-2 shadow-sm border border-transparent flex flex-col">
        <div className="flex flex-wrap justify-between items-center p-6 border-b border-[#BCE1E5]/30 gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={selectAllFilters}
              className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all ${
                allFilterTabsActive ? 'bg-[#0F3A40] text-white shadow-sm' : 'text-[#4A787C] hover:text-[#0F3A40]'
              }`}
            >
              Tất cả trạng thái
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatuses(['OPEN'])}
              className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all ${
                selectedStatuses.length === 1 && selectedStatuses[0] === 'OPEN'
                  ? 'bg-[#E68A00] text-white shadow-sm'
                  : 'text-[#4A787C] hover:text-[#0F3A40]'
              }`}
            >
              Chờ xử lý
            </button>
          </div>

          <div className="flex items-center gap-4 flex-1 justify-end flex-wrap">
            <div className="relative max-w-[300px] w-full min-w-[200px] group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#82ABB0] group-focus-within:text-[#14B8A6] transition-colors" />
              <input
                type="text"
                placeholder="Tiêu đề, mô tả, phòng, người gửi…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#F2FCFD] border border-[#BCE1E5]/40 rounded-full py-2.5 pl-11 pr-4 text-[13px] font-medium text-[#0F3A40] outline-none focus:border-[#14B8A6]/40 focus:bg-white transition-all"
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#82ABB0] hover:text-[#0F3A40]"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold transition-all border ${
                  showFilters ? 'bg-[#0F3A40] text-white border-transparent shadow-lg' : 'text-[#4A787C] border-[#BCE1E5]/40 hover:bg-[#F2FCFD]'
                }`}
              >
                <Filter className="w-4 h-4" /> Bộ lọc
              </button>

              {showFilters && (
                <div
                  ref={filterRef}
                  className="absolute right-0 top-[120%] z-50 w-64 bg-white rounded-2xl shadow-2xl border border-[#BCE1E5]/40 p-4 animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  <h4 className="text-[11px] font-bold text-[#82ABB0] tracking-widest uppercase mb-4">Trạng thái (API)</h4>
                  <div className="space-y-3">
                    {FILTER_STATUSES.map((st) => (
                      <label key={st.id} className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedStatuses.includes(st.id)}
                            onChange={() => toggleStatusFilter(st.id)}
                            className="peer appearance-none w-5 h-5 rounded-md border-2 border-[#BCE1E5] checked:bg-[#14B8A6] checked:border-transparent transition-all"
                          />
                          <CheckCircle2 className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 left-[3px] transition-opacity" />
                        </div>
                        <span className="text-[13px] font-bold text-[#4A787C] group-hover:text-[#0F3A40] transition-colors">{st.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-6 pt-4 border-t border-[#BCE1E5]/20 flex justify-between gap-3">
                    <button type="button" onClick={selectAllFilters} className="text-[11px] font-bold text-[#82ABB0] hover:text-[#D14D4D] transition-colors">
                      Chọn lại tất cả
                    </button>
                    <button type="button" onClick={() => setShowFilters(false)} className="text-[11px] font-bold text-[#14B8A6] hover:underline">
                      Đóng
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 w-full overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-bold text-[#82ABB0] tracking-widest uppercase">
                <th className="pb-5 font-bold px-2">Tiêu đề</th>
                <th className="pb-5 font-bold px-2">Người gửi</th>
                <th className="pb-5 font-bold px-2">Phòng</th>
                <th className="pb-5 font-bold px-2 w-[28%]">Mô tả</th>
                <th className="pb-5 font-bold px-2">Ưu tiên</th>
                <th className="pb-5 font-bold px-2">Ngày tạo</th>
                <th className="pb-5 font-bold px-2">Trạng thái</th>
                <th className="pb-5 font-bold px-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="before:block before:h-2">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-[13px] font-medium text-[#4A787C]">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : pageRows.length > 0 ? (
                pageRows.map((t) => {
                  const apiSt = String(t.status || '').toUpperCase();
                  return (
                    <tr key={t.incident_id} className="border-b border-[#BCE1E5]/40 last:border-0 hover:bg-[#F2FCFD]/50 transition-colors">
                      <td className="py-5 px-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[#EBFDFB] text-[#14B8A6]">
                            <Lightbulb className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-[#0F3A40] text-[14px] leading-tight">{t.title}</span>
                        </div>
                      </td>
                      <td className="py-5 px-2 text-[12px] text-[#4A787C] font-medium max-w-[140px]">
                        <span className="block truncate font-bold text-[#0F3A40]">{t.reported_by_full_name || '—'}</span>
                        <span className="block truncate text-[11px] text-[#82ABB0]">{t.reported_by_email || ''}</span>
                      </td>
                      <td className="py-5 px-2">
                        <span className="font-bold text-[13px] text-[#0F3A40]">{t.room_number ? `Phòng ${t.room_number}` : '—'}</span>
                      </td>
                      <td className="py-5 px-2 pr-6">
                        <p className="text-[13px] text-[#82ABB0] font-medium line-clamp-2">{t.description || '—'}</p>
                      </td>
                      <td className="py-5 px-2 text-[11px] font-bold text-[#0F3A40]">{priorityVi(t.priority)}</td>
                      <td className="py-5 px-2">
                        <span className="text-[#0F3A40] font-medium text-[13px]">
                          {t.created_at ? new Date(t.created_at).toLocaleDateString('vi-VN') : '—'}
                        </span>
                      </td>
                      <td className="py-5 px-2">
                        <span className={`${statusBadgeClass(apiSt)} px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase inline-block text-center`}>
                          {statusLabelVi(apiSt)}
                        </span>
                      </td>
                      <td className="py-5 px-2 text-right relative">
                        <button
                          type="button"
                          onClick={() => setActiveMenuId(activeMenuId === t.incident_id ? null : t.incident_id)}
                          className={`transition-all p-2 rounded-xl ${
                            activeMenuId === t.incident_id ? 'bg-[#0F3A40] text-white shadow-lg' : 'text-[#82ABB0] hover:text-[#0F3A40] hover:bg-[#F2FCFD]'
                          }`}
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>

                        {activeMenuId === t.incident_id && (
                          <div
                            ref={menuRef}
                            className="absolute right-2 top-[70%] z-[100] w-56 bg-white/95 backdrop-blur-xl border border-[#BCE1E5]/40 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200 text-left"
                          >
                            <div className="px-3 py-2 border-b border-[#BCE1E5]/20 mb-1">
                              <p className="text-[10px] font-bold text-[#82ABB0] tracking-widest uppercase">Quản lý phiếu</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => openDetail(t.incident_id)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-bold text-[#4A787C] hover:bg-[#F2FCFD] hover:text-[#0F3A40] rounded-xl transition-colors"
                            >
                              <Eye size={16} /> Xem & cập nhật
                            </button>
                            {apiSt === 'OPEN' ? (
                              <button
                                type="button"
                                onClick={() => patchTicket(t.incident_id, { status: 'IN_PROGRESS' }, 'Đã chuyển sang đang xử lý.')}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-bold text-[#4A787C] hover:bg-[#F2FCFD] hover:text-[#3B82F6] rounded-xl transition-colors"
                              >
                                <Clock size={16} /> Tiếp nhận xử lý
                              </button>
                            ) : null}
                            {apiSt === 'IN_PROGRESS' ? (
                              <button
                                type="button"
                                onClick={() => patchTicket(t.incident_id, { status: 'RESOLVED' }, 'Đã đánh dấu đã xử lý.')}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-bold text-[#4A787C] hover:bg-[#F2FCFD] hover:text-[#14B8A6] rounded-xl transition-colors"
                              >
                                <CheckCircle2 size={16} /> Đã xử lý
                              </button>
                            ) : null}
                            {(apiSt === 'RESOLVED' || apiSt === 'CLOSED') && apiSt !== 'CLOSED' ? (
                              <button
                                type="button"
                                onClick={() => patchTicket(t.incident_id, { status: 'CLOSED' }, 'Đã đóng phiếu.')}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-bold text-[#4A787C] hover:bg-slate-50 rounded-xl transition-colors"
                              >
                                <X size={16} /> Đóng phiếu
                              </button>
                            ) : null}
                            {apiSt !== 'OPEN' ? (
                              <button
                                type="button"
                                onClick={() => patchTicket(t.incident_id, { status: 'OPEN' }, 'Đã mở lại phiếu (chờ xử lý).')}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-bold text-[#4A787C] hover:bg-[#FFF3E0] rounded-xl transition-colors"
                              >
                                <PenTool size={16} /> Mở lại (chờ)
                              </button>
                            ) : null}
                            <div className="h-px bg-[#BCE1E5]/20 my-1" />
                            <button
                              type="button"
                              onClick={() => handleDelete(t.incident_id)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-bold text-[#D14D4D] hover:bg-red-50 rounded-xl transition-colors"
                            >
                              <Trash2 size={16} /> Xóa phiếu
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Search className="w-10 h-10 text-[#BCE1E5]" />
                      <p className="text-[15px] font-bold text-[#0F3A40]">Không có phiếu phù hợp</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm('');
                          selectAllFilters();
                        }}
                        className="text-[13px] font-bold text-[#14B8A6] hover:underline"
                      >
                        Xóa bộ lọc
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap justify-between items-center gap-4 px-8 py-4 border-t border-[#BCE1E5]/30 text-[12px] font-bold text-[#82ABB0]">
          <span>
            Hiển thị{' '}
            <span className="text-[#0F3A40]">{filteredTickets.length === 0 ? 0 : `${rangeStart}–${rangeEnd}`}</span> /{' '}
            <span className="text-[#0F3A40]">{filteredTickets.length}</span> phiếu
            {filteredTickets.length !== rawTickets.length && <span className="font-medium"> (trên {rawTickets.length} tổng)</span>}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="text-[#82ABB0] hover:text-[#0F3A40] px-2 disabled:opacity-30 disabled:pointer-events-none"
            >
              &lt;
            </button>
            {pageButtons.map((b, idx) =>
              b === '…' ? (
                <span key={`e-${idx}`} className="px-1 opacity-50">
                  …
                </span>
              ) : (
                <button
                  key={b}
                  type="button"
                  onClick={() => setPage(b)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    safePage === b ? 'bg-[#0F3A40] text-white' : 'text-[#4A787C] hover:bg-[#F2FCFD]'
                  }`}
                >
                  {b}
                </button>
              )
            )}
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="text-[#82ABB0] hover:text-[#0F3A40] px-2 disabled:opacity-30 disabled:pointer-events-none"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] p-3 shadow-sm border border-[#BCE1E5]/30 flex flex-col md:flex-row gap-10 items-center min-h-[200px]">
        <div className="w-full md:w-[42%] h-[200px] rounded-[24px] overflow-hidden relative shadow-inner group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0F3A40] to-[#14B8A6] flex items-end p-6">
            <p className="text-white text-[12px] font-medium leading-loose max-w-[90%]">
              Hotline kỹ thuật: <span className="font-bold">{HOTLINE || 'Chưa cấu hình'}</span>
            </p>
          </div>
        </div>
        <div className="flex-1 px-4 md:px-8 py-6 flex flex-col justify-center">
          <h2 className="text-[24px] font-bold text-[#0F3A40] mb-4">Hỗ trợ khẩn cấp</h2>
          <p className="text-[#4A787C] font-medium text-[15px] leading-relaxed mb-8 max-w-[95%]">
            Trường hợp cháy, rò gas, ngập nước — gọi ngay. Số hiển thị lấy từ <code className="text-[12px] bg-slate-100 px-1 rounded">VITE_SUPPORT_HOTLINE</code>.
          </p>
          <button
            type="button"
            onClick={callHotline}
            className="bg-white border-2 border-[#EBFDFB] hover:border-[#14B8A6]/50 hover:shadow-lg text-[#0F3A40] flex items-center gap-3 px-6 py-3.5 rounded-full w-fit transition-all group"
          >
            <div className="w-8 h-8 rounded-full bg-[#EBFDFB] flex items-center justify-center text-[#14B8A6] group-hover:scale-110 transition-transform">
              <PhoneCall className="w-4 h-4 fill-current" />
            </div>
            <span className="font-bold text-[18px] tracking-wide">{HOTLINE || 'Chưa cấu hình số'}</span>
          </button>
        </div>
      </div>

      {createOpen && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeCreateModal();
          }}
          role="presentation"
        >
          <div className="w-full max-w-lg rounded-[28px] bg-white shadow-2xl border border-slate-200 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-[#0F3A40]">Tạo phiếu thay người thuê</h3>
              <button type="button" onClick={closeCreateModal} className="p-2 rounded-full hover:bg-slate-100 text-slate-500">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-[#82ABB0] uppercase">Người thuê *</label>
                <select
                  value={createForm.reported_by}
                  onChange={(e) => onCreateTenantChange(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-[14px] font-medium outline-none focus:border-[#14B8A6]"
                >
                  <option value="">— Chọn —</option>
                  {tenants.map((tn) => (
                    <option key={tn.user_id} value={String(tn.user_id)}>
                      {tn.full_name || tn.email} {tn.room_number ? `(Phòng ${tn.room_number})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#82ABB0] uppercase">Phòng liên quan</label>
                <select
                  value={createForm.room_id}
                  onChange={(e) => setCreateForm((p) => ({ ...p, room_id: e.target.value }))}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-[14px] font-medium outline-none focus:border-[#14B8A6]"
                >
                  <option value="">— Không gán —</option>
                  {tenants
                    .filter((tn) => String(tn.user_id) === String(createForm.reported_by) && tn.room_id)
                    .map((tn) => (
                      <option key={tn.room_id} value={String(tn.room_id)}>
                        Phòng {tn.room_number}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#82ABB0] uppercase">Ưu tiên</label>
                <select
                  value={createForm.priority}
                  onChange={(e) => setCreateForm((p) => ({ ...p, priority: e.target.value }))}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-[14px] font-medium outline-none focus:border-[#14B8A6]"
                >
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#82ABB0] uppercase">Tiêu đề *</label>
                <input
                  value={createForm.title}
                  onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                  maxLength={200}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-[14px] font-medium outline-none focus:border-[#14B8A6]"
                  placeholder="Ví dụ: Thay bóng đèn hành lang"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#82ABB0] uppercase">Mô tả</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-[14px] font-medium outline-none focus:border-[#14B8A6] resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#82ABB0] uppercase">
                  Hình ảnh đính kèm ({createAttachments.length}/{CREATE_MAX_FILES})
                </label>
                <div
                  className={`relative mt-1 min-h-[120px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-3 transition-colors ${
                    createDragActive ? 'border-[#14B8A6] bg-[#EAF7F8]' : 'border-slate-200 bg-slate-50/50 hover:border-[#14B8A6]/50'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setCreateDragActive(true);
                  }}
                  onDragLeave={() => setCreateDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setCreateDragActive(false);
                    addCreateFiles(e.dataTransfer.files);
                  }}
                >
                  <input
                    ref={createFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    onChange={(e) => {
                      addCreateFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  {createAttachments.length === 0 ? (
                    <>
                      <Upload className="w-8 h-8 text-[#14B8A6] mb-2 pointer-events-none" />
                      <p className="text-[12px] font-bold text-[#0F3A40] pointer-events-none text-center px-2">
                        Kéo thả hoặc chọn ảnh
                      </p>
                      <p className="text-[10px] text-[#82ABB0] font-medium pointer-events-none mt-1">
                        JPG, PNG, GIF, WebP — tối đa {CREATE_MAX_FILES} ảnh, ≤ {CREATE_MAX_MB}MB/ảnh
                      </p>
                    </>
                  ) : (
                    <div className="w-full grid grid-cols-3 gap-2 pt-1 z-20 relative">
                      {createAttachments.map((a) => (
                        <div key={a.id} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-white">
                          <img src={a.preview} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={(ev) => {
                              ev.preventDefault();
                              ev.stopPropagation();
                              removeCreateAttachment(a.id);
                            }}
                            className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-500 z-30"
                            aria-label="Xóa ảnh"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      {createAttachments.length < CREATE_MAX_FILES ? (
                        <button
                          type="button"
                          onClick={() => createFileInputRef.current?.click()}
                          className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-[10px] font-bold text-[#82ABB0] hover:border-[#14B8A6] hover:text-[#14B8A6] z-30"
                        >
                          <ImageIcon size={18} /> Thêm
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={closeCreateModal} className="flex-1 py-3 rounded-2xl border border-slate-200 font-bold text-[#4A787C]">
                Hủy
              </button>
              <button
                type="button"
                disabled={createSubmitting}
                onClick={submitCreate}
                className="flex-1 py-3 rounded-2xl bg-[#0F3A40] text-white font-bold hover:bg-[#1F545B] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {createSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : null}
                Tạo
              </button>
            </div>
          </div>
        </div>
      )}

      {detailId != null && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-[28px] bg-white shadow-2xl border border-slate-200">
            <div className="sticky top-0 flex justify-between items-center gap-3 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur z-10">
              <h3 className="text-lg font-bold text-[#0F3A40]">Phiếu #{detailId}</h3>
              <button type="button" onClick={closeDetail} className="p-2 rounded-full hover:bg-slate-100 text-slate-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {detailLoading || !detailTicket ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-[#14B8A6]" />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${statusBadgeClass(detailTicket.status)}`}>
                      {statusLabelVi(detailTicket.status)}
                    </span>
                    <span className="text-[11px] font-bold rounded-lg bg-slate-100 px-2 py-1 text-[#0F3A40]">{priorityVi(detailTicket.priority)}</span>
                  </div>
                  <h4 className="text-xl font-bold text-[#0F3A40] leading-snug">{detailTicket.title}</h4>
                  <div className="flex items-start gap-2 text-[12px] text-[#4A787C]">
                    <User className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-[#0F3A40]">{detailTicket.reported_by_full_name || '—'}</p>
                      <p>{detailTicket.reported_by_email || '—'}</p>
                      <p className="mt-1">
                        Phòng: {detailTicket.room_number ? `Phòng ${detailTicket.room_number}` : '—'}
                      </p>
                    </div>
                  </div>
                  <p className="text-[14px] text-[#4A787C] font-medium whitespace-pre-wrap leading-relaxed">{detailTicket.description || '—'}</p>
                  <div className="text-[11px] text-[#82ABB0] font-medium space-y-1">
                    <p>Tạo: {detailTicket.created_at ? new Date(detailTicket.created_at).toLocaleString('vi-VN') : '—'}</p>
                    {detailTicket.updated_at ? <p>Cập nhật: {new Date(detailTicket.updated_at).toLocaleString('vi-VN')}</p> : null}
                    <p>Chi phí sửa chữa: <span className="font-bold text-[#0F3A40]">{moneyVi(detailTicket.repair_cost)}</span></p>
                  </div>

                  {parseAttachmentUrls(detailTicket.attachment_urls).length > 0 ? (
                    <div>
                      <p className="text-[10px] font-bold text-[#82ABB0] uppercase mb-2 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> Ảnh đính kèm
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {parseAttachmentUrls(detailTicket.attachment_urls).map((u, i) => (
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

                  <div className="border-t border-slate-100 pt-4 space-y-2">
                    <label className="text-[10px] font-bold text-[#82ABB0] uppercase">Người phụ trách (admin)</label>
                    <div className="flex gap-2">
                      <select
                        value={assignDraft}
                        onChange={(e) => setAssignDraft(e.target.value)}
                        className="flex-1 rounded-2xl border border-slate-200 px-3 py-2.5 text-[13px] font-medium outline-none focus:border-[#14B8A6]"
                      >
                        <option value="">— Chưa phân công —</option>
                        {staff.map((s) => (
                          <option key={s.user_id} value={String(s.user_id)}>
                            {s.full_name || s.email}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={detailSaving}
                        onClick={handleAssignSave}
                        className="px-4 py-2 rounded-2xl bg-[#14B8A6] text-white text-[12px] font-bold hover:bg-[#109284] disabled:opacity-50"
                      >
                        Lưu
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-2">
                    <label className="text-[10px] font-bold text-[#82ABB0] uppercase">Chi phí sửa chữa</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={repairCostDraft}
                        onChange={(e) => setRepairCostDraft(e.target.value)}
                        className="flex-1 rounded-2xl border border-slate-200 px-3 py-2.5 text-[13px] font-medium outline-none focus:border-[#14B8A6]"
                        placeholder="0"
                      />
                      <button
                        type="button"
                        disabled={detailSaving}
                        onClick={handleRepairCostSave}
                        className="px-4 py-2 rounded-2xl bg-[#0F3A40] text-white text-[12px] font-bold hover:bg-[#1F545B] disabled:opacity-50"
                      >
                        Lưu
                      </button>
                    </div>
                    <p className="text-[11px] font-medium text-[#82ABB0]">Có thể nhập 0 nếu không thu phí.</p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {String(detailTicket.status).toUpperCase() === 'OPEN' ? (
                      <button
                        type="button"
                        disabled={detailSaving}
                        onClick={() => patchTicket(detailTicket.incident_id, { status: 'IN_PROGRESS' }, 'Đã tiếp nhận xử lý.')}
                        className="flex-1 min-w-[120px] py-3 rounded-2xl bg-[#3B82F6] text-white text-[13px] font-bold hover:opacity-90 disabled:opacity-50"
                      >
                        Tiếp nhận
                      </button>
                    ) : null}
                    {String(detailTicket.status).toUpperCase() === 'IN_PROGRESS' ? (
                      <button
                        type="button"
                        disabled={detailSaving}
                        onClick={() => patchTicket(detailTicket.incident_id, { status: 'RESOLVED' }, 'Đã xử lý xong.')}
                        className="flex-1 min-w-[120px] py-3 rounded-2xl bg-[#14B8A6] text-white text-[13px] font-bold hover:opacity-90 disabled:opacity-50"
                      >
                        Đánh dấu đã xử lý
                      </button>
                    ) : null}
                    {String(detailTicket.status).toUpperCase() === 'RESOLVED' ? (
                      <button
                        type="button"
                        disabled={detailSaving}
                        onClick={() => patchTicket(detailTicket.incident_id, { status: 'CLOSED' }, 'Đã đóng phiếu.')}
                        className="flex-1 min-w-[120px] py-3 rounded-2xl bg-slate-700 text-white text-[13px] font-bold hover:opacity-90 disabled:opacity-50"
                      >
                        Đóng phiếu
                      </button>
                    ) : null}
                    {String(detailTicket.status).toUpperCase() !== 'OPEN' ? (
                      <button
                        type="button"
                        disabled={detailSaving}
                        onClick={() => patchTicket(detailTicket.incident_id, { status: 'OPEN' }, 'Đã mở lại (chờ xử lý).')}
                        className="flex-1 min-w-[120px] py-3 rounded-2xl border-2 border-[#E68A00] text-[#E68A00] text-[13px] font-bold hover:bg-[#FFF8F0] disabled:opacity-50"
                      >
                        Mở lại
                      </button>
                    ) : null}
                    {canPrintTicketReceipt(detailTicket) ? (
                      <button
                        type="button"
                        disabled={detailSaving}
                        onClick={() => handlePrintReceipt(detailTicket)}
                        className="flex-1 min-w-[120px] py-3 rounded-2xl border-2 border-[#14B8A6] text-[#0F3A40] text-[13px] font-bold hover:bg-[#EBFDFB] disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Printer className="w-4 h-4" /> Tải biên lai
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={detailSaving}
                      onClick={() => handleDelete(detailTicket.incident_id)}
                      className="flex-1 min-w-[100px] py-3 rounded-2xl border border-rose-200 text-rose-600 text-[13px] font-bold hover:bg-rose-50 disabled:opacity-50"
                    >
                      Xóa
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
