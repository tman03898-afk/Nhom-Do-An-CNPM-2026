import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Package,
  Search,
  Download,
  MoreVertical,
  Edit3,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import AppDialog from '../../components/common/AppDialog';
import { useToast } from '../../context/ToastContext';

const PAGE_SIZE = 10;

/** Gợi ý loại từ tên (không có cột category trên DB). */
function inferAssetCategory(name) {
  const n = String(name || '').toLowerCase();
  if (/điều hòa|máy lạnh|tủ lạnh|điện lạnh|máy sấy|máy nước nóng lạnh|bình nóng lạnh/.test(n)) return 'cooling';
  if (/giường|tủ|bàn|ghế|nội thất|kệ|tủ quần áo|sofa/.test(n)) return 'furniture';
  if (/tivi|tv|máy giặt|máy tính|loa|điện tử|wifi|router/.test(n)) return 'electronics';
  return 'other';
}

function formatDateVi(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
}

function statusBadgeClass(status) {
  switch (status) {
    case 'OK':
      return 'bg-teal-50 text-teal-700 border border-teal-100';
    case 'BROKEN':
      return 'bg-rose-50 text-rose-700 border border-rose-100';
    case 'MAINTENANCE':
      return 'bg-amber-50 text-amber-800 border border-amber-100';
    case 'LOST':
      return 'bg-slate-100 text-slate-600 border border-slate-200';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

const STATUS_CHART_COLORS = {
  OK: '#14B8A6',
  BROKEN: '#E11D48',
  MAINTENANCE: '#F59E0B',
  LOST: '#64748B',
};

export default function AssetManagePage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [assets, setAssets] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ room_id: '', name: '', quantity: 1, status: 'OK', note: '' });
  const [editForm, setEditForm] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [menuFor, setMenuFor] = useState(null);
  const menuRef = useRef(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [a, r] = await Promise.all([apiFetch('/admin/assets', { token }), apiFetch('/rooms', { token })]);
      setAssets(a.assets || []);
      setRooms(r.rooms || []);
    } catch {
      setAssets([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuFor(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filterType, filterStatus, search]);

  const stats = useMemo(() => {
    const total = assets.length;
    const needMaint = assets.filter((a) => a.status === 'MAINTENANCE' || a.status === 'BROKEN').length;
    const ok = assets.filter((a) => a.status === 'OK').length;
    const totalQty = assets.reduce((s, a) => s + (Number(a.quantity) || 0), 0);
    return { total, needMaint, ok, totalQty };
  }, [assets]);

  const assetStats = useMemo(
    () => [
      { label: 'TỔNG TÀI SẢN', value: String(stats.total), detail: 'Dòng trong danh mục', icon: <Package className="w-5 h-5" />, color: 'text-[#14B8A6]', bg: 'bg-[#EBFDFB]' },
      { label: 'CẦN BẢO TRÌ', value: String(stats.needMaint), detail: 'BROKEN / MAINTENANCE', icon: <AlertTriangle className="w-5 h-5" />, color: 'text-[#D14D4D]', bg: 'bg-[#FFF0F0]' },
      { label: 'TỔNG SỐ LƯỢNG', value: String(stats.totalQty), detail: 'Cộng quantity', icon: <TrendingUp className="w-5 h-5" />, color: 'text-[#3B82F6]', bg: 'bg-[#EBF4FF]' },
      { label: 'ĐANG HOẠT ĐỘNG', value: String(stats.ok), detail: 'Trạng thái OK', icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-[#E68A00]', bg: 'bg-[#FFF3E0]' },
    ],
    [stats]
  );

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;

    return assets.filter((a) => {
      if (q && !String(a.name || '').toLowerCase().includes(q) && !String(a.room_number || '').toLowerCase().includes(q)) {
        return false;
      }
      if (filterType !== 'all' && inferAssetCategory(a.name) !== filterType) return false;

      if (filterStatus === 'all') return true;
      if (filterStatus === 'ok') return a.status === 'OK';
      if (filterStatus === 'need') return a.status === 'BROKEN' || a.status === 'MAINTENANCE';
      if (filterStatus === 'new') {
        const t = a.created_at ? new Date(a.created_at).getTime() : 0;
        return now - t <= fourteenDays;
      }
      return true;
    });
  }, [assets, search, filterType, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = useMemo(() => {
    const p = Math.min(page, totalPages);
    const start = (p - 1) * PAGE_SIZE;
    return filteredAssets.slice(start, start + PAGE_SIZE);
  }, [filteredAssets, page, totalPages]);

  const chartByStatus = useMemo(() => {
    const keys = ['OK', 'BROKEN', 'MAINTENANCE', 'LOST'];
    return keys.map((name) => ({
      name,
      count: assets.filter((a) => a.status === name).length,
    }));
  }, [assets]);

  const latestAssets = useMemo(() => {
    return [...assets]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 5);
  }, [assets]);

  const exportCsv = () => {
    const rows = filteredAssets.map((a) => ({
      name: a.name,
      room: a.room_number ?? '',
      status: a.status,
      quantity: a.quantity,
      created_at: a.created_at ?? '',
      note: (a.note || '').replace(/\r?\n/g, ' '),
    }));
    const header = ['name', 'room', 'status', 'quantity', 'created_at', 'note'];
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const body = [header.join(','), ...rows.map((r) => header.map((h) => esc(r[h])).join(','))].join('\r\n');
    const blob = new Blob(['\ufeff' + body], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tai-san-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setFilterType('all');
    setFilterStatus('all');
    setSearch('');
  };

  const handleCreate = async () => {
    if (!token || !createForm.name?.trim()) return;
    try {
      await apiFetch('/admin/assets', {
        token,
        method: 'POST',
        body: {
          room_id: createForm.room_id ? Number(createForm.room_id) : null,
          name: createForm.name.trim(),
          quantity: Number(createForm.quantity || 1),
          status: createForm.status,
          note: createForm.note?.trim() || null,
        },
      });
      setIsCreateOpen(false);
      setCreateForm({ room_id: '', name: '', quantity: 1, status: 'OK', note: '' });
      await refresh();
    } catch {
      /* apiFetch throws */
    }
  };

  const handleSaveEdit = async () => {
    if (!token || !editForm?.asset_id || !editForm.name?.trim()) return;
    try {
      await apiFetch(`/admin/assets/${editForm.asset_id}`, {
        token,
        method: 'PUT',
        body: {
          room_id: editForm.room_id === '' || editForm.room_id == null ? null : Number(editForm.room_id),
          name: editForm.name.trim(),
          quantity: Number(editForm.quantity || 1),
          status: editForm.status,
          note: editForm.note?.trim() || null,
        },
      });
      setEditForm(null);
      await refresh();
    } catch {
      /* ignore */
    }
  };

  const openDeleteConfirm = (asset) => {
    setMenuFor(null);
    setDeleteTarget({ id: asset.asset_id, name: asset.name || 'Tài sản' });
  };

  const confirmDeleteAsset = async () => {
    if (!token || !deleteTarget) return;
    setDeleteBusy(true);
    try {
      await apiFetch(`/admin/assets/${deleteTarget.id}`, { token, method: 'DELETE' });
      addToast(`Đã xóa «${deleteTarget.name}» khỏi danh mục.`, 'success');
      setDeleteTarget(null);
      await refresh();
    } catch (e) {
      addToast(e?.message || 'Không xóa được tài sản.', 'error');
    } finally {
      setDeleteBusy(false);
    }
  };

  const openEdit = (a) => {
    setEditForm({
      asset_id: a.asset_id,
      room_id: a.room_id != null ? String(a.room_id) : '',
      name: a.name || '',
      quantity: a.quantity ?? 1,
      status: a.status || 'OK',
      note: a.note || '',
    });
    setMenuFor(null);
  };

  const rangeStart = filteredAssets.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filteredAssets.length);

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

  return (
    <div className="w-full max-w-[1400px] mx-auto pb-12">
      <div className="flex justify-between items-end mb-8 pt-4">
        <div>
          <h1 className="text-[32px] font-bold text-[#0F3A40] leading-none mb-3">Quản lý Tài sản</h1>
          <p className="text-[#4A787C] font-medium text-[14px]">
            Theo dõi và cập nhật danh mục thiết bị, nội thất trong hệ thống The Sun.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 bg-[#14B8A6] hover:bg-[#0da090] text-white px-6 py-3 rounded-full text-[14px] font-bold transition-all shadow-lg shadow-[#14B8A6]/20"
        >
          <Plus className="w-5 h-5" /> Thêm tài sản mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {assetStats.map((stat, i) => (
          <div
            key={stat.label}
            className="bg-white/70 backdrop-blur-md border border-white/50 rounded-[28px] p-6 shadow-sm hover:translate-y-[-4px] transition-all duration-300"
          >
            <p className="text-[10px] font-bold text-[#82ABB0] tracking-widest uppercase mb-3">{stat.label}</p>
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-3xl font-bold text-[#0F3A40] mb-1">{stat.value}</h3>
                <p className={`text-[12px] font-bold ${i === 1 ? 'text-[#D14D4D]' : 'text-[#82ABB0]'}`}>
                  {i === 1 && <span className="inline-block mr-1">▲</span>}
                  {stat.detail}
                </p>
              </div>
              <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center`}>{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white/40 backdrop-blur-sm border border-white/50 rounded-[32px] p-4 flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col min-w-[200px] flex-1 sm:flex-none">
            <span className="text-[10px] font-bold text-[#82ABB0] ml-3 mb-1 uppercase tracking-tight">Tìm kiếm</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#82ABB0]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tên tài sản hoặc số phòng…"
                className="w-full bg-white/80 border border-[#BCE1E5]/30 rounded-2xl pl-10 pr-4 py-2 text-[13px] font-bold text-[#0F3A40] outline-none"
              />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-[#82ABB0] ml-3 mb-1 uppercase tracking-tight">Loại (theo tên)</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-white/80 border border-[#BCE1E5]/30 rounded-2xl px-4 py-2 text-[13px] font-bold text-[#0F3A40] outline-none min-w-[160px]"
            >
              <option value="all">Tất cả loại</option>
              <option value="cooling">Điện lạnh / nước nóng</option>
              <option value="furniture">Nội thất</option>
              <option value="electronics">Điện tử</option>
            </select>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-[#82ABB0] ml-3 mb-1 uppercase tracking-tight">Tình trạng</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white/80 border border-[#BCE1E5]/30 rounded-2xl px-4 py-2 text-[13px] font-bold text-[#0F3A40] outline-none min-w-[180px]"
            >
              <option value="all">Tất cả</option>
              <option value="ok">Tốt (OK)</option>
              <option value="need">Cần bảo trì / hỏng</option>
              <option value="new">Ghi nhận trong 14 ngày</option>
            </select>
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-5 text-[13px] font-bold text-[#14B8A6] hover:underline px-4"
          >
            Xóa bộ lọc
          </button>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={filteredAssets.length === 0}
          className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-white border border-[#BCE1E5]/50 rounded-2xl text-[13px] font-bold text-[#4A787C] hover:text-[#0F3A40] transition-all shadow-sm disabled:opacity-40 disabled:pointer-events-none"
        >
          <Download size={16} /> Xuất CSV ({filteredAssets.length})
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-[40px] p-8 shadow-sm mb-10 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-bold text-[#82ABB0] tracking-widest uppercase">
                <th className="pb-6 px-2">Tên tài sản</th>
                <th className="pb-6 px-2">Phòng</th>
                <th className="pb-6 px-2">Ngày ghi nhận</th>
                <th className="pb-6 px-2">Tình trạng</th>
                <th className="pb-6 px-2">Số lượng</th>
                <th className="pb-6 px-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[13px] font-medium text-[#4A787C]">
                    Đang tải dữ liệu tài sản...
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[13px] font-medium text-[#4A787C]">
                    Chưa có dữ liệu tài sản.
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[13px] font-medium text-[#4A787C]">
                    Không có tài sản khớp bộ lọc.
                  </td>
                </tr>
              ) : (
                pageSlice.map((a) => (
                  <tr
                    key={a.asset_id}
                    className="border-b border-[#BCE1E5]/30 last:border-0 hover:bg-white/40 transition-colors"
                  >
                    <td className="py-5 px-2 font-bold text-[#0F3A40]">{a.name}</td>
                    <td className="py-5 px-2 font-bold text-[#0F3A40]">{a.room_number || '—'}</td>
                    <td className="py-5 px-2 text-[13px] font-medium text-[#4A787C]">{formatDateVi(a.created_at)}</td>
                    <td className="py-5 px-2">
                      <span
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase inline-block ${statusBadgeClass(a.status)}`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="py-5 px-2 font-bold text-[#0F3A40]">{a.quantity ?? '—'}</td>
                    <td className="py-5 px-2 text-right">
                      <div className="relative inline-flex justify-end" ref={menuFor === a.asset_id ? menuRef : null}>
                        <button
                          type="button"
                          aria-label="Thao tác"
                          onClick={() => setMenuFor(menuFor === a.asset_id ? null : a.asset_id)}
                          className="p-2 rounded-xl text-[#82ABB0] hover:text-[#0F3A40] hover:bg-[#F2FCFD] transition-all"
                        >
                          <MoreVertical size={18} />
                        </button>
                        {menuFor === a.asset_id && (
                          <div className="absolute right-0 top-full mt-1 z-30 min-w-[140px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg text-left">
                            <button
                              type="button"
                              onClick={() => openEdit(a)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-[13px] font-bold text-[#0F3A40] hover:bg-[#F2FCFD]"
                            >
                              <Edit3 className="w-4 h-4" /> Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteConfirm(a)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-[13px] font-bold text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="w-4 h-4" /> Xóa
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-8 flex flex-wrap justify-between items-center gap-4 text-[12px] font-bold text-[#82ABB0] border-t border-[#BCE1E5]/20 pt-6">
          <span>
            Hiển thị{' '}
            <span className="text-[#0F3A40]">
              {filteredAssets.length === 0 ? 0 : `${rangeStart} – ${rangeEnd}`}
            </span>{' '}
            / <span className="text-[#0F3A40]">{filteredAssets.length}</span> tài sản
            {filteredAssets.length !== assets.length && (
              <span className="font-medium text-[#82ABB0]"> (lọc từ {assets.length})</span>
            )}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="w-8 h-8 rounded-lg hover:bg-[#F2FCFD] flex items-center justify-center text-[#82ABB0] disabled:opacity-30 disabled:pointer-events-none"
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
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    safePage === b ? 'bg-[#14B8A6] text-white shadow-md' : 'hover:bg-[#F2FCFD] text-[#4A787C]'
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
              className="w-8 h-8 rounded-lg hover:bg-[#F2FCFD] flex items-center justify-center text-[#82ABB0] disabled:opacity-30 disabled:pointer-events-none"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-stretch">
        <div className="lg:col-span-3 bg-white/70 backdrop-blur-xl border border-white/50 rounded-[40px] p-8 shadow-sm flex flex-col h-full">
          <h3 className="text-[18px] font-bold text-[#0F3A40] mb-2">Phân bổ theo trạng thái</h3>
          <p className="text-[13px] text-[#4A787C] font-medium mb-6">Số lượng tài sản theo từng trạng thái (dữ liệu hiện tại).</p>
          <div className="flex-1 min-h-[260px] w-full">
            {assets.length === 0 ? (
              <div className="h-full flex items-center justify-center rounded-[28px] bg-white/60 border border-white/60 text-[#4A787C] font-medium text-[13px]">
                Chưa có dữ liệu để vẽ biểu đồ.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartByStatus} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} width={36} />
                  <Tooltip formatter={(v) => [`${v} tài sản`, 'Số lượng']} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={48}>
                    {chartByStatus.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_CHART_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-[#F2FCFD] border border-[#BCE1E5]/30 rounded-[40px] p-8 shadow-sm flex flex-col h-full">
          <h3 className="text-[18px] font-bold text-[#0F3A40] mb-6">Tài sản mới ghi nhận</h3>
          <div className="space-y-3 flex-1">
            {latestAssets.length === 0 ? (
              <div className="bg-white rounded-[24px] p-8 border border-white shadow-sm text-center text-[#4A787C] font-medium text-[13px]">
                Chưa có tài sản.
              </div>
            ) : (
              latestAssets.map((a) => (
                <div
                  key={a.asset_id}
                  className="bg-white rounded-[20px] px-4 py-3 border border-white shadow-sm flex justify-between items-center gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[#0F3A40] text-[13px] truncate">{a.name}</p>
                    <p className="text-[11px] font-bold text-[#82ABB0]">
                      Phòng {a.room_number || '—'} · {formatDateVi(a.created_at)}
                    </p>
                  </div>
                  <span className={`shrink-0 px-2 py-1 rounded-full text-[9px] font-bold uppercase ${statusBadgeClass(a.status)}`}>
                    {a.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white rounded-[32px] p-7 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-[#0F3A40]">Thêm tài sản</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <select
                value={createForm.room_id}
                onChange={(e) => setCreateForm((p) => ({ ...p, room_id: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#14B8A6]"
              >
                <option value="">Chọn phòng (tùy chọn)</option>
                {rooms.map((r) => (
                  <option key={r.room_id} value={r.room_id}>
                    #{r.room_id} - {r.room_number}
                  </option>
                ))}
              </select>
              <div>
                <input
                  type="text"
                  list="assetNameSuggestions"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#14B8A6]"
                  placeholder="Tên tài sản (hoặc chọn từ danh sách)"
                />
                <datalist id="assetNameSuggestions">
                  {[...new Set(assets.map((a) => a.name).filter(Boolean))].map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
              <input
                type="number"
                min={1}
                value={createForm.quantity}
                onChange={(e) => setCreateForm((p) => ({ ...p, quantity: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#14B8A6]"
                placeholder="Số lượng"
              />
              <select
                value={createForm.status}
                onChange={(e) => setCreateForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#14B8A6]"
              >
                <option value="OK">OK</option>
                <option value="BROKEN">BROKEN</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
                <option value="LOST">LOST</option>
              </select>
              <input
                type="text"
                value={createForm.note}
                onChange={(e) => setCreateForm((p) => ({ ...p, note: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#14B8A6]"
                placeholder="Ghi chú"
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-6 py-3 rounded-full font-bold text-[#4A787C] hover:text-[#0F3A40]"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!createForm.name?.trim()}
                onClick={handleCreate}
                className="px-8 py-3 rounded-full bg-[#14B8A6] hover:bg-[#0da090] text-white font-bold shadow-lg shadow-[#14B8A6]/20 disabled:opacity-40 disabled:pointer-events-none"
              >
                Tạo
              </button>
            </div>
          </div>
        </div>
      )}

      {editForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white rounded-[32px] p-7 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-[#0F3A40]">Sửa tài sản</h3>
              <button
                type="button"
                onClick={() => setEditForm(null)}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <select
                value={editForm.room_id}
                onChange={(e) => setEditForm((p) => ({ ...p, room_id: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#14B8A6]"
              >
                <option value="">Không gán phòng</option>
                {rooms.map((r) => (
                  <option key={r.room_id} value={String(r.room_id)}>
                    #{r.room_id} - {r.room_number}
                  </option>
                ))}
              </select>
              <div>
                <input
                  type="text"
                  list="assetNameSuggestionsEdit"
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#14B8A6]"
                  placeholder="Tên tài sản (hoặc chọn từ danh sách)"
                />
                <datalist id="assetNameSuggestionsEdit">
                  {[...new Set(assets.map((a) => a.name).filter(Boolean))].map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
              <input
                type="number"
                min={1}
                value={editForm.quantity}
                onChange={(e) => setEditForm((p) => ({ ...p, quantity: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#14B8A6]"
                placeholder="Số lượng"
              />
              <select
                value={editForm.status}
                onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#14B8A6]"
              >
                <option value="OK">OK</option>
                <option value="BROKEN">BROKEN</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
                <option value="LOST">LOST</option>
              </select>
              <input
                type="text"
                value={editForm.note}
                onChange={(e) => setEditForm((p) => ({ ...p, note: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#14B8A6]"
                placeholder="Ghi chú"
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setEditForm(null)}
                className="px-6 py-3 rounded-full font-bold text-[#4A787C] hover:text-[#0F3A40]"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!editForm.name?.trim()}
                onClick={handleSaveEdit}
                className="px-8 py-3 rounded-full bg-[#14B8A6] hover:bg-[#0da090] text-white font-bold shadow-lg shadow-[#14B8A6]/20 disabled:opacity-40 disabled:pointer-events-none"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      <AppDialog
        open={!!deleteTarget}
        onClose={() => !deleteBusy && setDeleteTarget(null)}
        title="Xóa tài sản?"
        description={
          deleteTarget
            ? `Xóa «${deleteTarget.name}» khỏi danh mục thiết bị? Hành động không thể hoàn tác.`
            : ''
        }
        confirmText="Xóa"
        cancelText="Giữ lại"
        variant="danger"
        busy={deleteBusy}
        onConfirm={confirmDeleteAsset}
      />
    </div>
  );
}
