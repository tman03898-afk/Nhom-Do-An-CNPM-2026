import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
   Receipt, Filter, Search, ChevronLeft, ChevronRight,
   Eye, CheckCircle2, AlertCircle, CreditCard, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

export default function TenantInvoicePage() {
   const navigate = useNavigate();
   const { token } = useAuth();
   const [searchQuery, setSearchQuery] = useState('');
   const [filterMonth, setFilterMonth] = useState('Tất cả');
   const [filterStatus, setFilterStatus] = useState('Tất cả');

   const [invoices, setInvoices] = useState([]);
   const [payments, setPayments] = useState([]);
   const [isLoading, setIsLoading] = useState(false);
   const [detailOpen, setDetailOpen] = useState(false);
   const [detailLoading, setDetailLoading] = useState(false);
   const [detailInvoice, setDetailInvoice] = useState(null);

   const formatMoney = (v) => Number(v || 0).toLocaleString('vi-VN');
   const formatMonth = (periodMonth, periodYear) => `${String(periodMonth).padStart(2, '0')}/${periodYear}`;
   const statusMeta = (invoiceStatus, paymentStatus) => {
      const invoiceValue = String(invoiceStatus || '').toUpperCase();
      const paymentValue = String(paymentStatus || '').toUpperCase();

      if (invoiceValue === 'PAID' || paymentValue === 'APPROVED') {
         return { text: 'Đã phê duyệt', type: 'approved' };
      }
      if (paymentValue === 'PENDING') {
         return { text: 'Chờ phê duyệt', type: 'pending' };
      }
      if (paymentValue === 'REJECTED') {
         return { text: 'Không thành công', type: 'failed' };
      }
      return { text: 'Chưa thanh toán', type: 'unpaid' };
   };

   useEffect(() => {
      const run = async () => {
         if (!token) return;
         setIsLoading(true);
         const [invoiceResult, paymentResult] = await Promise.allSettled([
            apiFetch('/tenant/invoices', { token }),
            apiFetch('/tenant/payments', { token }),
         ]);

         if (invoiceResult.status === 'fulfilled') {
            setInvoices(invoiceResult.value?.invoices || []);
         } else {
            setInvoices([]);
         }

         if (paymentResult.status === 'fulfilled') {
            setPayments(paymentResult.value?.payments || []);
         } else {
            setPayments([]);
         }

         setIsLoading(false);
      };
      run();
   }, [token]);

   const latestPaymentByInvoice = useMemo(() => {
      const map = new Map();
      for (const p of payments) {
         const key = Number(p.invoice_id);
         if (!map.has(key)) {
            map.set(key, p);
         }
      }
      return map;
   }, [payments]);

   const displayInvoices = useMemo(() => {
      return invoices.map((inv) => {
         const latestPayment = latestPaymentByInvoice.get(Number(inv.invoice_id));
         const meta = statusMeta(inv.status, latestPayment?.status);
         return {
            invoice_id: inv.invoice_id,
            month: formatMonth(inv.period_month, inv.period_year),
            rent: formatMoney(inv.rent_amount),
            electric: formatMoney(inv.electricity_amount),
            water: formatMoney(inv.water_amount),
            otherFees: formatMoney(inv.other_fees_amount),
            total: formatMoney(inv.total_amount),
            status: meta.text,
            statusType: meta.type,
            rawStatus: String(inv.status || '').toUpperCase(),
         };
      });
   }, [invoices, latestPaymentByInvoice]);

   const filteredInvoices = displayInvoices.filter((inv) => {
      const matchesSearch =
         inv.month.toLowerCase().includes(searchQuery.toLowerCase()) ||
         inv.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
         inv.total.includes(searchQuery);

      const matchesMonth = filterMonth === 'Tất cả' || filterMonth.includes(inv.month);
      const normalizedFilter = filterStatus.replace('Trạng thái ', '');
      const matchesStatus = filterStatus === 'Trạng thái Tất cả' || normalizedFilter === 'Tất cả' || inv.status === normalizedFilter;

      return matchesSearch && matchesMonth && matchesStatus;
   });

   const totalDebt = displayInvoices
      .filter((i) => i.statusType !== 'approved')
      .reduce((sum, i) => sum + Number(String(i.total).replace(/\./g, '')), 0);

   const latestInvoice = invoices[0] || null;
   const latestActionableInvoice = displayInvoices.find((i) => i.statusType === 'unpaid' || i.statusType === 'failed') || null;
   const latestActionableInvoiceRaw = latestActionableInvoice
      ? invoices.find((inv) => Number(inv.invoice_id) === Number(latestActionableInvoice.invoice_id))
      : null;
   const latestPendingInvoice = displayInvoices.find((i) => i.statusType === 'pending') || null;
   const latestMonthLabel = latestInvoice ? formatMonth(latestInvoice.period_month, latestInvoice.period_year) : '—';

   const formatDueDate = (d) => {
      if (!d) return '—';
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return '—';
      return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
   };
   const latestDueDate = formatDueDate(latestActionableInvoiceRaw?.due_date);
   const hasUnpaid = Boolean(latestActionableInvoiceRaw);

   const openInvoiceDetail = async (invoiceId) => {
      if (!token || !invoiceId) return;
      setDetailOpen(true);
      setDetailLoading(true);
      setDetailInvoice(null);
      try {
         const data = await apiFetch(`/tenant/invoices/${invoiceId}`, { token });
         setDetailInvoice(data?.invoice || null);
      } catch {
         setDetailInvoice(null);
      } finally {
         setDetailLoading(false);
      }
   };

   return (
      <div className="flex flex-col gap-8 pb-10">
         {/* Header */}
         <div>
            {/* <p className="text-[11px] font-bold text-[#14B8A6] uppercase tracking-widest mb-1.5">QUẢN LÝ TÀI CHÍNH</p> */}
            <h1 className="text-[34px] font-sans font-bold text-[#0F3A40] tracking-tight">Lịch sử Hóa đơn</h1>
            <p className="text-[14.5px] text-[#4A787C] font-medium mt-2 max-w-[600px]">
               Theo dõi chi tiết chi phí hàng tháng và quản lý các giao dịch thanh toán của bạn tại The Nest Living.
            </p>
         </div>

         {/* Summary Ribbon */}
         <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 bg-white/60 backdrop-blur-md rounded-[40px] p-8 border border-white shadow-sm flex items-center justify-between group overflow-hidden relative">
               <div className="absolute top-0 right-0 w-32 h-32 bg-[#14B8A6]/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
               <div className="relative">
                  <p className="text-[12px] font-bold text-[#82ABB0] mb-2">Tổng dư nợ hiện tại</p>
                  <div className="flex items-baseline gap-2">
                     <h2 className="text-[36px] font-bold text-[#0F3A40]">{formatMoney(totalDebt)}</h2>
                     <span className="text-xl font-bold text-[#0F3A40]">VNĐ</span>
                  </div>
                  <p className="text-[12px] font-bold text-[#D14D4D] mt-3 flex items-center gap-1.5">
                     {hasUnpaid ? (
                       <>
                         <AlertCircle size={14} /> Hạn thanh toán: {latestDueDate}
                       </>
                     ) : (
                       <>
                         <CheckCircle2 size={14} className="text-[#14B8A6]" /> Không có hóa đơn cần thanh toán
                       </>
                     )}
                  </p>
               </div>
               <button
                  onClick={() => navigate(latestActionableInvoiceRaw ? `/tenant/payment?invoiceId=${latestActionableInvoiceRaw.invoice_id}` : '/tenant/payment')}
                  disabled={!hasUnpaid}
                  className={`relative px-8 py-4 rounded-3xl font-bold text-[15px] shadow-xl transition-all flex items-center gap-2 group/btn ${
                    hasUnpaid ? 'bg-[#0F3A40] hover:bg-[#1F545B] text-white' : 'bg-slate-200 text-slate-500 cursor-not-allowed shadow-transparent'
                  }`}
               >
                  Thanh toán ngay <CreditCard size={18} className="group-hover/btn:rotate-12 transition-transform" />
               </button>
            </div>

            <div className="w-full md:w-[320px] bg-white/40 rounded-[40px] p-8 border border-white/50 shadow-sm flex flex-col justify-center">
               <p className="text-[12px] font-bold text-[#82ABB0] mb-2">Hóa đơn mới nhất</p>
               <h3 className="text-[22px] font-bold text-[#0F3A40]">Tháng {latestMonthLabel}</h3>
               <div className="w-full h-1.5 bg-[#BCE1E5]/30 rounded-full mt-5 overflow-hidden">
                  <div className="w-[70%] h-full bg-[#14B8A6] rounded-full"></div>
               </div>
            </div>
         </div>

         {/* Filters & Table */}
         <div className="bg-white/60 backdrop-blur-xl rounded-[40px] border border-white shadow-xl overflow-hidden">
            {/* Filter Bar */}
            <div className="p-8 border-b border-[#BCE1E5]/30 flex flex-col md:flex-row justify-between items-center gap-6">
               <div className="flex items-center gap-4">
                  <div className="relative">
                     <select
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="appearance-none bg-[#F2FCFD] border border-[#BCE1E5]/40 rounded-2xl px-6 py-2.5 pr-12 text-[13px] font-bold text-[#0F3A40] outline-none cursor-pointer hover:border-[#14B8A6]/30 transition-all"
                     >
                        <option>Tháng Tất cả</option>
                        <option>Tháng 10/2023</option>
                        <option>Tháng 09/2023</option>
                     </select>
                     <Filter size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-[#4A787C] pointer-events-none" />
                  </div>
                  <div className="relative">
                     <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="appearance-none bg-[#F2FCFD] border border-[#BCE1E5]/40 rounded-2xl px-6 py-2.5 pr-12 text-[13px] font-bold text-[#0F3A40] outline-none cursor-pointer hover:border-[#14B8A6]/30 transition-all"
                     >
                        <option>Trạng thái Tất cả</option>
                        <option>Chưa thanh toán</option>
                        <option>Chờ phê duyệt</option>
                        <option>Không thành công</option>
                        <option>Đã phê duyệt</option>
                     </select>
                     <Filter size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-[#4A787C] pointer-events-none" />
                  </div>
               </div>

               <div className="relative w-full md:w-[320px]">
                  <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#82ABB0]" />
                  <input
                     type="text"
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     placeholder="Tìm kiếm hóa đơn..."
                     className="w-full bg-[#F2FCFD] border border-[#BCE1E5]/40 rounded-2xl pl-12 pr-12 py-2.5 text-[13px] outline-none focus:border-[#14B8A6]/30 transition-all font-bold text-[#0F3A40]"
                  />
                  {searchQuery && (
                     <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-[#82ABB0] hover:text-[#D14D4D] transition-colors"
                     >
                        <X size={14} />
                     </button>
                  )}
               </div>
            </div>

            {/* Invoice Table */}
            <div className="overflow-x-auto p-4">
               <table className="w-full border-collapse">
                  <thead>
                     <tr className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-widest text-left">
                        <th className="px-6 py-5">Tháng</th>
                        <th className="px-6 py-5">Tiền phòng</th>
                        <th className="px-6 py-5">Điện</th>
                        <th className="px-6 py-5">Nước</th>
                        <th className="px-6 py-5">Phí khác</th>
                        <th className="px-6 py-5">Tổng tiền</th>
                        <th className="px-6 py-5">Trạng thái</th>
                        <th className="px-6 py-5 text-center">Thao tác</th>
                     </tr>
                  </thead>
                  <tbody className="space-y-4">
                     {filteredInvoices.map((inv, i) => (
                        <tr key={i} className="group hover:bg-[#F2FCFD]/60 transition-all cursor-pointer">
                           <td className="px-6 py-6 transition-all first:rounded-l-3xl">
                              <span className="font-bold text-[#0F3A40] text-[15px]">{inv.month}</span>
                           </td>
                           <td className="px-6 py-6 font-medium text-[#4A787C] text-[15px]">{inv.rent}</td>
                           <td className="px-6 py-6 font-medium text-[#4A787C] text-[15px]">{inv.electric}</td>
                           <td className="px-6 py-6 font-medium text-[#4A787C] text-[15px]">{inv.water}</td>
                           <td className="px-6 py-6 font-medium text-[#4A787C] text-[15px]">{inv.otherFees}</td>
                           <td className="px-6 py-6">
                              <span className="font-bold text-[#0F3A40] text-[16px]">{inv.total}</span>
                           </td>
                           <td className="px-6 py-6">
                              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold tracking-wide transition-all ${
                                 inv.statusType === 'approved'
                                    ? 'bg-[#EBFDFB] text-[#14B8A6]'
                                    : inv.statusType === 'pending'
                                      ? 'bg-[#FFF3E0] text-[#E68A00]'
                                      : 'bg-[#FFF0F0] text-[#D14D4D]'
                                 }`}>
                                 {inv.statusType === 'approved' ? <CheckCircle2 size={12} /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                                 {inv.status?.toUpperCase()}
                              </div>
                           </td>
                           <td className="px-6 py-6 last:rounded-r-3xl text-center">
                              <div className="flex items-center justify-center gap-3">
                                 <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); openInvoiceDetail(inv.invoice_id); }}
                                    className="p-2.5 rounded-xl bg-[#F2FCFD] border border-[#BCE1E5]/40 text-[#4A787C] hover:text-[#14B8A6] hover:bg-white transition-all shadow-sm"
                                    title="Xem chi tiết"
                                 >
                                    <Eye size={16} />
                                 </button>
                                 {(inv.statusType === 'unpaid' || inv.statusType === 'failed') && (
                                    <button
                                       onClick={(e) => { e.stopPropagation(); navigate(`/tenant/payment?invoiceId=${inv.invoice_id}`); }}
                                       className="px-5 py-2.5 rounded-xl bg-[#14B8A6] text-white text-[12px] font-bold shadow-lg shadow-[#14B8A6]/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                                    >
                                       {inv.statusType === 'failed' ? 'Gửi lại' : 'Thanh toán'}
                                    </button>
                                 )}
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>

            {/* Pagination */}
            <div className="p-8 border-t border-[#BCE1E5]/30 flex justify-between items-center text-[12px] font-bold text-[#82ABB0]">
               <span>
                  Hiển thị {filteredInvoices.length} trong tổng số <span className="text-[#0F3A40]">{invoices.length} hóa đơn</span>
                  {latestPendingInvoice ? ` • ${latestPendingInvoice.month} đang chờ phê duyệt` : ''}
               </span>
               <div className="flex items-center gap-3">
                  <button className="p-2 rounded-full hover:bg-[#F2FCFD] transition-all"><ChevronLeft size={16} /></button>
                  <button className="w-8 h-8 rounded-full bg-[#0F3A40] text-white flex items-center justify-center shadow-lg shadow-[#0F3A40]/20">1</button>
                  <button className="w-8 h-8 rounded-full text-[#4A787C] hover:bg-[#F2FCFD] flex items-center justify-center transition-all">2</button>
                  <button className="p-2 rounded-full hover:bg-[#F2FCFD] transition-all"><ChevronRight size={16} /></button>
               </div>
            </div>
         </div>

         {detailOpen ? (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0F3A40]/40 backdrop-blur-sm">
               <div className="bg-white rounded-[32px] shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col border border-white">
                  <div className="flex items-center justify-between px-8 py-6 border-b border-[#BCE1E5]/30">
                     <h3 className="text-lg font-bold text-[#0F3A40]">Chi tiết hóa đơn</h3>
                     <button
                        type="button"
                        onClick={() => { setDetailOpen(false); setDetailInvoice(null); }}
                        className="p-2 rounded-xl hover:bg-[#F2FCFD] text-[#4A787C]"
                        aria-label="Đóng"
                     >
                        <X size={20} />
                     </button>
                  </div>
                  <div className="px-8 py-6 overflow-y-auto text-[14px]">
                     {detailLoading ? (
                        <p className="text-[#82ABB0] font-medium py-8 text-center">Đang tải…</p>
                     ) : !detailInvoice ? (
                        <p className="text-[#82ABB0] font-medium py-8 text-center">Không tải được chi tiết.</p>
                     ) : (
                        <div className="space-y-4">
                           <p className="text-[#4A787C]">
                              Kỳ{' '}
                              <span className="font-bold text-[#0F3A40]">
                                 {String(detailInvoice.period_month).padStart(2, '0')}/{detailInvoice.period_year}
                              </span>
                              {detailInvoice.room_number ? (
                                 <> · Phòng <span className="font-bold text-[#0F3A40]">{detailInvoice.room_number}</span></>
                              ) : null}
                           </p>
                           <div className="rounded-2xl border border-[#BCE1E5]/30 divide-y divide-[#BCE1E5]/20">
                              <div className="flex justify-between px-4 py-3">
                                 <span className="text-[#82ABB0]">Tiền phòng</span>
                                 <span className="font-bold text-[#0F3A40]">{formatMoney(detailInvoice.rent_amount)}₫</span>
                              </div>
                              <div className="flex justify-between px-4 py-3">
                                 <span className="text-[#82ABB0]">Điện</span>
                                 <span className="font-bold text-[#0F3A40]">{formatMoney(detailInvoice.electricity_amount)}₫</span>
                              </div>
                              <div className="flex justify-between px-4 py-3">
                                 <span className="text-[#82ABB0]">Nước</span>
                                 <span className="font-bold text-[#0F3A40]">{formatMoney(detailInvoice.water_amount)}₫</span>
                              </div>
                              <div className="px-4 py-3">
                                 <div className="flex justify-between">
                                    <span className="text-[#82ABB0]">Dịch vụ &amp; tiện ích</span>
                                    <span className="font-bold text-[#0F3A40]">{formatMoney(detailInvoice.other_fees_amount)}₫</span>
                                 </div>
                                 {Array.isArray(detailInvoice.subscription_services) && detailInvoice.subscription_services.length > 0 ? (
                                    <ul className="mt-3 space-y-2 pl-3 border-l-2 border-[#14B8A6]/25">
                                       {detailInvoice.subscription_services.map((line, idx) => (
                                          <li key={`${line.source}-${line.service_id ?? line.fee_id}-${idx}`} className="flex justify-between text-[13px]">
                                             <span className="text-[#4A787C]">{line.service_name}</span>
                                             <span className="font-bold text-[#0F3A40]">{formatMoney(line.monthly_price)}₫</span>
                                          </li>
                                       ))}
                                       {Number(detailInvoice.other_fees_manual || 0) > 0 ? (
                                          <li className="flex justify-between text-[13px]">
                                             <span className="text-[#4A787C]">Phí khác (thủ công)</span>
                                             <span className="font-bold text-[#0F3A40]">{formatMoney(detailInvoice.other_fees_manual)}₫</span>
                                          </li>
                                       ) : null}
                                    </ul>
                                 ) : null}
                              </div>
                              <div className="flex justify-between px-4 py-3 bg-[#F2FCFD]/50">
                                 <span className="font-bold text-[#0F3A40]">Tổng cộng</span>
                                 <span className="font-bold text-[#14B8A6] text-lg">{formatMoney(detailInvoice.total_amount)}₫</span>
                              </div>
                           </div>
                           <p className="text-[12px] text-[#82ABB0]">
                              Hạn thanh toán: {formatDueDate(detailInvoice.due_date)}
                           </p>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         ) : null}
      </div>
   );
}
