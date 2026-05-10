import { useEffect, useMemo, useState } from 'react';
import { 
  FileSignature, ClipboardList, Search, Filter, 
  Download, MoreVertical, Plus, Calendar, 
  Wallet, AlertCircle, CheckCircle2, XCircle,
  FileText, History, Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { downloadCsv } from '../../utils/exportCsv';

export default function ContractManagePage() {
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [contracts, setContracts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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
    } catch (e) {
      setContracts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const stats = useMemo(() => {
    const total = contracts.length;
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringSoon = contracts.filter((c) => c.status === 'ACTIVE' && c.end_date && new Date(c.end_date) <= in30Days).length;
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
                      <button className="p-2 rounded-xl text-[#82ABB0] hover:text-[#0F3A40] hover:bg-[#F2FCFD] transition-all">
                        <MoreVertical size={18} />
                      </button>
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
              Có 8 hợp đồng sẽ hết hạn trong vòng 30 ngày tới. Hệ thống đã tự động gửi thông báo nhắc nhở đến khách thuê. Vui lòng kiểm tra phản hồi để chuẩn bị thủ tục gia hạn hoặc thanh lý.
            </p>
          </div>
        </div>

        <div className="bg-[#F2FCFD] rounded-[32px] p-8 border border-[#BCE1E5]/30 flex gap-6 items-start">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#14B8A6] shrink-0 shadow-sm">
            <Info size={24} />
          </div>
          <div>
            <h4 className="text-[16px] font-bold text-[#0F3A40] mb-2">Hợp đồng điện tử mẫu</h4>
            <p className="text-[13px] text-[#4A787C] font-medium leading-relaxed">
               Bạn có thể sử dụng các mẫu hợp đồng chuẩn đã được phê duyệt để tạo nhanh hợp đồng mới cho khách thuê. Mọi thay đổi về điều khoản cần được lưu lại thành bản phụ lục.
            </p>
            <button className="mt-4 text-[13px] font-bold text-[#14B8A6] hover:underline flex items-center gap-1.5 group">
              Tải xuống biểu mẫu <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

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
              <button onClick={handleCreate} className="px-8 py-3 rounded-full bg-[#14B8A6] hover:bg-[#0da090] text-white font-bold shadow-lg shadow-[#14B8A6]/20">
                Tạo hợp đồng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
