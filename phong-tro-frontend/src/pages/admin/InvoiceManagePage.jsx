import { useEffect, useMemo, useState } from 'react';
import { Info, Download, Eye, Bell, Plus, DollarSign, ClipboardList, TrendingUp, X, Pencil, Ban, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import InvoiceUtilityDetails from '../../components/invoice/InvoiceUtilityDetails';
import { parseInvoiceElectricityBreakdown } from '../../components/invoice/parseElectricityBreakdown';
import { parseInvoiceWaterBreakdown } from '../../components/invoice/parseWaterBreakdown';

function normStatus(s) {
  return String(s ?? '').trim().toUpperCase();
}

function isPaidStatus(s) {
  return normStatus(s) === 'PAID';
}

function isCancelledStatus(s) {
  return normStatus(s) === 'CANCELLED';
}

/** Chưa thu hoặc chưa đủ — loại trừ đã thanh toán và hủy */
function isOutstandingStatus(s) {
  return !isPaidStatus(s) && !isCancelledStatus(s);
}

function canModifyInvoice(inv) {
  return inv && isOutstandingStatus(inv.status);
}

function toIsoDateInput(value) {
  if (value == null || value === '') return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

/** Một tenant chỉ một hóa đơn / kỳ — sau khi chốt kỳ này, kỳ tạo tiếp theo là tháng sau hóa đơn mới nhất. */
function suggestNextPeriodForTenant(tenantId, invoiceRows) {
  const tid = Number(tenantId);
  const d = new Date();
  const fallback = { month: d.getMonth() + 1, year: d.getFullYear() };
  if (!Number.isInteger(tid) || tid <= 0) return fallback;

  const rows = (invoiceRows || []).filter((i) => Number(i.tenant_id) === tid);
  if (!rows.length) return fallback;

  let maxY = 0;
  let maxM = 0;
  for (const r of rows) {
    const y = Number(r.period_year);
    const m = Number(r.period_month);
    if (!Number.isInteger(y) || y < 2000 || !Number.isInteger(m) || m < 1 || m > 12) continue;
    if (y > maxY || (y === maxY && m > maxM)) {
      maxY = y;
      maxM = m;
    }
  }
  if (!maxY) return fallback;

  let nm = maxM + 1;
  let ny = maxY;
  if (nm > 12) {
    nm = 1;
    ny += 1;
  }
  return { month: nm, year: ny };
}

export default function InvoiceManagePage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  /** all | paid | unpaid — unpaid = còn phải thu (không PAID, không CANCELLED) */
  const [filterPayment, setFilterPayment] = useState('all');
  /** '' = mọi phòng */
  const [filterRoomKey, setFilterRoomKey] = useState('');
  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [electricCurrent, setElectricCurrent] = useState('');
  const [waterCurrent, setWaterCurrent] = useState('');
  const [utilityBaseline, setUtilityBaseline] = useState(null);
  const [utilityBaselineLoading, setUtilityBaselineLoading] = useState(false);
  /** Chỉ gửi API khi admin sửa tay (để xử lý dữ liệu chỉ số cũ lệch). */
  const [overrideElectricPrevious, setOverrideElectricPrevious] = useState('');
  const [overrideWaterPrevious, setOverrideWaterPrevious] = useState('');
  const [viewInvoice, setViewInvoice] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editModalInvoice, setEditModalInvoice] = useState(null);
  const [editForm, setEditForm] = useState({
    rent_amount: '',
    electricity_amount: '',
    water_amount: '',
    other_fees_amount: '',
    due_date: '',
  });
  const [editError, setEditError] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [cancelModalInvoice, setCancelModalInvoice] = useState(null);
  const [cancelError, setCancelError] = useState('');
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    tenant_id: '',
    room_id: '',
    period_month: new Date().getMonth() + 1,
    period_year: new Date().getFullYear(),
    rent_amount: '',
    services_amount: '',
    due_date: new Date().toISOString().slice(0, 10),
    note: '',
  });

  const refresh = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [inv, roomsData, tenantsData] = await Promise.all([
        apiFetch('/admin/invoices', { token }),
        apiFetch('/rooms', { token }),
        apiFetch('/admin/tenants', { token }),
      ]);
      const nextInvoices = inv.invoices || [];
      setInvoices(nextInvoices);
      setCurrentPage(1);
      setRooms(roomsData.rooms || []);
      setTenants(tenantsData.tenants || []);
    } catch (e) {
      console.error('Invoice list refresh:', e);
      addToast(e?.message || 'Không tải lại danh sách hóa đơn.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const rid = Number(createForm.room_id);
    if (!token || !Number.isInteger(rid) || rid <= 0) {
      setUtilityBaseline(null);
      setOverrideElectricPrevious('');
      setOverrideWaterPrevious('');
      return;
    }
    let cancelled = false;
    (async () => {
      setUtilityBaselineLoading(true);
      try {
        const data = await apiFetch(`/admin/utilities/readings/baseline?room_id=${rid}`, { token });
        if (!cancelled) setUtilityBaseline(data);
      } catch {
        if (!cancelled) setUtilityBaseline(null);
      } finally {
        if (!cancelled) setUtilityBaselineLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, createForm.room_id]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((i) => {
      if (filterPayment === 'paid' && !isPaidStatus(i.status)) return false;
      if (filterPayment === 'unpaid' && !isOutstandingStatus(i.status)) return false;
      if (filterRoomKey) {
        const roomLabel = String(i.room_number ?? '').trim();
        if (roomLabel !== filterRoomKey) return false;
      }
      return true;
    });
  }, [invoices, filterPayment, filterRoomKey]);

  /** Chỉ số phân tích luôn theo tập đã lọc (cùng logic với bảng). */
  const stats = useMemo(() => {
    const rows = filteredInvoices;
    const toNum = (v) => Number(v || 0);
    const totalBilled = rows.reduce((sum, i) => sum + toNum(i.total_amount), 0);
    const paidRows = rows.filter((i) => isPaidStatus(i.status));
    const totalCollected = paidRows.reduce((sum, i) => sum + toNum(i.total_amount), 0);
    const outstandingRows = rows.filter((i) => isOutstandingStatus(i.status));
    const totalOutstanding = outstandingRows.reduce((sum, i) => sum + toNum(i.total_amount), 0);
    const unpaidCount = outstandingRows.length;
    const electricSum = rows.reduce((sum, i) => sum + toNum(i.electricity_amount), 0);
    const waterSum = rows.reduce((sum, i) => sum + toNum(i.water_amount), 0);
    return {
      totalBilled,
      totalCollected,
      totalOutstanding,
      unpaidCount,
      paidCount: paidRows.length,
      cancelledCount: rows.filter((i) => isCancelledStatus(i.status)).length,
      rowCount: rows.length,
      electricSum,
      waterSum,
    };
  }, [filteredInvoices]);

  const filterSummary = useMemo(() => {
    const parts = [];
    if (filterPayment === 'paid') parts.push('Đã thanh toán');
    else if (filterPayment === 'unpaid') parts.push('Chưa thanh toán');
    else parts.push('Mọi hóa đơn');
    if (filterRoomKey) parts.push(`Phòng ${filterRoomKey}`);
    return parts.join(' · ');
  }, [filterPayment, filterRoomKey]);

  const clearFilters = () => {
    setFilterPayment('all');
    setFilterRoomKey('');
    setCurrentPage(1);
  };

  const handleExportPdf = async () => {
    if (!filteredInvoices.length) {
      addToast('Không có hóa đơn để xuất.', 'error');
      return;
    }
    try {
      const { exportInvoicesPdf } = await import('../../lib/exportInvoicesPdf');
      exportInvoicesPdf(filteredInvoices, { filterSummary, stats });
      addToast('Đã tải file PDF.', 'success');
    } catch (e) {
      console.error('Export PDF:', e);
      addToast('Không xuất được PDF.', 'error');
    }
  };

  const roomOptions = useMemo(() => {
    const set = new Set();
    invoices.forEach((i) => {
      const r = String(i.room_number ?? '').trim();
      if (r) set.add(r);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  }, [invoices]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterPayment, filterRoomKey]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredInvoices.length / pageSize)), [filteredInvoices.length]);
  const pagedInvoices = useMemo(() => {
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const formatMoney = (v) => Number(v || 0).toLocaleString('vi-VN');

  const formatPaymentDate = (v) => {
    if (v == null || v === '') return '—';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const statusPill = (s) => {
    const v = String(s || '').toUpperCase();
    if (v === 'PAID') return { label: 'PAID', pill: 'bg-[#EBFDFB] text-[#14B8A6]' };
    if (v === 'OVERDUE') return { label: 'OVERDUE', pill: 'bg-[#FFF0F0] text-[#D14D4D]' };
    if (v === 'CANCELLED') return { label: 'CANCELLED', pill: 'bg-slate-100 text-slate-500' };
    return { label: v || 'ISSUED', pill: 'bg-[#FFF3E0] text-[#E68A00]' };
  };

  const handleCreateInvoice = async () => {
    if (!token) return;
    if (!createForm.tenant_id) {
      addToast('Vui lòng chọn tenant.', 'error');
      return;
    }
    const payload = {
      tenant_id: Number(createForm.tenant_id),
      room_id: createForm.room_id ? Number(createForm.room_id) : null,
      period_month: Number(createForm.period_month),
      period_year: Number(createForm.period_year),
      rent_amount: Number(createForm.rent_amount || 0),
      services_amount: Number(createForm.services_amount || 0),
      due_date: createForm.due_date,
      note: createForm.note || null,
      status: 'ISSUED',
    };
    try {
      await apiFetch('/admin/invoices', { token, method: 'POST', body: payload });
      addToast('Đã tạo hóa đơn.', 'success');
      setIsCreateOpen(false);
      setCreateForm((p) => ({ ...p, tenant_id: '', room_id: '', rent_amount: '', services_amount: '', note: '' }));
      await refresh();
    } catch (e) {
      addToast(e?.message || 'Không tạo được hóa đơn.', 'error');
    }
  };

  const editPreviewTotal = useMemo(() => {
    const sum =
      Number(editForm.rent_amount || 0) +
      Number(editForm.electricity_amount || 0) +
      Number(editForm.water_amount || 0) +
      Number(editForm.other_fees_amount || 0);
    return Number.isFinite(sum) ? sum : 0;
  }, [editForm]);

  const invoiceViewUtility = useMemo(() => {
    const vi = viewInvoice;
    if (!vi) return { showMergedUtility: false, utilityEmptyHint: '' };
    const hasTierE = !!parseInvoiceElectricityBreakdown(vi.electricity_breakdown);
    const hasTierW = !!parseInvoiceWaterBreakdown(vi.water_breakdown);
    const hasSnap = vi.utility_meter_snapshot != null && typeof vi.utility_meter_snapshot === 'object';
    const amtE = Number(vi.electricity_amount || 0);
    const amtW = Number(vi.water_amount || 0);
    const showMergedUtility = amtE > 0 || amtW > 0 || hasTierE || hasTierW || hasSnap;
    const utilityEmptyHint =
      !hasTierE && !hasTierW && !hasSnap && (amtE > 0 || amtW > 0)
        ? 'Chưa có chỉ số điện/nước (cũ → mới) và bảng bậc lưu trên hệ thống — hóa đơn này có thể nhập tay hoặc tạo trước khi lưu chỉ số. Dùng mục nhập & “Xác nhận chỉ số” đúng phòng/kỳ để lần sau hiện đầy đủ ngay dưới tổng tiền điện/nước.'
        : '';
    return { showMergedUtility, utilityEmptyHint };
  }, [viewInvoice]);

  const openEditModal = async (inv) => {
    if (!canModifyInvoice(inv)) {
      addToast('Không sửa được hóa đơn đã thanh toán hoặc đã hủy.', 'error');
      return;
    }
    setEditError('');
    setEditModalInvoice(inv);
    setEditForm({
      rent_amount: inv.rent_amount != null ? String(inv.rent_amount) : '0',
      electricity_amount: inv.electricity_amount != null ? String(inv.electricity_amount) : '0',
      water_amount: inv.water_amount != null ? String(inv.water_amount) : '0',
      other_fees_amount: inv.other_fees_amount != null ? String(inv.other_fees_amount) : '0',
      due_date: toIsoDateInput(inv.due_date),
    });
  };

  const closeEditModal = () => {
    if (isEditSubmitting) return;
    setEditModalInvoice(null);
    setEditError('');
  };

  const handleUpdateInvoice = async () => {
    if (!token || !editModalInvoice) return;
    const rent = Number(editForm.rent_amount);
    const elec = Number(editForm.electricity_amount);
    const water = Number(editForm.water_amount);
    const other = Number(editForm.other_fees_amount);
    if ([rent, elec, water, other].some((n) => !Number.isFinite(n) || n < 0)) {
      setEditError('Các khoản thu phải là số không âm.');
      return;
    }
    if (!editForm.due_date) {
      setEditError('Vui lòng chọn hạn thanh toán.');
      return;
    }

    setEditError('');
    setIsEditSubmitting(true);
    try {
      await apiFetch(`/admin/invoices/${editModalInvoice.invoice_id}`, {
        token,
        method: 'PUT',
        body: {
          rent_amount: rent,
          electricity_amount: elec,
          water_amount: water,
          other_fees_amount: other,
          due_date: editForm.due_date,
        },
      });
      addToast('Đã cập nhật hóa đơn. Khách thuê sẽ thấy số liệu mới trên cổng thanh toán.', 'success');
      setEditModalInvoice(null);
      if (isViewOpen && viewInvoice?.invoice_id === editModalInvoice.invoice_id) {
        setIsViewOpen(false);
        setViewInvoice(null);
      }
      await refresh();
    } catch (e) {
      const msg = e?.message || '';
      if (msg.includes('paid invoice')) {
        setEditError('Hóa đơn đã thanh toán, không thể sửa.');
      } else if (msg.includes('cancelled')) {
        setEditError('Hóa đơn đã bị hủy.');
      } else {
        setEditError(msg || 'Không cập nhật được hóa đơn.');
      }
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const openCancelModal = (inv) => {
    if (!canModifyInvoice(inv)) {
      addToast('Không hủy được hóa đơn đã thanh toán hoặc đã hủy.', 'error');
      return;
    }
    setCancelError('');
    setCancelModalInvoice(inv);
  };

  const closeCancelModal = () => {
    if (isCancelSubmitting) return;
    setCancelModalInvoice(null);
    setCancelError('');
  };

  const handleCancelInvoice = async () => {
    if (!token || !cancelModalInvoice) return;
    setCancelError('');
    setIsCancelSubmitting(true);
    try {
      await apiFetch(`/admin/invoices/${cancelModalInvoice.invoice_id}`, {
        token,
        method: 'PUT',
        body: { status: 'CANCELLED' },
      });
      addToast('Đã hủy hóa đơn. Khách thuê sẽ không còn thấy khoản này trong danh sách cần thanh toán.', 'success');
      setCancelModalInvoice(null);
      if (isViewOpen && viewInvoice?.invoice_id === cancelModalInvoice.invoice_id) {
        setIsViewOpen(false);
        setViewInvoice(null);
      }
      await refresh();
    } catch (e) {
      const msg = e?.message || '';
      if (msg.includes('paid invoice')) {
        setCancelError('Hóa đơn đã thanh toán, không thể hủy.');
      } else if (msg.includes('cancelled')) {
        setCancelError('Hóa đơn đã bị hủy trước đó.');
      } else {
        setCancelError(msg || 'Không hủy được hóa đơn.');
      }
    } finally {
      setIsCancelSubmitting(false);
    }
  };

  const handleConfirmUtilities = async () => {
    if (!token) return;
    if (!createForm.room_id) {
      addToast('Vui lòng chọn phòng trước khi xác nhận.', 'error');
      return;
    }

    const roomId = Number(createForm.room_id);
    const ele = Number(electricCurrent);
    const wat = Number(waterCurrent);
    if (!Number.isInteger(roomId) || roomId <= 0) {
      addToast('room_id không hợp lệ.', 'error');
      return;
    }
    if (Number.isNaN(ele) || Number.isNaN(wat)) {
      addToast('Vui lòng nhập số chỉ số điện/nước hợp lệ.', 'error');
      return;
    }

    try {
      const body = {
        room_id: roomId,
        electricity_current: ele,
        water_current: wat,
      };
      const oE = overrideElectricPrevious.trim();
      const oW = overrideWaterPrevious.trim();
      if (oE !== '' && !Number.isNaN(Number(oE))) body.electricity_previous = Number(oE);
      if (oW !== '' && !Number.isNaN(Number(oW))) body.water_previous = Number(oW);

      const result = await apiFetch('/admin/utilities/readings/confirm', {
        token,
        method: 'POST',
        body,
      });

      await refresh();
      setElectricCurrent('');
      setWaterCurrent('');
      setOverrideElectricPrevious('');
      setOverrideWaterPrevious('');
      try {
        const bl = await apiFetch(`/admin/utilities/readings/baseline?room_id=${roomId}`, { token });
        setUtilityBaseline(bl);
      } catch {
        /* ignore */
      }
      const ap = result?.applied;
      if (ap) {
        addToast(
          `Đã cập nhật hóa đơn. Tiêu thụ: điện ${ap.delta_electric_kwh} kWh, nước ${ap.delta_water_m3} m³ → ${Number(ap.amount_electric || 0).toLocaleString('vi-VN')}đ / ${Number(ap.amount_water || 0).toLocaleString('vi-VN')}đ`,
          'success'
        );
      } else {
        addToast('Đã lưu chỉ số và cập nhật hóa đơn.', 'success');
      }
    } catch (e) {
      console.error('Confirm utilities error:', e);
      addToast(e?.message || 'Không thể xác nhận chỉ số.', 'error');
    }
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto mt-2 px-4 pb-20 relative flex flex-col">
      {/* Floating Action Button */}
      <button onClick={() => setIsCreateOpen(true)} className="fixed bottom-10 right-10 w-14 h-14 bg-nest-text-primary text-nest-primary rounded-full shadow-2xl flex items-center justify-center hover:bg-nest-primary hover:text-white transition-all z-50">
         <Plus className="w-6 h-6" />
      </button>

      {/* Page Header */}
      <div className="flex justify-between items-end mb-8 relative z-10">
        <div>
          <h1 className="text-[32px] font-sans font-bold text-nest-text-primary tracking-tight leading-none">Quản lý Hóa đơn</h1>
        </div>
      </div>

      {/* Top Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
         {/* Form Card (Left) */}
         <div className="lg:col-span-5 bg-white rounded-[32px] p-8 shadow-[0_4px_24px_rgba(15,58,64,0.04)] border border-slate-200/60 flex flex-col">
            <div className="flex items-center gap-4 mb-8">
               <div className="w-10 h-10 rounded-[12px] bg-nest-primary flex items-center justify-center">
                  <div className="w-4 h-4 bg-white rounded-sm relative">
                     <div className="absolute top-[3px] right-[3px] w-1.5 h-1.5 bg-nest-primary rounded-full"></div>
                  </div>
               </div>
               <h3 className="text-[20px] font-bold text-nest-text-primary">Nhập chỉ số điện nước</h3>
            </div>

            <div className="mb-6">
               <label className="block text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-2">Chọn phòng</label>
               <select
                  value={createForm.room_id}
                  onChange={(e) => setCreateForm((p) => ({ ...p, room_id: e.target.value }))}
                  className="w-full bg-nest-bg rounded-xl px-4 py-3 text-nest-text-primary font-bold text-[14px] outline-none border border-nest-primary/5 focus:border-nest-primary/50"
               >
                  <option value="">Chọn phòng</option>
                  {rooms.map((r) => (
                     <option key={r.room_id} value={r.room_id}>
                        #{r.room_number}
                     </option>
                  ))}
               </select>
            </div>

            <div className="rounded-xl border border-nest-primary/15 bg-nest-bg/80 px-4 py-3 mb-4 text-[12px] text-nest-text-secondary font-medium leading-relaxed">
              {utilityBaselineLoading ? (
                <span>Đang tải chỉ số đầu kỳ…</span>
              ) : utilityBaseline && createForm.room_id ? (
                <span>
                  <span className="font-bold text-nest-text-primary">Chỉ số đầu kỳ (hệ thống):</span> điện{' '}
                  <span className="font-bold text-nest-text-primary">{utilityBaseline.previous_electric}</span> kWh · nước{' '}
                  <span className="font-bold text-nest-text-primary">{utilityBaseline.previous_water}</span> m³. Tiêu thụ =
                  chỉ số mới − các số trên (chỉ số trên công tơ, không phải số kWh/m³ tiêu thụ tháng).
                </span>
              ) : (
                <span>Chọn phòng để xem chỉ số đầu kỳ.</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
               <div>
                  <label className="block text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-2">Chỉ số điện (kWh)</label>
                  <input
                     type="text"
                     value={electricCurrent}
                     onChange={(e) => setElectricCurrent(e.target.value)}
                     placeholder="0"
                     className="w-full bg-nest-bg rounded-xl px-4 py-3 text-nest-text-primary font-bold text-[14px] outline-none border border-nest-primary/5 focus:border-nest-primary/50 placeholder-nest-text-secondary/50"
                  />
               </div>
               <div>
                  <label className="block text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-2">Chỉ số nước (m³)</label>
                  <input
                     type="text"
                     value={waterCurrent}
                     onChange={(e) => setWaterCurrent(e.target.value)}
                     placeholder="0"
                     className="w-full bg-nest-bg rounded-xl px-4 py-3 text-nest-text-primary font-bold text-[14px] outline-none border border-nest-primary/5 focus:border-nest-primary/50 placeholder-nest-text-secondary/50"
                  />
               </div>
            </div>

            <details className="mb-6 group">
              <summary className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest cursor-pointer list-none flex items-center gap-2">
                <span className="group-open:rotate-90 transition-transform inline-block">›</span>
                Sửa chỉ số đầu kỳ (khi dữ liệu cũ sai)
              </summary>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-[10px] font-bold text-nest-text-secondary mb-1.5">Đầu kỳ điện (tùy chọn)</label>
                  <input
                    type="text"
                    value={overrideElectricPrevious}
                    onChange={(e) => setOverrideElectricPrevious(e.target.value)}
                    placeholder={utilityBaseline != null ? String(utilityBaseline.previous_electric) : ''}
                    className="w-full bg-white rounded-xl px-3 py-2.5 text-nest-text-primary font-bold text-[13px] outline-none border border-nest-primary/10"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-nest-text-secondary mb-1.5">Đầu kỳ nước (tùy chọn)</label>
                  <input
                    type="text"
                    value={overrideWaterPrevious}
                    onChange={(e) => setOverrideWaterPrevious(e.target.value)}
                    placeholder={utilityBaseline != null ? String(utilityBaseline.previous_water) : ''}
                    className="w-full bg-white rounded-xl px-3 py-2.5 text-nest-text-primary font-bold text-[13px] outline-none border border-nest-primary/10"
                  />
                </div>
              </div>
            </details>

            <div className="bg-nest-primary/5 rounded-xl p-4 flex gap-3 mb-8">
               <Info className="w-4 h-4 text-nest-primary shrink-0 mt-0.5" />
               <p className="text-[12px] text-nest-text-secondary font-medium leading-relaxed">
                 Tiền trên hóa đơn = tiêu thụ × đơn giá (cấu hình Dịch vụ / hợp đồng). Nếu điện 0đ nhưng bạn vừa nhập đúng chỉ số mới, thường là chỉ số đầu kỳ điện đã bằng chỉ số mới (không có tiêu thụ)—hoặc dùng mục sửa đầu kỳ phía trên.
               </p>
            </div>

            <button
              onClick={handleConfirmUtilities}
              className="w-full bg-nest-primary hover:bg-[#0da090] text-white py-3.5 rounded-full text-[15px] font-bold transition-colors shadow-lg shadow-nest-primary/10 mt-auto"
            >
               Xác nhận chỉ số
            </button>
         </div>

         {/* Metrics & Banner (Right) */}
         <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-6">
               {/* Total Revenue */}
               <div className="bg-white rounded-[32px] p-8 shadow-[0_4px_24px_rgba(15,58,64,0.04)] relative overflow-hidden flex flex-col justify-between border border-slate-200/60 min-h-[160px]">
                  <DollarSign className="absolute -bottom-8 -right-8 w-40 h-40 text-nest-primary/5 pointer-events-none" />
                  <div className="relative z-10">
                     <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-3">Đã thu (PAID)</p>
                     <h3 className="text-3xl font-bold text-nest-text-primary">{formatMoney(stats.totalCollected)}đ</h3>
                  </div>
                  <div className="relative z-10 flex flex-col gap-1 mt-4 text-[12px]">
                     <div className="flex items-center gap-2 font-bold text-nest-primary">
                        <TrendingUp className="w-4 h-4 shrink-0" />
                        <span className="text-nest-text-secondary font-medium">{filterSummary}</span>
                     </div>
                     <p className="text-[11px] font-medium text-nest-text-secondary pl-6">
                        Phát hành: {formatMoney(stats.totalBilled)}đ · {stats.rowCount} hóa đơn
                     </p>
                  </div>
               </div>
               
               {/* Unpaid */}
               <div className="bg-white rounded-[32px] p-8 shadow-[0_4px_24px_rgba(15,58,64,0.04)] relative overflow-hidden flex flex-col justify-between border border-slate-200/60 min-h-[160px]">
                  <ClipboardList className="absolute -bottom-4 -right-4 w-32 h-32 text-nest-primary/5 pointer-events-none" />
                  <div className="relative z-10">
                     <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-3">Chưa đóng / Tồn đọng</p>
                     <h3 className="text-3xl font-bold text-red-500">{stats.unpaidCount}</h3>
                  </div>
                  <div className="relative z-10 flex flex-col gap-1 mt-4 bg-nest-bg w-full px-3 py-2 rounded-lg shadow-sm border border-nest-primary/10">
                     <div className="flex items-center gap-2">
                        <Info className="w-3.5 h-3.5 text-nest-text-secondary shrink-0" />
                        <span className="text-[11px] font-bold text-nest-text-secondary">Số tiền còn phải thu</span>
                     </div>
                     <p className="text-[13px] font-bold text-nest-text-primary pl-5">{formatMoney(stats.totalOutstanding)}đ</p>
                  </div>
               </div>
            </div>

            {/* Phân tích nhanh theo bộ lọc */}
            <div className="bg-white rounded-[32px] shadow-[0_4px_24px_rgba(15,58,64,0.04)] overflow-hidden relative flex-1 min-h-[180px] border border-slate-200/60 p-8 flex flex-col justify-center">
               <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-4">Phân tích ({filterSummary})</p>
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-nest-bg rounded-2xl p-4 border border-nest-primary/10">
                     <p className="text-[10px] font-bold text-nest-text-secondary uppercase tracking-wider mb-1">Đã thanh toán</p>
                     <p className="text-xl font-bold text-nest-text-primary">{stats.paidCount}</p>
                  </div>
                  <div className="bg-nest-bg rounded-2xl p-4 border border-nest-primary/10">
                     <p className="text-[10px] font-bold text-nest-text-secondary uppercase tracking-wider mb-1">Còn nợ</p>
                     <p className="text-xl font-bold text-red-600">{stats.unpaidCount}</p>
                  </div>
                  <div className="bg-nest-bg rounded-2xl p-4 border border-nest-primary/10">
                     <p className="text-[10px] font-bold text-nest-text-secondary uppercase tracking-wider mb-1">Tiền điện (kỳ)</p>
                     <p className="text-lg font-bold text-nest-text-primary">{formatMoney(stats.electricSum)}đ</p>
                  </div>
                  <div className="bg-nest-bg rounded-2xl p-4 border border-nest-primary/10">
                     <p className="text-[10px] font-bold text-nest-text-secondary uppercase tracking-wider mb-1">Tiền nước (kỳ)</p>
                     <p className="text-lg font-bold text-nest-text-primary">{formatMoney(stats.waterSum)}đ</p>
                  </div>
               </div>
               {stats.cancelledCount > 0 && (
                  <p className="text-[12px] text-nest-text-secondary mt-4">
                     Gồm {stats.cancelledCount} hóa đơn đã hủy (không tính vào tồn đọng).
                  </p>
               )}
            </div>
         </div>
      </div>

      {/* History Table */}
      <div className="bg-white/80 rounded-[32px] p-8 shadow-[0_8px_30px_rgba(15,58,64,0.04)] border border-slate-200/60 backdrop-blur-sm mb-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-[20px] font-bold text-nest-text-primary">Lịch sử hóa đơn</h3>
              <p className="text-[12px] font-medium text-nest-text-secondary mt-1">
                Thống kê phía trên và bảng dưới dùng chung: <span className="text-nest-text-primary font-bold">{filterSummary}</span>.
              </p>
              <div className="flex flex-wrap items-end gap-3 mt-4">
                <div className="min-w-[160px]">
                  <label className="block text-[10px] font-bold text-nest-text-secondary uppercase tracking-widest mb-1.5">Thanh toán</label>
                  <select
                    value={filterPayment}
                    onChange={(e) => setFilterPayment(e.target.value)}
                    className="w-full bg-white rounded-xl px-3 py-2.5 text-[13px] font-bold text-nest-text-primary outline-none border border-nest-primary/15 shadow-sm"
                  >
                    <option value="all">Tất cả</option>
                    <option value="paid">Đã thanh toán</option>
                    <option value="unpaid">Chưa thanh toán</option>
                  </select>
                </div>
                <div className="min-w-[140px]">
                  <label className="block text-[10px] font-bold text-nest-text-secondary uppercase tracking-widest mb-1.5">Phòng</label>
                  <select
                    value={filterRoomKey}
                    onChange={(e) => setFilterRoomKey(e.target.value)}
                    className="w-full bg-white rounded-xl px-3 py-2.5 text-[13px] font-bold text-nest-text-primary outline-none border border-nest-primary/15 shadow-sm"
                  >
                    <option value="">Tất cả phòng</option>
                    {roomOptions.map((r) => (
                      <option key={r} value={r}>
                        Phòng {r}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-2.5 rounded-xl text-[12px] font-bold text-nest-text-secondary hover:text-nest-text-primary border border-nest-primary/15 bg-white hover:bg-nest-bg"
                >
                  Xóa lọc
                </button>
              </div>
            </div>
            <div className="flex bg-white rounded-full p-1 border border-slate-200 shadow-sm shrink-0">
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isLoading || filteredInvoices.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-50 text-nest-text-primary text-[12px] font-bold shadow-sm disabled:opacity-45 disabled:cursor-not-allowed hover:bg-nest-bg transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Xuất PDF
              </button>
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-nest-primary/10 text-[10px] font-bold text-nest-text-secondary tracking-widest uppercase">
                <th className="pb-5 font-bold px-2">Tháng</th>
                <th className="pb-5 font-bold px-2">Phòng</th>
                <th className="pb-5 font-bold px-2 text-center">Tiền điện / Tiền nước</th>
                <th className="pb-5 font-bold px-2">Tổng tiền</th>
                <th className="pb-5 font-bold px-2 whitespace-nowrap">Ngày trả</th>
                <th className="pb-5 font-bold px-2">Trạng thái</th>
                <th className="pb-5 font-bold px-2 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[13px] font-medium text-nest-text-secondary">
                    Đang tải dữ liệu hóa đơn...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[13px] font-medium text-nest-text-secondary">
                    {invoices.length === 0
                      ? 'Chưa có dữ liệu hóa đơn.'
                      : 'Không có hóa đơn khớp bộ lọc — chọn “Tất cả” hoặc đổi phòng.'}
                  </td>
                </tr>
              ) : (
                pagedInvoices.map((inv) => {
                  const ui = statusPill(inv.status);
                  return (
                    <tr key={inv.invoice_id} className="border-b border-nest-primary/10 last:border-0 hover:bg-white/50 transition-colors">
                      <td className="py-4 px-2 font-bold text-nest-text-primary">
                        {String(inv.period_month).padStart(2, '0')}/{inv.period_year}
                      </td>
                      <td className="py-4 px-2 font-bold text-nest-text-primary">{inv.room_number || '—'}</td>
                      <td className="py-4 px-2 text-center text-[13px] font-medium text-nest-text-secondary">
                        {typeof inv.electricity_amount !== 'undefined' || typeof inv.water_amount !== 'undefined' ? (
                          `${Number(inv.electricity_amount || 0).toLocaleString('vi-VN')}đ / ${Number(inv.water_amount || 0).toLocaleString('vi-VN')}đ`
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-4 px-2 font-bold text-nest-text-primary">{formatMoney(inv.total_amount)}đ</td>
                      <td className="py-4 px-2 text-[13px] font-medium text-nest-text-secondary whitespace-nowrap">
                        {formatPaymentDate(inv.payment_paid_at)}
                      </td>
                      <td className="py-4 px-2">
                        <span className={`${ui.pill} px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase inline-block`}>
                          {ui.label}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const data = await apiFetch(`/admin/invoices/${inv.invoice_id}`, { token });
                                const invDetail = data?.invoice ?? null;
                                if (!invDetail) {
                                  addToast('Không tìm thấy hóa đơn.', 'error');
                                  return;
                                }
                                setViewInvoice(invDetail);
                                setIsViewOpen(true);
                              } catch (e) {
                                console.error('View invoice error:', e);
                                addToast(e?.message || 'Không tải được chi tiết hóa đơn.', 'error');
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-slate-200 text-[11px] font-bold text-nest-text-primary hover:bg-nest-bg transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> Xem
                          </button>
                          {canModifyInvoice(inv) ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditModal(inv)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#EBFDFB] border border-[#14B8A6]/30 text-[11px] font-bold text-[#14B8A6] hover:bg-[#14B8A6]/10 transition-colors"
                                title="Sửa các khoản thu"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => openCancelModal(inv)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-rose-50 border border-rose-100 text-[11px] font-bold text-rose-600 hover:bg-rose-100 transition-colors"
                                title="Hủy hóa đơn"
                              >
                                <Ban className="w-3.5 h-3.5" /> Hủy
                              </button>
                            </>
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

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-transparent text-[12px] font-bold text-nest-text-secondary">
           <span>
             Hiển thị {pagedInvoices.length} trên{' '}
             <span className="text-nest-text-primary">{filteredInvoices.length} hóa đơn</span>
             {filteredInvoices.length !== invoices.length && (
               <span className="text-nest-text-secondary font-medium"> (tổng {invoices.length})</span>
             )}
           </span>
           <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className={`px-2 ${currentPage <= 1 ? 'text-slate-300 cursor-not-allowed' : 'text-nest-text-secondary hover:text-nest-text-primary'}`}
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
                        ? 'w-8 h-8 rounded-full bg-nest-primary text-white flex items-center justify-center'
                        : 'w-8 h-8 rounded-full text-nest-text-primary hover:bg-nest-bg flex items-center justify-center transition-colors'
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
                className={`px-2 ${currentPage >= totalPages ? 'text-slate-300 cursor-not-allowed' : 'text-nest-text-secondary hover:text-nest-text-primary'}`}
                aria-label="Trang sau"
              >
                &gt;
              </button>
           </div>
        </div>
      </div>
      {/* Spacing to lift the table from the bottom */}
      <div className="h-10 w-full shrink-0"></div>

      {editModalInvoice && (
        <div
          className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => !isEditSubmitting && closeEditModal()}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-3xl p-7 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-invoice-title"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 id="edit-invoice-title" className="text-2xl font-bold text-nest-text-primary">
                Sửa hóa đơn #{editModalInvoice.invoice_id}
              </h3>
              <button
                type="button"
                onClick={closeEditModal}
                disabled={isEditSubmitting}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-50"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[13px] font-medium text-nest-text-secondary mb-2">
              Phòng <span className="font-bold text-nest-text-primary">{editModalInvoice.room_number || '—'}</span>
              {' · '}
              Kỳ {String(editModalInvoice.period_month).padStart(2, '0')}/{editModalInvoice.period_year}
            </p>
            <p className="text-[12px] text-nest-primary font-medium mb-6 bg-nest-primary/5 rounded-xl px-4 py-3 border border-nest-primary/15">
              Thay đổi được lưu vào cùng bản ghi hóa đơn — khách thuê đã nhận hóa đơn sẽ thấy số tiền và hạn thanh toán mới ngay trên trang Thanh toán.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-nest-text-secondary uppercase tracking-widest mb-1.5">Tiền phòng</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.rent_amount}
                  onChange={(e) => setEditForm((p) => ({ ...p, rent_amount: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-nest-text-secondary uppercase tracking-widest mb-1.5">Tiền điện</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.electricity_amount}
                  onChange={(e) => setEditForm((p) => ({ ...p, electricity_amount: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-nest-text-secondary uppercase tracking-widest mb-1.5">Tiền nước</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.water_amount}
                  onChange={(e) => setEditForm((p) => ({ ...p, water_amount: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-nest-text-secondary uppercase tracking-widest mb-1.5">
                  Phí khác / giảm trừ
                </label>
                <input
                  type="number"
                  min="0"
                  value={editForm.other_fees_amount}
                  onChange={(e) => setEditForm((p) => ({ ...p, other_fees_amount: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary font-bold"
                />
                <p className="text-[11px] text-nest-text-secondary mt-1.5">Gồm dịch vụ đăng ký + phí nhập thêm. Giảm số này để áp giảm giá đột xuất.</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-nest-text-secondary uppercase tracking-widest mb-1.5">Hạn thanh toán</label>
                <input
                  type="date"
                  value={editForm.due_date}
                  onChange={(e) => setEditForm((p) => ({ ...p, due_date: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary font-bold"
                />
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-nest-bg border border-nest-primary/10 px-4 py-3 flex justify-between items-center">
              <span className="text-[12px] font-bold text-nest-text-secondary uppercase tracking-wide">Tổng sau chỉnh</span>
              <span className="text-lg font-bold text-nest-text-primary">{formatMoney(editPreviewTotal)}đ</span>
            </div>

            {editError ? <p className="mt-4 text-sm font-medium text-red-600">{editError}</p> : null}

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={isEditSubmitting}
                className="px-6 py-3 rounded-full font-bold text-nest-text-secondary hover:text-nest-text-primary disabled:opacity-50"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleUpdateInvoice}
                disabled={isEditSubmitting}
                className="px-8 py-3 rounded-full bg-nest-primary hover:bg-[#0da090] text-white font-bold shadow-lg shadow-nest-primary/20 disabled:opacity-60"
              >
                {isEditSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelModalInvoice && (
        <div
          className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm"
          onClick={() => !isCancelSubmitting && closeCancelModal()}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-[28px] shadow-2xl border border-slate-200 p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-invoice-title"
          >
            <h3 id="cancel-invoice-title" className="text-xl font-bold text-nest-text-primary pr-8">
              Hủy hóa đơn #{cancelModalInvoice.invoice_id}
            </h3>
            <p className="mt-2 text-[13px] font-medium text-nest-text-secondary leading-relaxed">
              Phòng {cancelModalInvoice.room_number || '—'} · kỳ{' '}
              {String(cancelModalInvoice.period_month).padStart(2, '0')}/{cancelModalInvoice.period_year} · tổng{' '}
              {formatMoney(cancelModalInvoice.total_amount)}đ
            </p>
            <div className="flex gap-3 rounded-2xl bg-amber-50 border border-amber-100/80 p-4 text-[13px] text-amber-900 mt-5">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              <p className="font-medium leading-relaxed">
                Hóa đơn sẽ chuyển sang <span className="font-bold">CANCELLED</span>. Khách thuê không còn phải thanh toán khoản này; thao tác không hoàn tác.
              </p>
            </div>
            {cancelError ? <p className="mt-4 text-sm font-medium text-red-600">{cancelError}</p> : null}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={closeCancelModal}
                disabled={isCancelSubmitting}
                className="w-full sm:w-auto px-6 py-3 rounded-full font-bold text-nest-text-secondary hover:bg-slate-100 disabled:opacity-50"
              >
                Không hủy
              </button>
              <button
                type="button"
                onClick={handleCancelInvoice}
                disabled={isCancelSubmitting}
                className="w-full sm:w-auto px-6 py-3 rounded-full font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60"
              >
                {isCancelSubmitting ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
            <button
              type="button"
              onClick={closeCancelModal}
              disabled={isCancelSubmitting}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {isViewOpen && viewInvoice && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-3xl p-7 shadow-2xl border border-slate-200 my-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-nest-text-primary">Chi tiết hóa đơn</h3>
              <button
                onClick={() => setIsViewOpen(false)}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-nest-bg rounded-2xl p-4 border border-nest-primary/10">
                <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-2">Phòng</p>
                <p className="text-[14px] font-bold text-nest-text-primary">{viewInvoice.room_number || '—'}</p>
              </div>

              <div className="bg-nest-bg rounded-2xl p-4 border border-nest-primary/10">
                <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-2">Trạng thái</p>
                <p className="text-[14px] font-bold text-nest-text-primary">{viewInvoice.status}</p>
              </div>

              <div className="bg-nest-bg rounded-2xl p-4 border border-nest-primary/10">
                <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-2">Ngày trả tiền</p>
                <p className="text-[14px] font-bold text-nest-text-primary">{formatPaymentDate(viewInvoice.payment_paid_at)}</p>
              </div>

              <div className="bg-nest-bg rounded-2xl p-4 border border-nest-primary/10">
                <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-2">Tháng</p>
                <p className="text-[14px] font-bold text-nest-text-primary">
                  {String(viewInvoice.period_month).padStart(2, '0')}/{viewInvoice.period_year}
                </p>
              </div>

              {invoiceViewUtility.showMergedUtility ? (
                <div className="bg-nest-bg rounded-2xl p-4 border border-nest-primary/10 sm:col-span-2">
                  <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-2">Điện — Nước</p>
                  <p className="text-[15px] font-bold text-nest-text-primary mb-1">
                    {Number(viewInvoice.electricity_amount || 0).toLocaleString('vi-VN')}đ{' '}
                    <span className="text-nest-text-secondary font-bold">/</span>{' '}
                    {Number(viewInvoice.water_amount || 0).toLocaleString('vi-VN')}đ
                  </p>
                  <p className="text-[11px] text-nest-text-secondary font-medium mb-4">
                    Tổng tiền ghi trên hóa đơn (điện · nước). Chi tiết chỉ số &amp; bậc điện/nước bên dưới — nếu có.
                  </p>
                  <InvoiceUtilityDetails
                    electricity_breakdown={viewInvoice.electricity_breakdown}
                    water_breakdown={viewInvoice.water_breakdown}
                    utility_meter_snapshot={viewInvoice.utility_meter_snapshot}
                    emptyHint={invoiceViewUtility.utilityEmptyHint}
                  />
                </div>
              ) : null}

              <div className="bg-nest-bg rounded-2xl p-4 border border-nest-primary/10">
                <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-2">Tiền phòng</p>
                <p className="text-[14px] font-bold text-nest-text-primary">{formatMoney(viewInvoice.rent_amount)}đ</p>
              </div>

              <div className="bg-nest-bg rounded-2xl p-4 border border-nest-primary/10 sm:col-span-2">
                <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-2">
                  Dịch vụ đã dùng (đăng ký kỳ này)
                </p>
                {!Array.isArray(viewInvoice.subscription_services) || viewInvoice.subscription_services.length === 0 ? (
                  <p className="text-[14px] font-medium text-nest-text-secondary">Không có</p>
                ) : (
                  <ul className="space-y-2">
                    {viewInvoice.subscription_services.map((s) => (
                      <li
                        key={`${s.source || 'svc'}-${s.fee_id ?? ''}-${s.service_id ?? ''}-${s.service_name}`}
                        className="flex flex-wrap justify-between gap-2 text-[14px] font-bold text-nest-text-primary"
                      >
                        <span>{s.service_name}</span>
                        <span className="text-nest-text-secondary font-bold">{formatMoney(s.monthly_price)}đ / tháng</span>
                      </li>
                    ))}
                  </ul>
                )}
                {Number(viewInvoice.other_fees_manual || 0) > 0 && (
                  <p className="mt-3 text-[13px] text-nest-text-secondary border-t border-nest-primary/10 pt-3">
                    Phí nhập thêm (ngoài đăng ký):{' '}
                    <span className="font-bold text-nest-text-primary">{formatMoney(viewInvoice.other_fees_manual)}đ</span>
                  </p>
                )}
              </div>

              <div className="bg-nest-bg rounded-2xl p-4 border border-nest-primary/10 sm:col-span-2">
                <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-2">Tổng tiền</p>
                <p className="text-[18px] font-bold text-nest-text-primary">
                  {Number(viewInvoice.total_amount || 0).toLocaleString('vi-VN')}đ
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreateOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-7 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-nest-text-primary">Tạo hóa đơn</h3>
              <button onClick={() => setIsCreateOpen(false)} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500">
                <Bell className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={createForm.tenant_id}
                onChange={(e) => {
                  const tid = e.target.value;
                  const trow = tenants.find((x) => String(x.tenant_id) === String(tid));
                  const next = suggestNextPeriodForTenant(tid, invoices);
                  setCreateForm((p) => ({
                    ...p,
                    tenant_id: tid,
                    room_id: trow?.room_id != null && trow.room_id !== '' ? String(trow.room_id) : p.room_id,
                    period_month: next.month,
                    period_year: next.year,
                  }));
                }}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
              >
                <option value="">Chọn tenant (tenant_id)</option>
                {tenants.map((t) => (
                  <option key={t.tenant_id} value={t.tenant_id}>
                    #{t.tenant_id} - {t.full_name} ({t.room_number || '—'})
                  </option>
                ))}
              </select>
              <select
                value={createForm.room_id}
                onChange={(e) => setCreateForm((p) => ({ ...p, room_id: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
              >
                <option value="">Chọn phòng (room_id)</option>
                {rooms.map((r) => (
                  <option key={r.room_id} value={r.room_id}>
                    #{r.room_id} - {r.room_number}
                  </option>
                ))}
              </select>
              <div className="md:col-span-2">
                <p className="text-[11px] font-medium text-nest-text-secondary mb-2">
                  Kỳ hóa đơn: mỗi tenant chỉ một hóa đơn cho một tháng. Khi chọn tenant, hệ thống gợi ý{' '}
                  <span className="font-bold text-nest-text-primary">tháng sau hóa đơn mới nhất</span> của người đó.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    value={createForm.period_month}
                    onChange={(e) => setCreateForm((p) => ({ ...p, period_month: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
                    placeholder="Tháng"
                  />
                  <input
                    type="number"
                    value={createForm.period_year}
                    onChange={(e) => setCreateForm((p) => ({ ...p, period_year: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
                    placeholder="Năm"
                  />
                </div>
              </div>
              <input
                type="number"
                value={createForm.rent_amount}
                onChange={(e) => setCreateForm((p) => ({ ...p, rent_amount: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
                placeholder="Tiền phòng (VNĐ)"
              />
              <input
                type="number"
                value={createForm.services_amount}
                onChange={(e) => setCreateForm((p) => ({ ...p, services_amount: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
                placeholder="Tiền dịch vụ (VNĐ)"
              />
              <input
                type="date"
                value={createForm.due_date}
                onChange={(e) => setCreateForm((p) => ({ ...p, due_date: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
              />
              <input
                type="text"
                value={createForm.note}
                onChange={(e) => setCreateForm((p) => ({ ...p, note: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-nest-primary"
                placeholder="Ghi chú"
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsCreateOpen(false)} className="px-6 py-3 rounded-full font-bold text-nest-text-secondary hover:text-nest-text-primary">
                Hủy
              </button>
              <button onClick={handleCreateInvoice} className="px-8 py-3 rounded-full bg-nest-primary hover:bg-[#0da090] text-white font-bold shadow-lg shadow-nest-primary/20">
                Tạo hóa đơn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
