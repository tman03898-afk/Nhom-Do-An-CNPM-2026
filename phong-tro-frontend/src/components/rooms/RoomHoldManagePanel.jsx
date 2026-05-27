import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, resolveBackendAssetUrl } from '../../lib/api';
import { HOLD_REQUEST_STATUSES, formatHoldUntil } from '../../lib/roomHolds';
import { useToast } from '../../context/ToastContext';
import AppDialog from '../common/AppDialog';
import ContractFromHoldModal from './ContractFromHoldModal';

/**
 * Bảng quản lý yêu cầu giữ chỗ — nhúng trong Quản lý phòng.
 */
export default function RoomHoldManagePanel({ token, onRoomsChanged }) {
  const { addToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [busyId, setBusyId] = useState(null);
  const [contractHoldId, setContractHoldId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const q = filter !== 'ALL' ? `?status=${filter}` : '';
      const data = await apiFetch(`/room-holds/admin${q}`, { token });
      setRequests(data.requests || []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const patchStatus = async (id, request_status) => {
    setBusyId(id);
    try {
      await apiFetch(`/room-holds/admin/${id}`, { token, method: 'PATCH', body: { request_status } });
      await load();
      onRoomsChanged?.();
    } catch (err) {
      addToast(err?.message || 'Cập nhật thất bại', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const holdRoom = async (id, holdDays = 3) => {
    setBusyId(id);
    try {
      await apiFetch(`/room-holds/admin/${id}/hold-room`, {
        token,
        method: 'POST',
        body: { hold_days: holdDays },
      });
      await load();
      onRoomsChanged?.();
    } catch (err) {
      addToast(err?.message || 'Giữ phòng thất bại', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const releaseHold = (id) => {
    setConfirmAction({
      type: 'release',
      id,
      title: 'Hủy giữ chỗ?',
      description: 'Phòng sẽ được mở lại trạng thái trống để khách khác có thể đặt.',
      confirmText: 'Hủy giữ chỗ',
    });
  };

  const verifyDeposit = async (id) => {
    setBusyId(id);
    try {
      await apiFetch(`/room-holds/admin/${id}/verify-deposit`, { token, method: 'POST' });
      await load();
      onRoomsChanged?.();
    } catch (err) {
      addToast(err?.message || 'Xác minh thất bại', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const rejectDeposit = (id) => {
    setConfirmAction({
      type: 'reject-deposit',
      id,
      title: 'Từ chối minh chứng cọc?',
      description: 'Minh chứng sẽ bị từ chối và phòng được mở lại để tiếp tục cho thuê.',
      confirmText: 'Từ chối cọc',
    });
  };

  const closeConfirmAction = () => {
    if (confirmAction && busyId === confirmAction.id) return;
    setConfirmAction(null);
  };

  const confirmHoldAction = async () => {
    if (!confirmAction) return;
    const { id, type } = confirmAction;
    setBusyId(id);
    try {
      if (type === 'release') {
        await apiFetch(`/room-holds/admin/${id}/release-hold`, { token, method: 'POST' });
        addToast('Đã hủy giữ chỗ và mở lại phòng.', 'success');
      } else if (type === 'reject-deposit') {
        await apiFetch(`/room-holds/admin/${id}/reject-deposit`, { token, method: 'POST' });
        addToast('Đã từ chối minh chứng cọc.', 'success');
      }
      setConfirmAction(null);
      await load();
      onRoomsChanged?.();
    } catch (err) {
      addToast(err?.message || 'Thao tác thất bại', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const proofUrl = (url) => {
    return resolveBackendAssetUrl(url);
  };

  const canCreateContract = (row) => {
    const st = String(row.request_status || '').toUpperCase();
    const roomSt = String(row.room_status || '').toUpperCase();
    if (st === 'CANCELLED' || st === 'COMPLETED') return false;
    return roomSt === 'HELD' || st === 'DEPOSITED' || st === 'DEPOSIT_PENDING' || roomSt === 'RENTED';
  };

  return (
    <>
    {contractHoldId ? (
      <ContractFromHoldModal
        holdRequestId={contractHoldId}
        token={token}
        onClose={() => setContractHoldId(null)}
        onSuccess={async () => {
          await load();
          onRoomsChanged?.();
        }}
      />
    ) : null}
    <div className="bg-white/80 rounded-[32px] p-8 shadow-[0_4px_24px_rgba(15,58,64,0.04)] border border-slate-200/60 backdrop-blur-sm mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-nest-text-primary">Khách quan tâm / Giữ chỗ</h2>
          <p className="text-sm text-nest-text-secondary mt-1">
            Guest khóa phòng ngay · giữ 15p hoặc đặt cọc (QR) · admin xác minh
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[{ key: 'ALL', label: 'Tất cả' }, ...HOLD_REQUEST_STATUSES.filter((s) => s.value !== 'COMPLETED')].map(
            (opt) => (
              <button
                key={opt.key || opt.value}
                type="button"
                onClick={() => setFilter(opt.key || opt.value)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-bold ${
                  filter === (opt.key || opt.value)
                    ? 'bg-nest-primary text-white'
                    : 'bg-slate-100 text-nest-text-secondary'
                }`}
              >
                {opt.label}
              </button>
            )
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[720px]">
          <thead>
            <tr className="border-b border-[#BCE1E5]/40 text-[10px] font-bold text-[#82ABB0] uppercase tracking-widest">
              <th className="pb-4 px-2">Khách</th>
              <th className="pb-4 px-2">Phòng</th>
              <th className="pb-4 px-2">SĐT</th>
              <th className="pb-4 px-2">Ngày xem</th>
              <th className="pb-4 px-2">Trạng thái</th>
              <th className="pb-4 px-2">Loại / Hạn</th>
              <th className="pb-4 px-2 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-[#82ABB0]">
                  Đang tải...
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-[#82ABB0]">
                  Chưa có yêu cầu giữ chỗ
                </td>
              </tr>
            ) : (
              requests.map((row) => {
                const busy = busyId === row.hold_request_id;
                const roomHeld = row.room_status === 'HELD';
                return (
                  <tr key={row.hold_request_id} className="border-b border-[#BCE1E5]/30 last:border-0">
                    <td className="py-4 px-2 font-bold text-[#0F3A40]">{row.guest_name}</td>
                    <td className="py-4 px-2">
                      <Link to={`/rooms/${row.room_id}`} className="text-[#14B8A6] font-bold hover:underline">
                        {row.room_number}
                      </Link>
                      {roomHeld ? (
                        <span className="ml-2 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          Đang giữ
                        </span>
                      ) : null}
                    </td>
                    <td className="py-4 px-2 text-sm">
                      {row.guest_phone ? <div>{row.guest_phone}</div> : null}
                      {row.guest_email ? (
                        <div className="text-[11px] text-[#4A787C] break-all">{row.guest_email}</div>
                      ) : null}
                      {!row.guest_phone && !row.guest_email ? '—' : null}
                    </td>
                    <td className="py-4 px-2 text-sm">
                      {row.preferred_view_date
                        ? new Date(row.preferred_view_date).toLocaleDateString('vi-VN')
                        : '—'}
                    </td>
                    <td className="py-4 px-2">
                      <select
                        value={row.request_status}
                        disabled={busy}
                        onChange={(e) => patchStatus(row.hold_request_id, e.target.value)}
                        className="text-[12px] font-bold rounded-lg border border-slate-200 px-2 py-1.5"
                      >
                        {HOLD_REQUEST_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-4 px-2 text-sm font-medium">
                      <span className="block text-[11px] font-bold text-[#4A787C]">
                        {row.hold_kind_label || (row.hold_kind === 'DEPOSIT' ? 'Đặt cọc' : '15 phút')}
                      </span>
                      {row.hold_kind === 'TEMP' || !row.hold_kind
                        ? formatHoldUntil(row.hold_until || row.room_hold_until) || '—'
                        : row.deposit_submitted_at
                          ? 'Đến khi admin mở'
                          : 'Chờ bill cọc'}
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {row.request_status === 'DEPOSIT_PENDING' ? (
                          <>
                            {row.deposit_proof_url ? (
                              <a
                                href={proofUrl(row.deposit_proof_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-bold"
                              >
                                Xem bill
                              </a>
                            ) : null}
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => verifyDeposit(row.hold_request_id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold"
                            >
                              Duyệt cọc
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => rejectDeposit(row.hold_request_id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 text-[11px] font-bold"
                            >
                              Từ chối
                            </button>
                          </>
                        ) : null}
                        {!roomHeld && row.room_status === 'AVAILABLE' ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => holdRoom(row.hold_request_id, 3)}
                            className="px-2.5 py-1 rounded-lg bg-[#14B8A6] text-white text-[11px] font-bold"
                          >
                            Giữ phòng (3 ngày)
                          </button>
                        ) : null}
                        {roomHeld ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => releaseHold(row.hold_request_id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold"
                          >
                            Hủy giữ chỗ
                          </button>
                        ) : null}
                        {canCreateContract(row) ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setContractHoldId(row.hold_request_id)}
                            className="px-2.5 py-1 rounded-lg bg-[#0F3A40] text-white text-[11px] font-bold"
                          >
                            Tạo HĐ
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
    <AppDialog
      open={!!confirmAction}
      onClose={closeConfirmAction}
      title={confirmAction?.title || ''}
      description={confirmAction?.description || ''}
      confirmText={confirmAction?.confirmText || 'Xác nhận'}
      cancelText="Giữ lại"
      variant="danger"
      busy={!!confirmAction && busyId === confirmAction.id}
      onConfirm={confirmHoldAction}
    />
    </>
  );
}
