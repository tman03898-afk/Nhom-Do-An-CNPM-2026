/* DashboardPage.jsx */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
   Banknote,
   BedDouble,
   Building,
   FileText,
   CalendarClock,
   Wrench,
   CheckCircle2,
   UserPlus,
   ArrowRight,
   Users,
   CreditCard,
   Phone,
} from 'lucide-react';
import {
   Bar,
   BarChart,
   CartesianGrid,
   ResponsiveContainer,
   Tooltip,
   XAxis,
   YAxis,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';

function isUnpaidInvoiceStatus(status) {
   const s = String(status ?? '').toUpperCase();
   return s !== 'PAID' && s !== 'CANCELLED';
}

function formatRelativeTime(iso) {
   if (!iso) return '—';
   const d = new Date(iso);
   if (Number.isNaN(d.getTime())) return '—';
   const diff = Date.now() - d.getTime();
   const mins = Math.floor(diff / 60000);
   if (mins < 1) return 'Vừa xong';
   if (mins < 60) return `${mins} phút trước`;
   const hours = Math.floor(mins / 60);
   if (hours < 24) return `${hours} giờ trước`;
   const days = Math.floor(hours / 24);
   if (days < 7) return `${days} ngày trước`;
   return d.toLocaleDateString('vi-VN');
}

function activityIcon(type) {
   if (type === 'payment') return CheckCircle2;
   if (type === 'ticket') return Wrench;
   if (type === 'contract') return FileText;
   return UserPlus;
}

export default function DashboardPage() {
   const [activeTab, setActiveTab] = useState('revenue');
   const chartYear = new Date().getFullYear();
   const { token } = useAuth();
   const [rooms, setRooms] = useState([]);
   const [invoices, setInvoices] = useState([]);
   const [tickets, setTickets] = useState([]);
   const [contracts, setContracts] = useState([]);
   const [tenants, setTenants] = useState([]);
   const [monthlySeries, setMonthlySeries] = useState([]);
   const [activities, setActivities] = useState([]);
   const [collectionSummary, setCollectionSummary] = useState(null);
   /** Mốc thời gian cho thống kê quá hạn (tránh Date.now trong render). */
   const [invoiceAsOf, setInvoiceAsOf] = useState(null);

   useEffect(() => {
      queueMicrotask(() => setInvoiceAsOf(Date.now()));
   }, [invoices]);

   useEffect(() => {
      const fetchRooms = async () => {
         try {
               console.debug('Dashboard: fetching /rooms, token present?', !!token);
               const data = await apiFetch('/rooms', { token });
            setRooms(data.rooms || []);
         } catch {
            setRooms([]);
         }
      };
      fetchRooms();
   }, [token]);

   useEffect(() => {
      const run = async () => {
         if (!token) return;
         try {
            console.debug('Dashboard: fetching overview + invoices/tickets/contracts/tenants');
            const [, inv, tk, con, tn] = await Promise.all([
               apiFetch('/admin/analytics/overview', { token }),
               apiFetch('/admin/invoices', { token }),
               apiFetch('/admin/tickets', { token }),
               apiFetch('/admin/contracts', { token }),
               apiFetch('/admin/tenants', { token }),
            ]);
            setInvoices(inv.invoices || []);
            setTickets(tk.tickets || []);
            setContracts(con.contracts || []);
            setTenants(tn.tenants || []);
         } catch {
            setInvoices([]);
            setTickets([]);
            setContracts([]);
            setTenants([]);
         }
      };
      run();
   }, [token]);

   useEffect(() => {
      const loadAnalytics = async () => {
         if (!token) return;
         try {
            console.debug('Dashboard: fetching monthly-series, recent-activity, collection-summary');
            const [series, activity, collection] = await Promise.all([
               apiFetch(`/admin/analytics/monthly-series?year=${chartYear}`, { token }),
               apiFetch('/admin/analytics/recent-activity?limit=8', { token }),
               apiFetch('/admin/analytics/collection-summary', { token }),
            ]);
            setMonthlySeries(series?.months || []);
            setActivities(activity?.activities || []);
            setCollectionSummary(collection || null);
         } catch {
            setMonthlySeries([]);
            setActivities([]);
            setCollectionSummary(null);
         }
      };
      loadAnalytics();
   }, [token, chartYear]);

   const expiringContractsSoon = useMemo(() => {
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      return contracts.filter((c) => {
         if (c.status !== 'ACTIVE' || !c.end_date) return false;
         const end = new Date(c.end_date);
         return end >= now && end <= in30Days;
      }).length;
   }, [contracts]);

   /** Ghép tenant + phòng + hợp đồng ACTIVE + hóa đơn chưa trả (giống góc nhìn tenant). */
   const tenantSnapshots = useMemo(() => {
      const roomById = new Map(
         rooms.map((r) => [Number(r.room_id), r])
      );
      return tenants.map((t) => {
         const tenantId = Number(t.tenant_id);
         const roomFromList = t.room_id != null ? roomById.get(Number(t.room_id)) : null;
         const roomNumber = t.room_number || roomFromList?.room_number || '—';
         const maxTenants = roomFromList?.max_tenants ?? '—';

         const activeForTenant = contracts.filter(
            (c) => Number(c.tenant_id) === tenantId && c.status === 'ACTIVE'
         );
         const contract =
            activeForTenant.sort(
               (a, b) => new Date(b.end_date || 0) - new Date(a.end_date || 0)
            )[0] || null;

         const tenantInvoices = invoices.filter((i) => Number(i.tenant_id) === tenantId);
         const unpaid = tenantInvoices.filter((i) => isUnpaidInvoiceStatus(i.status));
         const amountDue = unpaid.reduce((sum, i) => sum + Number(i.total_amount || 0), 0);
         const nextDue = unpaid
            .filter((i) => i.due_date)
            .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];

         const fmt = (d) => {
            if (!d) return '—';
            const x = new Date(d);
            return Number.isNaN(x.getTime()) ? String(d) : x.toLocaleDateString('vi-VN');
         };

         return {
            tenant_id: tenantId,
            full_name: t.full_name || '—',
            email: t.email || '',
            phone: t.phone || '',
            room_number: roomNumber,
            max_tenants: maxTenants,
            contract_start: contract?.start_date,
            contract_end: contract?.end_date,
            contract_label:
               contract?.start_date && contract?.end_date
                  ? `${fmt(contract.start_date)} → ${fmt(contract.end_date)}`
                  : '—',
            amount_due: amountDue,
            unpaid_count: unpaid.length,
            next_due_label: nextDue?.due_date ? fmt(nextDue.due_date) : '—',
         };
      });
   }, [tenants, rooms, contracts, invoices]);

   const sortedTenantSnapshots = useMemo(() => {
      return [...tenantSnapshots].sort(
         (a, b) =>
            b.amount_due - a.amount_due ||
            String(a.room_number).localeCompare(String(b.room_number), 'vi')
      );
   }, [tenantSnapshots]);

   const roomStats = useMemo(() => {
      const total = rooms.length;
      const rented = rooms.filter((r) => r.status === 'RENTED').length;
      const available = rooms.filter((r) => r.status === 'AVAILABLE').length;
      return { total, rented, available };
   }, [rooms]);

   const invoiceStats = useMemo(() => {
      const unpaid = invoices.filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED').length;
      if (invoiceAsOf == null) {
         return { unpaid, overdueCount: 0, avgOverdueDays: null };
      }
      const now = invoiceAsOf;
      const overdue = invoices.filter(
         (i) => i.status !== 'PAID' && i.status !== 'CANCELLED' && i.due_date && new Date(i.due_date).getTime() < now
      );
      const avgOverdueDays =
         overdue.length > 0
            ? Math.round(
                 overdue.reduce((sum, i) => sum + (now - new Date(i.due_date).getTime()) / 86400000, 0) / overdue.length
              )
            : null;
      return { unpaid, overdueCount: overdue.length, avgOverdueDays };
   }, [invoices, invoiceAsOf]);

   const ticketStats = useMemo(() => {
      const open = tickets.filter((t) => t.status === 'OPEN').length;
      return { open };
   }, [tickets]);

   const monthRevenue = useMemo(() => {
      if (collectionSummary?.revenue) {
         return {
            amount: Number(collectionSummary.revenue.current || 0),
            changePct: collectionSummary.revenue.change_pct,
         };
      }
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      const cur = invoices
         .filter((i) => i.status === 'PAID' && Number(i.period_year) === y && Number(i.period_month) === m)
         .reduce((s, i) => s + Number(i.total_amount || 0), 0);
      return { amount: cur, changePct: null };
   }, [collectionSummary, invoices]);

   const chartData = useMemo(() => {
      return (monthlySeries.length ? monthlySeries : Array.from({ length: 12 }, (_, i) => ({
         month: i + 1,
         label: `T${i + 1}`,
         revenue: 0,
         cost: 0,
      }))).map((row) => ({
         name: row.label || `T${row.month}`,
         value: activeTab === 'revenue' ? Number(row.revenue || 0) : Number(row.cost || 0),
      }));
   }, [monthlySeries, activeTab]);

   return (
      <div className="w-full max-w-[1200px] mx-auto mt-2">
         {/* Header */}
         <div className="flex justify-between items-end mb-8 pl-4">
            <div>
               <h1 className="text-3xl font-sans font-bold text-nest-text-primary">Tổng quan</h1>
            </div>
            <div className="bg-white/80 backdrop-blur-sm text-nest-text-primary text-[13px] font-bold px-5 py-2.5 rounded-full flex items-center gap-2 shadow-sm border border-nest-primary/10 mr-4">
               <CalendarClock className="w-4 h-4 text-nest-primary" />
               Hôm nay, {new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
         </div>

         {/* Top Metrics Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 px-4">
            {/* Card 1: Doanh thu */}
            <div className="bg-white rounded-[2rem] p-7 shadow-[0_4px_23px_rgba(15,58,64,0.06)] border border-slate-200/60 flex flex-col justify-between hover:scale-[1.02] hover:shadow-xl transition-all duration-300 cursor-pointer group">
               <div className="flex justify-between items-start mb-8">
                  <div className="w-[42px] h-[42px] rounded-full bg-nest-primary/10 flex items-center justify-center group-hover:bg-nest-primary/20 transition-colors">
                     <Banknote className="w-5 h-5 text-nest-text-primary" />
                  </div>
                  {monthRevenue.changePct != null ? (
                     <span className={`text-xs font-bold px-3 py-1.5 rounded-full border shadow-sm ${
                        monthRevenue.changePct >= 0
                           ? 'bg-nest-bg text-nest-primary border-nest-primary/10'
                           : 'bg-red-50 text-red-600 border-red-100'
                     }`}>
                        {monthRevenue.changePct >= 0 ? '+' : ''}{monthRevenue.changePct}%
                     </span>
                  ) : null}
               </div>
               <div>
                  <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-2">Doanh thu tháng này</p>
                  <h3 className="text-2xl font-bold text-nest-text-primary">{Number(monthRevenue.amount || 0).toLocaleString('vi-VN')}đ</h3>
                  <Link to="/admin/payments" className="mt-4 text-[11px] font-bold text-nest-primary flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                     Xem chi tiết <ArrowRight size={12} />
                  </Link>
               </div>
            </div>

            {/* Card 2: Phòng thuê */}
            <div className="bg-white rounded-[2rem] p-7 shadow-[0_4px_23px_rgba(15,58,64,0.06)] border border-slate-200/60 flex flex-col justify-between hover:scale-[1.02] hover:shadow-xl transition-all duration-300 cursor-pointer group">
               <div className="flex justify-between items-start mb-8">
                  <div className="w-[42px] h-[42px] rounded-full bg-nest-primary/10 flex items-center justify-center group-hover:bg-nest-primary/20 transition-colors">
                     <BedDouble className="w-5 h-5 text-nest-text-primary" />
                  </div>
                  <div className="w-14 h-1.5 bg-nest-text-primary/10 rounded-full mt-3"></div>
               </div>
               <div>
                  <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-2">Số phòng đang thuê</p>
                  <h3 className="text-2xl font-bold text-nest-text-primary">{roomStats.rented} phòng</h3>
                  <Link to="/admin/rooms" className="mt-4 text-[11px] font-bold text-nest-primary flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                     Xem chi tiết <ArrowRight size={12} />
                  </Link>
               </div>
            </div>

            {/* Card 3: Phòng trống */}
            <div className="bg-white rounded-[2rem] p-7 shadow-[0_4px_23px_rgba(15,58,64,0.06)] border border-slate-200/60 flex flex-col justify-between hover:scale-[1.02] hover:shadow-xl transition-all duration-300 cursor-pointer group">
               <div className="flex justify-between items-start mb-8">
                  <div className="w-[42px] h-[42px] rounded-full bg-nest-primary/10 flex items-center justify-center group-hover:bg-nest-primary/20 transition-colors">
                     <Building className="w-5 h-5 text-nest-text-primary" />
                  </div>
                  <div className="w-3 h-3 rounded-full bg-nest-primary mt-2 shadow-[0_0_10px_rgba(20,184,166,0.4)]"></div>
               </div>
               <div>
                  <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-2">Số phòng trống</p>
                  <h3 className="text-2xl font-bold text-nest-text-primary">{roomStats.available} phòng</h3>
                  <Link to="/admin/rooms" className="mt-4 text-[11px] font-bold text-nest-primary flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                     Xem chi tiết <ArrowRight size={12} />
                  </Link>
               </div>
            </div>

            {/* Card 4: Hóa đơn */}
            <div className="bg-white rounded-[2rem] p-7 shadow-[0_4px_20px_rgba(15,58,64,0.06)] border border-white relative flex flex-col justify-between hover:scale-[1.02] hover:shadow-xl transition-all duration-300 cursor-pointer group">
               <div className="flex justify-between items-start mb-8">
                  <div className="w-[42px] h-[42px] rounded-full bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                     <FileText className="w-5 h-5 text-red-500" />
                  </div>
               </div>
               <div className="flex justify-between items-end">
                  <div>
                     <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-2">Hóa đơn chưa thanh toán</p>
                     <h3 className="text-2xl font-bold text-nest-text-primary">{invoiceStats.unpaid} hóa đơn</h3>
                     <Link to="/admin/invoices" className="mt-4 text-[11px] font-bold text-nest-primary flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        Xem chi tiết <ArrowRight size={12} />
                     </Link>
                  </div>
                  {invoiceStats.overdueCount > 0 && invoiceStats.avgOverdueDays != null ? (
                     <span className="text-red-500 text-[11px] font-bold whitespace-pre-line text-right mb-5">
                        {invoiceStats.overdueCount} quá hạn
                        <br />
                        ~{invoiceStats.avgOverdueDays} ngày TB
                     </span>
                  ) : null}
               </div>
            </div>

            {/* Card 5: Hợp đồng */}
            <div className="bg-white rounded-[2rem] p-7 shadow-[0_4px_20px_rgba(15,58,64,0.06)] border border-white relative flex flex-col justify-between hover:scale-[1.02] hover:shadow-xl transition-all duration-300 cursor-pointer group">
               <div className="flex justify-between items-start mb-8">
                  <div className="w-[42px] h-[42px] rounded-full bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                     <CalendarClock className="w-5 h-5 text-orange-500" />
                  </div>
               </div>
               <div>
                  <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-2">Hợp đồng sắp hết hạn</p>
                  <h3 className="text-2xl font-bold text-nest-text-primary">{expiringContractsSoon} hợp đồng</h3>
                  <Link to="/admin/tenants" className="mt-4 text-[11px] font-bold text-nest-primary flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                     Xem chi tiết <ArrowRight size={12} />
                  </Link>
               </div>
            </div>

            {/* Card 6: Bảo trì */}
            <div className="bg-white rounded-[2rem] p-7 shadow-[0_4px_23px_rgba(15,58,64,0.06)] border border-slate-200/60 flex flex-col justify-between hover:scale-[1.02] hover:shadow-xl transition-all duration-300 cursor-pointer group">
               <div className="flex justify-between items-start mb-8">
                  <div className="w-[42px] h-[42px] rounded-full bg-nest-text-primary flex items-center justify-center group-hover:bg-nest-primary/20 transition-colors">
                     <Wrench className="w-5 h-5 text-nest-primary" />
                  </div>
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
               </div>
               <div>
                  <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-2">Yêu cầu bảo trì mới</p>
                  <h3 className="text-2xl font-bold text-nest-text-primary flex items-baseline gap-2">
                     {ticketStats.open} <span className="text-[12px] font-bold text-nest-text-secondary tracking-wide">Phiếu chờ xử lý</span>
                  </h3>
                  <Link to="/admin/tickets" className="mt-4 text-[11px] font-bold text-nest-primary flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                     Xem chi tiết <ArrowRight size={12} />
                  </Link>
               </div>
            </div>
         </div>

         {/* Khách thuê — thông tin tổng hợp (phòng, HĐ, nợ) */}
         <div className="px-4 mb-8">
            <div className="bg-white/80 rounded-[2rem] p-6 sm:p-8 shadow-[0_4px_23px_rgba(15,58,64,0.06)] border border-slate-200/60 backdrop-blur-sm">
               <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
                  <div>
                     <h3 className="text-xl font-bold text-nest-text-primary flex items-center gap-2">
                        <Users className="w-5 h-5 text-nest-primary" />
                        Khách thuê hiện tại
                     </h3>
                     <p className="text-[13px] text-nest-text-secondary mt-1.5 font-medium max-w-xl">
                        Phòng đang ở, thời hạn hợp đồng đang hiệu lực và các khoản hóa đơn chưa thanh toán.
                     </p>
                  </div>
                  <Link
                     to="/admin/tenants"
                     className="text-[13px] font-bold text-nest-primary hover:underline inline-flex items-center gap-1 shrink-0"
                  >
                     Quản lý khách thuê <ArrowRight size={14} />
                  </Link>
               </div>
               <div className="w-full overflow-x-auto -mx-1">
                  <table className="w-full text-left border-collapse min-w-[860px]">
                     <thead>
                        <tr className="text-[10px] font-bold text-[#82ABB0] tracking-widest uppercase border-b border-[#BCE1E5]/40">
                           <th className="pb-4 px-2">Khách thuê</th>
                           <th className="pb-4 px-2">Liên hệ</th>
                           <th className="pb-4 px-2 text-center">Phòng</th>
                           <th className="pb-4 px-2 text-center">Số người (max)</th>
                           <th className="pb-4 px-2">Hợp đồng</th>
                           <th className="pb-4 px-2 text-right">Tiền cần thanh toán</th>
                           <th className="pb-4 px-2 text-center">HĐ chưa trả</th>
                           <th className="pb-4 px-2">Hạn gần nhất</th>
                        </tr>
                     </thead>
                     <tbody>
                        {sortedTenantSnapshots.length === 0 ? (
                           <tr>
                              <td colSpan={8} className="py-10 text-center text-[13px] font-medium text-nest-text-secondary">
                                 Chưa có khách thuê hoặc đang tải dữ liệu…
                              </td>
                           </tr>
                        ) : (
                           sortedTenantSnapshots.map((row) => (
                              <tr
                                 key={row.tenant_id}
                                 className="border-b border-[#BCE1E5]/30 last:border-0 hover:bg-nest-bg/40 transition-colors"
                              >
                                 <td className="py-4 px-2">
                                    <span className="font-bold text-nest-text-primary text-[14px]">{row.full_name}</span>
                                 </td>
                                 <td className="py-4 px-2">
                                    <div className="flex flex-col gap-0.5 text-[12px]">
                                       {row.email ? (
                                          <span className="text-nest-text-secondary font-medium">{row.email}</span>
                                       ) : null}
                                       {row.phone ? (
                                          <span className="text-[#82ABB0] font-medium flex items-center gap-1">
                                             <Phone className="w-3 h-3 shrink-0" /> {row.phone}
                                          </span>
                                       ) : null}
                                       {!row.email && !row.phone ? (
                                          <span className="text-[#82ABB0]">—</span>
                                       ) : null}
                                    </div>
                                 </td>
                                 <td className="py-4 px-2 text-center font-bold text-nest-text-primary">
                                    {row.room_number !== '—' ? `Phòng ${row.room_number}` : '—'}
                                 </td>
                                 <td className="py-4 px-2 text-center text-[13px] font-bold text-[#4A787C]">
                                    {row.max_tenants === '—' ? '—' : row.max_tenants}
                                 </td>
                                 <td className="py-4 px-2 text-[12px] font-medium text-[#4A787C] whitespace-nowrap">
                                    {row.contract_label}
                                 </td>
                                 <td className="py-4 px-2 text-right">
                                    <span className="font-bold text-nest-text-primary text-[14px] inline-flex items-center gap-1 justify-end">
                                       <CreditCard className="w-3.5 h-3.5 text-nest-primary shrink-0" />
                                       {Number(row.amount_due || 0).toLocaleString('vi-VN')}đ
                                    </span>
                                 </td>
                                 <td className="py-4 px-2 text-center font-bold text-[#0F3A40]">
                                    {row.unpaid_count}
                                 </td>
                                 <td className="py-4 px-2 text-[13px] font-medium text-[#4A787C]">
                                    {row.next_due_label}
                                 </td>
                              </tr>
                           ))
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>

         {/* Main Content Grid: Chart & Activities */}
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 mb-12">
            {/* Chart Section (Left) */}
            <div className="lg:col-span-8 bg-white/80 rounded-[2.5rem] p-5 sm:p-9 shadow-[0_8px_30px_rgba(15,58,64,0.04)] border border-slate-200/60 backdrop-blur-sm">
               <div className="flex justify-between items-start mb-12">
                  <div>
                     <h3 className="text-xl font-bold text-nest-text-primary">Doanh thu hàng tháng</h3>
                     <p className="text-[13px] text-nest-text-secondary mt-1.5 font-medium">Năm {chartYear} — từ hóa đơn đã thanh toán</p>
                  </div>
                  <div className="flex bg-nest-bg/50 backdrop-blur-sm rounded-full p-1 border border-nest-primary/10 shadow-sm">
                     <button
                        onClick={() => setActiveTab('revenue')}
                        className={`px-3 sm:px-5 py-2 rounded-full text-[11px] sm:text-[12px] font-bold shadow-sm transition-all duration-300 ${activeTab === 'revenue' ? 'bg-white text-nest-text-primary' : 'text-nest-text-secondary hover:text-nest-text-primary'}`}
                     >
                        Doanh thu
                     </button>
                     <button
                        onClick={() => setActiveTab('cost')}
                        className={`px-3 sm:px-5 py-2 rounded-full text-[11px] sm:text-[12px] font-bold shadow-sm transition-all duration-300 ${activeTab === 'cost' ? 'bg-white text-nest-text-primary' : 'text-nest-text-secondary hover:text-nest-text-primary'}`}
                     >
                        Chi phí
                     </button>
                  </div>
               </div>
               <div className="h-[260px] w-full mt-2">
                  {chartData.every((d) => d.value === 0) ? (
                     <p className="text-[13px] text-nest-text-secondary font-medium text-center py-16">
                        Chưa có dữ liệu {activeTab === 'revenue' ? 'doanh thu' : 'chi phí'} trong năm {chartYear}.
                     </p>
                  ) : (
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="4 4" stroke="#BCE1E5" vertical={false} />
                           <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#4A787C', fontWeight: 700 }} axisLine={false} tickLine={false} />
                           <YAxis
                              tick={{ fontSize: 10, fill: '#82ABB0' }}
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={(v) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}tr` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                           />
                           <Tooltip
                              formatter={(val) => [`${Number(val || 0).toLocaleString('vi-VN')}đ`, activeTab === 'revenue' ? 'Doanh thu' : 'Chi phí']}
                              contentStyle={{ borderRadius: 12, border: '1px solid #BCE1E5', fontSize: 12 }}
                           />
                           <Bar
                              dataKey="value"
                              fill={activeTab === 'revenue' ? '#14B8A6' : '#D14D4D'}
                              radius={[6, 6, 0, 0]}
                              maxBarSize={36}
                           />
                        </BarChart>
                     </ResponsiveContainer>
                  )}
               </div>
            </div>

            {/* Recent Activity (Right) */}
            <div className="lg:col-span-4 bg-white/80 rounded-[2.5rem] p-5 sm:p-9 shadow-[0_8px_30px_rgba(15,58,64,0.04)] border border-slate-200/60 backdrop-blur-sm">
               <h3 className="text-xl font-bold text-nest-text-primary mb-8">Hoạt động gần đây</h3>
               <div className="space-y-5">
                  {activities.length === 0 ? (
                     <p className="text-[13px] text-nest-text-secondary font-medium py-6 text-center">
                        Chưa có hoạt động gần đây.
                     </p>
                  ) : (
                     activities.map((item, idx) => {
                        const Icon = activityIcon(item.type);
                        const iconWrap =
                           item.type === 'ticket'
                              ? 'bg-orange-100 group-hover:bg-orange-200'
                              : item.type === 'payment'
                                ? 'bg-nest-primary/10 group-hover:bg-nest-primary/20'
                                : 'bg-slate-100 group-hover:bg-slate-200';
                        const iconColor =
                           item.type === 'ticket' ? 'text-orange-600' : item.type === 'payment' ? 'text-nest-primary' : 'text-slate-600';
                        return (
                           <div
                              key={`${item.type}-${item.at}-${idx}`}
                              className="flex gap-5 items-start hover:bg-nest-bg/60 p-3 -m-3 rounded-2xl transition-all group"
                           >
                              <div className={`w-[42px] h-[42px] rounded-full flex items-center justify-center shrink-0 transition-colors ${iconWrap}`}>
                                 <Icon className={`w-5 h-5 ${iconColor}`} />
                              </div>
                              <div className="mt-0.5 min-w-0">
                                 <h4 className="text-[13px] font-bold text-nest-text-primary leading-snug">{item.title}</h4>
                                 <p className="text-[11px] font-medium text-nest-text-secondary mt-1.5 truncate">{item.detail}</p>
                                 <p className="text-[10px] font-bold text-[#82ABB0] mt-1">{formatRelativeTime(item.at)}</p>
                              </div>
                           </div>
                        );
                     })
                  )}
               </div>
            </div>
         </div>
      </div>
   );
}
