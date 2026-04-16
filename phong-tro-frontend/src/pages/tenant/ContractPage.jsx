import { useState } from 'react';
import {
   ClipboardList, Download, MessageSquare,
   Calendar, CreditCard, ShieldCheck,
   Trash2, Home, CheckCircle2, ChevronRight, SearchX, Search, X
} from 'lucide-react';

export default function ContractPage() {
   const [searchQuery, setSearchQuery] = useState('');
   const rules = [
      {
         id: 1,
         title: "1. Quy định về thanh toán",
         desc: "Tiền nhà phải được thanh toán trước ngày 05 hàng tháng. Quá hạn sẽ tính phí phạt 100.000đ/ngày."
      },
      {
         id: 2,
         title: "2. Quy định an ninh",
         desc: "Giờ giấc tự do nhưng hạn chế làm ồn sau 22:00. Khách đến chơi qua đêm phải đăng ký với ban quản lý."
      },
      {
         id: 3,
         title: "3. Vệ sinh chung",
         desc: "Cư dân có trách nhiệm giữ gìn vệ sinh khu vực hành lang và thang máy. Rác thải phải được phân loại đúng nơi quy định."
      },
      {
         id: 4,
         title: "4. Sử dụng tiện ích",
         desc: "Hồ bơi và phòng Gym mở cửa từ 06:00 đến 21:00 hàng ngày dành riêng cho cư dân The Nest."
      },
      {
         id: 5,
         title: "5. Bảo trì thiết bị",
         desc: "Ban quản lý chịu trách nhiệm sửa chữa các hư hỏng do hao mòn tự nhiên. Các hư hỏng do lỗi người dùng sẽ tính phí theo bảng giá niêm yết."
      }
   ];

   const filteredRules = rules.filter(rule => 
      rule.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      rule.desc.toLowerCase().includes(searchQuery.toLowerCase())
   );

   return (
      <div className="flex flex-col gap-8 pb-10">
         {/* Header */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
               {/* <p className="text-[11px] font-bold text-[#14B8A6] uppercase tracking-widest mb-1.5">QUẢN LÝ THUÊ NHÀ</p> */}
               <h1 className="text-[34px] font-sans font-bold text-[#0F3A40] tracking-tight">Hợp đồng thuê nhà</h1>
            </div>
            <div className="flex gap-4">
               <button className="bg-[#0F3A40] hover:bg-[#1F545B] text-white px-6 py-3 rounded-full text-[14px] font-bold shadow-lg shadow-[#0F3A40]/10 transition-all flex items-center gap-2">
                  <Download size={18} /> Tải PDF
               </button>
               <button className="bg-white/60 hover:bg-white text-[#0F3A40] border border-white px-6 py-3 rounded-full text-[14px] font-bold shadow-sm transition-all flex items-center gap-2">
                  <MessageSquare size={18} /> Liên hệ Admin
               </button>
            </div>
         </div>

         <div className="flex flex-col lg:flex-row gap-8">
            {/* Main Contract Details (Left) */}
            <div className="flex-1 bg-white/60 backdrop-blur-md rounded-[40px] p-10 border border-white shadow-sm h-fit">
               <div className="flex justify-between items-start mb-12">
                  <div className="flex items-center gap-6">
                     <div className="w-16 h-16 rounded-[24px] bg-[#EAF7F8] flex items-center justify-center text-[#14B8A6] shadow-sm">
                        <Home size={32} />
                     </div>
                     <div>
                        <h2 className="text-[24px] font-bold text-[#0F3A40]">Khu trọ The Nest</h2>
                        <p className="text-[#82ABB0] font-medium text-[15px]">P.302 • Tầng 3 • Tòa A</p>
                     </div>
                  </div>
                  <div className="bg-[#EBFDFB] text-[#14B8A6] text-[11px] font-extrabold px-5 py-2 rounded-full tracking-widest uppercase border border-[#14B8A6]/20 shadow-sm">
                     Đang hiệu lực
                  </div>
               </div>

               {/* Metrics Grid */}
               <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
                  <div className="flex flex-col gap-1.5">
                     <p className="text-[10px] font-extrabold text-[#82ABB0] uppercase tracking-widest">NGÀY BẮT ĐẦU</p>
                     <p className="text-[18px] font-bold text-[#0F3A40]">15/09/2023</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                     <p className="text-[10px] font-extrabold text-[#82ABB0] uppercase tracking-widest">NGÀY KẾT THÚC</p>
                     <p className="text-[18px] font-bold text-[#0F3A40]">15/09/2024</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                     <p className="text-[10px] font-extrabold text-[#82ABB0] uppercase tracking-widest">TIỀN THUÊ</p>
                     <p className="text-[18px] font-bold text-[#14B8A6]">7.500.000₫</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                     <p className="text-[10px] font-extrabold text-[#82ABB0] uppercase tracking-widest">TIỀN CỌC</p>
                     <p className="text-[18px] font-bold text-[#0F3A40]">15.000.000₫</p>
                  </div>
               </div>

               {/* Visual Decor Element */}
               <div className="relative h-[280px] rounded-[40px] overflow-hidden mb-12 group">
                  <img
                     src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200"
                     alt="Modern Living Space"
                     className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F3A40]/80 via-transparent to-transparent flex items-end p-10">
                     <div className="flex items-center gap-3 text-white">
                        <ShieldCheck size={20} className="text-[#14B8A6]" />
                        <span className="font-medium text-[15px]">Căn hộ đã được kiểm định an toàn & đầy đủ nội thất</span>
                     </div>
                  </div>
               </div>
            </div>

            {/* Rules & Support (Right) */}
            <div className="w-full lg:w-[420px] flex flex-col gap-8">
               {/* Rules Card */}
               <div className="bg-white/60 backdrop-blur-md rounded-[40px] p-8 border border-white shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-[#EAF7F8] flex items-center justify-center text-[#14B8A6]">
                           <ClipboardList size={18} />
                        </div>
                        <h3 className="text-xl font-bold text-[#0F3A40]">Điều khoản & Quy định</h3>
                     </div>
                     
                     {/* Local Search Bar */}
                     <div className="relative w-full md:w-[200px] group">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#82ABB0] group-focus-within:text-[#14B8A6] transition-colors" />
                        <input 
                           type="text"
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           placeholder="Tìm nhanh..."
                           className="w-full bg-[#F2FCFD] border border-[#BCE1E5]/40 rounded-2xl pl-10 pr-8 py-2 text-[12px] outline-none focus:border-[#14B8A6]/30 transition-all font-bold text-[#0F3A40]"
                        />
                        {searchQuery && (
                           <button 
                              onClick={() => setSearchQuery('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#82ABB0] hover:text-[#D14D4D] transition-colors"
                           >
                              <X size={12} />
                           </button>
                        )}
                     </div>
                  </div>

                  <div className="space-y-8">
                     {filteredRules.length > 0 ? (
                        filteredRules.map((rule) => (
                           <div key={rule.id} className="flex flex-col gap-2">
                              <h4 className="text-[15px] font-bold text-[#0F3A40] leading-tight">{rule.title}</h4>
                              <p className="text-[13px] text-[#4A787C] leading-relaxed font-medium">
                                 {rule.desc}
                              </p>
                           </div>
                        ))
                     ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                           <div className="w-16 h-16 rounded-full bg-[#F2FCFD] flex items-center justify-center text-[#82ABB0] mb-4">
                              <SearchX size={32} />
                           </div>
                           <p className="text-[15px] font-bold text-[#0F3A40]">Không tìm thấy quy định nào</p>
                           <p className="text-[13px] text-[#82ABB0] mt-1">Vui lòng thử từ khóa khác</p>
                        </div>
                     )}
                  </div>

                  <button className="w-full mt-12 py-4 rounded-3xl bg-white border border-[#BCE1E5]/50 text-[#14B8A6] font-bold text-[14px] hover:bg-[#F2FCFD] transition-all flex items-center justify-center gap-2">
                     Xem toàn bộ chi tiết điều khoản <ChevronRight size={16} />
                  </button>
               </div>

               {/* Support Quick Help */}
               <div className="bg-[#14B8A6] rounded-[40px] p-8 border border-white shadow-xl shadow-[#14B8A6]/20 text-white">
                  <h3 className="text-[20px] font-bold mb-3">Hỗ trợ nhanh</h3>
                  <p className="text-white/80 text-[14px] leading-relaxed mb-8">
                     Mọi thắc mắc về hợp đồng vui lòng liên hệ Admin qua Zalo hoặc Hotline.
                  </p>
                  <div className="flex gap-4">
                     <button className="flex-1 py-3.5 rounded-2xl bg-white/15 hover:bg-white/25 transition-all text-white font-bold text-[13.5px] border border-white/20">
                        Zalo hỗ trợ
                     </button>
                     <button className="flex-1 py-3.5 rounded-2xl bg-white text-[#0F3A40] hover:bg-[#DDF5F7] transition-all font-bold text-[13.5px] shadow-lg">
                        Hotline
                     </button>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}
