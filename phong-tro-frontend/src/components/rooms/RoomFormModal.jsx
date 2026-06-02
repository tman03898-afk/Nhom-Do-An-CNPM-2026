import { useEffect, useState } from 'react';
import { ImagePlus, Trash2, X } from 'lucide-react';
import { apiFetch, apiUploadRoomImages, resolveBackendAssetUrl } from '../../lib/api';
import { ROOM_TYPE_FILTER_OPTIONS } from '../../lib/guestRoomMedia';

const EMPTY_FORM = {
  room_number: '',
  floor: '',
  area: '',
  max_tenants: 2,
  price: '',
  status: 'AVAILABLE',
  room_type: 'Phòng thường',
  description: '',
};

/**
 * Modal thêm/sửa phòng — dùng chung guest (admin) và quản lý phòng.
 */
export default function RoomFormModal({ open, onClose, room, token, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [existingImages, setExistingImages] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [pendingPreviews, setPendingPreviews] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setPendingFiles([]);
    setPendingPreviews([]);
    if (room?.room_id) {
      setForm({
        room_number: room.room_number || '',
        floor: room.floor ?? '',
        area: room.area ?? '',
        max_tenants: room.max_tenants ?? 2,
        price: room.price ?? '',
        status: room.status || 'AVAILABLE',
        room_type: room.room_type || 'Phòng thường',
        description: room.description || '',
      });
      setExistingImages(Array.isArray(room.images) ? [...room.images] : []);
    } else {
      setForm(EMPTY_FORM);
      setExistingImages([]);
    }
  }, [open, room]);

  useEffect(() => {
    return () => {
      pendingPreviews.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [pendingPreviews]);

  if (!open) return null;

  const onPickImages = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const next = [...pendingFiles, ...files].slice(0, 8);
    setPendingFiles(next);
    pendingPreviews.forEach((u) => URL.revokeObjectURL(u));
    setPendingPreviews(next.map((f) => URL.createObjectURL(f)));
    e.target.value = '';
  };

  const removeExisting = (idx) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const removePending = (idx) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
    setPendingPreviews((prev) => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      let uploaded = [];
      if (pendingFiles.length) {
        uploaded = await apiUploadRoomImages(pendingFiles, { token });
      }
      const images = [...existingImages, ...uploaded];

      const payload = {
        room_number: String(form.room_number || '').trim(),
        floor: form.floor === '' ? null : Number(form.floor),
        area: Number(form.area),
        max_tenants: Number(form.max_tenants || 1),
        price: Number(form.price),
        status: form.status,
        room_type: form.room_type || null,
        description: form.description ? String(form.description) : null,
        images,
      };

      if (room?.room_id) {
        await apiFetch(`/rooms/${room.room_id}`, { token, method: 'PUT', body: payload });
      } else {
        await apiFetch('/rooms', { token, method: 'POST', body: payload });
      }

      onSaved?.();
      onClose();
    } catch (err) {
      setError(err?.message || 'Không lưu được phòng');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl p-7 shadow-2xl border border-slate-200 my-8 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-white z-10 pb-2">
          <h3 className="text-2xl font-bold text-nest-text-primary">
            {room?.room_id ? `Sửa phòng ${room.room_number}` : 'Thêm phòng mới'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error ? (
          <p className="mb-4 text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </p>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            value={form.room_number}
            onChange={(e) => setForm((p) => ({ ...p, room_number: e.target.value }))}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
            placeholder="Số phòng (VD: B305)"
          />
          <select
            value={form.room_type}
            onChange={(e) => setForm((p) => ({ ...p, room_type: e.target.value }))}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
          >
            {ROOM_TYPE_FILTER_OPTIONS.filter((x) => x !== 'Tất cả').map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            value={form.floor}
            onChange={(e) => setForm((p) => ({ ...p, floor: e.target.value }))}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
            placeholder="Tầng"
          />
          <input
            value={form.area}
            onChange={(e) => setForm((p) => ({ ...p, area: e.target.value }))}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
            placeholder="Diện tích (m²)"
          />
          <input
            value={form.price}
            onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
            placeholder="Giá thuê (VNĐ/tháng)"
          />
          <input
            value={form.max_tenants}
            onChange={(e) => setForm((p) => ({ ...p, max_tenants: e.target.value }))}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
            placeholder="Số người tối đa"
          />
          <select
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
          >
            <option value="AVAILABLE">Còn trống (AVAILABLE)</option>
            <option value="HELD">Đang giữ chỗ (HELD)</option>
            <option value="RENTED">Đang thuê (RENTED)</option>
            <option value="MAINTENANCE">Bảo trì (MAINTENANCE)</option>
          </select>
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            className="md:col-span-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
            placeholder="Mô tả chi tiết (tiện nghi, quy định...)"
            rows={3}
          />
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-3">
            Ảnh phòng (tối đa 8)
          </p>
          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-nest-primary/30 text-nest-primary font-bold text-sm cursor-pointer hover:bg-nest-primary/5">
            <ImagePlus className="w-4 h-4" />
            Chọn ảnh từ máy
            <input type="file" accept="image/*" multiple className="hidden" onChange={onPickImages} />
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {existingImages.map((url, idx) => (
              <div key={`ex-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200">
                <img src={resolveBackendAssetUrl(url)} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeExisting(idx)}
                  className="absolute top-1 right-1 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {pendingPreviews.map((src, idx) => (
              <div key={`new-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-[#14B8A6]/40">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <span className="absolute bottom-1 left-1 text-[9px] font-bold bg-[#14B8A6] text-white px-1.5 py-0.5 rounded">
                  Mới
                </span>
                <button
                  type="button"
                  onClick={() => removePending(idx)}
                  className="absolute top-1 right-1 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8 sticky bottom-0 bg-white pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-full font-bold text-nest-text-secondary hover:text-nest-text-primary"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 rounded-full bg-nest-primary hover:bg-[#0da090] text-white font-bold shadow-lg shadow-nest-primary/20 disabled:opacity-60"
          >
            {saving ? 'Đang lưu...' : 'Lưu phòng'}
          </button>
        </div>
      </div>
    </div>
  );
}
