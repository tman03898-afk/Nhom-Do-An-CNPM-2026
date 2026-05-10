import { useEffect, useMemo, useState } from 'react';
import { Zap, Droplet, Info, ChevronDown, Filter, Download, Eye, Bell, Plus, DollarSign, ClipboardList, TrendingUp, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

export default function InvoiceManagePage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [electricCurrent, setElectricCurrent] = useState('');
  const [waterCurrent, setWaterCurrent] = useState('');
  const [viewInvoice, setViewInvoice] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
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
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const stats = useMemo(() => {
    const totalRevenue = invoices.reduce((sum, i) => sum + Number(i.total_amount || 0), 0);
    const unpaid = invoices.filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED').length;
    return { totalRevenue, unpaid };
  }, [invoices]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(invoices.length / pageSize)), [invoices.length]);
  const pagedInvoices = useMemo(() => {
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const start = (safePage - 1) * pageSize;
    return invoices.slice(start, start + pageSize);
  }, [invoices, currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const formatMoney = (v) => Number(v || 0).toLocaleString('vi-VN');

  const statusPill = (s) => {
    const v = String(s || '').toUpperCase();
    if (v === 'PAID') return { label: 'PAID', pill: 'bg-[#EBFDFB] text-[#14B8A6]' };
    if (v === 'OVERDUE') return { label: 'OVERDUE', pill: 'bg-[#FFF0F0] text-[#D14D4D]' };
    if (v === 'CANCELLED') return { label: 'CANCELLED', pill: 'bg-slate-100 text-slate-500' };
    return { label: v || 'ISSUED', pill: 'bg-[#FFF3E0] text-[#E68A00]' };
  };

  const handleCreateInvoice = async () => {
    if (!token) return;
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
    await apiFetch('/admin/invoices', { token, method: 'POST', body: payload });
    setIsCreateOpen(false);
    setCreateForm((p) => ({ ...p, tenant_id: '', room_id: '', rent_amount: '', services_amount: '', note: '' }));
    await refresh();
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
      await apiFetch('/admin/utilities/readings/confirm', {
        token,
        method: 'POST',
        body: {
          room_id: roomId,
          electricity_current: ele,
          water_current: wat,
        },
      });

      await refresh();
      setElectricCurrent('');
      setWaterCurrent('');
      addToast('Đã lưu chỉ số và cập nhật hóa đơn.', 'success');
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

            <div className="grid grid-cols-2 gap-4 mb-6">
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

            <div className="bg-nest-primary/5 rounded-xl p-4 flex gap-3 mb-8">
               <Info className="w-4 h-4 text-nest-primary shrink-0 mt-0.5" />
               <p className="text-[12px] text-nest-text-secondary font-medium leading-relaxed">
                 Hệ thống sẽ tự động tính toán số tiền dựa trên đơn giá đã cấu hình trong mục Dịch vụ.
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
                     <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-3">Tổng doanh thu tháng</p>
                     <h3 className="text-3xl font-bold text-nest-text-primary">{formatMoney(stats.totalRevenue)}đ</h3>
                  </div>
                  <div className="relative z-10 flex items-center gap-2 mt-4 text-[12px] font-bold text-nest-primary">
                     <TrendingUp className="w-4 h-4" /> <span className="text-nest-text-secondary font-medium">Đang cập nhật</span>
                  </div>
               </div>
               
               {/* Unpaid */}
               <div className="bg-white rounded-[32px] p-8 shadow-[0_4px_24px_rgba(15,58,64,0.04)] relative overflow-hidden flex flex-col justify-between border border-slate-200/60 min-h-[160px]">
                  <ClipboardList className="absolute -bottom-4 -right-4 w-32 h-32 text-nest-primary/5 pointer-events-none" />
                  <div className="relative z-10">
                     <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-3">Hóa đơn chưa đóng</p>
                     <h3 className="text-3xl font-bold text-red-500">{stats.unpaid}</h3>
                  </div>
                  <div className="relative z-10 flex items-center gap-2 mt-4 bg-nest-bg w-fit px-3 py-1.5 rounded-lg shadow-sm border border-nest-primary/10">
                     <Info className="w-3.5 h-3.5 text-nest-text-secondary" />
                     <span className="text-[11px] font-bold text-nest-text-secondary">Cần gửi thông báo nhắc nhở</span>
                  </div>
               </div>
            </div>

            {/* Visual Banner Card */}
            <div className="bg-white rounded-[32px] shadow-lg shadow-black/5 overflow-hidden relative flex-1 min-h-[180px] border border-slate-200/60 group">
               <img src="https://images.unsplash.com/photo-1558227031-60292723aa92?w=800&q=80" alt="Energy" className="w-full h-full object-cover opacity-80 mix-blend-multiply transition-transform duration-700 group-hover:scale-105" />
               <div className="absolute inset-0 bg-gradient-to-t from-nest-text-primary via-nest-text-primary/40 to-transparent flex items-end p-8">
                  <h3 className="text-2xl font-bold text-white tracking-wide">Dữ liệu tiêu thụ điện nước Quý 3</h3>
               </div>
            </div>
         </div>
      </div>

      {/* History Table */}
      <div className="bg-white/80 rounded-[32px] p-8 shadow-[0_8px_30px_rgba(15,58,64,0.04)] border border-slate-200/60 backdrop-blur-sm mb-6">
        <div className="flex justify-between items-center mb-8">
           <h3 className="text-[20px] font-bold text-nest-text-primary">Lịch sử hóa đơn</h3>
           <div className="flex bg-white rounded-full p-1 border border-slate-200 shadow-sm">
             <button className="flex items-center gap-1.5 px-4 py-2 rounded-full text-nest-text-secondary hover:text-nest-text-primary text-[12px] font-bold transition-colors">
                <Filter className="w-3.5 h-3.5" /> Bộ lọc
             </button>
             <button className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-50 text-nest-text-primary text-[12px] font-bold shadow-sm">
                <Download className="w-3.5 h-3.5" /> Xuất PDF
             </button>
           </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-nest-primary/10 text-[10px] font-bold text-nest-text-secondary tracking-widest uppercase">
                <th className="pb-5 font-bold px-2">Tháng</th>
                <th className="pb-5 font-bold px-2">Phòng</th>
                <th className="pb-5 font-bold px-2 text-center">Tiêu thụ (Điện/Nước)</th>
                <th className="pb-5 font-bold px-2">Tổng tiền</th>
                <th className="pb-5 font-bold px-2">Trạng thái</th>
                <th className="pb-5 font-bold px-2 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[13px] font-medium text-nest-text-secondary">
                    Đang tải dữ liệu hóa đơn...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[13px] font-medium text-nest-text-secondary">
                    Chưa có dữ liệu hóa đơn.
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
                      <td className="py-4 px-2">
                        <span className={`${ui.pill} px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase inline-block`}>
                          {ui.label}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-right">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const data = await apiFetch(`/admin/invoices/${inv.invoice_id}`, { token });
                              setViewInvoice(data?.invoice || null);
                              setIsViewOpen(true);
                            } catch (e) {
                              console.error('View invoice error:', e);
                            }
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-[12px] font-bold text-nest-text-primary hover:bg-nest-bg transition-colors"
                        >
                          <Eye className="w-4 h-4" /> Xem
                        </button>
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
             Hiển thị {pagedInvoices.length} trên <span className="text-nest-text-primary">{invoices.length} hóa đơn</span>
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

      {isViewOpen && viewInvoice && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-7 shadow-2xl border border-slate-200">
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
                <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-2">Tháng</p>
                <p className="text-[14px] font-bold text-nest-text-primary">
                  {String(viewInvoice.period_month).padStart(2, '0')}/{viewInvoice.period_year}
                </p>
              </div>

              <div className="bg-nest-bg rounded-2xl p-4 border border-nest-primary/10">
                <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-2">Điện/Nước</p>
                <p className="text-[14px] font-bold text-nest-text-primary">
                  {Number(viewInvoice.electricity_amount || 0).toLocaleString('vi-VN')}đ /{' '}
                  {Number(viewInvoice.water_amount || 0).toLocaleString('vi-VN')}đ
                </p>
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
                onChange={(e) => setCreateForm((p) => ({ ...p, tenant_id: e.target.value }))}
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
