import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Phone,
  MessageCircle,
  MapPin,
  Wifi,
  Wind,
  Box,
  BedDouble,
  Droplets,
  CheckCircle2,
  Ruler,
  LayoutGrid,
  Layers,
  Edit3,
  Trash2,
  Bookmark,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import AppDialog from '../../components/common/AppDialog';
import { useToast } from '../../context/ToastContext';
import RoomFormModal from '../../components/rooms/RoomFormModal';
import RoomHoldRequestModal from '../../components/rooms/RoomHoldRequestModal';
import { canGuestRequestHold, formatHoldUntil } from '../../lib/roomHolds';
import {
  getRoomDisplayImages,
  getRoomTypeMeta,
  inferRoomCategory,
  isRoomAvailable,
  isRoomHeld,
} from '../../lib/guestRoomMedia';

export default function RoomDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { addToast } = useToast();
  const isAdmin = user?.role === 'ADMIN';
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const [room, setRoom] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [holdModalOpen, setHoldModalOpen] = useState(false);

  const loadRoom = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${id}`);
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || 'Không tìm thấy phòng');
      }
      setRoom(data.room);
    } catch (error) {
      setRoom(null);
      setErrorMessage(error.message || 'Không thể tải thông tin phòng');
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL, id]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  const roomCategory = useMemo(() => (room ? inferRoomCategory(room) : 'Phòng thường'), [room]);
  const typeMeta = useMemo(() => getRoomTypeMeta(roomCategory), [roomCategory]);
  const gallery = useMemo(() => (room ? getRoomDisplayImages(room) : []), [room]);
  const canRent = useMemo(() => isRoomAvailable(room?.status), [room]);
  const canHold = useMemo(() => canGuestRequestHold(room?.status), [room]);
  const held = useMemo(() => isRoomHeld(room?.status), [room]);

  const statusView = useMemo(() => {
    if (!room?.status) return { label: '—', color: 'text-nest-text-secondary', icon: CheckCircle2 };
    if (isRoomAvailable(room.status)) return { label: 'Còn trống', color: 'text-[#0f8b7d]', icon: CheckCircle2 };
    if (isRoomHeld(room.status)) return { label: 'Đang giữ chỗ', color: 'text-amber-700', icon: CheckCircle2 };
    if (String(room.status).toUpperCase() === 'RENTED') return { label: 'Đang thuê', color: 'text-nest-text-secondary', icon: CheckCircle2 };
    if (String(room.status).toUpperCase() === 'MAINTENANCE') return { label: 'Bảo trì', color: 'text-amber-600', icon: CheckCircle2 };
    return { label: room.status, color: 'text-nest-text-secondary', icon: CheckCircle2 };
  }, [room]);

  const confirmDeleteRoom = async () => {
    if (!token || !room?.room_id) return;
    setDeleteBusy(true);
    try {
      await apiFetch(`/rooms/${room.room_id}`, { token, method: 'DELETE' });
      addToast(`Đã xóa phòng ${room.room_number}.`, 'success');
      setDeleteOpen(false);
      navigate('/#phong-trong');
    } catch (err) {
      addToast(err?.message || 'Không xóa được phòng.', 'error');
    } finally {
      setDeleteBusy(false);
    }
  };

  const [mainSrc, topSrc, bottomLeftSrc, bottomRightSrc] = [
    gallery[0],
    gallery[1] || gallery[0],
    gallery[2] || gallery[0],
    gallery[3] || gallery[1] || gallery[0],
  ];

  return (
    <div className="max-w-7xl mx-auto px-8 w-full pb-24">
      {isAdmin ? (
        <div className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-2xl bg-[#14B8A6]/10 border border-[#14B8A6]/25">
          <span className="text-[11px] font-bold text-[#006B5F] uppercase tracking-widest">Quản trị</span>
          <button
            type="button"
            onClick={() => setRoomModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-[#14B8A6] text-sm font-bold shadow-sm hover:bg-[#f0fffe]"
          >
            <Edit3 className="w-4 h-4" /> Sửa phòng
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-red-600 text-sm font-bold shadow-sm hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" /> Xóa phòng
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4 md:h-[450px]">
        <div className="md:col-span-5 h-[250px] md:h-full rounded-[2rem] overflow-hidden relative">
          <img src={mainSrc} alt={typeMeta.label} className="w-full h-full object-cover" loading="eager" />
          <span className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-white/90 text-[#0F3A40]">
            {room?.room_type || roomCategory}
          </span>
        </div>
        <div className="md:col-span-7 flex flex-col gap-3">
          <div className="h-[180px] md:h-[217px] rounded-[2rem] overflow-hidden">
            <img src={topSrc} alt={`${typeMeta.label} — không gian`} className="w-full h-full object-cover" loading="lazy" />
          </div>
          <div className="grid grid-cols-2 gap-3 flex-1 h-[140px] md:h-[217px]">
            <div className="rounded-[2rem] overflow-hidden">
              <img src={bottomLeftSrc} alt="Tiện ích phòng" className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="rounded-[2rem] overflow-hidden">
              <img src={bottomRightSrc} alt="Phòng tắm / bếp" className="w-full h-full object-cover" loading="lazy" />
            </div>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-nest-text-secondary font-medium mb-10 italic">
        {room?.images?.length
          ? 'Ảnh chi tiết từ hệ thống The Sun.'
          : `Ảnh minh họa phong cách ${typeMeta.label.toLowerCase()} — liên hệ xem phòng thực tế.`}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white/40 backdrop-blur-[16px] border border-white/60 rounded-[3rem] p-8 md:p-12">
          <h1 className="text-4xl md:text-[2.75rem] font-sans font-bold text-nest-text-primary mb-2 leading-[1.1]">
            {isLoading ? 'Đang tải...' : room?.room_number ? `Phòng ${room.room_number}` : 'Phòng'}
          </h1>
          <p className="text-sm text-[#14B8A6] font-medium mb-8">{typeMeta.tagline}</p>

          {errorMessage && (
            <div className="mb-8 p-4 rounded-2xl bg-white/60 border border-white/60 text-nest-text-secondary font-medium">
              {errorMessage}
            </div>
          )}

          {room && held && !isLoading && (
            <div className="mb-8 p-5 rounded-2xl bg-amber-50 border border-amber-200/80">
              <p className="font-bold text-amber-900 mb-1">Phòng đang được giữ cho khách khác</p>
              <p className="text-sm text-amber-800/90 leading-relaxed">
                Giữ đến:{' '}
                <span className="font-bold">{formatHoldUntil(room.hold_until) || '—'}</span>. Bạn có thể xem phòng khác hoặc liên hệ Zalo.
              </p>
            </div>
          )}

          {room && !canRent && !held && !isLoading && (
            <div className="mb-8 p-5 rounded-2xl bg-amber-50 border border-amber-200/80">
              <p className="font-bold text-amber-900 mb-1">Phòng này không nhận giữ chỗ mới</p>
              <p className="text-sm text-amber-800/90 leading-relaxed mb-3">
                Trạng thái: <span className="font-bold">{statusView.label}</span>
              </p>
              <Link to="/#phong-trong" className="inline-flex text-sm font-bold text-[#14B8A6] hover:underline">
                ← Xem phòng khác
              </Link>
            </div>
          )}

          <div className="mb-10">
            <div className="text-[10px] font-bold text-nest-text-secondary uppercase tracking-wider mb-2">Giá Thuê Tháng</div>
            <div className="text-4xl md:text-5xl font-sans font-bold text-[#14B8A6]">
              {room?.price !== null && room?.price !== undefined ? `${Number(room.price).toLocaleString('vi-VN')}đ` : '—'}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8 border-y border-nest-surface-low mb-10">
            <div>
              <div className="text-[10px] font-bold text-nest-text-secondary uppercase tracking-wider mb-2">Diện tích</div>
              <div className="flex items-center gap-2 font-bold text-nest-text-primary text-base">
                <Ruler className="w-5 h-5 text-[#14B8A6]" />{' '}
                {room?.area !== null && room?.area !== undefined ? `${room.area} m²` : typeMeta.areaHint}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-nest-text-secondary uppercase tracking-wider mb-2">Loại phòng</div>
              <div className="flex items-center gap-2 font-bold text-nest-text-primary text-base">
                <LayoutGrid className="w-5 h-5 text-[#14B8A6]" /> {room?.room_type || roomCategory}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-nest-text-secondary uppercase tracking-wider mb-2">Trạng thái</div>
              <div className={`flex items-center gap-2 font-bold text-base ${statusView.color}`}>
                <statusView.icon className="w-5 h-5 text-[#14B8A6]" /> {statusView.label}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-nest-text-secondary uppercase tracking-wider mb-2">Tầng</div>
              <div className="flex items-center gap-2 font-bold text-nest-text-primary text-base">
                <Layers className="w-5 h-5 text-[#14B8A6]" /> {room?.floor !== null && room?.floor !== undefined ? String(room.floor) : '—'}
              </div>
            </div>
          </div>

          <h3 className="font-sans font-bold text-lg text-nest-text-primary mb-6">Tiện nghi có sẵn</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {[
              { icon: Wifi, text: 'Wi-Fi Tốc độ cao' },
              { icon: Wind, text: 'Điều hòa Inverter' },
              { icon: Box, text: 'Tủ lạnh 180L' },
              { icon: BedDouble, text: 'Giường Queen Size' },
              { icon: Droplets, text: 'Máy nước nóng' },
              { icon: CheckCircle2, text: 'Máy giặt sấy' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 bg-white/60 px-5 py-3.5 rounded-2xl border border-white/60 shadow-sm"
              >
                <item.icon className="w-5 h-5 text-[#14B8A6]" />
                <span className="text-sm font-bold text-nest-text-primary">{item.text}</span>
              </div>
            ))}
          </div>

          <h3 className="font-sans font-bold text-lg text-nest-text-primary mb-4">Mô tả chi tiết</h3>
          <p className="text-sm text-nest-text-secondary leading-[1.8] pr-4 mb-6">
            {room?.description?.trim() || typeMeta.description}
          </p>

          {gallery.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {gallery.map((src, i) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden border border-white/60">
                  <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="bg-white/40 backdrop-blur-[16px] border border-white/60 rounded-[2.5rem] p-8">
            <h3 className="font-sans font-bold text-lg text-nest-text-primary mb-6">Liên hệ xem phòng</h3>

            <div className="bg-nest-surface-low p-4 rounded-2xl flex items-center gap-4 mb-4 border border-white/60">
              <div className="w-10 h-10 bg-[#14B8A6] rounded-full flex items-center justify-center text-white shrink-0 shadow-sm">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[9px] font-bold text-nest-text-secondary uppercase tracking-wider mb-1">Gọi trực tiếp</div>
                <div className="font-bold text-nest-text-primary text-sm">+84 857 667 533</div>
              </div>
            </div>

            {canHold ? (
              <button
                type="button"
                onClick={() => setHoldModalOpen(true)}
                className="w-full py-4 rounded-2xl bg-[#0F3A40] hover:bg-[#1a4d54] text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md mb-3"
              >
                <Bookmark className="w-4 h-4" /> Giữ chỗ
              </button>
            ) : null}

            {canRent ? (
              <button
                onClick={() => window.open('https://zalo.me/84857667533', '_blank', 'noopener')}
                className="w-full py-4 rounded-2xl bg-[#14B8A6] hover:bg-[#0fa696] text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md mb-4"
              >
                <MessageCircle className="w-4 h-4" /> Nhắn tin Zalo ngay
              </button>
            ) : (
              <Link
                to="/#phong-trong"
                className="w-full py-4 rounded-2xl bg-gray-100 text-nest-text-secondary text-sm font-bold transition-all flex items-center justify-center gap-2 mb-4"
              >
                Xem phòng khác
              </Link>
            )}

            <p className="text-[11px] text-nest-text-secondary text-center leading-relaxed">
              {canHold
                ? 'Gửi yêu cầu giữ chỗ — admin sẽ liên hệ xác nhận trong thời gian sớm nhất.'
                : held
                  ? 'Phòng đang được giữ tạm thời cho khách khác.'
                  : 'Liên hệ Zalo nếu bạn cần tư vấn thêm.'}
            </p>
          </div>

          <div className="bg-white/40 backdrop-blur-[16px] border border-white/60 rounded-[2.5rem] p-8">
            <h3 className="font-bold text-[11px] text-nest-text-secondary uppercase tracking-wider mb-5">Vị trí</h3>
            <div className="rounded-[1.5rem] overflow-hidden mb-5 bg-[#14B8A6]/10 border border-[#14B8A6]/20 shadow-inner h-32 relative group cursor-pointer">
              <img
                src={mainSrc}
                alt="Vị trí"
                className="w-full h-full object-cover mix-blend-luminosity opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <MapPin className="w-8 h-8 text-[#14B8A6] drop-shadow-md pb-1" />
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#14B8A6] shrink-0 fill-[#14B8A6]/20 mt-0.5" />
              <span className="text-[13px] font-bold text-nest-text-primary leading-[1.6]">
                Trường Đại học Công nghệ Thông tin, ĐHQG-HCM
              </span>
            </div>
          </div>
        </div>
      </div>

      <RoomFormModal
        open={roomModalOpen}
        onClose={() => setRoomModalOpen(false)}
        room={room}
        token={token}
        onSaved={loadRoom}
      />

      <RoomHoldRequestModal
        open={holdModalOpen}
        onClose={() => setHoldModalOpen(false)}
        roomId={Number(room?.room_id || id)}
        roomNumber={room?.room_number}
        onSuccess={loadRoom}
      />

      <AppDialog
        open={deleteOpen}
        onClose={() => !deleteBusy && setDeleteOpen(false)}
        title="Xóa phòng?"
        description={
          room?.room_number
            ? `Bạn có chắc muốn xóa phòng ${room.room_number}? Hành động không thể hoàn tác.`
            : 'Bạn có chắc muốn xóa phòng này?'
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
