/* DashboardPage.jsx */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, BedDouble, Building, FileText, CalendarClock, Wrench, CheckCircle2, UserPlus, ArrowRight } from 'lucide-react';

export default function DashboardPage() {
   const [activeTab, setActiveTab] = useState('revenue');

   return (
      <div className="w-full max-w-[1200px] mx-auto mt-2">
         {/* Header */}
         <div className="flex justify-between items-end mb-8 pl-4">
            <div>
               <h1 className="text-3xl font-sans font-bold text-[#0F3A40]">Tổng quan</h1>
            </div>
            <div className="bg-[#F2FCFD] text-[#0F3A40] text-[13px] font-bold px-5 py-2.5 rounded-full flex items-center gap-2 shadow-sm border border-[#BCE1E5]/40 mr-4">
               <CalendarClock className="w-4 h-4 text-[#14B8A6]" />
               Hôm nay, {new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
         </div>

         {/* Top Metrics Grid */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 px-4">
            {/* Card 1: Doanh thu */}
            <div className="bg-[#F2FCFD] rounded-3xl p-7 shadow-sm border border-transparent flex flex-col justify-between hover:scale-[1.02] hover:bg-white hover:shadow-xl transition-all duration-300 cursor-pointer group">
               <div className="flex justify-between items-start mb-8">
                  <div className="w-[42px] h-[42px] rounded-full bg-[#D1EDF1] flex items-center justify-center group-hover:bg-[#14B8A6]/10 transition-colors">
                     <Banknote className="w-5 h-5 text-[#0F3A40]" />
                  </div>
                  <span className="bg-white text-[#14B8A6] text-xs font-bold px-3 py-1.5 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.04)]">+12.5%</span>
               </div>
               <div>
                  <p className="text-[11px] font-bold text-[#4A787C] uppercase tracking-widest mb-2">Tổng doanh thu tháng</p>
                  <h3 className="text-2xl font-bold text-[#0F3A40]">245.5M ₫</h3>
                  <Link to="/admin/payments" className="mt-4 text-[11px] font-bold text-[#14B8A6] flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                     Xem chi tiết <ArrowRight size={12} />
                  </Link>
               </div>
            </div>

            {/* Card 2: Phòng thuê */}
            <div className="bg-[#F2FCFD] rounded-3xl p-7 shadow-sm border border-transparent flex flex-col justify-between hover:scale-[1.02] hover:bg-white hover:shadow-xl transition-all duration-300 cursor-pointer group">
               <div className="flex justify-between items-start mb-8">
                  <div className="w-[42px] h-[42px] rounded-full bg-[#D1EDF1] flex items-center justify-center group-hover:bg-[#14B8A6]/10 transition-colors">
                     <BedDouble className="w-5 h-5 text-[#0F3A40]" />
                  </div>
                  <div className="w-14 h-1.5 bg-[#0F3A40] rounded-full mt-3"></div>
               </div>
               <div>
                  <p className="text-[11px] font-bold text-[#4A787C] uppercase tracking-widest mb-2">Số phòng đang thuê</p>
                  <h3 className="text-2xl font-bold text-[#0F3A40]">42 phòng</h3>
                  <Link to="/admin/rooms" className="mt-4 text-[11px] font-bold text-[#14B8A6] flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                     Xem chi tiết <ArrowRight size={12} />
                  </Link>
               </div>
            </div>

            {/* Card 3: Phòng trống */}
            <div className="bg-[#F2FCFD] rounded-3xl p-7 shadow-sm border border-transparent flex flex-col justify-between hover:scale-[1.02] hover:bg-white hover:shadow-xl transition-all duration-300 cursor-pointer group">
               <div className="flex justify-between items-start mb-8">
                  <div className="w-[42px] h-[42px] rounded-full bg-[#D1EDF1] flex items-center justify-center group-hover:bg-[#14B8A6]/10 transition-colors">
                     <Building className="w-5 h-5 text-[#0F3A40]" />
                  </div>
                  <div className="w-3 h-3 rounded-full bg-[#14B8A6] mt-2 shadow-[0_0_10px_rgba(20,184,166,0.4)]"></div>
               </div>
               <div>
                  <p className="text-[11px] font-bold text-[#4A787C] uppercase tracking-widest mb-2">Số phòng trống</p>
                  <h3 className="text-2xl font-bold text-[#0F3A40]">8 phòng</h3>
                  <Link to="/admin/rooms" className="mt-4 text-[11px] font-bold text-[#14B8A6] flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                     Xem chi tiết <ArrowRight size={12} />
                  </Link>
               </div>
            </div>

            {/* Card 4: Hóa đơn */}
            <div className="bg-[#F2FCFD] rounded-3xl p-7 shadow-sm border border-transparent relative flex flex-col justify-between hover:scale-[1.02] hover:bg-white hover:shadow-xl transition-all duration-300 cursor-pointer group">
               <div className="flex justify-between items-start mb-8">
                  <div className="w-[42px] h-[42px] rounded-full bg-[#FFECE8] flex items-center justify-center group-hover:bg-[#D14D4D]/10 transition-colors">
                     <FileText className="w-5 h-5 text-[#D14D4D]" />
                  </div>
               </div>
               <div className="flex justify-between items-end">
                  <div>
                     <p className="text-[11px] font-bold text-[#4A787C] uppercase tracking-widest mb-2">Hóa đơn chưa thanh toán</p>
                     <h3 className="text-2xl font-bold text-[#0F3A40]">12 hóa đơn</h3>
                     <Link to="/admin/invoices" className="mt-4 text-[11px] font-bold text-[#14B8A6] flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        Xem chi tiết <ArrowRight size={12} />
                     </Link>
                  </div>
                  <span className="text-[#D14D4D] text-[11px] font-bold whitespace-pre-line text-right mb-5">
                     - 3 days late<br />avg
                  </span>
               </div>
            </div>

            {/* Card 5: Hợp đồng */}
            <div className="bg-[#F2FCFD] rounded-3xl p-7 shadow-sm border border-transparent relative flex flex-col justify-between hover:scale-[1.02] hover:bg-white hover:shadow-xl transition-all duration-300 cursor-pointer group">
               <div className="flex justify-between items-start mb-8">
                  <div className="w-[42px] h-[42px] rounded-full bg-[#FFF3E0] flex items-center justify-center group-hover:bg-[#E68A00]/10 transition-colors">
                     <CalendarClock className="w-5 h-5 text-[#E68A00]" />
                  </div>
               </div>
               <div>
                  <p className="text-[11px] font-bold text-[#4A787C] uppercase tracking-widest mb-2">Hợp đồng sắp hết hạn</p>
                  <h3 className="text-2xl font-bold text-[#0F3A40]">5 hợp đồng</h3>
                  <Link to="/admin/tenants" className="mt-4 text-[11px] font-bold text-[#14B8A6] flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                     Xem chi tiết <ArrowRight size={12} />
                  </Link>
               </div>
            </div>

            {/* Card 6: Bảo trì */}
            <div className="bg-[#F2FCFD] rounded-3xl p-7 shadow-sm border border-transparent border-l-[4px] border-l-[#0F3A40] flex flex-col justify-between relative left-[-4px] w-[calc(100%+4px)] hover:scale-[1.02] hover:bg-white hover:shadow-xl transition-all duration-300 cursor-pointer group">
               <div className="flex justify-between items-start mb-8 pl-1">
                  <div className="w-[42px] h-[42px] rounded-full bg-[#0F3A40] flex items-center justify-center group-hover:bg-[#14B8A6]/20 transition-colors">
                     <Wrench className="w-5 h-5 text-[#14B8A6]" />
                  </div>
               </div>
               <div className="pl-1">
                  <p className="text-[11px] font-bold text-[#4A787C] uppercase tracking-widest mb-2">Yêu cầu bảo trì mới</p>
                  <h3 className="text-2xl font-bold text-[#0F3A40] flex items-baseline gap-2">
                     3 <span className="text-[12px] font-bold text-[#4A787C] tracking-wide">Phiếu chờ xử lý</span>
                  </h3>
                  <Link to="/admin/tickets" className="mt-4 text-[11px] font-bold text-[#14B8A6] flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                     Xem chi tiết <ArrowRight size={12} />
                  </Link>
               </div>
            </div>
         </div>

         {/* Main Content Grid: Chart & Activities */}
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 mb-12">
            {/* Chart Section (Left) */}
            <div className="lg:col-span-8 bg-[#F2FCFD] rounded-3xl p-8 shadow-sm border border-transparent">
               <div className="flex justify-between items-start mb-12">
                  <div>
                     <h3 className="text-xl font-bold text-[#0F3A40]">Doanh thu hàng tháng</h3>
                     <p className="text-[13px] text-[#82ABB0] mt-1.5 font-medium">Phân tích hiệu suất theo năm</p>
                  </div>
                  <div className="flex bg-[#EAF7F8] rounded-full p-1 border border-[#BCE1E5]/40 shadow-sm">
                     <button
                        onClick={() => setActiveTab('revenue')}
                        className={`px-5 py-2 rounded-full text-[12px] font-bold shadow-sm transition-all duration-300 ${activeTab === 'revenue' ? 'bg-white text-[#0F3A40]' : 'text-[#4A787C] hover:text-[#0F3A40]'}`}
                     >
                        Doanh thu
                     </button>
                     <button
                        onClick={() => setActiveTab('cost')}
                        className={`px-5 py-2 rounded-full text-[12px] font-bold shadow-sm transition-all duration-300 ${activeTab === 'cost' ? 'bg-white text-[#0F3A40]' : 'text-[#4A787C] hover:text-[#0F3A40]'}`}
                     >
                        Chi phí
                     </button>
                  </div>
               </div>
               <div className="h-[240px] w-full flex flex-col relative mt-2">
                  <div className="flex-1 relative w-full flex items-end px-2">
                     <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                        <defs>
                           <linearGradient id="chartGradientRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#14B8A6" stopOpacity="0" />
                           </linearGradient>
                           <linearGradient id="chartGradientCost" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#D14D4D" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#D14D4D" stopOpacity="0" />
                           </linearGradient>
                        </defs>

                        {/* Grid lines */}
                        <line x1="0" y1="20" x2="100" y2="20" stroke="#BCE1E5" strokeWidth="1" strokeOpacity="0.6" vectorEffect="non-scaling-stroke" strokeDasharray="4 4" />
                        <line x1="0" y1="40" x2="100" y2="40" stroke="#BCE1E5" strokeWidth="1" strokeOpacity="0.6" vectorEffect="non-scaling-stroke" strokeDasharray="4 4" />
                        <line x1="0" y1="60" x2="100" y2="60" stroke="#BCE1E5" strokeWidth="1" strokeOpacity="0.6" vectorEffect="non-scaling-stroke" strokeDasharray="4 4" />
                        <line x1="0" y1="80" x2="100" y2="80" stroke="#BCE1E5" strokeWidth="1" strokeOpacity="0.6" vectorEffect="non-scaling-stroke" strokeDasharray="4 4" />

                        {/* Chart Gradient Fill */}
                        <polygon
                           points={activeTab === 'revenue'
                              ? "0,100 0,60 9.1,55 18.2,70 27.3,40 36.4,45 45.5,20 54.5,30 63.6,50 72.7,65 81.8,30 90.9,40 100,25 100,100"
                              : "0,100 0,80 9.1,85 18.2,75 27.3,90 36.4,85 45.5,70 54.5,60 63.6,80 72.7,85 81.8,60 90.9,75 100,50 100,100"
                           }
                           fill={activeTab === 'revenue' ? "url(#chartGradientRev)" : "url(#chartGradientCost)"}
                           style={{ transition: 'all 0.5s ease-in-out' }}
                        />
                        {/* Chart Line */}
                        <polyline
                           points={activeTab === 'revenue'
                              ? "0,60 9.1,55 18.2,70 27.3,40 36.4,45 45.5,20 54.5,30 63.6,50 72.7,65 81.8,30 90.9,40 100,25"
                              : "0,80 9.1,85 18.2,75 27.3,90 36.4,85 45.5,70 54.5,60 63.6,80 72.7,85 81.8,60 90.9,75 100,50"
                           }
                           fill="none"
                           stroke={activeTab === 'revenue' ? "#14B8A6" : "#D14D4D"}
                           strokeWidth="3.5"
                           vectorEffect="non-scaling-stroke"
                           strokeLinecap="round"
                           strokeLinejoin="round"
                           style={{ transition: 'all 0.5s ease-in-out' }}
                        />
                     </svg>
                  </div>
                  <div className="h-8 border-t border-[#BCE1E5]/80 flex items-center justify-between px-2 pt-4 z-10 w-full">
                     {['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'].map((month, i) => (
                        <span key={i} className="text-[11px] font-bold text-[#4A787C] w-full text-center">{month}</span>
                     ))}
                  </div>
               </div>
            </div>

            {/* Recent Activity (Right) */}
            <div className="lg:col-span-4 bg-[#F2FCFD] rounded-3xl p-8 shadow-sm border border-transparent">
               <h3 className="text-xl font-bold text-[#0F3A40] mb-8">Hoạt động gần đây</h3>
               <div className="space-y-7">
                  <div className="flex gap-5 items-start hover:bg-white/60 p-3 -m-3 rounded-2xl transition-all cursor-pointer group">
                     <div className="w-[42px] h-[42px] rounded-full bg-[#D1EDF1] flex items-center justify-center shrink-0 group-hover:bg-[#14B8A6]/10 transition-colors">
                        <UserPlus className="w-5 h-5 text-[#0F3A40]" />
                     </div>
                     <div className="mt-0.5">
                        <h4 className="text-[13px] font-bold text-[#0F3A40] leading-snug">Khách thuê mới chuyển vào P.402</h4>
                        <p className="text-[11px] font-medium text-[#4A787C] mt-1.5">2 giờ trước</p>
                     </div>
                  </div>
                  <div className="flex gap-5 items-start hover:bg-white/60 p-3 -m-3 rounded-2xl transition-all cursor-pointer group">
                     <div className="w-[42px] h-[42px] rounded-full bg-[#FFF3E0] flex items-center justify-center shrink-0 group-hover:bg-[#E68A00]/10 transition-colors">
                        <Wrench className="w-5 h-5 text-[#E68A00]" />
                     </div>
                     <div className="mt-0.5">
                        <h4 className="text-[13px] font-bold text-[#0F3A40] leading-snug">Hoàn thành bảo trì: Điều hòa P.205</h4>
                        <p className="text-[11px] font-medium text-[#4A787C] mt-1.5">Hôm qua</p>
                     </div>
                  </div>
                  <div className="flex gap-5 items-start hover:bg-white/60 p-3 -m-3 rounded-2xl transition-all cursor-pointer group">
                     <div className="w-[42px] h-[42px] rounded-full bg-[#E8F8F5] flex items-center justify-center shrink-0 group-hover:bg-[#14B8A6]/10 transition-colors">
                        <CheckCircle2 className="w-5 h-5 text-[#14B8A6]" />
                     </div>
                     <div className="mt-0.5">
                        <h4 className="text-[13px] font-bold text-[#0F3A40] leading-snug">Đã nhận thanh toán thuê: Căn 12A</h4>
                        <p className="text-[11px] font-medium text-[#4A787C] mt-1.5">2 ngày trước</p>
                     </div>
                  </div>
                  <div className="flex gap-5 items-start hover:bg-white/60 p-3 -m-3 rounded-2xl transition-all cursor-pointer group">
                     <div className="w-[42px] h-[42px] rounded-full bg-[#F5F5F5] flex items-center justify-center shrink-0 group-hover:bg-[#0F3A40]/10 transition-colors">
                        <BedDouble className="w-5 h-5 text-[#4A787C]" />
                     </div>
                     <div className="mt-0.5">
                        <h4 className="text-[13px] font-bold text-[#0F3A40] leading-snug">Phòng 301 đã được đặt lịch xem</h4>
                        <p className="text-[11px] font-medium text-[#4A787C] mt-1.5">3 ngày trước</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}
