import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Loader2, XCircle, Info, ClipboardList, Clock, CheckCircle2, X, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import AppDialog from '../../components/common/AppDialog';

function money(v) {
  return Number(v || 0).toLocaleString('vi-VN');
}

function feeTypeLabel(t) {
  const u = String(t || '').toUpperCase();
  if (u === 'UTILITY') return 'Theo chỉ số (công tơ)';
  if (u === 'FIXED') return 'Phí cố định';
  return t ? String(t) : '—';
}

function feeBillingLabel(row) {
  if (String(row?.billing_mode || '').toUpperCase() === 'TIERED') return 'Bậc thang theo chỉ số';
  return feeTypeLabel(row?.fee_type);
}

function tierLabel(row, tier) {
  const unit = row?.tier_unit || row?.unit || '';
  const range = tier.to == null ? `Trên ${Math.max(0, Number(tier.from || 1) - 1)}` : `${tier.from}-${tier.to}`;
  return `${range} ${unit}: ${money(tier.price)}đ`;
}

function statusLabel(st) {
  const u = String(st || '').toUpperCase();
  if (u === 'PENDING') return 'Chờ duyệt đăng ký';
  if (u === 'PENDING_CANCEL') return 'Chờ duyệt ngưng';
  if (u === 'ACTIVE') return 'Đang dùng';
  if (u === 'REJECTED') return 'Từ chối';
  if (u === 'CANCELLED') return 'Đã hủy';
  return st || '—';
}

function statusPillClass(st) {
  const u = String(st || '').toUpperCase();
  if (u === 'PENDING') return 'bg-amber-50 text-amber-800';
  if (u === 'PENDING_CANCEL') return 'bg-orange-50 text-orange-800';
  if (u === 'ACTIVE') return 'bg-teal-50 text-teal-800';
  if (u === 'REJECTED') return 'bg-red-50 text-red-700';
  return 'bg-slate-100 text-slate-600';
}

function isPersonUnit(unit) {
  return String(unit || '').trim().toLowerCase() === 'person';
}

function serviceUnitLabel(unit) {
  if (isPersonUnit(unit)) return 'VNĐ/người/tháng';
  return 'VNĐ/tháng';
}

