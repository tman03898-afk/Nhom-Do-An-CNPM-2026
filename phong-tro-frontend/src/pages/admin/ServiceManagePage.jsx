import { useEffect, useState, useCallback } from 'react';
import {
  Zap, Droplet, Wifi, Trash2, Save, Plus, X,
  Settings2, User, Box, Info, UserCheck, XCircle, RefreshCw
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import AppDialog from '../../components/common/AppDialog';

export default function ServiceManagePage() {
  const { addToast } = useToast();
  const { token } = useAuth();

  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingFeeSubs, setPendingFeeSubs] = useState([]);
  const [pendingSvcSubs, setPendingSvcSubs] = useState([]);
  const [pendingSvcCancels, setPendingSvcCancels] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [busyFeeId, setBusyFeeId] = useState(null);
  const [busySvcId, setBusySvcId] = useState(null);
  /** @type {null | { kind: string, id: number, reason: string }} */
  const [rejectModal, setRejectModal] = useState(null);
  const [deleteSvcId, setDeleteSvcId] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [newSvc, setNewSvc] = useState({ title: '', desc: '', value: '', method: 'fixed' });
  const [dirtyIds, setDirtyIds] = useState(() => new Set());

  const getIcon = (name) => {
    switch (name) {
      case 'Zap': return <Zap className="w-6 h-6" fill="currentColor" />;
      case 'Droplet': return <Droplet className="w-6 h-6" fill="currentColor" />;
      case 'Wifi': return <Wifi className="w-6 h-6" />;
      case 'Trash2': return <Trash2 className="w-6 h-6" fill="currentColor" />;
      default: return <Settings2 className="w-6 h-6" />;
    }
  };

  const isMeterUnit = (unit) => {
    const u = String(unit || '').trim().toLowerCase().replace(/³/g, '3');
    return u === 'kwh' || u === 'm3';
  };

  const toUiMethod = (unit) => {
    if (unit === 'person') return 'person';
    return 'fixed';
  };

  const fromUi = (svc) => {
    const method = svc.method;
    let unit = 'month';
    if (method === 'person') unit = 'person';
    if (method === 'fixed') unit = 'month';
    return {
      name: svc.title,
      unit,
      price: Number(svc.value || 0),
      is_active: true,
    };
  };

  const refresh = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await apiFetch('/admin/services', { token });
      const mapped = (data.services || [])
        .filter((s) => !isMeterUnit(s.unit))
        .map((s) => ({
          id: String(s.service_id),
          service_id: s.service_id,
          title: s.name,
          desc: s.unit === 'person' ? 'Tính theo số người đăng ký' : 'Phí cố định mỗi tháng',
          icon: 'Settings2',
          method: toUiMethod(s.unit),
          value: String(s.price ?? ''),
        }));
      setServices(mapped);
      setDirtyIds(new Set());
    } catch {
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadPendingApprovals = useCallback(async () => {
    if (!token) return;
    setPendingLoading(true);
    try {
      const [fee, svc] = await Promise.allSettled([
        apiFetch('/admin/fee-subscriptions/pending', { token }),
        apiFetch('/admin/service-subscriptions/pending', { token }),
      ]);
      setPendingFeeSubs(fee.status === 'fulfilled' ? fee.value?.pending || [] : []);
      setPendingSvcSubs(svc.status === 'fulfilled' ? svc.value?.pending || [] : []);
      setPendingSvcCancels(svc.status === 'fulfilled' ? svc.value?.pending_cancellations || [] : []);
    } catch {
      setPendingFeeSubs([]);
      setPendingSvcSubs([]);
      setPendingSvcCancels([]);
    } finally {
      setPendingLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadPendingApprovals();
  }, [loadPendingApprovals]);

  const approveFeeSub = async (id) => {
    if (!token) return;
    setBusyFeeId(id);
    try {
      await apiFetch(`/admin/fee-subscriptions/${id}/approve`, { token, method: 'POST', body: {} });
      addToast('Đã duyệt tiện ích. Phí cộng vào hóa đơn kỳ đang mở.', 'success');
      await loadPendingApprovals();
    } catch (e) {
      addToast(e?.message || 'Không duyệt được.', 'error');
    } finally {
      setBusyFeeId(null);
    }
  };

  const openRejectFee = (id) => {
    setRejectModal({ kind: 'fee', id, reason: '' });
  };

  const runRejectModal = async () => {
    if (!token || !rejectModal) return;
    const { kind, id, reason } = rejectModal;
    const body = { reason: reason.trim() || undefined };

    if (kind === 'fee') {
      setBusyFeeId(id);
      try {
        await apiFetch(`/admin/fee-subscriptions/${id}/reject`, { token, method: 'POST', body });
        addToast('Đã từ chối yêu cầu tiện ích.', 'success');
        setRejectModal(null);
        await loadPendingApprovals();
      } catch (e) {
        addToast(e?.message || 'Không từ chối được.', 'error');
      } finally {
        setBusyFeeId(null);
      }
      return;
    }

    setBusySvcId(id);
    try {
      if (kind === 'svc-reg') {
        await apiFetch(`/admin/service-subscriptions/${id}/reject`, { token, method: 'POST', body });
        addToast('Đã từ chối yêu cầu đăng ký.', 'success');
      } else if (kind === 'svc-cancel') {
        await apiFetch(`/admin/service-subscriptions/${id}/reject-cancel`, { token, method: 'POST', body });
        addToast('Đã từ chối yêu cầu ngưng — tenant tiếp tục dùng dịch vụ.', 'success');
      }
      setRejectModal(null);
      await loadPendingApprovals();
    } catch (e) {
      addToast(e?.message || 'Không từ chối được.', 'error');
    } finally {
      setBusySvcId(null);
    }
  };

  const approveSvcSub = async (id) => {
    if (!token) return;
    setBusySvcId(id);
    try {
      await apiFetch(`/admin/service-subscriptions/${id}/approve`, { token, method: 'POST', body: {} });
      addToast('Đã duyệt dịch vụ. Phí cộng vào hóa đơn kỳ đang mở.', 'success');
      await loadPendingApprovals();
    } catch (e) {
      addToast(e?.message || 'Không duyệt được.', 'error');
    } finally {
      setBusySvcId(null);
    }
  };

  const openRejectSvcReg = (id) => {
    setRejectModal({ kind: 'svc-reg', id, reason: '' });
  };

  const approveSvcCancel = async (id) => {
    if (!token) return;
    setBusySvcId(id);
    try {
      await apiFetch(`/admin/service-subscriptions/${id}/approve-cancel`, { token, method: 'POST', body: {} });
      addToast('Đã duyệt ngưng dùng. Phí đã trừ khỏi hóa đơn kỳ đang mở.', 'success');
      await loadPendingApprovals();
    } catch (e) {
      addToast(e?.message || 'Không duyệt được.', 'error');
    } finally {
      setBusySvcId(null);
    }
  };

  const openRejectSvcCancel = (id) => {
    setRejectModal({ kind: 'svc-cancel', id, reason: '' });
  };

  const rejectModalMeta = () => {
    if (!rejectModal) return null;
    if (rejectModal.kind === 'fee') {
      return { title: 'Từ chối đăng ký tiện ích', hint: 'Tenant sẽ thấy lý do (nếu có).' };
    }
    if (rejectModal.kind === 'svc-reg') {
      return { title: 'Từ chối đăng ký dịch vụ', hint: 'Tenant có thể gửi lại yêu cầu sau.' };
    }
    return { title: 'Giữ tiếp dịch vụ', hint: 'Từ chối yêu cầu ngưng — tenant tiếp tục bị tính phí.' };
  };

  const getUnitLabel = (method) => {
    switch (method) {
      case 'person': return 'VNĐ / Người / tháng';
      case 'fixed': return 'VNĐ / Tháng';
      default: return 'VNĐ';
    }
  };

  const handleDelete = (id) => {
    setDeleteSvcId(id);
  };

  const confirmDeleteSvc = async () => {
    if (!token || !deleteSvcId) return;
    const svc = services.find((s) => s.id === deleteSvcId);
    const serviceId = Number(svc?.service_id || deleteSvcId);
    if (!Number.isInteger(serviceId) || serviceId <= 0) return;

    setDeleteBusy(true);
    try {
      const data = await apiFetch(`/admin/services/${serviceId}`, { token, method: 'DELETE' });
      setDeleteSvcId(null);
      setDirtyIds((prev) => {
        const next = new Set(prev);
        next.delete(String(serviceId));
        return next;
      });
      addToast(
        data?.deactivated
          ? `Dịch vụ đã được ngưng, ẩn khỏi danh sách và hủy ${Number(data.cancelled_subscriptions || 0)} đăng ký đang mở.`
          : 'Đã xóa dịch vụ khỏi hệ thống.',
        'success'
      );
      await refresh();
    } catch (e) {
      addToast(e?.message || 'Không thể xóa dịch vụ.', 'error');
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleAdd = () => {
    if (!newSvc.title || !newSvc.value) {
      addToast('Vui lòng điền tên và đơn giá dịch vụ!', 'error');
      return;
    }
    const run = async () => {
      if (!token) return;
      await apiFetch('/admin/services', { token, method: 'POST', body: fromUi(newSvc) });
      setNewSvc({ title: '', desc: '', value: '', method: 'fixed' });
      setIsAdding(false);
      addToast('Đã thêm dịch vụ mới!');
      await refresh();
    };
    run().catch((e) => addToast(e.message || 'Không thể thêm dịch vụ', 'error'));
  };

  const handleUpdate = (id, field, val) => {
    setServices(services.map(s => s.id === id ? { ...s, [field]: val } : s));
    setDirtyIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleSaveAll = () => {
    const run = async () => {
      if (!token) return;
      const dirty = Array.from(dirtyIds);
      for (const id of dirty) {
        const svc = services.find((s) => s.id === id);
        if (!svc?.service_id) continue;
        const payload = fromUi(svc);
        await apiFetch(`/admin/services/${svc.service_id}`, { token, method: 'PUT', body: payload });
      }
      addToast('Đã lưu toàn bộ thay đổi hệ thống!');
      await refresh();
    };
    run().catch((e) => addToast(e.message || 'Không thể lưu thay đổi', 'error'));
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto mt-2 px-4 pb-32 relative flex flex-col min-h-[85vh]">
      <div className="relative z-10 flex-1 flex flex-col">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-[600px]">
            <h1 className="text-[36px] font-sans font-bold text-[#0F3A40] tracking-tight leading-none mb-4">
              Quản lý dịch vụ
            </h1>
            <p className="text-[15px] font-medium text-[#4A787C] leading-relaxed">
              Tùy chỉnh danh mục dịch vụ và cấu hình cách tính phí cho toàn bộ tòa nhà.
            </p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="bg-[#0F3A40] hover:bg-[#1F545B] text-white px-6 py-3.5 rounded-2xl text-[14px] font-bold transition-all shadow-xl shadow-[#0F3A40]/10 flex items-center gap-2 h-fit"
          >
            <Plus className="w-5 h-5" /> Thêm dịch vụ
          </button>
        </div>

        {/* Duyệt đăng ký dịch vụ (tenant → services) */}
        <div className="mb-8 rounded-[32px] border border-[#14B8A6]/25 bg-white p-6 shadow-[0_4px_24px_rgba(15,58,64,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#F2FCFD] text-[#14B8A6] flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#0F3A40]">Duyệt đăng ký dịch vụ</h2>
                <p className="text-xs text-[#4A787C] font-medium">
                  Tenant đăng ký từ trang Dịch vụ. Sau khi duyệt, phí cộng vào <span className="font-bold">hóa đơn kỳ đang mở</span>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => loadPendingApprovals()}
              disabled={pendingLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#BCE1E5] text-[13px] font-bold text-[#0F3A40] hover:bg-[#F2FCFD] disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${pendingLoading ? 'animate-spin' : ''}`} /> Làm mới
            </button>
          </div>
          {pendingLoading && pendingSvcSubs.length === 0 ? (
            <p className="text-sm text-[#4A787C] py-4">Đang tải…</p>
          ) : pendingSvcSubs.length === 0 ? (
            <p className="text-sm text-[#4A787C] py-2">Không có yêu cầu dịch vụ chờ duyệt.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#BCE1E5]/40">
              <table className="w-full text-left text-sm min-w-[720px]">
                <thead>
                  <tr className="bg-[#F2FCFD] text-[10px] font-bold uppercase tracking-wider text-[#82ABB0]">
                    <th className="px-3 py-2.5">Phòng</th>
                    <th className="px-3 py-2.5">Tenant</th>
                    <th className="px-3 py-2.5">Dịch vụ</th>
                    <th className="px-3 py-2.5">Số người</th>
                    <th className="px-3 py-2.5 whitespace-nowrap">Phí/tháng</th>
                    <th className="px-3 py-2.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingSvcSubs.map((row) => {
                    const busy = busySvcId === row.subscription_id;
                    return (
                      <tr key={row.subscription_id} className="border-t border-[#BCE1E5]/30">
                        <td className="px-3 py-2.5 font-bold text-[#0F3A40]">{row.room_number || '—'}</td>
                        <td className="px-3 py-2.5 text-[#4A787C]">
                          <div className="font-medium text-[#0F3A40]">{row.tenant_name || '—'}</div>
                          <div className="text-xs">{row.tenant_email || ''}</div>
                        </td>
                        <td className="px-3 py-2.5 text-[#0F3A40]">{row.service_name}</td>
                        <td className="px-3 py-2.5 text-[#4A787C]">
                          {row.head_count != null ? row.head_count : '—'}
                        </td>
                        <td className="px-3 py-2.5 font-semibold whitespace-nowrap">
                          {Number(row.monthly_price || 0).toLocaleString('vi-VN')}đ
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => approveSvcSub(row.subscription_id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#14B8A6] text-white text-xs font-bold mr-2 hover:bg-[#0da090] disabled:opacity-50"
                          >
                            Duyệt
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => openRejectSvcReg(row.subscription_id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Từ chối
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Duyệt yêu cầu ngưng dịch vụ */}
        <div className="mb-8 rounded-[32px] border border-orange-200/80 bg-white p-6 shadow-[0_4px_24px_rgba(15,58,64,0.04)]">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-[#0F3A40]">Duyệt yêu cầu ngưng dùng</h2>
            <p className="text-xs text-[#4A787C] font-medium mt-1">
              Tenant gửi &quot;Ngưng&quot; khi đang dùng. Sau khi duyệt, phí được trừ khỏi hóa đơn kỳ đang mở.
            </p>
          </div>
          {pendingLoading && pendingSvcCancels.length === 0 ? (
            <p className="text-sm text-[#4A787C] py-4">Đang tải…</p>
          ) : pendingSvcCancels.length === 0 ? (
            <p className="text-sm text-[#4A787C] py-2">Không có yêu cầu ngưng chờ duyệt.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-orange-100">
              <table className="w-full text-left text-sm min-w-[720px]">
                <thead>
                  <tr className="bg-orange-50/80 text-[10px] font-bold uppercase tracking-wider text-[#82ABB0]">
                    <th className="px-3 py-2.5">Phòng</th>
                    <th className="px-3 py-2.5">Tenant</th>
                    <th className="px-3 py-2.5">Dịch vụ</th>
                    <th className="px-3 py-2.5">Số người</th>
                    <th className="px-3 py-2.5 whitespace-nowrap">Phí/tháng</th>
                    <th className="px-3 py-2.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingSvcCancels.map((row) => {
                    const busy = busySvcId === row.subscription_id;
                    return (
                      <tr key={`cancel-${row.subscription_id}`} className="border-t border-orange-100/80">
                        <td className="px-3 py-2.5 font-bold text-[#0F3A40]">{row.room_number || '—'}</td>
                        <td className="px-3 py-2.5 text-[#4A787C]">
                          <div className="font-medium text-[#0F3A40]">{row.tenant_name || '—'}</div>
                          <div className="text-xs">{row.tenant_email || ''}</div>
                        </td>
                        <td className="px-3 py-2.5 text-[#0F3A40]">{row.service_name}</td>
                        <td className="px-3 py-2.5 text-[#4A787C]">
                          {row.head_count != null ? row.head_count : '—'}
                        </td>
                        <td className="px-3 py-2.5 font-semibold whitespace-nowrap">
                          {Number(row.monthly_price || 0).toLocaleString('vi-VN')}đ
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => approveSvcCancel(row.subscription_id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#14B8A6] text-white text-xs font-bold mr-2 hover:bg-[#0da090] disabled:opacity-50"
                          >
                            Duyệt ngưng
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => openRejectSvcCancel(row.subscription_id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Giữ tiếp
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Duyệt đăng ký tiện ích (tenant → service_fees) */}
        <div className="mb-10 rounded-[32px] border border-[#BCE1E5]/60 bg-white p-6 shadow-[0_4px_24px_rgba(15,58,64,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#F2FCFD] text-[#14B8A6] flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#0F3A40]">Duyệt đăng ký tiện ích</h2>
                <p className="text-xs text-[#4A787C] font-medium">
                  Tenant gửi từ trang dịch vụ (bảng tiện ích cũ). Sau khi duyệt, phí cộng vào hóa đơn kỳ đang mở.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => loadPendingApprovals()}
              disabled={pendingLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#BCE1E5] text-[13px] font-bold text-[#0F3A40] hover:bg-[#F2FCFD] disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${pendingLoading ? 'animate-spin' : ''}`} /> Làm mới
            </button>
          </div>
          {pendingLoading && pendingFeeSubs.length === 0 ? (
            <p className="text-sm text-[#4A787C] py-4">Đang tải…</p>
          ) : pendingFeeSubs.length === 0 ? (
            <p className="text-sm text-[#4A787C] py-2">Không có yêu cầu tiện ích chờ duyệt.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#BCE1E5]/40">
              <table className="w-full text-left text-sm min-w-[640px]">
                <thead>
                  <tr className="bg-[#F2FCFD] text-[10px] font-bold uppercase tracking-wider text-[#82ABB0]">
                    <th className="px-3 py-2.5">Phòng</th>
                    <th className="px-3 py-2.5">Tenant</th>
                    <th className="px-3 py-2.5">Tiện ích</th>
                    <th className="px-3 py-2.5 whitespace-nowrap">Phí/tháng</th>
                    <th className="px-3 py-2.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingFeeSubs.map((row) => {
                    const busy = busyFeeId === row.id;
                    return (
                      <tr key={row.id} className="border-t border-[#BCE1E5]/30">
                        <td className="px-3 py-2.5 font-bold text-[#0F3A40]">{row.room_number || '—'}</td>
                        <td className="px-3 py-2.5 text-[#4A787C]">
                          <div className="font-medium text-[#0F3A40]">{row.tenant_name || '—'}</div>
                          <div className="text-xs">{row.tenant_email || ''}</div>
                        </td>
                        <td className="px-3 py-2.5 text-[#0F3A40]">{row.fee_name}</td>
                        <td className="px-3 py-2.5 font-semibold whitespace-nowrap">
                          {Number(row.monthly_price || 0).toLocaleString('vi-VN')}đ
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => approveFeeSub(row.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#14B8A6] text-white text-xs font-bold mr-2 hover:bg-[#0da090] disabled:opacity-50"
                          >
                            Duyệt
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => openRejectFee(row.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Từ chối
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Adding New Service Form (Inline Card) */}
        {isAdding && (
          <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-[#14B8A6] rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none"></div>
              <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-1 space-y-6 w-full">
                  <div className="flex items-center gap-3 text-white">
                    <Plus className="bg-white/20 p-1.5 rounded-lg w-8 h-8" />
                    <h3 className="text-xl font-bold">Thêm dịch vụ phát sinh mới</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Tên dịch vụ (VD: Phí giữ xe...)"
                      value={newSvc.title}
                      onChange={(e) => setNewSvc({ ...newSvc, title: e.target.value })}
                      className="bg-white/10 border border-white/20 rounded-2xl px-6 py-3.5 text-white placeholder:text-white/60 focus:bg-white/20 outline-none transition-all"
                    />
                    <input
                      type="text"
                      placeholder="Mô tả ngắn"
                      value={newSvc.desc}
                      onChange={(e) => setNewSvc({ ...newSvc, desc: e.target.value })}
                      className="bg-white/10 border border-white/20 rounded-2xl px-6 py-3.5 text-white placeholder:text-white/60 focus:bg-white/20 outline-none transition-all"
                    />
                    <input
                      type="number"
                      placeholder="Đơn giá"
                      value={newSvc.value}
                      onChange={(e) => setNewSvc({ ...newSvc, value: e.target.value })}
                      className="bg-white/10 border border-white/20 rounded-2xl px-6 py-3.5 text-white placeholder:text-white/60 focus:bg-white/20 outline-none transition-all"
                    />
                    <div className="relative">
                      <select 
                         value={newSvc.method}
                         onChange={(e) => setNewSvc({...newSvc, method: e.target.value})}
                         className="w-full bg-white/10 border border-white/20 rounded-2xl px-6 pr-12 py-3.5 text-white focus:bg-white/20 outline-none transition-all cursor-pointer appearance-none"
                      >
                         <option value="fixed" className="text-[#0F3A40]">Cố định / Trọn gói</option>
                         <option value="person" className="text-[#0F3A40]">Theo đầu người</option>
                      </select>
                      <Settings2 className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button onClick={() => setIsAdding(false)} className="px-6 py-3.5 rounded-2xl text-white font-bold bg-white/10 hover:bg-white/20 transition-all">Hủy</button>
                  <button onClick={handleAdd} className="px-8 py-3.5 rounded-2xl bg-white text-[#14B8A6] font-bold shadow-lg hover:bg-[#F2FCFD] transition-all">Hoàn tất</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {isLoading ? (
            <div className="col-span-full text-center text-[#4A787C] font-medium py-10">Đang tải dịch vụ...</div>
          ) : services.length === 0 ? (
            <div className="col-span-full text-center text-[#4A787C] font-medium py-10">Chưa có dịch vụ nào.</div>
          ) : services.map((svc) => (
            <div key={svc.id} className="bg-white rounded-[40px] p-8 shadow-[0_4px_25px_rgba(15,58,64,0.06)] border border-[#BCE1E5]/20 hover:border-[#14B8A6]/40 transition-all group relative overflow-hidden">
              <button
                onClick={() => handleDelete(svc.id)}
                className="absolute top-6 right-6 p-2 text-[#82ABB0] hover:text-[#D14D4D] hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-5 mb-10">
                <div className="w-[60px] h-[60px] rounded-[20px] bg-[#F2FCFD] text-[#14B8A6] flex items-center justify-center shadow-inner group-hover:bg-[#14B8A6] group-hover:text-white transition-all duration-500">
                  {getIcon(svc.icon)}
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={svc.title}
                    onChange={(e) => handleUpdate(svc.id, 'title', e.target.value)}
                    className="text-[20px] font-bold text-[#0F3A40] mb-0.5 bg-transparent border-b border-transparent hover:border-[#14B8A6]/30 focus:border-[#14B8A6] outline-none w-full"
                  />
                  <input
                    type="text"
                    value={svc.desc}
                    onChange={(e) => handleUpdate(svc.id, 'desc', e.target.value)}
                    className="text-[12px] font-medium text-[#82ABB0] bg-transparent border-b border-transparent hover:border-[#14B8A6]/30 focus:border-[#14B8A6] outline-none w-full"
                  />
                </div>
              </div>

              {/* Calculation Method Select */}
              <div className="mb-8">
                <label className="text-[10px] font-bold text-[#82ABB0] uppercase tracking-widest mb-2 block pl-1">Cách tính phí</label>
                <div className="relative">
                    <select 
                       value={svc.method}
                       onChange={(e) => handleUpdate(svc.id, 'method', e.target.value)}
                       className="w-full bg-[#F2FCFD] border border-[#BCE1E5]/40 rounded-2xl px-5 pr-12 py-3.5 text-[14px] font-bold text-[#0F3A40] outline-none appearance-none cursor-pointer focus:border-[#14B8A6]/40"
                    >
                    <option value="person">Theo đầu người (Số khách × Đơn giá)</option>
                    <option value="fixed">Cố định / Trọn gói (mỗi hóa đơn)</option>
                  </select>
                  <Settings2 className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#82ABB0] pointer-events-none" />
                </div>
              </div>

              <div className="relative">
                <div className="absolute -top-3 left-6 z-10 bg-white px-3 py-1 rounded-full text-[10px] font-bold text-[#4A787C] tracking-widest uppercase shadow-sm border border-[#BCE1E5]/30 flex items-center gap-2">
                  {svc.method === 'person' ? <User size={10} /> : <Box size={10} />}
                  {getUnitLabel(svc.method)}
                </div>
                <div className="flex items-center bg-[#DDF5F7]/40 rounded-[28px] px-8 py-5 border-2 border-transparent focus-within:border-[#14B8A6]/30 transition-all shadow-inner">
                  <input
                    type="number"
                    value={svc.value}
                    onChange={(e) => handleUpdate(svc.id, 'value', e.target.value)}
                    className="flex-1 bg-transparent font-bold text-[28px] text-[#0F3A40] outline-none"
                  />
                  <span className="text-[#14B8A6] font-bold text-[18px]">VNĐ</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Note / Info */}
        <div className="bg-[#0F3A40]/5 rounded-[32px] p-6 flex items-start gap-4 border border-[#0F3A40]/10 mb-12">
          <div className="p-2 rounded-xl bg-white text-[#0F3A40] shadow-sm">
            <Info size={20} />
          </div>
          <p className="text-[14px] text-[#4A787C] font-medium leading-relaxed">
            **Lưu ý:** Điện/nước tính riêng trên trang <strong>Hóa đơn</strong> (nhập chỉ số công tơ). <br />
            Dịch vụ <strong>theo đầu người</strong>: tenant nhập số người khi đăng ký (≤ sức chứa phòng); phí = đơn giá × số người, cộng thẳng vào hóa đơn đang mở.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-auto pt-8 pb-12 items-center z-10">
          <button
            type="button"
            onClick={() => refresh()}
            disabled={isLoading || dirtyIds.size === 0}
            className="text-[#4A787C] hover:text-[#0F3A40] font-bold px-6 py-3.5 transition-colors text-[14px] disabled:opacity-40"
          >
            Hủy mọi thay đổi
          </button>
          <button
            onClick={handleSaveAll}
            disabled={isLoading || dirtyIds.size === 0}
            className="bg-[#14B8A6] hover:bg-[#0da090] text-white px-10 py-4 rounded-full text-[15px] font-bold transition-all shadow-xl shadow-[#14B8A6]/20 flex items-center gap-3 animate-pulse-slow disabled:opacity-45 disabled:cursor-not-allowed disabled:animate-none"
          >
            <Save className="w-5 h-5" /> ÁP DỤNG HỆ THỐNG
          </button>
        </div>
      </div>

      {rejectModal && rejectModalMeta() ? (
        <AppDialog
          open
          onClose={() => {
            if (!busyFeeId && !busySvcId) setRejectModal(null);
          }}
          title={rejectModalMeta().title}
          description={rejectModalMeta().hint}
          confirmText="Xác nhận từ chối"
          cancelText="Đóng"
          variant="danger"
          busy={busyFeeId === rejectModal.id || busySvcId === rejectModal.id}
          onConfirm={runRejectModal}
        >
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#82ABB0] mb-2">
            Lý do (tùy chọn)
          </label>
          <textarea
            value={rejectModal.reason}
            onChange={(e) =>
              setRejectModal((m) => (m ? { ...m, reason: e.target.value } : m))
            }
            rows={3}
            placeholder="Nhập lý do để tenant đối chiếu…"
            className="w-full rounded-2xl border border-[#BCE1E5]/60 bg-[#F2FCFD] px-4 py-3 text-[14px] text-[#0F3A40] outline-none focus:border-[#14B8A6]/50 resize-none"
          />
        </AppDialog>
      ) : null}

      {deleteSvcId ? (
        <AppDialog
          open
          onClose={() => !deleteBusy && setDeleteSvcId(null)}
          title="Xóa dịch vụ?"
          description="Dịch vụ sẽ bị gỡ khỏi danh sách và tenant không thể đăng ký mới. Nếu đã có lịch sử đăng ký, hệ thống sẽ ngưng dịch vụ thay vì xóa dữ liệu cũ."
          confirmText="Xóa"
          cancelText="Giữ lại"
          variant="danger"
          busy={deleteBusy}
          onConfirm={confirmDeleteSvc}
        />
      ) : null}
    </div>
  );
}
