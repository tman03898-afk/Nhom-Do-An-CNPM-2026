import { useState } from 'react';
import { Banknote, BedDouble, Building, FileText, CalendarClock, Wrench, CheckCircle2, UserPlus, Map } from 'lucide-react';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('revenue');

  return (
    <div className="w-full max-w-[1200px] mx-auto mt-2">
       {/* Header */}
       <div className="flex justify-between items-end mb-8 pl-4">
          <div>
            <p className="text-[10px] font-bold text-[#4A787C] uppercase tracking-widest mb-1 mt-2">BẢNG ĐIỀU KHIỂN</p>
            <h1 className="text-3xl font-sans font-bold text-[#0F3A40]">Tổng quan</h1>
          </div>
          <div className="bg-[#F2FCFD] text-[#0F3A40] text-[13px] font-bold px-5 py-2.5 rounded-full flex items-center gap-2 shadow-sm border border-[#BCE1E5]/40 mr-4">
            <CalendarClock className="w-4 h-4 text-[#14B8A6]" /> Hôm nay, 24 Thg 10 2023
          </div>
       </div>

       {/* Top Metrics Grid */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 px-4">
          {/* Card 1 */}
          <div className="bg-[#F2FCFD] rounded-3xl p-7 shadow-sm border border-transparent flex flex-col justify-between">
             <div className="flex justify-between items-start mb-8">
                <div className="w-[42px] h-[42px] rounded-full bg-[#D1EDF1] flex items-center justify-center">
                   <Banknote className="w-5 h-5 text-[#0F3A40]" />
                </div>
                <span className="bg-white text-[#14B8A6] text-xs font-bold px-3 py-1.5 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.04)]">+12.5%</span>
             </div>
             <div>
                <p className="text-[11px] font-bold text-[#4A787C] uppercase tracking-widest mb-2">Tổng doanh thu tháng</p>
                <h3 className="text-2xl font-bold text-[#0F3A40]">245.5M ₫</h3>
             </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#F2FCFD] rounded-3xl p-7 shadow-sm border border-transparent flex flex-col justify-between">
             <div className="flex justify-between items-start mb-8">
                <div className="w-[42px] h-[42px] rounded-full bg-[#D1EDF1] flex items-center justify-center">
                   <BedDouble className="w-5 h-5 text-[#0F3A40]" />
                </div>
                <div className="w-14 h-1.5 bg-[#0F3A40] rounded-full mt-3"></div>
             </div>
             <div>
                <p className="text-[11px] font-bold text-[#4A787C] uppercase tracking-widest mb-2">Số phòng đang thuê</p>
                <h3 className="text-2xl font-bold text-[#0F3A40]">42 phòng</h3>
             </div>
          </div>

          {/* Card 3 */}
          <div className="bg-[#F2FCFD] rounded-3xl p-7 shadow-sm border border-transparent flex flex-col justify-between">
             <div className="flex justify-between items-start mb-8">
                <div className="w-[42px] h-[42px] rounded-full bg-[#D1EDF1] flex items-center justify-center">
                   <Building className="w-5 h-5 text-[#0F3A40]" />
                </div>
                <div className="w-3 h-3 rounded-full bg-[#14B8A6] mt-2 shadow-[0_0_10px_rgba(20,184,166,0.4)]"></div>
             </div>
             <div>
                <p className="text-[11px] font-bold text-[#4A787C] uppercase tracking-widest mb-2">Số phòng trống</p>
                <h3 className="text-2xl font-bold text-[#0F3A40]">8 phòng</h3>
             </div>
          </div>

          {/* Card 4 */}
          <div className="bg-[#F2FCFD] rounded-3xl p-7 shadow-sm border border-transparent relative flex flex-col justify-between">
             <div className="flex justify-between items-start mb-8">
                <div className="w-[42px] h-[42px] rounded-full bg-[#FFECE8] flex items-center justify-center">
                   <FileText className="w-5 h-5 text-[#D14D4D]" />
                </div>
             </div>
             <div className="flex justify-between items-end">
               <div>
                  <p className="text-[11px] font-bold text-[#4A787C] uppercase tracking-widest mb-2">Hóa đơn chưa thanh toán</p>
                  <h3 className="text-2xl font-bold text-[#0F3A40]">12 hóa đơn</h3>
               </div>
               <span className="text-[#D14D4D] text-[11px] font-bold whitespace-pre-line text-right">
                 - 3 days late<br/>avg
               </span>
             </div>
          </div>

          {/* Card 5 */}
          <div className="bg-[#F2FCFD] rounded-3xl p-7 shadow-sm border border-transparent relative flex flex-col justify-between">
             <div className="flex justify-between items-start mb-8">
                <div className="w-[42px] h-[42px] rounded-full bg-[#FFF3E0] flex items-center justify-center">
                   <CalendarClock className="w-5 h-5 text-[#E68A00]" />
                </div>
             </div>
             <div>
                <p className="text-[11px] font-bold text-[#4A787C] uppercase tracking-widest mb-2">Hợp đồng sắp hết hạn</p>
                <h3 className="text-2xl font-bold text-[#0F3A40]">5 hợp đồng</h3>
                <p className="text-[11px] text-[#82ABB0] mt-1.5 font-medium">Trong tháng này</p>
             </div>
          </div>

          {/* Card 6 */}
          <div className="bg-[#F2FCFD] rounded-3xl p-7 shadow-sm border border-transparent border-l-[4px] border-l-[#0F3A40] flex flex-col justify-between relative left-[-4px] w-[calc(100%+4px)]">
             <div className="flex justify-between items-start mb-8 pl-1">
                <div className="w-[42px] h-[42px] rounded-full bg-[#0F3A40] flex items-center justify-center">
                   <Wrench className="w-5 h-5 text-[#14B8A6]" />
                </div>
             </div>
             <div className="pl-1">
                <p className="text-[11px] font-bold text-[#4A787C] uppercase tracking-widest mb-2">Yêu cầu bảo trì mới</p>
                <h3 className="text-2xl font-bold text-[#0F3A40] flex items-baseline gap-2">
                   3 <span className="text-[12px] font-bold text-[#4A787C] tracking-wide">Phiếu chờ xử lý</span>
                </h3>
             </div>
          </div>
       </div>

       {/* Chart Section */}
       <div className="px-4 mb-8">
         <div className="bg-[#F2FCFD] rounded-3xl p-8 shadow-sm border border-transparent">
            <div className="flex justify-between items-start mb-12">
               <div>
                  <h3 className="text-xl font-bold text-[#0F3A40]">Doanh thu hàng tháng</h3>
                  <p className="text-[13px] text-[#82ABB0] mt-1.5 font-medium">Year over year performance analysis</p>
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
                        <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.25"/>
                        <stop offset="100%" stopColor="#14B8A6" stopOpacity="0"/>
                      </linearGradient>
                      <linearGradient id="chartGradientCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D14D4D" stopOpacity="0.25"/>
                        <stop offset="100%" stopColor="#D14D4D" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    
                    {/* Grid lines */}
                    <line x1="0" y1="20" x2="100" y2="20" stroke="#BCE1E5" strokeWidth="1" strokeOpacity="0.6" vectorEffect="non-scaling-stroke" strokeDasharray="4 4"/>
                    <line x1="0" y1="40" x2="100" y2="40" stroke="#BCE1E5" strokeWidth="1" strokeOpacity="0.6" vectorEffect="non-scaling-stroke" strokeDasharray="4 4"/>
                    <line x1="0" y1="60" x2="100" y2="60" stroke="#BCE1E5" strokeWidth="1" strokeOpacity="0.6" vectorEffect="non-scaling-stroke" strokeDasharray="4 4"/>
                    <line x1="0" y1="80" x2="100" y2="80" stroke="#BCE1E5" strokeWidth="1" strokeOpacity="0.6" vectorEffect="non-scaling-stroke" strokeDasharray="4 4"/>

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
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, i) => (
                     <span key={i} className="text-[11px] font-bold text-[#4A787C] w-full text-center">{month}</span>
                  ))}
               </div>
            </div>
         </div>
       </div>

       {/* Bottom sections */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 px-4">
          {/* Recent Activity */}
          <div className="bg-[#F2FCFD] rounded-3xl p-8 shadow-sm border border-transparent">
             <h3 className="text-xl font-bold text-[#0F3A40] mb-8">Hoạt động gần đây</h3>
             <div className="space-y-7">
                <div className="flex gap-5 items-start">
                   <div className="w-[42px] h-[42px] rounded-full bg-[#D1EDF1] flex items-center justify-center shrink-0">
                      <UserPlus className="w-5 h-5 text-[#0F3A40]" />
                   </div>
                   <div className="mt-0.5">
                      <h4 className="text-[13px] font-bold text-[#0F3A40] leading-snug">Khách thuê mới đã chuyển vào Phòng 402</h4>
                      <p className="text-[11px] font-medium text-[#4A787C] mt-1.5">2 giờ trước</p>
                   </div>
                </div>
                <div className="flex gap-5 items-start">
                   <div className="w-[42px] h-[42px] rounded-full bg-[#FFF3E0] flex items-center justify-center shrink-0">
                      <Wrench className="w-5 h-5 text-[#E68A00]" />
                   </div>
                   <div className="mt-0.5">
                      <h4 className="text-[13px] font-bold text-[#0F3A40] leading-snug">Yêu cầu bảo trì đã hoàn thành: Điều hòa Phòng 205</h4>
                      <p className="text-[11px] font-medium text-[#4A787C] mt-1.5">Hôm qua</p>
                   </div>
                </div>
                <div className="flex gap-5 items-start">
                   <div className="w-[42px] h-[42px] rounded-full bg-[#E8F8F5] flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-[#14B8A6]" />
                   </div>
                   <div className="mt-0.5">
                      <h4 className="text-[13px] font-bold text-[#0F3A40] leading-snug">Đã nhận thanh toán tiền thuê: Căn hộ 12A</h4>
                      <p className="text-[11px] font-medium text-[#4A787C] mt-1.5">2 ngày trước</p>
                   </div>
                </div>
             </div>
          </div>

          {/* Building Overview */}
          <div className="bg-[#F2FCFD] rounded-3xl p-8 shadow-sm border border-transparent">
             <h3 className="text-xl font-bold text-[#0F3A40] mb-8">Tổng quan tòa nhà</h3>
             <div className="w-full h-44 bg-[#0F3A40] rounded-2xl relative overflow-hidden mb-6 shadow-md">
                {/* Image Placeholder matched with mock */}
                <img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80" alt="Building Overview" className="w-full h-full object-cover opacity-60 mix-blend-luminosity"/>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0F3A40] to-transparent p-6 pt-16">
                   <h4 className="text-white font-bold text-lg">The Nest District 1</h4>
                   <p className="text-white/80 text-[11px] font-medium mt-1">Lấp đầy 88% • Đánh giá trung bình 4.9</p>
                </div>
             </div>
             <div className="flex items-center justify-between px-2 pt-2">
                <div className="flex gap-6">
                   <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#14B8A6]"></div>
                      <span className="text-[13px] font-bold text-[#0F3A40]">Trống: 8</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#0F3A40]"></div>
                      <span className="text-[13px] font-bold text-[#0F3A40]">Đã thuê: 42</span>
                   </div>
                </div>
                <button className="text-[13px] font-bold text-[#14B8A6] hover:text-[#0F3A40] transition-colors flex items-center gap-1.5">
                   Xem bản đồ chi tiết
                </button>
             </div>
          </div>
       </div>
    </div>
  );
}
