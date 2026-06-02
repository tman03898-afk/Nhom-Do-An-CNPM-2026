import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MapPin, CheckCircle2, UserCheck, BarChart3, Edit3, Trash2, ArrowUpRight, Plus } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import RoomFormModal from '../../components/rooms/RoomFormModal';
import RoomHoldManagePanel from '../../components/rooms/RoomHoldManagePanel';
import AppDialog from '../../components/common/AppDialog';
import { useToast } from '../../context/ToastContext';

export default function RoomManagePage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  /** ALL | AVAILABLE (trống) | RENTED (đang thuê) */
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const statusView = useMemo(
    () => ({
      AVAILABLE: { label: 'TRỐNG', pill: 'bg-[#EBFDFB] text-[#14B8A6]', dot: 'bg-[#14B8A6]' },
      HELD: { label: 'ĐANG GIỮ', pill: 'bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
      RENTED: { label: 'ĐANG THUÊ', pill: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
      MAINTENANCE: { label: 'BẢO TRÌ', pill: 'bg-[#FFF3E0] text-[#E68A00]', dot: 'bg-[#E68A00]' },
    }),
    []
  );

  const stats = useMemo(() => {
    const total = rooms.length;
    const available = rooms.filter((r) => r.status === 'AVAILABLE').length;
    const held = rooms.filter((r) => r.status === 'HELD').length;
    const rented = rooms.filter((r) => r.status === 'RENTED').length;
    const maintenance = rooms.filter((r) => r.status === 'MAINTENANCE').length;
    const occupancy = total > 0 ? Math.round((rented / total) * 100) : 0;
    return { total, available, held, rented, maintenance, occupancy };
  }, [rooms]);

  const spotlightRoom = useMemo(() => {
    if (!rooms.length) return null;
    const sorted = [...rooms].sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    return sorted.find((r) => r.status === 'AVAILABLE') || sorted[0];
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    if (statusFilter === 'ALL') return rooms;
    return rooms.filter((r) => r.status === statusFilter);
  }, [rooms, statusFilter]);

  const filteredTotal = filteredRooms.length;

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredTotal / pageSize)), [filteredTotal]);
  const pagedRooms = useMemo(() => {
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredRooms.slice(start, start + pageSize);
  }, [filteredRooms, currentPage, totalPages]);

  useEffect(() => {
    const fetchRooms = async () => {
      setIsLoading(true);
      try {
        const data = await apiFetch('/rooms', { token });
        const nextRooms = data.rooms || [];
        setRooms(nextRooms);
        setCurrentPage(1);
      } catch {
        setRooms([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRooms();
  }, [token]);

  useEffect(() => {
    // keep currentPage valid after rooms / filter change (e.g. delete)
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const reloadRooms = async () => {
    const data = await apiFetch('/rooms', { token });
    setRooms(data.rooms || []);
    setCurrentPage(1);
  };

  const openCreate = () => {
    setEditingRoom(null);
    setIsModalOpen(true);
  };

  const openEdit = (room) => {
    setEditingRoom(room);
    setIsModalOpen(true);
  };

  const confirmDeleteRoom = async () => {
    if (!token || !deleteTarget) return;
    setDeleteBusy(true);
    try {
      await apiFetch(`/rooms/${deleteTarget.room_id}`, { token, method: 'DELETE' });
      addToast(`Đã xóa phòng ${deleteTarget.room_number}.`, 'success');
      setDeleteTarget(null);
      const data = await apiFetch('/rooms', { token });
      setRooms(data.rooms || []);
    } catch (e) {
      addToast(e?.message || 'Không xóa được phòng.', 'error');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto mt-2 px-4 pb-12">
      {/* Page Header */}
      <div className="flex justify-between items-end mb-8 relative z-10">
        <div>
          <h1 className="text-[32px] font-sans font-bold text-nest-text-primary tracking-tight">Quản lý Phòng</h1>
          <p className="text-[13px] font-bold text-nest-text-secondary mt-2 flex items-center gap-1.5">
            <MapPin className="w-[14px] h-[14px]" /> Lâm Đồng Campus • {stats.total} Phòng
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-wrap gap-1 bg-white/50 backdrop-blur-md rounded-full p-1 border border-nest-primary/10 shadow-sm">
            {[
              { key: 'ALL', label: 'Tất cả' },
              { key: 'AVAILABLE', label: 'Phòng trống' },
              { key: 'HELD', label: 'Đang giữ' },
              { key: 'RENTED', label: 'Đang thuê' },
            ].map(({ key, label }) => {
              const active = statusFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={
                    active
                      ? 'px-5 py-2.5 rounded-full bg-white text-nest-text-primary text-[13px] font-bold shadow-sm'
                      : 'px-5 py-2.5 rounded-full text-nest-text-secondary hover:text-nest-text-primary text-[13px] font-bold transition-colors'
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
          <button onClick={openCreate} className="bg-nest-primary hover:bg-[#0da090] text-white px-6 py-2.5 rounded-full text-[14px] font-bold transition-colors shadow-lg shadow-nest-primary/20 flex items-center gap-2">
             <Plus className="w-[18px] h-[18px]" /> Thêm phòng
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 relative z-10">
        <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_23px_rgba(15,58,64,0.06)] border border-slate-200/60 flex justify-between items-center">
           <div>
              <p className="text-[10px] font-bold text-nest-text-secondary uppercase tracking-widest mb-2">Sẵn sàng</p>
              <h3 className="text-3xl font-bold text-nest-primary">{stats.available}</h3>
           </div>
           <div className="w-[42px] h-[42px] rounded-full bg-nest-primary/10 text-nest-primary border border-nest-primary/20 flex items-center justify-center">
              <CheckCircle2 className="w-[22px] h-[22px]" />
           </div>
        </div>
        <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_23px_rgba(15,58,64,0.06)] border border-slate-200/60 flex justify-between items-center">
           <div>
              <p className="text-[10px] font-bold text-nest-text-secondary uppercase tracking-widest mb-2">Đang thuê</p>
              <h3 className="text-3xl font-bold text-nest-text-primary">{stats.rented}</h3>
           </div>
           <div className="w-[42px] h-[42px] rounded-full bg-gray-50 text-gray-400 flex items-center justify-center border border-gray-100">
              <UserCheck className="w-[20px] h-[20px]" />
           </div>
        </div>
        <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_23px_rgba(15,58,64,0.06)] border border-slate-200/60 flex justify-between items-center">
           <div>
              <p className="text-[10px] font-bold text-nest-text-secondary uppercase tracking-widest mb-2">Tỉ lệ lấp đầy</p>
              <h3 className="text-3xl font-bold text-nest-text-primary">{stats.occupancy}%</h3>
           </div>
           <div className="w-[42px] h-[42px] rounded-full bg-nest-primary/10 text-nest-text-primary flex items-center justify-center text-nest-primary border border-nest-primary/20">
              <BarChart3 className="w-[20px] h-[20px]" />
           </div>
        </div>
      </div>

      <RoomHoldManagePanel token={token} onRoomsChanged={reloadRooms} />

      {/* Main Table */}
      <div className="bg-white/80 rounded-[32px] p-8 shadow-[0_4px_24px_rgba(15,58,64,0.04)] border border-slate-200/60 backdrop-blur-sm mb-8">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#BCE1E5]/40 text-[10px] font-bold text-[#82ABB0] tracking-widest uppercase">
                <th className="pb-5 font-bold px-2">Số phòng</th>
                <th className="pb-5 font-bold px-2 text-center">Loại phòng</th>
                <th className="pb-5 font-bold px-2 text-center">Diện tích</th>
                <th className="pb-5 font-bold px-2">Giá thuê</th>
                <th className="pb-5 font-bold px-2">Trạng thái</th>
                <th className="pb-5 font-bold px-2 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm font-medium text-[#82ABB0]">
                    Đang tải danh sách phòng...
                  </td>
                </tr>
              ) : pagedRooms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm font-medium text-[#82ABB0]">
                    {statusFilter === 'ALL'
                      ? 'Chưa có phòng nào.'
                      : statusFilter === 'AVAILABLE'
                        ? 'Không có phòng trống.'
                        : 'Không có phòng đang thuê.'}
                  </td>
                </tr>
              ) : (
                pagedRooms.map((room) => {
                  const view = statusView[room.status] || statusView.AVAILABLE;
                  return (
                <tr key={room.room_id ?? room.room_number} className="border-b border-[#BCE1E5]/40 last:border-0 hover:bg-white/50 transition-colors">
                  <td className="py-5 px-2">
                    <span className="font-bold text-[#0F3A40] text-[15px]">{room.room_number}</span>
                  </td>
                  <td className="py-5 px-2 text-center">
                    <span className="bg-nest-primary/10 text-[#0F3A40] px-3 py-1 rounded-full text-[11px] font-bold tracking-wide">
                      {room.floor !== null && room.floor !== undefined ? `Tầng ${room.floor}` : '—'}
                    </span>
                  </td>
                  <td className="py-5 px-2 text-[#4A787C] text-[13px] font-bold text-center">
                    {room.area !== null && room.area !== undefined ? `${room.area} m²` : '—'}
                  </td>
                  <td className="py-5 px-2 text-[#0F3A40] font-bold text-[14px]">
                    {room.price !== null && room.price !== undefined ? `${Number(room.price).toLocaleString('vi-VN')}đ` : '—'}
                  </td>
                  <td className="py-5 px-2">
                    <div className={`${view.pill} inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide`}>
                       <span className={`w-1.5 h-1.5 rounded-full ${view.dot}`}></span>
                       {view.label}
                    </div>
                  </td>
                  <td className="py-5 px-2 text-right">
                    <div className="flex items-center justify-end gap-3 text-[#82ABB0]">
                       <button onClick={() => openEdit(room)} className="hover:text-[#14B8A6] transition-colors p-1"><Edit3 className="w-[18px] h-[18px]" /></button>
                       <button onClick={() => setDeleteTarget({ room_id: room.room_id, room_number: room.room_number })} className="hover:text-[#D14D4D] transition-colors p-1"><Trash2 className="w-[18px] h-[18px]" /></button>
                    </div>
                  </td>
                </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-transparent text-[12px] font-bold text-[#82ABB0]">
            <span>
              Hiển thị {pagedRooms.length} trên{' '}
              <span className="text-[#0F3A40]">
                {filteredTotal} phòng
                {statusFilter !== 'ALL' ? ` (lọc / ${stats.total} tổng)` : ''}
              </span>
            </span>
           <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className={`px-2 ${currentPage <= 1 ? 'text-slate-300 cursor-not-allowed' : 'text-[#82ABB0] hover:text-[#0F3A40]'}`}
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
                        ? 'w-8 h-8 rounded-full bg-[#14B8A6] text-white flex items-center justify-center'
                        : 'w-8 h-8 rounded-full text-[#4A787C] hover:bg-[#EBFDFB] flex items-center justify-center transition-colors'
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
                className={`px-2 ${currentPage >= totalPages ? 'text-slate-300 cursor-not-allowed' : 'text-[#82ABB0] hover:text-[#0F3A40]'}`}
                aria-label="Trang sau"
              >
                &gt;
              </button>
           </div>
        </div>
      </div>

      {/* Tóm tắt vận hành — dữ liệu thật từ danh sách phòng */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-[32px] p-10 flex flex-col justify-between shadow-[0_8px_30px_rgba(15,58,64,0.04)] border border-slate-200/60 self-stretch relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-nest-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
           <div className="relative z-10">
              <p className="text-[11px] font-bold text-nest-primary uppercase tracking-widest mb-6">Tổng quan vận hành</p>
              <h3 className="text-2xl font-bold text-nest-text-primary leading-snug mb-5">
                 Tỷ lệ lấp đầy {stats.occupancy}%
              </h3>
              <p className="text-[14px] text-nest-text-secondary font-medium leading-relaxed">
                 Hiện có {stats.rented} phòng đang cho thuê, {stats.available} phòng trống
                 {stats.maintenance > 0 ? ` và ${stats.maintenance} phòng bảo trì` : ''}.
                 {stats.available > 0
                    ? ' Nên ưu tiên đẩy nhanh các phòng trống để tối ưu doanh thu.'
                    : ' Toàn bộ phòng đã có khách hoặc đang bảo trì.'}
              </p>
           </div>
           <Link
              to="/admin/analytics"
              className="text-nest-primary hover:text-[#0da090] font-bold text-[14px] items-center gap-1.5 flex mt-10 w-fit transition-colors group relative z-10"
           >
              Xem phân tích chi tiết <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
           </Link>
        </div>

        <div className="bg-[#F2FCFD] rounded-[32px] shadow-sm overflow-hidden flex flex-col self-stretch border border-transparent">
           <div className="h-[220px] relative w-full overflow-hidden bg-gradient-to-br from-[#0F3A40] to-[#14B8A6] flex items-center justify-center">
              <div className="text-center text-white px-6">
                 <p className="text-[11px] font-bold uppercase tracking-widest text-white/70 mb-2">Phòng nổi bật</p>
                 <p className="text-3xl font-bold">{spotlightRoom ? `Phòng ${spotlightRoom.room_number}` : '—'}</p>
              </div>
              {spotlightRoom ? (
                 <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] font-bold text-[#0F3A40] uppercase tracking-widest shadow-sm">
                    {statusView[spotlightRoom.status]?.label || spotlightRoom.status}
                 </div>
              ) : null}
           </div>
           <div className="p-8 flex-1 flex flex-col justify-between">
              {spotlightRoom ? (
                 <>
                    <div>
                       <h4 className="text-[20px] font-bold text-[#0F3A40] mb-3">
                          {Number(spotlightRoom.area || 0).toLocaleString('vi-VN')} m² · Tầng {spotlightRoom.floor ?? '—'}
                       </h4>
                       <p className="text-[13px] text-[#4A787C] font-medium leading-relaxed mb-6 line-clamp-3">
                          {spotlightRoom.description?.trim() || 'Chưa có mô tả phòng.'}
                       </p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                       <span className="text-[18px] font-bold text-[#14B8A6]">
                          {Number(spotlightRoom.price || 0).toLocaleString('vi-VN')}đ/tháng
                       </span>
                       <span className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-wider">
                          Tối đa {spotlightRoom.max_tenants ?? 1} người
                       </span>
                    </div>
                 </>
              ) : (
                 <p className="text-[14px] text-[#82ABB0]">Chưa có dữ liệu phòng.</p>
              )}
           </div>
        </div>
      </div>

      <RoomFormModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        room={editingRoom}
        token={token}
        onSaved={reloadRooms}
      />

      <AppDialog
        open={!!deleteTarget}
        onClose={() => !deleteBusy && setDeleteTarget(null)}
        title="Xóa phòng?"
        description={
          deleteTarget
            ? `Bạn có chắc muốn xóa phòng ${deleteTarget.room_number}? Hành động không thể hoàn tác.`
            : ''
        }
        confirmText="Xóa phòng"
        cancelText="Giữ lại"
        variant="danger"
        busy={deleteBusy}
        onConfirm={confirmDeleteRoom}
      />
    </div>
  );
}
