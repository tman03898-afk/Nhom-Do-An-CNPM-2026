import { useEffect, useState } from 'react';
import {
  X, Calendar, User, Phone, MessageSquare, CheckCircle2, Clock, Wallet, Upload, ImageIcon,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BANK_QR_IMAGE_URL = `${import.meta.env.BASE_URL}images/home/qr.png`;

/**
 * @param {{ open: boolean, onClose: () => void, roomId: number, roomNumber?: string, onSuccess?: () => void }} props
 */
export default function RoomHoldRequestModal({ open, onClose, roomId, roomNumber, onSuccess }) {
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [preferredViewDate, setPreferredViewDate] = useState('');
  const [note, setNote] = useState('');
  const [holdMode, setHoldMode] = useState('temp');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('form');
  const [holdRequestId, setHoldRequestId] = useState(null);
  const [depositInfo, setDepositInfo] = useState(null);
  const [holdMinutes, setHoldMinutes] = useState(15);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');

  useEffect(() => {
    if (!open || holdMode !== 'deposit') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/room-holds/public/deposit-config?room_id=${roomId}`);
        const data = await res.json();
        if (!cancelled && data?.ok) setDepositInfo(data.deposit);
      } catch {
        if (!cancelled) setDepositInfo(null);
      }
    })();
    return () => { cancelled = true; };
  }, [open, holdMode, roomId]);

  if (!open) return null;

  const reset = () => {
    setGuestName('');
    setGuestPhone('');
    setGuestEmail('');
    setPreferredViewDate('');
    setNote('');
    setHoldMode('temp');
    setError('');
    setStep('form');
    setHoldRequestId(null);
    setDepositInfo(null);
    setProofFile(null);
    setProofPreview('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submitHold = async (e) => {
    e.preventDefault();
    const phone = guestPhone.trim();
    const email = guestEmail.trim();
    if (!phone && !email) {
      setError('Vui lòng nhập SĐT/Zalo hoặc email (ít nhất một).');
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email không hợp lệ.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/room-holds/public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          guest_name: guestName,
          guest_phone: phone || null,
          guest_email: email || null,
          preferred_view_date: preferredViewDate || null,
          note: note || null,
          hold_mode: holdMode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || 'Gửi yêu cầu thất bại');
      }
      onSuccess?.();
      setHoldRequestId(data.request?.hold_request_id);
      setHoldMinutes(data.hold_minutes || 15);
      if (holdMode === 'deposit') {
        setDepositInfo(data.deposit || depositInfo);
        setStep('deposit');
      } else {
        setStep('success');
      }
    } catch (err) {
      setError(err?.message || 'Không gửi được yêu cầu');
    } finally {
      setSaving(false);
    }
  };

  const submitDepositProof = async (e) => {
    e.preventDefault();
    if (!holdRequestId || !proofFile) {
      setError('Vui lòng chọn ảnh chuyển khoản');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('proof', proofFile);
      const res = await fetch(`${API_BASE_URL}/room-holds/public/${holdRequestId}/deposit-proof`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || 'Gửi minh chứng thất bại');
      }
      onSuccess?.();
      setStep('success');
    } catch (err) {
      setError(err?.message || 'Không gửi được minh chứng');
    } finally {
      setSaving(false);
    }
  };

  const onPickProof = (file) => {
    if (!file) return;
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const qrSrc = BANK_QR_IMAGE_URL;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-3xl p-7 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-xl font-bold text-nest-text-primary">Giữ chỗ phòng</h3>
            {roomNumber ? (
              <p className="text-sm text-[#14B8A6] font-medium mt-1">Phòng {roomNumber}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'success' ? (
          <div className="text-center py-6 px-2">
            <div className="w-16 h-16 rounded-full bg-[#14B8A6]/15 text-[#14B8A6] flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-9 h-9" strokeWidth={2.2} />
            </div>
            <p className="text-xl font-bold text-nest-text-primary mb-3">Cảm ơn bạn!</p>
            {holdMode === 'deposit' ? (
              <p className="text-sm text-nest-text-secondary leading-relaxed mb-6">
                Đã nhận minh chứng đặt cọc. Trạng thái: <strong>Đã cọc</strong> — admin sẽ xác minh và liên hệ bạn.
                Phòng được giữ cho đến khi hoàn tất thủ tục.
              </p>
            ) : (
              <p className="text-sm text-nest-text-secondary leading-relaxed mb-6">
                Phòng đã được giữ <strong>{holdMinutes} phút</strong>. The Sun sẽ liên hệ qua SĐT/Zalo.
                Nếu không đặt cọc trong thời gian này, phòng sẽ tự mở lại.
              </p>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="px-8 py-3 rounded-full bg-nest-primary hover:bg-[#0fa696] text-white font-bold"
            >
              Đã hiểu
            </button>
          </div>
        ) : step === 'deposit' ? (
          <form onSubmit={submitDepositProof} className="space-y-4">
            {error ? (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
            ) : null}
            <p className="text-sm text-nest-text-secondary">
              Phòng đã khóa cho bạn. Chuyển khoản đặt cọc và tải ảnh bill để xác nhận.
            </p>
            {depositInfo ? (
              <div className="rounded-2xl bg-[#F8FAFB] border border-slate-100 p-4 text-sm [&>p]:hidden">
                <p className="font-bold text-[#0F3A40]">
                  Số tiền: {Number(depositInfo.amount || 0).toLocaleString('vi-VN')}đ
                </p>
                <p><span className="text-[#82ABB0]">Ngân hàng:</span> {depositInfo.bank_name}</p>
                <p><span className="text-[#82ABB0]">STK:</span> <strong>{depositInfo.account_number}</strong></p>
                <p><span className="text-[#82ABB0]">Chủ TK:</span> {depositInfo.account_holder}</p>
                <p className="text-[12px] text-[#4A787C]">Nội dung: {depositInfo.transfer_note}</p>
                {qrSrc ? (
                  <div className="flex justify-center pt-2">
                    <img
                      src={qrSrc}
                      alt="Mã QR thanh toán"
                      className="max-w-[200px] rounded-xl border border-slate-200"
                      onError={(ev) => { ev.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                ) : (
                  <p className="text-[12px] text-amber-700 flex items-center gap-1">
                    <ImageIcon className="w-4 h-4" /> Chưa cấu hình ảnh QR — chuyển khoản theo STK trên.
                  </p>
                )}
              </div>
            ) : null}
            <label className="block">
              <span className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-wider flex items-center gap-1 mb-1.5">
                <Upload className="w-3.5 h-3.5" /> Ảnh minh chứng chuyển khoản *
              </span>
              <input
                type="file"
                accept="image/*"
                required
                onChange={(e) => onPickProof(e.target.files?.[0])}
                className="w-full text-sm"
              />
              {proofPreview ? (
                <img src={proofPreview} alt="Preview" className="mt-2 max-h-40 rounded-xl border" />
              ) : null}
            </label>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 rounded-2xl bg-[#14B8A6] hover:bg-[#0fa696] text-white font-bold disabled:opacity-60"
            >
              {saving ? 'Đang gửi...' : 'Gửi minh chứng — Đã cọc'}
            </button>
          </form>
        ) : (
          <form onSubmit={submitHold} className="space-y-4">
            {error ? (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
            ) : null}

            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setHoldMode('temp')}
                className={`py-2.5 rounded-xl text-[12px] font-bold flex flex-col items-center gap-1 ${
                  holdMode === 'temp' ? 'bg-white text-[#14B8A6] shadow-sm' : 'text-slate-500'
                }`}
              >
                <Clock className="w-4 h-4" /> Giữ chỗ 15 phút
              </button>
              <button
                type="button"
                onClick={() => setHoldMode('deposit')}
                className={`py-2.5 rounded-xl text-[12px] font-bold flex flex-col items-center gap-1 ${
                  holdMode === 'deposit' ? 'bg-white text-[#14B8A6] shadow-sm' : 'text-slate-500'
                }`}
              >
                <Wallet className="w-4 h-4" /> Đặt cọc ngay
              </button>
            </div>
            <p className="text-[12px] text-[#82ABB0] leading-relaxed">
              {holdMode === 'temp'
                ? 'Phòng khóa ngay 15 phút. Không cọc / admin không xử lý → tự mở lại.'
                : 'Phòng khóa cho đến khi admin mở lại. Chuyển khoản + ảnh bill → chờ xác minh.'}
            </p>

            <label className="block">
              <span className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-wider flex items-center gap-1 mb-1.5">
                <User className="w-3.5 h-3.5" /> Họ tên *
              </span>
              <input
                required
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
                placeholder="Nguyễn Văn A"
              />
            </label>

            <p className="text-[12px] text-[#82ABB0] -mt-2">
              Nhập <strong>ít nhất một</strong>: SĐT/Zalo hoặc email. Có cả hai thì sau khi tạo HĐ sẽ ưu tiên gửi tài khoản qua email.
            </p>

            <label className="block">
              <span className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-wider flex items-center gap-1 mb-1.5">
                <Phone className="w-3.5 h-3.5" /> SĐT / Zalo
              </span>
              <input
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
                placeholder="09xx xxx xxx"
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-wider mb-1.5 block">
                Email
              </span>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
                placeholder="email@example.com"
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-wider flex items-center gap-1 mb-1.5">
                <Calendar className="w-3.5 h-3.5" /> Ngày muốn xem
              </span>
              <input
                type="date"
                value={preferredViewDate}
                onChange={(e) => setPreferredViewDate(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-wider flex items-center gap-1 mb-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Ghi chú
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
                placeholder="Khung giờ xem phòng..."
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 rounded-2xl bg-[#14B8A6] hover:bg-[#0fa696] text-white font-bold disabled:opacity-60"
            >
              {saving ? 'Đang gửi...' : holdMode === 'deposit' ? 'Giữ phòng & thanh toán cọc' : 'Giữ chỗ — khóa phòng 15 phút'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
