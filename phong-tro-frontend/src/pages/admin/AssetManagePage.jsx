import { useEffect, useMemo, useState } from 'react';
import { 
  Plus, Package, Refrigerator, Bed, Shirt, Snowflake, 
  Search, Filter, Download, MoreVertical, Edit3, Trash2, 
  AlertTriangle, CheckCircle2, TrendingUp, Info
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';

const assetStats = [
  { label: 'TỔNG TÀI SẢN', value: '—', detail: 'Đang cập nhật', icon: <Package className="w-5 h-5" />, color: 'text-[#14B8A6]', bg: 'bg-[#EBFDFB]' },
  { label: 'CẦN BẢO TRÌ', value: '—', detail: 'Đang cập nhật', icon: <AlertTriangle className="w-5 h-5" />, color: 'text-[#D14D4D]', bg: 'bg-[#FFF0F0]' },
  { label: 'GIÁ TRỊ TỒN KHO', value: '—', detail: 'Đang cập nhật', icon: <TrendingUp className="w-5 h-5" />, color: 'text-[#3B82F6]', bg: 'bg-[#EBF4FF]' },
  { label: 'MỚI TRANG BỊ', value: '—', detail: 'Đang cập nhật', icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-[#E68A00]', bg: 'bg-[#FFF3E0]' },
];

export default function AssetManagePage() {
  const { token } = useAuth();
  const [assets, setAssets] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ room_id: '', name: '', quantity: 1, status: 'OK', note: '' });

  const refresh = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [a, r] = await Promise.all([apiFetch('/admin/assets', { token }), apiFetch('/rooms', { token })]);
      setAssets(a.assets || []);
      setRooms(r.rooms || []);
    } catch (e) {
      setAssets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const stats = useMemo(() => {
    const total = assets.length;
    const needMaint = assets.filter((a) => a.status === 'MAINTENANCE' || a.status === 'BROKEN').length;
    const ok = assets.filter((a) => a.status === 'OK').length;
    return { total, needMaint, ok };
  }, [assets]);

  const assetStats = useMemo(() => ([
    { label: 'TỔNG TÀI SẢN', value: String(stats.total), detail: 'Đang sử dụng', icon: <Package className="w-5 h-5" />, color: 'text-[#14B8A6]', bg: 'bg-[#EBFDFB]' },
    { label: 'CẦN BẢO TRÌ', value: String(stats.needMaint), detail: 'BROKEN/MAINTENANCE', icon: <AlertTriangle className="w-5 h-5" />, color: 'text-[#D14D4D]', bg: 'bg-[#FFF0F0]' },
    { label: 'GIÁ TRỊ TỒN KHO', value: '—', detail: 'Chưa tính', icon: <TrendingUp className="w-5 h-5" />, color: 'text-[#3B82F6]', bg: 'bg-[#EBF4FF]' },
    { label: 'MỚI TRANG BỊ', value: String(stats.ok), detail: 'OK', icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-[#E68A00]', bg: 'bg-[#FFF3E0]' },
  ]), [stats]);

  const handleCreate = async () => {
    if (!token) return;
    await apiFetch('/admin/assets', {
      token,
      method: 'POST',
      body: {
        room_id: createForm.room_id ? Number(createForm.room_id) : null,
        name: createForm.name,
        quantity: Number(createForm.quantity || 1),
        status: createForm.status,
        note: createForm.note || null,
      },
    });
    setIsCreateOpen(false);
    setCreateForm({ room_id: '', name: '', quantity: 1, status: 'OK', note: '' });
    await refresh();
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto pb-12">
      {/* Header section */}
      <div className="flex justify-between items-end mb-8 pt-4">
        <div>
          <h1 className="text-[32px] font-bold text-[#0F3A40] leading-none mb-3">Quản lý Tài sản</h1>
          <p className="text-[#4A787C] font-medium text-[14px]">Theo dõi và cập nhật danh mục thiết bị, nội thất trong hệ thống The Nest Living.</p>
        </div>
        <button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 bg-[#14B8A6] hover:bg-[#0da090] text-white px-6 py-3 rounded-full text-[14px] font-bold transition-all shadow-lg shadow-[#14B8A6]/20">
          <Plus className="w-5 h-5" /> Thêm tài sản mới
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {assetStats.map((stat, i) => (
          <div key={i} className="bg-white/70 backdrop-blur-md border border-white/50 rounded-[28px] p-6 shadow-sm hover:translate-y-[-4px] transition-all duration-300">
            <p className="text-[10px] font-bold text-[#82ABB0] tracking-widest uppercase mb-3">{stat.label}</p>
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-3xl font-bold text-[#0F3A40] mb-1">{stat.value}</h3>
                <p className={`text-[12px] font-bold ${i === 1 ? 'text-[#D14D4D]' : 'text-[#82ABB0]'}`}>
                  {i === 1 && <span className="inline-block mr-1">▲</span>}
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
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-[#82ABB0] ml-3 mb-1 uppercase tracking-tight">Loại tài sản</span>
            <select className="bg-white/80 border border-[#BCE1E5]/30 rounded-2xl px-4 py-2 text-[13px] font-bold text-[#0F3A40] outline-none min-w-[160px]">
              <option>Tất cả loại</option>
              <option>Điện lạnh</option>
              <option>Nội thất</option>
              <option>Điện tử</option>
            </select>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-[#82ABB0] ml-3 mb-1 uppercase tracking-tight">Tình trạng</span>
            <select className="bg-white/80 border border-[#BCE1E5]/30 rounded-2xl px-4 py-2 text-[13px] font-bold text-[#0F3A40] outline-none min-w-[160px]">
              <option>Tất cả tình trạng</option>
              <option>Mới</option>
              <option>Tốt</option>
              <option>Cần bảo trì</option>
            </select>
          </div>
          <button className="mt-5 text-[13px] font-bold text-[#14B8A6] hover:underline px-4">Xóa bộ lọc</button>
        </div>
        <button className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-white border border-[#BCE1E5]/50 rounded-2xl text-[13px] font-bold text-[#4A787C] hover:text-[#0F3A40] transition-all shadow-sm">
          <Download size={16} /> Xuất báo cáo
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-[40px] p-8 shadow-sm mb-10 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-bold text-[#82ABB0] tracking-widest uppercase">
                <th className="pb-6 px-2">Tên tài sản</th>
                <th className="pb-6 px-2">Phòng</th>
                <th className="pb-6 px-2">Ngày mua</th>
                <th className="pb-6 px-2">Tình trạng</th>
                <th className="pb-6 px-2">Giá trị</th>
                <th className="pb-6 px-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[13px] font-medium text-[#4A787C]">Đang tải dữ liệu tài sản...</td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[13px] font-medium text-[#4A787C]">
                    Chưa có dữ liệu tài sản.
                  </td>
                </tr>
              ) : (
                assets.map((a) => (
                  <tr key={a.asset_id} className="border-b border-[#BCE1E5]/30 last:border-0 hover:bg-white/40 transition-colors">
                    <td className="py-5 px-2 font-bold text-[#0F3A40]">{a.name}</td>
                    <td className="py-5 px-2 font-bold text-[#0F3A40]">{a.room_number || '—'}</td>
                    <td className="py-5 px-2 text-[13px] font-medium text-[#4A787C]">—</td>
                    <td className="py-5 px-2">
                      <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase inline-block">
                        {a.status}
                      </span>
                    </td>
                    <td className="py-5 px-2 font-bold text-[#0F3A40]">—</td>
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
        <div className="mt-8 flex justify-between items-center text-[12px] font-bold text-[#82ABB0] border-t border-[#BCE1E5]/20 pt-6">
          <span>Hiển thị 1 - 4 của <span className="text-[#0F3A40]">1,248 tài sản</span></span>
          <div className="flex items-center gap-1.5">
            <button className="w-8 h-8 rounded-lg hover:bg-[#F2FCFD] flex items-center justify-center text-[#82ABB0]">&lt;</button>
            <button className="w-8 h-8 rounded-lg bg-[#14B8A6] text-white flex items-center justify-center shadow-md">1</button>
            <button className="w-8 h-8 rounded-lg hover:bg-[#F2FCFD] flex items-center justify-center text-[#4A787C]">2</button>
            <button className="w-8 h-8 rounded-lg hover:bg-[#F2FCFD] flex items-center justify-center text-[#4A787C]">3</button>
            <span className="px-1 opacity-50">...</span>
            <button className="w-8 h-8 rounded-lg hover:bg-[#F2FCFD] flex items-center justify-center text-[#4A787C]">312</button>
            <button className="w-8 h-8 rounded-lg hover:bg-[#F2FCFD] flex items-center justify-center text-[#82ABB0]">&gt;</button>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-stretch">
        {/* Maintenance Cost Bar Chart */}
        <div className="lg:col-span-3 bg-white/70 backdrop-blur-xl border border-white/50 rounded-[40px] p-8 shadow-sm flex flex-col h-full">
          <h3 className="text-[18px] font-bold text-[#0F3A40] mb-2">Chi phí bảo trì hàng tháng</h3>
          <p className="text-[13px] text-[#4A787C] font-medium mb-8">
            Tăng 15% so với kỳ trước do lịch bảo trì định kỳ điều hòa tập trung vào tháng này.
          </p>
          <div className="flex-1 min-h-[250px] w-full mt-auto flex items-center justify-center rounded-[28px] bg-white/60 border border-white/60 text-[#4A787C] font-medium">
            Đang cập nhật dữ liệu bảo trì
          </div>
        </div>

        {/* Latest Assets List */}
        <div className="lg:col-span-2 bg-[#F2FCFD] border border-[#BCE1E5]/30 rounded-[40px] p-8 shadow-sm flex flex-col h-full">
          <h3 className="text-[18px] font-bold text-[#0F3A40] mb-8">Tài sản mới nhất</h3>
          <div className="space-y-4 flex-1">
            <div className="bg-white rounded-[24px] p-8 border border-white shadow-sm text-center text-[#4A787C] font-medium">
              Chưa có dữ liệu tài sản mới. (Đã xoá dữ liệu demo)
            </div>
          </div>
          <button className="mt-8 text-[13px] font-bold text-[#14B8A6] hover:underline flex items-center gap-2 group justify-center">
            Xem tất cả hoạt động <CheckCircle2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white rounded-[32px] p-7 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-[#0F3A40]">Thêm tài sản</h3>
              <button onClick={() => setIsCreateOpen(false)} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500">
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
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#14B8A6]"
                placeholder="Tên tài sản"
              />
              <input
                type="number"
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
              <button onClick={() => setIsCreateOpen(false)} className="px-6 py-3 rounded-full font-bold text-[#4A787C] hover:text-[#0F3A40]">
                Hủy
              </button>
              <button onClick={handleCreate} className="px-8 py-3 rounded-full bg-[#14B8A6] hover:bg-[#0da090] text-white font-bold shadow-lg shadow-[#14B8A6]/20">
                Tạo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