export default function TenantServicesPage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [feeRef, setFeeRef] = useState([]);
  const [feeOptions, setFeeOptions] = useState([]);
  const [feeSubs, setFeeSubs] = useState([]);
  const [svcCatalog, setSvcCatalog] = useState([]);
  const [roomMaxTenants, setRoomMaxTenants] = useState(1);
  const [svcSubs, setSvcSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);
  /** @type {null | { row: object, headCount: string, fieldError: string }} */
  const [subscribeModal, setSubscribeModal] = useState(null);
  /** @type {null | { id: number, status: string, serviceName: string }} */
  const [cancelModal, setCancelModal] = useState(null);

  const openSlotByServiceId = useMemo(() => {
    const m = new Map();
    for (const s of svcSubs) {
      const st = String(s.status || '').toUpperCase();
      if (st === 'PENDING' || st === 'ACTIVE' || st === 'PENDING_CANCEL') {
        m.set(Number(s.service_id), s);
      }
    }
    return m;
  }, [svcSubs]);

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
      const [rr, ro, rs, rc, rsub] = await Promise.allSettled([
        apiFetch('/tenant/service-fees-reference', { token }),
        apiFetch('/tenant/fee-subscription-options', { token }),
        apiFetch('/tenant/fee-subscriptions', { token }),
        apiFetch('/tenant/services-catalog', { token }),
        apiFetch('/tenant/service-subscriptions', { token }),
      ]);
      if (rr.status === 'fulfilled') setFeeRef(rr.value?.fees || []);
      else setFeeRef([]);
      if (ro.status === 'fulfilled') setFeeOptions(ro.value?.fees || []);
      else setFeeOptions([]);
      if (rs.status === 'fulfilled') setFeeSubs(rs.value?.subscriptions || []);
      else setFeeSubs([]);
      if (rc.status === 'fulfilled') {
        setSvcCatalog(rc.value?.services || []);
        setRoomMaxTenants(Number(rc.value?.room_max_tenants) || 1);
      } else {
        setSvcCatalog([]);
        setRoomMaxTenants(1);
      }
      if (rsub.status === 'fulfilled') setSvcSubs(rsub.value?.subscriptions || []);
      else setSvcSubs([]);
      if (
        rr.status === 'rejected' &&
        ro.status === 'rejected' &&
        rs.status === 'rejected' &&
        rc.status === 'rejected'
      ) {
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

  const openSubscribeFlow = (row) => {
    if (isPersonUnit(row.unit)) {
      setSubscribeModal({ row, headCount: '1', fieldError: '' });
      return;
    }
    submitSubscribe(row, null);
  };

  const closeSubscribeModal = () => setSubscribeModal(null);

  const validateHeadCount = (raw, max) => {
    const n = Number(String(raw).trim());
    if (!Number.isInteger(n) || n < 1) {
      return { ok: false, error: 'Nhập số nguyên từ 1 trở lên.' };
    }
    if (n > max) {
      return { ok: false, error: `Tối đa ${max} người theo sức chứa phòng.` };
    }
    return { ok: true, value: n };
  };

  const confirmSubscribeModal = () => {
    if (!subscribeModal) return;
    const { row, headCount } = subscribeModal;
    const check = validateHeadCount(headCount, roomMaxTenants);
    if (!check.ok) {
      setSubscribeModal((m) => (m ? { ...m, fieldError: check.error } : m));
      return;
    }
    submitSubscribe(row, check.value);
  };

  const submitSubscribe = async (row, headCount) => {
    if (!token) return;
    const sid = Number(row.service_id);
    setBusyKey(`svc-${sid}`);
    try {
      const body = { service_id: sid };
      if (headCount != null) body.head_count = headCount;
      const res = await apiFetch('/tenant/service-subscriptions', { token, method: 'POST', body });
      closeSubscribeModal();
      addToast(res?.message || 'Đã đăng ký. Phí đã cộng vào hóa đơn.', 'success');
      await load();
    } catch (e) {
      addToast(e?.message || 'Không đăng ký được.', 'error');
    } finally {
      setBusyKey(null);
    }
  };

  const openCancelServiceModal = (id, currentStatus, serviceName) => {
    setCancelModal({
      id: Number(id),
      status: String(currentStatus || '').toUpperCase(),
      serviceName: serviceName || 'Dịch vụ',
    });
  };

  const cancelModalCopy = () => {
    if (!cancelModal) return null;
    const st = cancelModal.status;
    if (st === 'ACTIVE') {
      return {
        title: 'Yêu cầu ngưng dùng',
        description: `Bạn muốn ngưng "${cancelModal.serviceName}"? Chủ trọ duyệt xong mới ngừng tính phí trên hóa đơn.`,
        confirmText: 'Gửi yêu cầu ngưng',
        variant: 'warning',
      };
    }
    if (st === 'PENDING_CANCEL') {
      return {
        title: 'Thu hồi yêu cầu ngưng',
        description: `Hủy yêu cầu ngưng "${cancelModal.serviceName}" và tiếp tục sử dụng dịch vụ.`,
        confirmText: 'Thu hồi',
        variant: 'default',
      };
    }
    return {
      title: 'Thu hồi đăng ký',
      description: `Hủy yêu cầu đăng ký "${cancelModal.serviceName}" đang chờ duyệt.`,
      confirmText: 'Thu hồi',
      variant: 'default',
    };
  };

  const confirmCancelServiceSub = async () => {
    if (!cancelModal || !token) return;
    const { id, status: st } = cancelModal;
    setBusyKey(`svc-del-${id}`);
    try {
      const res = await apiFetch(`/tenant/service-subscriptions/${id}`, { token, method: 'DELETE' });
      const msg =
        res?.message ||
        (st === 'PENDING'
          ? 'Đã thu hồi yêu cầu đăng ký.'
          : st === 'PENDING_CANCEL'
            ? 'Đã thu hồi yêu cầu ngưng.'
            : 'Đã gửi yêu cầu ngưng dùng. Chờ chủ trọ duyệt.');
      addToast(msg, 'success');
      setCancelModal(null);
      await load();
    } catch (e) {
      addToast(e?.message || 'Không thực hiện được.', 'error');
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
            Gửi yêu cầu đăng ký dịch vụ → chủ trọ <strong className="font-semibold text-[#0F3A40]">duyệt</strong> → phí mới vào hóa đơn.
            Điện/nước tính riêng (chỉ số công tơ).
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
                Điện/nước được tính theo bậc thang khi admin xác nhận chỉ số công tơ. Các phí khác dùng để đối chiếu theo
                giá hợp đồng hoặc mức đã duyệt khi bạn đăng ký tiện ích.
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
                {feeRef.map((row) => {
                  const isTiered = String(row.billing_mode || '').toUpperCase() === 'TIERED' && Array.isArray(row.tiers);
                  return (
                    <tr key={row.fee_id} className="border-t border-[#0F3A40]/8 hover:bg-[#DDF5F7]/25">
                      <td className="px-3 py-2.5 font-bold text-[#0F3A40]">{row.fee_name}</td>
                      <td className="px-3 py-2.5 text-[#0F3A40]/70 text-xs hidden sm:table-cell max-w-[220px]">
                        {row.description || '—'}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-[#0F3A40]">
                        {isTiered ? (
                          <div className="space-y-1">
                            <div className="whitespace-nowrap">Theo bậc thang</div>
                            <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] font-medium text-[#0F3A40]/65 max-w-[360px]">
                              {row.tiers.map((tier, idx) => (
                                <span key={`${tier.from}-${tier.to ?? 'up'}-${idx}`} className="whitespace-nowrap">
                                  {tierLabel(row, tier)}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="whitespace-nowrap">{money(row.unit_price)}đ</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[#0F3A40]/75">{row.unit || row.tier_unit || '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-[#0F3A40]/65 hidden md:table-cell">
                        {feeBillingLabel(row)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-3xl bg-white/90 border border-[#14B8A6]/25 shadow-sm p-6 mb-8">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#0F3A40]/60 mb-1">Đăng ký dịch vụ</h2>
        <p className="text-xs text-[#0F3A40]/60 mb-4">
          Gửi yêu cầu → chờ duyệt → phí cộng vào hóa đơn. Dịch vụ <strong>theo đầu người</strong>: nhập số người (≤ {roomMaxTenants} theo phòng).
        </p>
        {loading ? (
          <div className="flex items-center gap-2 text-[#0F3A40]/60 text-sm py-6 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" /> Đang tải…
          </div>
        ) : svcCatalog.length === 0 ? (
          <p className="text-sm text-[#0F3A40]/60 py-2">Chưa có dịch vụ nào mở đăng ký.</p>
        ) : (
          <ul className="space-y-3">
            {svcCatalog.map((row) => {
              const sid = Number(row.service_id);
              const active = openSlotByServiceId.get(sid);
              const isBusy = busyKey === `svc-${sid}`;
              const unitPrice = Number(row.price || 0);
              return (
                <li
                  key={row.service_id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#14B8A6]/20 bg-[#F2FCFD]/80 px-4 py-3"
                >
                  <div>
                    <p className="font-bold text-[#0F3A40]">{row.name}</p>
                    <p className="text-xs text-[#0F3A40]/60">
                      {serviceUnitLabel(row.unit)} · {money(unitPrice)}đ
                      {isPersonUnit(row.unit) ? ' × số người' : ''}
                    </p>
                  </div>
                  {active ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {(() => {
                        const st = String(active.status || '').toUpperCase();
                        if (st === 'PENDING') {
                          return (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-amber-50 text-amber-800">
                              <Clock className="w-3.5 h-3.5" /> Chờ duyệt đăng ký · {money(active.monthly_price)}đ/tháng
                              {active.head_count ? ` (${active.head_count} người)` : ''}
                            </span>
                          );
                        }
                        if (st === 'PENDING_CANCEL') {
                          return (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-orange-50 text-orange-800">
                              <Clock className="w-3.5 h-3.5" /> Chờ duyệt ngưng · {money(active.monthly_price)}đ/tháng
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-teal-50 text-teal-800">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Đang dùng · {money(active.monthly_price)}đ/tháng
                            {active.head_count ? ` (${active.head_count} người)` : ''}
                          </span>
                        );
                      })()}
                      <button
                        type="button"
                        disabled={busyKey === `svc-del-${active.subscription_id}`}
                        onClick={() =>
                          openCancelServiceModal(active.subscription_id, active.status, row.name)
                        }
                        className="text-xs font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg"
                      >
                        {(() => {
                          const st = String(active.status || '').toUpperCase();
                          if (st === 'PENDING' || st === 'PENDING_CANCEL') return 'Thu hồi';
                          return 'Ngưng';
                        })()}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => openSubscribeFlow(row)}
                      className="px-4 py-2 rounded-full bg-[#14B8A6] text-white text-xs font-bold hover:bg-[#0da090] disabled:opacity-50"
                    >
                      {isBusy ? '…' : 'Đăng ký'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-3xl bg-white/90 border border-[#0F3A40]/10 shadow-sm p-6 mb-8">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#0F3A40]/60 mb-1">Đăng ký tiện ích (chờ duyệt)</h2>
        <p className="text-xs text-[#0F3A40]/60 mb-4">
          Gửi yêu cầu → chủ trọ duyệt → phí vào hóa đơn kỳ tháng được duyệt.
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
        {!loading &&
        feeSubs.length === 0 &&
        svcSubs.filter((s) =>
            ['PENDING', 'PENDING_CANCEL', 'ACTIVE', 'REJECTED'].includes(String(s.status || '').toUpperCase())
          ).length === 0 ? (
          <p className="text-sm text-[#0F3A40]/60">Bạn chưa có đăng ký nào.</p>
        ) : (
          <ul className="space-y-2">
            {svcSubs
              .filter((s) =>
                ['PENDING', 'PENDING_CANCEL', 'ACTIVE', 'REJECTED'].includes(
                  String(s.status || '').toUpperCase()
                )
              )
              .map((s) => {
                const st = String(s.status || '').toUpperCase();
                const canWithdraw = st === 'PENDING' || st === 'ACTIVE' || st === 'PENDING_CANCEL';
                return (
                <li
                  key={`svc-${s.subscription_id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#14B8A6]/15 px-3 py-2 text-sm bg-[#F2FCFD]/50"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-[#0F3A40]">{s.service_name}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusPillClass(s.status)}`}>
                        {statusLabel(s.status)}
                      </span>
                    </div>
                    <span className="block text-[#0F3A40]/60 text-xs">
                      {money(s.monthly_price)}đ/tháng
                      {s.head_count
                        ? ` · ${s.head_count} người × ${money(s.service_unit_price || 0)}đ`
                        : ''}
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
                    disabled={busyKey === `svc-del-${s.subscription_id}`}
                    onClick={() =>
                      openCancelServiceModal(s.subscription_id, s.status, s.service_name)
                    }
                    className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg"
                  >
                    <XCircle className="w-3.5 h-3.5" />{' '}
                    {st === 'PENDING' || st === 'PENDING_CANCEL' ? 'Thu hồi' : 'Ngưng'}
                  </button>
                  ) : null}
                </li>
              );
              })}
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

      {subscribeModal ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#0F3A40]/45 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="subscribe-svc-title"
          onClick={closeSubscribeModal}
        >
          <div
            className="bg-white rounded-[32px] shadow-2xl max-w-md w-full border border-white p-8 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-[#F2FCFD] text-[#14B8A6] flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 id="subscribe-svc-title" className="text-lg font-bold text-[#0F3A40] leading-tight">
                    Đăng ký dịch vụ
                  </h3>
                  <p className="text-sm font-bold text-[#14B8A6] truncate">{subscribeModal.row.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeSubscribeModal}
                className="p-2 rounded-xl hover:bg-[#F2FCFD] text-[#4A787C] shrink-0"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[14px] text-[#4A787C] leading-relaxed mb-5">
              Dịch vụ tính theo <strong className="text-[#0F3A40]">số người sử dụng</strong>. Phòng bạn tối đa{' '}
              <strong className="text-[#0F3A40]">{roomMaxTenants} người</strong> — sau khi chủ trọ duyệt, phí mới vào hóa đơn.
            </p>

            <label className="block mb-2 text-[10px] font-bold uppercase tracking-widest text-[#82ABB0] pl-1">
              Số người sử dụng
            </label>
            <div className="flex items-center gap-3 mb-1">
              <button
                type="button"
                disabled={Number(subscribeModal.headCount) <= 1}
                onClick={() =>
                  setSubscribeModal((m) =>
                    m
                      ? {
                          ...m,
                          headCount: String(Math.max(1, Number(m.headCount || 1) - 1)),
                          fieldError: '',
                        }
                      : m
                  )
                }
                className="w-11 h-11 rounded-2xl border border-[#BCE1E5]/60 text-[#0F3A40] font-bold text-lg hover:bg-[#F2FCFD] disabled:opacity-40"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={roomMaxTenants}
                value={subscribeModal.headCount}
                onChange={(e) =>
                  setSubscribeModal((m) =>
                    m ? { ...m, headCount: e.target.value, fieldError: '' } : m
                  )
                }
                className="flex-1 text-center text-2xl font-bold text-[#0F3A40] bg-[#DDF5F7]/50 border-2 border-[#BCE1E5]/40 rounded-2xl py-3 outline-none focus:border-[#14B8A6]/50"
              />
              <button
                type="button"
                disabled={Number(subscribeModal.headCount) >= roomMaxTenants}
                onClick={() =>
                  setSubscribeModal((m) =>
                    m
                      ? {
                          ...m,
                          headCount: String(
                            Math.min(roomMaxTenants, Number(m.headCount || 1) + 1)
                          ),
                          fieldError: '',
                        }
                      : m
                  )
                }
                className="w-11 h-11 rounded-2xl border border-[#BCE1E5]/60 text-[#0F3A40] font-bold text-lg hover:bg-[#F2FCFD] disabled:opacity-40"
              >
                +
              </button>
            </div>
            {subscribeModal.fieldError ? (
              <p className="text-xs font-bold text-red-600 mb-4 pl-1">{subscribeModal.fieldError}</p>
            ) : (
              <p className="text-xs text-[#82ABB0] mb-4 pl-1">Từ 1 đến {roomMaxTenants} người</p>
            )}

            {(() => {
              const unitPrice = Number(subscribeModal.row.price || 0);
              const check = validateHeadCount(subscribeModal.headCount, roomMaxTenants);
              const total = check.ok ? unitPrice * check.value : null;
              return (
                <div className="rounded-2xl bg-[#F2FCFD] border border-[#BCE1E5]/40 px-5 py-4 mb-6">
                  <div className="flex justify-between text-sm text-[#4A787C] mb-1">
                    <span>Đơn giá</span>
                    <span className="font-bold text-[#0F3A40]">{money(unitPrice)}đ / người / tháng</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-[#0F3A40] pt-2 border-t border-[#BCE1E5]/30">
                    <span>Tạm tính / tháng</span>
                    <span className="text-[#14B8A6] text-lg">
                      {total != null ? `${money(total)}đ` : '—'}
                    </span>
                  </div>
                </div>
              );
            })()}

            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button
                type="button"
                onClick={closeSubscribeModal}
                className="flex-1 py-3.5 rounded-2xl border border-[#BCE1E5] text-[#4A787C] font-bold text-[14px] hover:bg-[#F2FCFD]"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={busyKey === `svc-${subscribeModal.row.service_id}`}
                onClick={confirmSubscribeModal}
                className="flex-1 py-3.5 rounded-2xl bg-[#14B8A6] hover:bg-[#0da090] text-white font-bold text-[14px] shadow-lg shadow-[#14B8A6]/20 disabled:opacity-50"
              >
                {busyKey === `svc-${subscribeModal.row.service_id}` ? 'Đang gửi…' : 'Gửi yêu cầu đăng ký'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {(() => {
        const copy = cancelModal ? cancelModalCopy() : null;
        if (!copy) return null;
        const busy = busyKey === `svc-del-${cancelModal.id}`;
        return (
          <AppDialog
            open
            onClose={() => !busy && setCancelModal(null)}
            title={copy.title}
            description={copy.description}
            confirmText={copy.confirmText}
            cancelText="Đóng"
            variant={copy.variant}
            busy={busy}
            onConfirm={confirmCancelServiceSub}
          />
        );
      })()}
    </div>
  );
}
