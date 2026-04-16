import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
   Receipt, Filter, Search, ChevronLeft, ChevronRight,
   Eye, CheckCircle2, AlertCircle, CreditCard, X
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function TenantInvoicePage() {
   const navigate = useNavigate();
   const [searchQuery, setSearchQuery] = useState('');
   const [filterMonth, setFilterMonth] = useState('Tất cả');
   const [filterStatus, setFilterStatus] = useState('Tất cả');

   const invoices = [
      {
         month: '10/2023', rent: '4.500.000', electric: '850.000', water: '100.000',
         total: '5.450.000', status: 'Chưa thanh toán', statusType: 'unpaid'
      },
      {
         month: '09/2023', rent: '4.500.000', electric: '720.000', water: '95.000',
         total: '5.315.000', status: 'Đã thanh toán', statusType: 'paid'
      },
      {
         month: '08/2023', rent: '4.500.000', electric: '980.000', water: '110.000',
         total: '5.590.000', status: 'Đã thanh toán', statusType: 'paid'
      },
   ];

   const filteredInvoices = invoices.filter(inv => {
      const matchesSearch = 
         inv.month.toLowerCase().includes(searchQuery.toLowerCase()) ||
         inv.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
         inv.total.includes(searchQuery);
      
      const matchesMonth = filterMonth === 'Tất cả' || filterMonth.includes(inv.month);
      const matchesStatus = filterStatus === 'Tất cả' || inv.status === filterStatus;

      return matchesSearch && matchesMonth && matchesStatus;
   });

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
                     <h2 className="text-[36px] font-bold text-[#0F3A40]">5.450.000</h2>
                     <span className="text-xl font-bold text-[#0F3A40]">VNĐ</span>
                  </div>
                  <p className="text-[12px] font-bold text-[#D14D4D] mt-3 flex items-center gap-1.5">
                     <AlertCircle size={14} /> Hạn thanh toán: 05/11/2023
                  </p>
               </div>
               <button
                  onClick={() => navigate('/tenant/payment')}
                  className="relative bg-[#0F3A40] hover:bg-[#1F545B] text-white px-8 py-4 rounded-3xl font-bold text-[15px] shadow-xl transition-all flex items-center gap-2 group/btn"
               >
                  Thanh toán ngay <CreditCard size={18} className="group-hover/btn:rotate-12 transition-transform" />
               </button>
            </div>

            <div className="w-full md:w-[320px] bg-white/40 rounded-[40px] p-8 border border-white/50 shadow-sm flex flex-col justify-center">
               <p className="text-[12px] font-bold text-[#82ABB0] mb-2">Hóa đơn mới nhất</p>
               <h3 className="text-[22px] font-bold text-[#0F3A40]">Tháng 10/2023</h3>
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
                        <option>Đã thanh toán</option>
                        <option>Chưa thanh toán</option>
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
                           <td className="px-6 py-6">
                              <span className="font-bold text-[#0F3A40] text-[16px]">{inv.total}</span>
                           </td>
                           <td className="px-6 py-6">
                              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold tracking-wide transition-all ${inv.statusType === 'paid'
                                    ? 'bg-[#EBFDFB] text-[#14B8A6]'
                                    : 'bg-[#FFF0F0] text-[#D14D4D]'
                                 }`}>
                                 {inv.statusType === 'paid' ? <CheckCircle2 size={12} /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                                 {inv.status?.toUpperCase()}
                              </div>
                           </td>
                           <td className="px-6 py-6 last:rounded-r-3xl text-center">
                              <div className="flex items-center justify-center gap-3">
                                 <button className="p-2.5 rounded-xl bg-[#F2FCFD] border border-[#BCE1E5]/40 text-[#4A787C] hover:text-[#14B8A6] hover:bg-white transition-all shadow-sm">
                                    <Eye size={16} />
                                 </button>
                                 {inv.statusType === 'unpaid' && (
                                    <button
                                       onClick={(e) => { e.stopPropagation(); navigate('/tenant/payment'); }}
                                       className="px-5 py-2.5 rounded-xl bg-[#14B8A6] text-white text-[12px] font-bold shadow-lg shadow-[#14B8A6]/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                                    >
                                       Thanh toán
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
               <span>Hiển thị {filteredInvoices.length} trong tổng số <span className="text-[#0F3A40]">{invoices.length} hóa đơn</span></span>
               <div className="flex items-center gap-3">
                  <button className="p-2 rounded-full hover:bg-[#F2FCFD] transition-all"><ChevronLeft size={16} /></button>
                  <button className="w-8 h-8 rounded-full bg-[#0F3A40] text-white flex items-center justify-center shadow-lg shadow-[#0F3A40]/20">1</button>
                  <button className="w-8 h-8 rounded-full text-[#4A787C] hover:bg-[#F2FCFD] flex items-center justify-center transition-all">2</button>
                  <button className="p-2 rounded-full hover:bg-[#F2FCFD] transition-all"><ChevronRight size={16} /></button>
               </div>
            </div>
         </div>
      </div>
   );
}
