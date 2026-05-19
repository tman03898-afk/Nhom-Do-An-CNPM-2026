import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Loader2, XCircle, Info, ClipboardList, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

function money(v) {
  return Number(v || 0).toLocaleString('vi-VN');
}

function feeTypeLabel(t) {
  const u = String(t || '').toUpperCase();
  if (u === 'UTILITY') return 'Theo chỉ số (công tơ)';
  if (u === 'FIXED') return 'Phí cố định';
  return t ? String(t) : '—';
}

function statusLabel(st) {
  const u = String(st || '').toUpperCase();
  if (u === 'PENDING') return 'Chờ duyệt';
  if (u === 'ACTIVE') return 'Đã duyệt';
  if (u === 'REJECTED') return 'Từ chối';
  if (u === 'CANCELLED') return 'Đã hủy';
  return st || '—';
}

function statusPillClass(st) {
  const u = String(st || '').toUpperCase();
  if (u === 'PENDING') return 'bg-amber-50 text-amber-800';
  if (u === 'ACTIVE') return 'bg-teal-50 text-teal-800';
  if (u === 'REJECTED') return 'bg-red-50 text-red-700';
  return 'bg-slate-100 text-slate-600';
}

export default function TenantServicesPage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [feeRef, setFeeRef] = useState([]);
  const [feeOptions, setFeeOptions] = useState([]);
  const [feeSubs, setFeeSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);

  const openSlotByFeeId = useMemo(() => {
    const m = new Map();
    for (const s of feeSubs) {
      const st = String(s.status || '').toUpperCase();
      if (st === 'PENDING' || st === 'ACTIVE') {
        m.set(Number(s.fee_id), s);
      }
    }
    return m;
  }, [feeSubs]);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [rr, ro, rs] = await Promise.allSettled([
        apiFetch('/tenant/service-fees-reference', { token }),
        apiFetch('/tenant/fee-subscription-options', { token }),
        apiFetch('/tenant/fee-subscriptions', { token }),
      ]);
      if (rr.status === 'fulfilled') setFeeRef(rr.value?.fees || []);
      else setFeeRef([]);
      if (ro.status === 'fulfilled') setFeeOptions(ro.value?.fees || []);
      else setFeeOptions([]);
      if (rs.status === 'fulfilled') setFeeSubs(rs.value?.subscriptions || []);
      else setFeeSubs([]);
      if (rr.status === 'rejected' && ro.status === 'rejected' && rs.status === 'rejected') {
        addToast('Không tải được dữ liệu.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const requestFee = async (feeId) => {
    if (!token) return;
    setBusyKey(`req-${feeId}`);
    try {
      await apiFetch('/tenant/fee-subscriptions', { token, method: 'POST', body: { fee_id: feeId } });
      addToast('Đã gửi yêu cầu. Vui lòng chờ chủ trọ duyệt.', 'success');
      await load();
    } catch (e) {
      addToast(e?.message || 'Không gửi được yêu cầu.', 'error');
    } finally {
      setBusyKey(null);
    }
  };

  const cancelFeeSub = async (id) => {
    if (!token) return;
    setBusyKey(`del-${id}`);
    try {
      await apiFetch(`/tenant/fee-subscriptions/${id}`, { token, method: 'DELETE' });
      addToast('Đã cập nhật.', 'success');
      await load();
    } catch (e) {
      addToast(e?.message || 'Không thực hiện được.', 'error');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="w-full max-w-[900px] mx-auto px-4 pb-16 pt-4">
      <div className="flex items-start gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-[#14B8A6] flex items-center justify-center text-white shadow-lg shadow-teal-500/30">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#0F3A40] tracking-tight">Tiện ích &amp; đăng ký</h1>
          <p className="text-sm text-[#0F3A40]/70 mt-1 max-w-xl">
            Xem bảng phí tham khảo, gửi yêu cầu dùng tiện ích (Internet, điều hòa, máy giặt, …).             Sau khi chủ trọ <strong className="font-semibold text-[#0F3A40]">duyệt</strong>, phí được cộng vào{' '}
            <strong className="font-semibold text-[#0F3A40]">kỳ hóa đơn trong tháng duyệt</strong> (và các kỳ sau nếu còn hiệu lực).
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-white/90 border border-[#0F3A40]/10 shadow-sm p-6 mb-8">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#0F3A40]/8 flex items-center justify-center text-[#0F3A40] shrink-0">
            <ClipboardList className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#0F3A40]/60">Bảng phí tham khảo</h2>
            <p className="text-xs text-[#0F3A40]/65 mt-1 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#14B8A6]" />
              <span>
                Danh mục phí tham khảo để đối chiếu. Số tiền trên hóa đơn có thể theo giá hợp đồng hoặc mức đã duyệt khi
                bạn đăng ký tiện ích.
              </span>
            </p>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-[#0F3A40]/60 text-sm py-6 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" /> Đang tải…
          </div>
        ) : feeRef.length === 0 ? (
          <p className="text-sm text-[#0F3A40]/60 py-2">Chưa có dữ liệu bảng phí tham khảo trên hệ thống.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#0F3A40]/10">
            <table className="w-full text-left text-sm min-w-[520px]">
              <thead>
                <tr className="bg-[#DDF5F7]/50 text-[10px] font-bold uppercase tracking-wider text-[#0F3A40]/55">
                  <th className="px-3 py-2.5">Tên phí</th>
                  <th className="px-3 py-2.5 hidden sm:table-cell">Mô tả</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Đơn giá</th>
                  <th className="px-3 py-2.5">Đơn vị</th>
                  <th className="px-3 py-2.5 hidden md:table-cell">Loại</th>
                </tr>
              </thead>
              <tbody>
                {feeRef.map((row) => (
                  <tr key={row.fee_id} className="border-t border-[#0F3A40]/8 hover:bg-[#DDF5F7]/25">
                    <td className="px-3 py-2.5 font-bold text-[#0F3A40]">{row.fee_name}</td>
                    <td className="px-3 py-2.5 text-[#0F3A40]/70 text-xs hidden sm:table-cell max-w-[220px]">
                      {row.description || '—'}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-[#0F3A40] whitespace-nowrap">{money(row.unit_price)}đ</td>
                    <td className="px-3 py-2.5 text-[#0F3A40]/75">{row.unit || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-[#0F3A40]/65 hidden md:table-cell">
                      {feeTypeLabel(row.fee_type)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-3xl bg-white/90 border border-[#0F3A40]/10 shadow-sm p-6 mb-8">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#0F3A40]/60 mb-1">Đăng ký tiện ích</h2>
        <p className="text-xs text-[#0F3A40]/60 mb-4">
          Các khoản phí cố định (không gồm điện/nước theo công tơ). Gửi yêu cầu → chờ duyệt → phí vào hóa đơn kỳ tháng được duyệt.
        </p>
        {loading ? (
          <div className="flex items-center gap-2 text-[#0F3A40]/60 text-sm py-8 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" /> Đang tải…
          </div>
        ) : feeOptions.length === 0 ? (
          <p className="text-sm text-[#0F3A40]/60 py-4">Hiện không có tiện ích nào mở đăng ký.</p>
        ) : (
          <ul className="space-y-3">
            {feeOptions.map((row) => {
              const fid = Number(row.fee_id);
              const block = openSlotByFeeId.get(fid);
              const isBusy = busyKey === `req-${fid}`;
              return (
                <li
                  key={row.fee_id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#0F3A40]/8 bg-[#DDF5F7]/40 px-4 py-3"
                >
                  <div>
                    <p className="font-bold text-[#0F3A40]">{row.fee_name}</p>
                    <p className="text-xs text-[#0F3A40]/60">
                      {row.unit ? `${row.unit}` : 'Gói'} · {money(row.unit_price)}đ
                      {row.description ? ` · ${row.description}` : ''}
                    </p>
                  </div>
                  {block ? (
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${statusPillClass(block.status)}`}
                    >
                      {String(block.status).toUpperCase() === 'PENDING' ? (
                        <Clock className="w-3.5 h-3.5" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      {statusLabel(block.status)}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => requestFee(fid)}
                      className="px-4 py-2 rounded-full bg-[#14B8A6] text-white text-xs font-bold hover:bg-[#0da090] disabled:opacity-50"
                    >
                      {isBusy ? '…' : 'Gửi đăng ký'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-3xl bg-white/90 border border-[#0F3A40]/10 shadow-sm p-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#0F3A40]/60 mb-4">Yêu cầu &amp; tiện ích của tôi</h2>
        {!loading && feeSubs.length === 0 ? (
          <p className="text-sm text-[#0F3A40]/60">Bạn chưa có yêu cầu nào.</p>
        ) : (
          <ul className="space-y-2">
            {feeSubs.map((s) => {
              const st = String(s.status || '').toUpperCase();
              const isBusy = busyKey === `del-${s.id}`;
              const canWithdraw = st === 'PENDING' || st === 'ACTIVE';
              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#0F3A40]/8 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-[#0F3A40]">{s.fee_name}</span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${statusPillClass(s.status)}`}
                      >
                        {statusLabel(s.status)}
                      </span>
                    </div>
                    <span className="text-[#0F3A40]/60 text-xs">
                      {money(s.monthly_price)}đ · {s.unit || '—'}
                    </span>
                    {st === 'ACTIVE' && s.effective_from && (() => {
                      const d = new Date(s.effective_from);
                      const label = Number.isNaN(d.getTime())
                        ? '—'
                        : `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                      return (
                        <span className="block text-xs text-teal-700 mt-0.5">
                          Áp dụng hóa đơn từ tháng {label}
                        </span>
                      );
                    })()}
                    {st === 'REJECTED' && s.reject_reason && (
                      <span className="block text-xs text-red-600 mt-0.5">Lý do: {s.reject_reason}</span>
                    )}
                  </div>
                  {canWithdraw ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => cancelFeeSub(s.id)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg disabled:opacity-50 shrink-0"
                    >
                      <XCircle className="w-3.5 h-3.5" /> {st === 'PENDING' ? 'Thu hồi' : 'Ngưng dùng'}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
