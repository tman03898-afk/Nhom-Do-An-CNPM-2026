import { useCallback, useEffect, useState } from 'react';
import { X, FileText, User, Home, Calendar, KeyRound } from 'lucide-react';
import { apiFetch } from '../../lib/api';

function formatVnd(n) {
  return `${Number(n || 0).toLocaleString('vi-VN')}đ`;
}

/**
 * Tạo hợp đồng từ yêu cầu giữ chỗ — điền sẵn khách + phòng, admin chỉ chọn ngày thuê.
 */
export default function ContractFromHoldModal({ holdRequestId, token, onClose, onSuccess }) {
  const [loading, setLoading] = useState(true);
  const [prefill, setPrefill] = useState(null);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const loadPrefill = useCallback(async () => {
    if (!token || !holdRequestId) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/room-holds/admin/${holdRequestId}/contract-prefill`, { token });
      const p = data.prefill;
      setPrefill(p);
      setStartDate(p?.default_start_date || '');
      setEndDate(p?.default_end_date || '');
      setEmail(p?.suggested_email || '');
    } catch (err) {
      setError(err?.message || 'Không tải được thông tin');
      setPrefill(null);
    } finally {
      setLoading(false);
    }
  }, [token, holdRequestId]);

  useEffect(() => {
    loadPrefill();
  }, [loadPrefill]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token || !holdRequestId) return;
    setError('');
    setSubmitting(true);
    try {
      const body = { start_date: startDate, end_date: endDate };
      if (prefill?.will_create_tenant) {
        body.email = email.trim();
        if (password.trim()) body.password = password.trim();
      }
      const data = await apiFetch(`/room-holds/admin/${holdRequestId}/finalize-contract`, {
        token,
        method: 'POST',
        body,
      });
      setResult(data);
      onSuccess?.(data);
    } catch (err) {
      setError(err?.message || 'Tạo hợp đồng thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  if (result?.ok) {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
        <div className="w-full max-w-lg bg-white rounded-[28px] p-8 shadow-2xl border border-slate-200">
          <h3 className="text-xl font-bold text-[#0F3A40] mb-2">Đã tạo hợp đồng</h3>
          <p className="text-sm text-[#4A787C] mb-4">{result.message}</p>
          {result.created_credentials ? (
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 text-sm mb-4">
              <p className="font-bold text-amber-900 mb-2">Tài khoản khách thuê (mới)</p>
              <p>
                Email đăng nhập: <span className="font-mono font-semibold">{result.created_credentials.email}</span>
              </p>
              <p>
                Mật khẩu: <span className="font-mono font-semibold">{result.created_credentials.password}</span>
              </p>
              {result.credentials_delivery?.ok ? (
                <p className="text-[12px] text-emerald-800 mt-2 font-medium">
                  Đã gửi thông tin qua {result.credentials_delivery.channel === 'email' ? 'email' : 'SMS'}.
                </p>
              ) : result.credentials_delivery ? (
                <p className="text-[12px] text-amber-800 mt-2">
                  Chưa gửi tự động ({result.credentials_delivery.message || 'kiểm tra SMTP/Twilio'}). Copy thủ công cho khách.
                </p>
              ) : (
                <p className="text-[12px] text-amber-800 mt-2">Copy thông tin cho khách nếu cần.</p>
              )}
            </div>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-full bg-[#14B8A6] text-white font-bold"
          >
            Đóng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-[28px] shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-slate-100 bg-white rounded-t-[28px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EBFDFB] flex items-center justify-center text-[#14B8A6]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0F3A40]">Tạo hợp đồng từ giữ chỗ</h3>
              <p className="text-[12px] text-[#82ABB0]">Thông tin khách & phòng đã điền sẵn</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm text-[#82ABB0]">Đang tải thông tin...</p>
        ) : !prefill ? (
          <div className="p-8">
            <p className="text-sm text-red-600">{error || 'Không có dữ liệu'}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            <section className="rounded-2xl bg-[#F8FAFB] border border-slate-100 p-4">
              <div className="flex items-center gap-2 text-[11px] font-bold text-[#82ABB0] uppercase mb-3">
                <User className="w-4 h-4" /> Khách thuê
              </div>
              <dl className="grid grid-cols-2 gap-2 text-[13px]">
                <dt className="text-[#4A787C]">Họ tên</dt>
                <dd className="font-bold text-[#0F3A40] text-right">{prefill.guest_name}</dd>
                <dt className="text-[#4A787C]">SĐT / Zalo</dt>
                <dd className="font-semibold text-[#0F3A40] text-right">{prefill.guest_phone || '—'}</dd>
                <dt className="text-[#4A787C]">Email</dt>
                <dd className="font-semibold text-[#0F3A40] text-right break-all">{prefill.guest_email || '—'}</dd>
                {prefill.notify_channel ? (
                  <>
                    <dt className="text-[#4A787C]">Gửi TK sau HĐ</dt>
                    <dd className="text-right text-[12px] font-bold text-[#14B8A6]">
                      {prefill.notify_channel === 'email' ? 'Qua email' : 'Qua SMS'}
                    </dd>
                  </>
                ) : null}
                {prefill.tenant ? (
                  <>
                    <dt className="text-[#4A787C]">Đã có tài khoản</dt>
                    <dd className="text-right text-[#14B8A6] font-bold">#{prefill.tenant.tenant_id}</dd>
                    <dt className="text-[#4A787C]">Email</dt>
                    <dd className="font-semibold text-right break-all">{prefill.tenant.email}</dd>
                  </>
                ) : (
                  <dt className="col-span-2 text-[12px] text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                    Chưa có khách thuê trong hệ thống — sẽ tự tạo tài khoản khi lưu HĐ
                  </dt>
                )}
              </dl>
            </section>

            <section className="rounded-2xl bg-[#F8FAFB] border border-slate-100 p-4">
              <div className="flex items-center gap-2 text-[11px] font-bold text-[#82ABB0] uppercase mb-3">
                <Home className="w-4 h-4" /> Phòng
              </div>
              <dl className="grid grid-cols-2 gap-2 text-[13px]">
                <dt className="text-[#4A787C]">Số phòng</dt>
                <dd className="font-bold text-[#0F3A40] text-right">{prefill.room?.room_number}</dd>
                <dt className="text-[#4A787C]">Giá thuê / Cọc</dt>
                <dd className="font-semibold text-right">
                  {formatVnd(prefill.rent_price)} / {formatVnd(prefill.deposit)}
                </dd>
                {prefill.room?.area ? (
                  <>
                    <dt className="text-[#4A787C]">Diện tích</dt>
                    <dd className="text-right">{prefill.room.area} m²</dd>
                  </>
                ) : null}
                {prefill.room?.room_type ? (
                  <>
                    <dt className="text-[#4A787C]">Loại phòng</dt>
                    <dd className="text-right">{prefill.room.room_type}</dd>
                  </>
                ) : null}
              </dl>
            </section>

            {prefill.will_create_tenant ? (
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-[11px] font-bold text-[#82ABB0] uppercase">
                  <KeyRound className="w-4 h-4" /> Tài khoản đăng nhập (mới)
                </div>
                <p className="text-[12px] text-[#4A787C]">
                  Mật khẩu tự tạo nếu để trống. Sau khi lưu HĐ, hệ thống{' '}
                  {prefill.notify_channel === 'email'
                    ? 'gửi email'
                    : prefill.notify_channel === 'sms'
                      ? 'gửi SMS'
                      : 'gửi thông tin đăng nhập'} cho khách.
                </p>
                {!prefill.guest_email ? (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    placeholder="Email đăng nhập (bắt buộc nếu không có email guest)"
                    required
                  />
                ) : (
                  <p className="text-[12px] rounded-xl bg-slate-50 px-3 py-2 font-mono">{email}</p>
                )}
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="Mật khẩu (để trống = tự tạo)"
                  autoComplete="new-password"
                />
              </section>
            ) : null}

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-[11px] font-bold text-[#82ABB0] uppercase">
                <Calendar className="w-4 h-4" /> Thời hạn hợp đồng (admin điền)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-[#4A787C] mb-1">Ngày bắt đầu thuê</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#14B8A6]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[#4A787C] mb-1">Ngày hết hạn HĐ</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#14B8A6]"
                  />
                </div>
              </div>
            </section>

            {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-6 py-3 rounded-full font-bold text-[#4A787C] hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-3 rounded-full bg-[#14B8A6] hover:bg-[#0da090] text-white font-bold shadow-lg shadow-[#14B8A6]/20 disabled:opacity-60"
              >
                {submitting ? 'Đang tạo...' : 'Tạo hợp đồng & hoàn tất'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
