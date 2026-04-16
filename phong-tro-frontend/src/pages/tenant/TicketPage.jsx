import { useState } from 'react';
import {
   AlertTriangle, Upload, Send,
   History, CheckCircle2, Clock,
   PenTool, PhoneCall, ChevronRight,
   Image as ImageIcon, X, SearchX, Search
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function TenantTicketPage() {
   const [searchQuery, setSearchQuery] = useState('');
   const { addToast } = useToast();
   const [dragActive, setDragActive] = useState(false);
   const [title, setTitle] = useState('');
   const [desc, setDesc] = useState('');

   const [history, setHistory] = useState([
      {
         id: 1,
         title: 'Hỏng điều hòa',
         room: 'Phòng 402',
         date: '12/10/2023',
         status: 'ĐANG THỰC HIỆN',
         statusColor: 'bg-[#EBF4FF] text-[#3B82F6]',
         desc: 'Kỹ thuật viên đang kiểm tra bảng mạch...'
      },
      {
         id: 2,
         title: 'Thay bóng đèn hành lang',
         room: 'Hành lang tầng 4',
         date: '08/10/2023',
         status: 'HOÀN THÀNH',
         statusColor: 'bg-[#EBFDFB] text-[#14B8A6]',
         desc: 'Đã thay mới bóng đèn LED 12W.'
      },
      {
         id: 3,
         title: 'Cửa sổ bị kẹt',
         room: 'Phòng 402',
         date: '05/10/2023',
         status: 'CHỜ XỬ LÝ',
         statusColor: 'bg-[#F5F5F5] text-[#82ABB0]',
         desc: 'Đã tiếp nhận yêu cầu.'
      }
   ]);

   const filteredHistory = history.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.status.toLowerCase().includes(searchQuery.toLowerCase())
   );

   const handleSubmit = (e) => {
      e.preventDefault();
      if (!title || !desc) {
         addToast('Vui lòng điền đầy đủ tiêu đề và mô tả!', 'error');
         return;
      }

      const newTicket = {
         id: Date.now(),
         title,
         room: 'Phòng 402', // Mock user room
         date: new Date().toLocaleDateString('vi-VN'),
         status: 'CHỜ XỬ LÝ',
         statusColor: 'bg-[#F5F5F5] text-[#82ABB0]',
         desc: desc
      };

      setHistory([newTicket, ...history]);
      setTitle('');
      setDesc('');
      addToast('Gửi yêu cầu thành công! Đội ngũ kỹ thuật sẽ sớm phản hồi.');
   };

   return (
      <div className="flex flex-col gap-8 pb-10">
         {/* Header */}
         <div>
            <h1 className="text-[34px] font-sans font-bold text-[#0F3A40] tracking-tight">Yêu cầu sửa chữa</h1>
            <p className="text-[14.5px] text-[#4A787C] font-medium mt-2 max-w-[600px]">
               Chúng tôi luôn sẵn sàng hỗ trợ bạn. Vui lòng cung cấp chi tiết sự cố để đội ngũ kỹ thuật xử lý nhanh nhất có thể.
            </p>
         </div>

         <div className="flex flex-col lg:flex-row gap-10">
            {/* Form Section (Left) */}
            <div className="flex-1 bg-white/60 backdrop-blur-md rounded-[40px] p-10 border border-white shadow-sm h-fit">
               <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="space-y-3">
                     <label className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-widest pl-2">TIÊU ĐỀ SỰ CỐ</label>
                     <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ví dụ: Vòi nước bị rò rỉ"
                        className="w-full bg-[#F2FCFD] border border-[#BCE1E5]/40 rounded-2xl px-6 py-4 text-[14px] outline-none focus:border-[#14B8A6]/30 transition-all text-[#0F3A40] font-medium"
                     />
                  </div>

                  <div className="space-y-3">
                     <label className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-widest pl-2">MÔ TẢ CHI TIẾT</label>
                     <textarea
                        rows={5}
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        placeholder="Mô tả cụ thể tình trạng và vị trí sự cố..."
                        className="w-full bg-[#F2FCFD] border border-[#BCE1E5]/40 rounded-3xl px-6 py-4 text-[14px] outline-none focus:border-[#14B8A6]/30 transition-all text-[#0F3A40] font-medium resize-none"
                     />
                  </div>

                  <div className="space-y-3">
                     <label className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-widest pl-2">HÌNH ẢNH ĐÍNH KÈM</label>
                     <div
                        className={`relative h-[220px] rounded-[32px] border-2 border-dashed transition-all flex flex-col items-center justify-center bg-[#F2FCFD]/40 ${dragActive ? 'border-[#14B8A6] bg-[#EAF7F8]' : 'border-[#BCE1E5]/50 hover:border-[#14B8A6]/50'
                           }`}
                        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={(e) => { e.preventDefault(); setDragActive(false); }}
                     >
                        <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" />
                        <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-[#14B8A6] shadow-sm mb-4">
                           <Upload size={24} />
                        </div>
                        <p className="text-[14px] font-bold text-[#0F3A40] mb-1">
                           Kéo thả ảnh hoặc <span className="text-[#14B8A6] underline">chọn tệp</span>
                        </p>
                        <p className="text-[11px] text-[#82ABB0] font-medium">Hỗ trợ JPG, PNG (Tối đa 5MB)</p>
                     </div>
                  </div>

                  <button
                     type="submit"
                     className="w-full py-5 rounded-[24px] bg-[#0F3A40] hover:bg-[#1F545B] text-white font-bold text-[16px] shadow-xl shadow-[#0F3A40]/10 transition-all flex items-center justify-center gap-3"
                  >
                     <Send size={18} /> Gửi yêu cầu
                  </button>
               </form>
            </div>

            {/* History & Support (Right) */}
            <div className="w-full lg:w-[420px] flex flex-col gap-10">
               {/* History List */}
               <div className="flex flex-col gap-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                     <h3 className="text-xl font-bold text-[#0F3A40]">Lịch sử báo cáo</h3>

                     {/* Local Search Bar */}
                     <div className="relative w-full md:w-[200px] group">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#82ABB0] group-focus-within:text-[#14B8A6] transition-colors" />
                        <input
                           type="text"
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           placeholder="Tìm sự cố..."
                           className="w-full bg-white/80 border border-[#BCE1E5]/40 rounded-2xl pl-10 pr-8 py-2 text-[12px] outline-none focus:border-[#14B8A6]/30 transition-all font-bold text-[#0F3A40]"
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

                  <div className="space-y-4">
                     {filteredHistory.length > 0 ? (
                        filteredHistory.map((item) => (
                           <div key={item.id} className="bg-white/60 backdrop-blur-md p-6 rounded-[32px] border border-white shadow-sm group hover:scale-[1.02] transition-all cursor-pointer">
                              <div className="flex justify-between items-start mb-4">
                                 <h4 className="text-[15px] font-bold text-[#0F3A40]">{item.title}</h4>
                                 <span className={`${item.statusColor} text-[9px] font-extrabold px-3 py-1 rounded-full tracking-wider uppercase`}>
                                    {item.status}
                                 </span>
                              </div>
                              <div className="flex items-center gap-3 text-[12px] text-[#82ABB0] font-medium mb-3">
                                 <span>{item.room}</span>
                                 <div className="w-1 h-1 rounded-full bg-[#BCE1E5]"></div>
                                 <span>{item.date}</span>
                              </div>
                              <p className="text-[13px] text-[#4A787C] font-medium leading-relaxed italic">
                                 {item.desc}
                              </p>
                           </div>
                        ))
                     ) : (
                        <div className="flex flex-col items-center justify-center py-10 bg-white/40 rounded-[32px] border border-white/50 text-center">
                           <div className="w-16 h-16 rounded-full bg-[#F2FCFD] flex items-center justify-center text-[#82ABB0] mb-4">
                              <SearchX size={32} />
                           </div>
                           <p className="text-[15px] font-bold text-[#0F3A40]">Không tìm thấy báo cáo nào</p>
                           <p className="text-[13px] text-[#82ABB0] mt-1">Thử tìm kiếm với nội dung khác</p>
                        </div>
                     )}
                  </div>
               </div>
               {/* Support Visual Card */}
               <div className="bg-[#0F3A40] rounded-[40px] overflow-hidden shadow-xl group">
                  <div className="h-[220px] relative">
                     <img
                        src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=800"
                        alt="Technicians"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-60"
                     />
                     <div className="absolute inset-0 bg-gradient-to-t from-[#0F3A40] to-transparent"></div>
                     <div className="absolute inset-x-0 bottom-0 p-8 flex flex-col gap-2">
                        <h3 className="text-[22px] font-bold text-white">Hỗ trợ 24/7</h3>
                        <p className="text-white/70 text-[13px] leading-relaxed">
                           Đội ngũ kỹ thuật luôn túc trực để đảm bảo không gian sống của bạn tốt nhất.
                        </p>
                     </div>
                  </div>
                  <div className="p-8 pt-0">
                     <button className="w-full py-4 rounded-3xl bg-[#14B8A6] hover:bg-[#109284] text-white font-bold text-[14px] shadow-lg shadow-[#14B8A6]/20 transition-all flex items-center justify-center gap-3">
                        <PhoneCall size={18} className="fill-current" /> Gọi hỗ trợ gấp
                     </button>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}
