import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ClipboardList, Search,
  Download, Plus, Pencil,
  Wallet, AlertCircle, XCircle,
  Info, Trash2, AlertTriangle, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { downloadCsv } from '../../utils/exportCsv';
import ContractFromHoldModal from '../../components/rooms/ContractFromHoldModal';

function toIsoDateInput(value) {
  if (value == null || value === '') return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export default function ContractManagePage() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const holdRequestIdFromUrl = searchParams.get('hold_request_id');
  const [contractHoldId, setContractHoldId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [contracts, setContracts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteModalContract, setDeleteModalContract] = useState(null);
  const [deleteModalDeleting, setDeleteModalDeleting] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState('');
  const [editModalContract, setEditModalContract] = useState(null);
  const [editForm, setEditForm] = useState({
    start_date: '',
    end_date: '',
    rent_price: '',
    deposit: '',
    status: 'ACTIVE',
    notes: '',
  });
  const [editError, setEditError] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    tenant_id: '',
    room_number: '',
    start_date: '',
    end_date: '',
    rent_price: '',
    deposit: '',
    notes: '',
  });

  const refresh = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await apiFetch('/admin/contracts', { token });
      setContracts(data.contracts || []);
    } catch {
      setContracts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const id = Number(holdRequestIdFromUrl);
    if (Number.isInteger(id) && id > 0) {
      setContractHoldId(id);
      setSearchParams({}, { replace: true });
    }
  }, [holdRequestIdFromUrl, setSearchParams]);

  const stats = useMemo(() => {
    const total = contracts.length;
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringSoon = contracts.filter((c) => {
      if (c.status !== 'ACTIVE' || !c.end_date) return false;
      const end = new Date(c.end_date);
      return end >= now && end <= in30Days;
    }).length;
    const ended = contracts.filter((c) => c.status !== 'ACTIVE').length;
    const deposits = contracts.reduce((sum, c) => sum + Number(c.deposit || 0), 0);
    return { total, expiringSoon, ended, deposits };
  }, [contracts]);

  const contractStats = useMemo(
    () => [
      { label: 'TỔNG HỢP ĐỒNG', value: String(stats.total), detail: 'Tất cả', icon: <ClipboardList className="w-5 h-5" />, color: 'text-[#14B8A6]', bg: 'bg-[#EBFDFB]' },
      { label: 'SẮP HẾT HẠN', value: String(stats.expiringSoon), detail: '30 ngày tới', icon: <AlertCircle className="w-5 h-5" />, color: 'text-[#E68A00]', bg: 'bg-[#FFF3E0]' },
      { label: 'ĐÃ KẾT THÚC', value: String(stats.ended), detail: 'Expired/Terminated', icon: <XCircle className="w-5 h-5" />, color: 'text-[#82ABB0]', bg: 'bg-[#F5F5F5]' },
      { label: 'TỔNG TIỀN CỌC', value: Number(stats.deposits).toLocaleString('vi-VN'), detail: 'VNĐ', icon: <Wallet className="w-5 h-5" />, color: 'text-[#3B82F6]', bg: 'bg-[#EBF4FF]' },
    ],
    [stats]
  );

  const filtered = useMemo(() => {
    const q = String(searchQuery || '').trim().toLowerCase();
    return contracts.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${c.full_name || ''} ${c.email || ''} ${c.room_number || ''} ${c.contract_id || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [contracts, searchQuery, statusFilter]);

  const filteredTotal = filtered.length;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredTotal / pageSize)), [filteredTotal]);

  const pagedContracts = useMemo(() => {
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const handleCreate = async () => {
    if (!token) return;
    // basic validation
    if (!createForm.tenant_id || !createForm.room_number || !createForm.start_date || !createForm.end_date) {
      alert('Vui lòng điền đầy đủ tenant_id, số phòng, start_date và end_date');
      return;
    }

    const payload = {
      tenant_id: Number(createForm.tenant_id),
      room_number: String(createForm.room_number).trim(),
      start_date: createForm.start_date,
      end_date: createForm.end_date,
      rent_price: Number(createForm.rent_price || 0),
      deposit: Number(createForm.deposit || 0),
      notes: createForm.notes || null,
    };

    setIsSubmitting(true);
    try {
      await apiFetch('/admin/contracts', { token, method: 'POST', body: payload });
      setIsCreateOpen(false);
      setCreateForm({ tenant_id: '', room_number: '', start_date: '', end_date: '', rent_price: '', deposit: '', notes: '' });
      await refresh();
    } catch (err) {
      console.error('Create contract error', err);
      // show user-friendly message
      alert(err?.data?.message || err.message || 'Lỗi khi tạo hợp đồng');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pill = (status) => {
    if (status === 'ACTIVE') return 'bg-[#EBFDFB] text-[#14B8A6]';
    if (status === 'EXPIRED') return 'bg-[#FFF3E0] text-[#E68A00]';
    return 'bg-slate-100 text-slate-500';
  };

  const openEditModal = (c) => {
    setEditForm({
      start_date: toIsoDateInput(c.start_date),
      end_date: toIsoDateInput(c.end_date),
      rent_price: c.rent_price != null ? String(c.rent_price) : '',
      deposit: c.deposit != null ? String(c.deposit) : '',
      status: c.status || 'ACTIVE',
      notes: c.notes || '',
    });
    setEditError('');
    setEditModalContract(c);
  };

  const closeEditModal = () => {
    if (isEditSubmitting) return;
    setEditModalContract(null);
    setEditError('');
  };

  const handleUpdateContract = async () => {
    if (!token || !editModalContract) return;

    if (!editForm.start_date || !editForm.end_date) {
      setEditError('Vui lòng nhập ngày bắt đầu và ngày kết thúc.');
      return;
    }
    if (editForm.end_date < editForm.start_date) {
      setEditError('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.');
      return;
    }

    const payload = {
      start_date: editForm.start_date,
      end_date: editForm.end_date,
      rent_price: Number(editForm.rent_price || 0),
      deposit: Number(editForm.deposit || 0),
      status: editForm.status,
      notes: editForm.notes.trim() ? editForm.notes.trim() : null,
    };

    setEditError('');
    setIsEditSubmitting(true);
    try {
      await apiFetch(`/admin/contracts/${editModalContract.contract_id}`, {
        token,
        method: 'PUT',
        body: payload,
      });
      setEditModalContract(null);
      await refresh();
    } catch (err) {
      setEditError(err?.data?.message || err.message || 'Không cập nhật được hợp đồng.');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const openDeleteContractModal = (c) => {
    setDeleteModalError('');
    setDeleteModalContract(c);
  };

  const closeDeleteContractModal = () => {
    if (deleteModalDeleting) return;
    setDeleteModalContract(null);
    setDeleteModalError('');
  };

  const confirmDeleteContract = async () => {
    if (!token || !deleteModalContract) return;
    setDeleteModalDeleting(true);
    setDeleteModalError('');
    try {
      await apiFetch(`/admin/contracts/${deleteModalContract.contract_id}`, { token, method: 'DELETE' });
      window.dispatchEvent(new Event('admin-nav-badges-refresh'));
      setDeleteModalContract(null);
      await refresh();
    } catch (err) {
      setDeleteModalError(err?.data?.message || err.message || 'Không xóa được hợp đồng.');
    } finally {
      setDeleteModalDeleting(false);
    }
  };

  const handleExportCsv = () => {
    if (filtered.length === 0) {
      window.alert('Không có hợp đồng để xuất (kiểm tra bộ lọc hoặc từ khóa tìm kiếm).');
      return;
    }
    const fmtDate = (d) => {
      if (d == null || d === '') return '';
      const x = new Date(d);
      return Number.isNaN(x.getTime()) ? String(d) : x.toISOString().slice(0, 10);
    };
    const headers = [
      'Mã HĐ',
      'Khách thuê',
      'Email',
      'Phòng',
      'Ngày bắt đầu',
      'Ngày kết thúc',
      'Giá thuê (VNĐ)',
      'Tiền cọc (VNĐ)',
      'Trạng thái',
      'Ghi chú',
    ];
    const rows = filtered.map((c) => [
      c.contract_id,
      c.full_name ?? '',
      c.email ?? '',
      c.room_number ?? '',
      fmtDate(c.start_date),
      fmtDate(c.end_date),
      Number(c.rent_price ?? 0),
      Number(c.deposit ?? 0),
      c.status ?? '',
      c.notes ?? '',
    ]);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    downloadCsv(`danh-sach-hop-dong-${stamp}.csv`, headers, rows);
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto pb-12">
      {/* Header section */}
      <div className="flex justify-between items-end mb-8 pt-4">
        <div>
          <h1 className="text-[32px] font-bold text-[#0F3A40] leading-none mb-3">Quản lý Hợp đồng</h1>
          <p className="text-[#4A787C] font-medium text-[14px]">Theo dõi, gia hạn và quản lý các thỏa thuận thuê phòng trong hệ thống.</p>
        </div>
        <button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 bg-[#14B8A6] hover:bg-[#0da090] text-white px-6 py-3 rounded-full text-[14px] font-bold transition-all shadow-lg shadow-[#14B8A6]/20">
          <Plus className="w-5 h-5" /> Tạo hợp đồng mới
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {contractStats.map((stat, i) => (
          <div key={i} className="bg-white/70 backdrop-blur-md border border-white/50 rounded-[28px] p-6 shadow-sm hover:translate-y-[-4px] transition-all duration-300">
            <p className="text-[10px] font-bold text-[#82ABB0] tracking-widest uppercase mb-3">{stat.label}</p>
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-3xl font-bold text-[#0F3A40] mb-1">{stat.value}</h3>
                <p className="text-[12px] font-bold text-[#82ABB0]">
                  {stat.detail}
                </p>
              </div>
              <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white/40 backdrop-blur-sm border border-white/50 rounded-[32px] p-4 flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#82ABB0] group-focus-within:text-[#14B8A6] transition-colors" />
            <input 
              type="text"
              placeholder="Tìm khách thuê, số phòng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/80 border border-[#BCE1E5]/30 rounded-2xl pl-11 pr-4 py-2.5 text-[13px] font-bold text-[#0F3A40] outline-none min-w-[280px] focus:border-[#14B8A6]/50 transition-all"
            />
          </div>
          <div className="flex flex-col">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white/80 border border-[#BCE1E5]/30 rounded-2xl px-4 py-2.5 text-[13px] font-bold text-[#0F3A40] outline-none min-w-[160px]"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hiệu lực</option>
              <option value="EXPIRED">Hết hạn</option>
              <option value="TERMINATED">Thanh lý</option>
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#BCE1E5]/50 rounded-2xl text-[13px] font-bold text-[#4A787C] hover:text-[#0F3A40] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={16} /> Xuất CSV
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-[40px] p-8 shadow-sm mb-10 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-bold text-[#82ABB0] tracking-widest uppercase">
                <th className="pb-6 px-2">Mã Hợp đồng</th>
                <th className="pb-6 px-2">Khách thuê</th>
                <th className="pb-6 px-2">Phòng</th>
                <th className="pb-6 px-2">Thời hạn</th>
                <th className="pb-6 px-2">Tiền cọc</th>
                <th className="pb-6 px-2">Trạng thái</th>
                <th className="pb-6 px-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[13px] font-medium text-[#4A787C]">
                    Đang tải dữ liệu hợp đồng...
                  </td>
                </tr>
              ) : filteredTotal === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[13px] font-medium text-[#4A787C]">
                    {contracts.length === 0
                      ? 'Chưa có dữ liệu hợp đồng.'
                      : 'Không có hợp đồng khớp bộ lọc / từ khóa tìm kiếm.'}
                  </td>
                </tr>
              ) : (
                pagedContracts.map((c) => (
                  <tr key={c.contract_id} className="border-b border-[#BCE1E5]/30 last:border-0 hover:bg-white/40 transition-colors">
                    <td className="py-5 px-2 font-bold text-[#0F3A40]">#{c.contract_id}</td>
                    <td className="py-5 px-2">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#0F3A40] text-[13px]">{c.full_name}</span>
                        <span className="text-[11px] font-medium text-[#82ABB0]">{c.email}</span>
                      </div>
                    </td>
                    <td className="py-5 px-2 font-bold text-[#0F3A40]">{c.room_number}</td>
                    <td className="py-5 px-2 text-[12px] font-bold text-[#4A787C]">
                      {c.start_date} → {c.end_date}
                    </td>
                    <td className="py-5 px-2 font-bold text-[#0F3A40]">{Number(c.deposit || 0).toLocaleString('vi-VN')}đ</td>
                    <td className="py-5 px-2">
                      <span className={`${pill(c.status)} px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase inline-block`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-5 px-2 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(c)}
                          className="p-2 rounded-xl text-[#14B8A6] hover:text-[#0da090] hover:bg-[#EBFDFB] transition-all inline-flex"
                          title="Chỉnh sửa hợp đồng"
                          aria-label={`Sửa hợp đồng ${c.contract_id}`}
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteContractModal(c)}
                          className="p-2 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition-all inline-flex"
                          title="Xóa hợp đồng (giữ khách thuê)"
                          aria-label={`Xóa hợp đồng ${c.contract_id}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredTotal > 0 ? (
          <div className="mt-8 flex flex-wrap justify-between items-center gap-4 text-[12px] font-bold text-[#82ABB0] border-t border-[#BCE1E5]/20 pt-6">
            <span>
              Hiển thị{' '}
              <span className="text-[#0F3A40]">
                {(Math.min(currentPage, totalPages) - 1) * pageSize + 1}–
                {Math.min(Math.min(currentPage, totalPages) * pageSize, filteredTotal)}
              </span>{' '}
              trên <span className="text-[#0F3A40]">{filteredTotal}</span> hợp đồng
              {filteredTotal !== contracts.length ? (
                <span className="font-medium text-[#82ABB0]"> (tổng {contracts.length})</span>
              ) : null}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className={`px-2 py-1 rounded-lg ${currentPage <= 1 ? 'text-slate-300 cursor-not-allowed' : 'text-[#82ABB0] hover:text-[#0F3A40]'}`}
                aria-label="Trang trước"
              >
                &lt;
              </button>
              {Array.from({ length: totalPages }).map((_, i) => {
                const page = i + 1;
                const active = page === currentPage;
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={
                      active
                        ? 'w-8 h-8 rounded-lg bg-[#14B8A6] text-white flex items-center justify-center shadow-md'
                        : 'w-8 h-8 rounded-lg hover:bg-[#F2FCFD] flex items-center justify-center text-[#4A787C]'
                    }
                    aria-current={active ? 'page' : undefined}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className={`px-2 py-1 rounded-lg ${currentPage >= totalPages ? 'text-slate-300 cursor-not-allowed' : 'text-[#82ABB0] hover:text-[#0F3A40]'}`}
                aria-label="Trang sau"
              >
                &gt;
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Warning/Info Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#FFF3E0] rounded-[32px] p-8 border border-[#E68A00]/10 flex gap-6 items-start">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#E68A00] shrink-0 shadow-sm">
            <AlertCircle size={24} />
          </div>
          <div>
            <h4 className="text-[16px] font-bold text-[#0F3A40] mb-2">Lưu ý gia hạn hợp đồng</h4>
            <p className="text-[13px] text-[#4A787C] font-medium leading-relaxed">
              {stats.expiringSoon > 0
                ? `Có ${stats.expiringSoon} hợp đồng sẽ hết hạn trong 30 ngày tới. Vui lòng liên hệ khách thuê để gia hạn hoặc thanh lý.`
                : 'Không có hợp đồng nào sắp hết hạn trong 30 ngày tới.'}
            </p>
          </div>
        </div>

        <div className="bg-[#F2FCFD] rounded-[32px] p-8 border border-[#BCE1E5]/30 flex gap-6 items-start">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#14B8A6] shrink-0 shadow-sm">
            <Info size={24} />
          </div>
          <div>
            <h4 className="text-[16px] font-bold text-[#0F3A40] mb-2">Tạo hợp đồng mới</h4>
            <p className="text-[13px] text-[#4A787C] font-medium leading-relaxed">
               Ghi chú điều khoản trong trường &quot;Ghi chú&quot; khi tạo/sửa hợp đồng — khách thuê sẽ thấy nội dung này trên trang Hợp đồng.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="mt-4 text-[13px] font-bold text-[#14B8A6] hover:underline flex items-center gap-1.5 group"
            >
              Tạo hợp đồng <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {editModalContract && (
        <div
          className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => !isEditSubmitting && closeEditModal()}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-[32px] p-7 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-contract-title"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 id="edit-contract-title" className="text-2xl font-bold text-[#0F3A40]">
                Chỉnh sửa hợp đồng #{editModalContract.contract_id}
              </h3>
              <button
                type="button"
                onClick={closeEditModal}
                disabled={isEditSubmitting}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-50"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[13px] font-medium text-[#4A787C] mb-6">
              Khách: <span className="font-bold text-[#0F3A40]">{editModalContract.full_name}</span>
              {' · '}
              Phòng: <span className="font-bold text-[#0F3A40]">{editModalContract.room_number}</span>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#82ABB0] uppercase tracking-wide mb-1.5">
                  Ngày bắt đầu
                </label>
                <input
                  type="date"
                  value={editForm.start_date}
                  onChange={(e) => setEditForm((p) => ({ ...p, start_date: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#14B8A6]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#82ABB0] uppercase tracking-wide mb-1.5">
                  Ngày kết thúc
                </label>
                <input
                  type="date"
                  value={editForm.end_date}
                  onChange={(e) => setEditForm((p) => ({ ...p, end_date: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#14B8A6]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#82ABB0] uppercase tracking-wide mb-1.5">
                  Giá thuê (VNĐ)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editForm.rent_price}
                  onChange={(e) => setEditForm((p) => ({ ...p, rent_price: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#14B8A6]"
                  placeholder="Giá thuê"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#82ABB0] uppercase tracking-wide mb-1.5">
                  Tiền cọc (VNĐ)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editForm.deposit}
                  onChange={(e) => setEditForm((p) => ({ ...p, deposit: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#14B8A6]"
                  placeholder="Tiền cọc"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#82ABB0] uppercase tracking-wide mb-1.5">
                  Trạng thái
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#14B8A6] font-bold text-[#0F3A40]"
                >
                  <option value="ACTIVE">Đang hiệu lực</option>
                  <option value="EXPIRED">Hết hạn</option>
                  <option value="TERMINATED">Thanh lý</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-[#82ABB0] uppercase tracking-wide mb-1.5">
                  Ghi chú
                </label>
                <textarea
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#14B8A6]"
                  placeholder="Ghi chú"
                />
              </div>
            </div>

            {editError ? <p className="mt-4 text-sm font-medium text-red-600">{editError}</p> : null}

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={isEditSubmitting}
                className="px-6 py-3 rounded-full font-bold text-[#4A787C] hover:text-[#0F3A40] disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleUpdateContract}
                disabled={isEditSubmitting}
                className="px-8 py-3 rounded-full bg-[#14B8A6] hover:bg-[#0da090] text-white font-bold shadow-lg shadow-[#14B8A6]/20 disabled:opacity-60"
              >
                {isEditSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModalContract && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm"
          onClick={() => !deleteModalDeleting && closeDeleteContractModal()}
        >
          <div
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-[28px] shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-contract-title"
          >
            <button
              type="button"
              onClick={closeDeleteContractModal}
              disabled={deleteModalDeleting}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-50"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 sm:p-8 border-b border-slate-100">
              <h3 id="delete-contract-title" className="text-xl font-bold text-[#0F3A40] pr-10">
                Xác nhận xóa hợp đồng
              </h3>
              <p className="mt-2 text-[13px] font-medium text-[#4A787C] leading-relaxed">
                Khách thuê <span className="font-bold text-[#0F3A40]">vẫn được giữ</span> trong hệ thống. Chỉ hợp đồng này và các hóa đơn / thanh toán gắn hợp đồng sẽ bị gỡ.
              </p>
            </div>

            <div className="p-6 sm:p-8 space-y-5">
              <div className="rounded-2xl bg-[#F8FAFB] border border-slate-100 p-4">
                <p className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-wide mb-3">Khách thuê</p>
                <dl className="grid grid-cols-1 gap-2 text-[13px]">
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#4A787C] font-medium">Họ tên</dt>
                    <dd className="font-bold text-[#0F3A40] text-right">{deleteModalContract.full_name}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#4A787C] font-medium">Email</dt>
                    <dd className="font-semibold text-[#0F3A40] text-right break-all">{deleteModalContract.email}</dd>
                  </div>
                  {deleteModalContract.tenant_id != null ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-[#4A787C] font-medium">Mã khách (tenant)</dt>
                      <dd className="font-mono font-semibold text-[#0F3A40]">#{deleteModalContract.tenant_id}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>

              <div className="rounded-2xl border border-slate-100 overflow-hidden">
                <p className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-wide px-4 pt-4 pb-2 bg-white">
                  Hợp đồng sẽ xóa
                </p>
                <table className="w-full text-[12px]">
                  <tbody>
                    <tr className="border-t border-slate-100">
                      <td className="px-4 py-2 text-[#4A787C] font-medium w-[38%]">Mã hợp đồng</td>
                      <td className="px-4 py-2 font-mono font-bold text-[#0F3A40]">#{deleteModalContract.contract_id}</td>
                    </tr>
                    <tr className="border-t border-slate-100">
                      <td className="px-4 py-2 text-[#4A787C] font-medium">Phòng</td>
                      <td className="px-4 py-2 font-semibold text-[#0F3A40]">{deleteModalContract.room_number ?? '—'}</td>
                    </tr>
                    <tr className="border-t border-slate-100">
                      <td className="px-4 py-2 text-[#4A787C] font-medium">Thời hạn</td>
                      <td className="px-4 py-2 text-[#4A787C]">
                        {deleteModalContract.start_date && deleteModalContract.end_date
                          ? `${deleteModalContract.start_date} → ${deleteModalContract.end_date}`
                          : '—'}
                      </td>
                    </tr>
                    <tr className="border-t border-slate-100">
                      <td className="px-4 py-2 text-[#4A787C] font-medium">Giá thuê</td>
                      <td className="px-4 py-2 font-semibold text-[#0F3A40]">
                        {Number(deleteModalContract.rent_price ?? 0).toLocaleString('vi-VN')}đ
                      </td>
                    </tr>
                    <tr className="border-t border-slate-100">
                      <td className="px-4 py-2 text-[#4A787C] font-medium">Tiền cọc</td>
                      <td className="px-4 py-2 font-semibold text-[#0F3A40]">
                        {Number(deleteModalContract.deposit ?? 0).toLocaleString('vi-VN')}đ
                      </td>
                    </tr>
                    <tr className="border-t border-slate-100">
                      <td className="px-4 py-2 text-[#4A787C] font-medium">Trạng thái</td>
                      <td className="px-4 py-2">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${pill(deleteModalContract.status)}`}>
                          {deleteModalContract.status}
                        </span>
                      </td>
                    </tr>
                    {deleteModalContract.notes ? (
                      <tr className="border-t border-slate-100">
                        <td className="px-4 py-2 text-[#4A787C] font-medium align-top">Ghi chú</td>
                        <td className="px-4 py-2 text-[#4A787C] whitespace-pre-wrap">{deleteModalContract.notes}</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 rounded-2xl bg-amber-50 border border-amber-100/80 p-4 text-[13px] text-amber-900">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                <p className="font-medium leading-relaxed">
                  Xác nhận xóa hợp đồng <span className="font-bold">#{deleteModalContract.contract_id}</span>? Thao tác không hoàn tác.
                </p>
              </div>

              {deleteModalError ? <p className="text-sm font-medium text-red-600">{deleteModalError}</p> : null}

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeDeleteContractModal}
                  disabled={deleteModalDeleting}
                  className="w-full sm:w-auto px-6 py-3 rounded-full font-bold text-[#4A787C] hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteContract}
                  disabled={deleteModalDeleting}
                  className="w-full sm:w-auto px-6 py-3 rounded-full font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/20 disabled:opacity-60"
                >
                  {deleteModalDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreateOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-[32px] p-7 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-[#0F3A40]">Tạo hợp đồng mới</h3>
              <button onClick={() => setIsCreateOpen(false)} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="number"
                value={createForm.tenant_id}
                onChange={(e) => setCreateForm((p) => ({ ...p, tenant_id: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#14B8A6]"
                placeholder="tenant_id (ví dụ: 1)"
              />
              <input
                type="text"
                value={createForm.room_number}
                onChange={(e) => setCreateForm((p) => ({ ...p, room_number: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#14B8A6]"
                placeholder="Số phòng (ví dụ: A100)"
              />
              <input
                type="date"
                value={createForm.start_date}
                onChange={(e) => setCreateForm((p) => ({ ...p, start_date: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#14B8A6]"
              />
              <input
                type="date"
                value={createForm.end_date}
                onChange={(e) => setCreateForm((p) => ({ ...p, end_date: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#14B8A6]"
              />
              <input
                type="number"
                value={createForm.rent_price}
                onChange={(e) => setCreateForm((p) => ({ ...p, rent_price: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#14B8A6]"
                placeholder="Giá thuê (VNĐ)"
              />
              <input
                type="number"
                value={createForm.deposit}
                onChange={(e) => setCreateForm((p) => ({ ...p, deposit: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#14B8A6]"
                placeholder="Tiền cọc (VNĐ)"
              />
              <textarea
                rows={3}
                value={createForm.notes}
                onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))}
                className="md:col-span-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#14B8A6]"
                placeholder="Ghi chú"
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsCreateOpen(false)} className="px-6 py-3 rounded-full font-bold text-[#4A787C] hover:text-[#0F3A40]">
                Hủy
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCreate}
                className="px-8 py-3 rounded-full bg-[#14B8A6] hover:bg-[#0da090] text-white font-bold shadow-lg shadow-[#14B8A6]/20 disabled:opacity-60 disabled:pointer-events-none"
              >
                Tạo hợp đồng
              </button>
            </div>
          </div>
        </div>
      )}

      {contractHoldId ? (
        <ContractFromHoldModal
          holdRequestId={contractHoldId}
          token={token}
          onClose={() => setContractHoldId(null)}
          onSuccess={async () => {
            setContractHoldId(null);
            await refresh();
            window.dispatchEvent(new Event('admin-nav-badges-refresh'));
          }}
        />
      ) : null}
    </div>
  );
}
