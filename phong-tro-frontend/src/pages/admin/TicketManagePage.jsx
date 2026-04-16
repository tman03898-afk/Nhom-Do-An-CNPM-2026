import { useState, useRef, useEffect } from 'react';
import { 
  Plus, BarChart3, ClipboardList, PenTool, CheckCircle2, 
  Filter, Snowflake, Droplet, Lightbulb, Key, 
  MoreVertical, PhoneCall, Trash2, Eye, Clock, Search, X
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function TicketManagePage() {
   const { addToast } = useToast();
   const [activeMenuId, setActiveMenuId] = useState(null);
   const [showFilters, setShowFilters] = useState(false);
   const [searchTerm, setSearchTerm] = useState('');
   const [selectedStatuses, setSelectedStatuses] = useState(['CHỜ XỬ LÝ', 'ĐANG THỰC HIỆN', 'HOÀN THÀNH']);
   
   const menuRef = useRef(null);
   const filterRef = useRef(null);

   const stats = [
      { label: 'Tổng phiếu', value: '42', icon: <BarChart3 className="w-4 h-4 text-[#14B8A6]" />, border: 'border-[#14B8A6]/30', bg: 'bg-white' },
      { label: 'Chờ xử lý', value: '12', icon: <ClipboardList className="w-4 h-4 text-[#E68A00]" />, border: 'border-[#E68A00]', bg: 'bg-white' },
      { label: 'Đang thực hiện', value: '08', icon: <PenTool className="w-4 h-4 text-[#3B82F6]" />, border: 'border-[#3B82F6]', bg: 'bg-white' },
      { label: 'Hoàn thành', value: '22', icon: <CheckCircle2 className="w-4 h-4 text-[#14B8A6]" />, border: 'border-[#14B8A6]', bg: 'bg-white' },
   ];

   const [tickets, setTickets] = useState([
      {
         id: 1,
         iconBlock: 'bg-[#FFF0F0] text-[#D14D4D]', icon: <Snowflake className="w-4 h-4" />,
         title: 'Điều hòa không mát', room: 'P.304 - Building A', roomColor: 'text-[#4A787C]',
         desc: 'Mới bật lên nhưng chỉ ra gió, không lạnh sau 3...',
         date: '12/10/2023',
         status: 'CHỜ XỬ LÝ', statusColor: 'bg-[#FFF3E0] text-[#E68A00]'
      },
      {
         id: 2,
         iconBlock: 'bg-[#EBF4FF] text-[#3B82F6]', icon: <Droplet className="w-4 h-4" />,
         title: 'Rò rỉ vòi nước', room: 'P.102 - Building B', roomColor: 'text-[#4A787C]',
         desc: 'Vòi sen trong nhà tắm bị rỉ nước liên tục...',
         date: '11/10/2023',
         status: 'ĐANG THỰC HIỆN', statusColor: 'bg-[#EBF4FF] text-[#3B82F6]'
      },
      {
         id: 3,
         iconBlock: 'bg-[#EBFDFB] text-[#14B8A6]', icon: <Lightbulb className="w-4 h-4" />,
         title: 'Thay bóng đèn hành lang', room: 'Khu vực chung - Tầng 2', roomColor: 'text-[#14B8A6]',
         desc: 'Bóng đèn chớp liên tục gây khó chịu cho cư d...',
         date: '10/10/2023',
         status: 'HOÀN THÀNH', statusColor: 'bg-[#EBFDFB] text-[#14B8A6]'
      },
      {
         id: 4,
         iconBlock: 'bg-[#FFF3E0] text-[#E68A00]', icon: <Key className="w-4 h-4" />,
         title: 'Kẹt khóa cửa phòng', room: 'P.505 - Building A', roomColor: 'text-[#4A787C]',
         desc: 'Ổ khóa thông minh bị lỗi không nhận vân tay...',
         date: '09/10/2023',
         status: 'CHỜ XỬ LÝ', statusColor: 'bg-[#FFF3E0] text-[#E68A00]'
      }
   ]);

   // Close popovers when clicking outside
   useEffect(() => {
      function handleClickOutside(event) {
         if (menuRef.current && !menuRef.current.contains(event.target)) {
            setActiveMenuId(null);
         }
         if (filterRef.current && !filterRef.current.contains(event.target)) {
            setShowFilters(false);
         }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
   }, [menuRef, filterRef]);

   const handleStatusUpdate = (id, newStatus) => {
      let statusColor = 'bg-[#FFF3E0] text-[#E68A00]';
      if (newStatus === 'ĐANG THỰC HIỆN') statusColor = 'bg-[#EBF4FF] text-[#3B82F6]';
      if (newStatus === 'HOÀN THÀNH') statusColor = 'bg-[#EBFDFB] text-[#14B8A6]';

      setTickets(tickets.map(t => 
         t.id === id ? { ...t, status: newStatus, statusColor } : t
      ));
      setActiveMenuId(null);
      addToast(`Đã chuyển trạng thái sang: ${newStatus}`);
   };

   const handleDelete = (id) => {
      if (window.confirm('Bạn có chắc muốn xóa phiếu yêu cầu này?')) {
         setTickets(tickets.filter(t => t.id !== id));
         setActiveMenuId(null);
         addToast('Đã xóa phiếu yêu cầu bảo trì!', 'error');
      }
   };

   const toggleStatusFilter = (status) => {
      if (selectedStatuses.includes(status)) {
         setSelectedStatuses(selectedStatuses.filter(s => s !== status));
      } else {
         setSelectedStatuses([...selectedStatuses, status]);
      }
   };

   const filteredTickets = tickets.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           t.room.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = selectedStatuses.includes(t.status);
      return matchesSearch && matchesStatus;
   });

   return (
      <div className="w-full max-w-[1200px] mx-auto mt-2 px-4 pb-12 relative flex flex-col h-full gap-8">
         {/* Header */}
         <div className="flex justify-between items-end relative z-10">
            <div>
               <h1 className="text-[32px] font-sans font-bold text-[#0F3A40] tracking-tight leading-none mb-3">Yêu cầu bảo trì</h1>
               <p className="text-[14px] text-[#4A787C] font-medium">Theo dõi và quản lý các yêu cầu sửa chữa từ khách thuê.</p>
            </div>
            <button className="bg-[#0F3A40] hover:bg-[#1F545B] border border-[#BCE1E5]/20 text-white px-6 py-3 rounded-full text-[14px] font-bold transition-colors shadow-xl flex items-center gap-2">
               <Plus className="w-[18px] h-[18px]" /> Tạo phiếu mới
            </button>
         </div>

         {/* Stats Cards */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
               <div key={i} className={`rounded-[24px] p-6 shadow-sm border-2 ${stat.border} ${stat.bg} flex justify-between items-end min-h-[120px]`}>
                  <div className="flex flex-col justify-between h-full w-full">
                     <span className="text-[12px] font-bold text-[#4A787C] mb-2">{stat.label}</span>
                     <div className="flex justify-between items-end w-full">
                        <span className="text-4xl font-bold text-[#0F3A40] leading-none">{stat.value}</span>
                        <div className="bg-[#F2FCFD] p-1.5 rounded-lg border border-[#BCE1E5]/30">
                           {stat.icon}
                        </div>
                     </div>
                  </div>
               </div>
            ))}
         </div>

         {/* Main Table Area */}
         <div className="bg-white rounded-[32px] p-2 shadow-sm border border-transparent flex flex-col">
            {/* Table Filters Navbar */}
            <div className="flex flex-wrap justify-between items-center p-6 border-b border-[#BCE1E5]/30 gap-4">
               <div className="flex items-center gap-2">
                  <button 
                     onClick={() => setSelectedStatuses(['CHỜ XỬ LÝ', 'ĐANG THỰC HIỆN', 'HOÀN THÀNH'])}
                     className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all ${selectedStatuses.length === 3 ? 'bg-[#0F3A40] text-white shadow-sm' : 'text-[#4A787C] hover:text-[#0F3A40]'}`}
                  >
                     Tất cả
                  </button>
                  <button 
                     onClick={() => setSelectedStatuses(['CHỜ XỬ LÝ'])}
                     className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all ${selectedStatuses.length === 1 && selectedStatuses[0] === 'CHỜ XỬ LÝ' ? 'bg-[#E68A00] text-white shadow-sm' : 'text-[#4A787C] hover:text-[#0F3A40]'}`}
                  >
                     Chờ xử lý
                  </button>
               </div>

               <div className="flex items-center gap-4 flex-1 justify-end">
                  {/* Search Bar */}
                  <div className="relative max-w-[300px] w-full group">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#82ABB0] group-focus-within:text-[#14B8A6] transition-colors" />
                     <input 
                        type="text"
                        placeholder="Tìm theo lỗi, số phòng..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#F2FCFD] border border-[#BCE1E5]/40 rounded-full py-2.5 pl-11 pr-4 text-[13px] font-medium text-[#0F3A40] outline-none focus:border-[#14B8A6]/40 focus:bg-white transition-all"
                     />
                     {searchTerm && (
                        <button 
                           onClick={() => setSearchTerm('')}
                           className="absolute right-4 top-1/2 -translate-y-1/2 text-[#82ABB0] hover:text-[#0F3A40]"
                        >
                           <X size={14} />
                        </button>
                     )}
                  </div>

                  {/* Filter Button */}
                  <div className="relative">
                     <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold transition-all border ${showFilters ? 'bg-[#0F3A40] text-white border-transparent shadow-lg' : 'text-[#4A787C] border-[#BCE1E5]/40 hover:bg-[#F2FCFD]'}`}
                     >
                        <Filter className="w-4 h-4" /> Bộ lọc
                     </button>

                     {showFilters && (
                        <div 
                           ref={filterRef}
                           className="absolute right-0 top-[120%] z-50 w-64 bg-white rounded-2xl shadow-2xl border border-[#BCE1E5]/40 p-4 animate-in fade-in slide-in-from-top-2 duration-200"
                        >
                           <h4 className="text-[11px] font-bold text-[#82ABB0] tracking-widest uppercase mb-4">Trạng thái phiếu</h4>
                           <div className="space-y-3">
                              {['CHỜ XỬ LÝ', 'ĐANG THỰC HIỆN', 'HOÀN THÀNH'].map(status => (
                                 <label key={status} className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative flex items-center">
                                       <input 
                                          type="checkbox"
                                          checked={selectedStatuses.includes(status)}
                                          onChange={() => toggleStatusFilter(status)}
                                          className="peer appearance-none w-5 h-5 rounded-md border-2 border-[#BCE1E5] checked:bg-[#14B8A6] checked:border-transparent transition-all"
                                       />
                                       <CheckCircle2 className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 left-[3px] transition-opacity" />
                                    </div>
                                    <span className="text-[13px] font-bold text-[#4A787C] group-hover:text-[#0F3A40] transition-colors">{status}</span>
                                 </label>
                              ))}
                           </div>
                           <div className="mt-6 pt-4 border-t border-[#BCE1E5]/20 flex justify-between gap-3">
                              <button 
                                 onClick={() => setSelectedStatuses([])}
                                 className="text-[11px] font-bold text-[#82ABB0] hover:text-[#D14D4D] transition-colors"
                              >
                                 Bỏ chọn hết
                              </button>
                              <button 
                                 onClick={() => setShowFilters(false)}
                                 className="text-[11px] font-bold text-[#14B8A6] hover:underline"
                              >
                                 Đóng
                              </button>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </div>

            {/* Table Content */}
            <div className="px-6 py-4 w-full overflow-x-auto min-h-[400px]">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="text-[10px] font-bold text-[#82ABB0] tracking-widest uppercase">
                        <th className="pb-5 font-bold px-2">Tiêu đề</th>
                        <th className="pb-5 font-bold px-2">Phòng</th>
                        <th className="pb-5 font-bold px-2 w-[35%]">Mô tả</th>
                        <th className="pb-5 font-bold px-2">Ngày tạo</th>
                        <th className="pb-5 font-bold px-2">Trạng thái</th>
                        <th className="pb-5 font-bold px-2 text-right">Thao tác</th>
                     </tr>
                  </thead>
                  <tbody className="before:block before:h-2">
                     {filteredTickets.length > 0 ? (
                        filteredTickets.map((t) => (
                           <tr key={t.id} className="border-b border-[#BCE1E5]/40 last:border-0 hover:bg-[#F2FCFD]/50 transition-colors">
                              <td className="py-5 px-2">
                                 <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${t.iconBlock}`}>
                                       {t.icon}
                                    </div>
                                    <span className="font-bold text-[#0F3A40] text-[14px] leading-tight">{t.title}</span>
                                 </div>
                              </td>
                              <td className="py-5 px-2">
                                 <span className={`font-bold text-[13px] leading-tight ${t.roomColor} w-24 block`}>{t.room}</span>
                              </td>
                              <td className="py-5 px-2 pr-8">
                                 <p className="text-[13px] text-[#82ABB0] font-medium truncate">{t.desc}</p>
                              </td>
                              <td className="py-5 px-2">
                                 <span className="text-[#0F3A40] font-medium text-[13px]">{t.date}</span>
                              </td>
                              <td className="py-5 px-2">
                                 <span className={`${t.statusColor} px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase inline-block text-center`}>
                                    {t.status}
                                 </span>
                              </td>
                              <td className="py-5 px-2 text-right relative">
                                 <button 
                                    onClick={() => setActiveMenuId(activeMenuId === t.id ? null : t.id)}
                                    className={`transition-all p-2 rounded-xl ${activeMenuId === t.id ? 'bg-[#0F3A40] text-white shadow-lg' : 'text-[#82ABB0] hover:text-[#0F3A40] hover:bg-[#F2FCFD]'}`}
                                 >
                                    <MoreVertical className="w-5 h-5" />
                                 </button>

                                 {/* Action Menu Dropdown */}
                                 {activeMenuId === t.id && (
                                    <div 
                                       ref={menuRef}
                                       className="absolute right-2 top-[70%] z-[100] w-56 bg-white/95 backdrop-blur-xl border border-[#BCE1E5]/40 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200"
                                    >
                                       <div className="px-3 py-2 border-b border-[#BCE1E5]/20 mb-1">
                                          <p className="text-[10px] font-bold text-[#82ABB0] tracking-widest uppercase">Quản lý phiếu</p>
                                       </div>
                                       <button onClick={() => {}} className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-bold text-[#4A787C] hover:bg-[#F2FCFD] hover:text-[#0F3A40] rounded-xl transition-colors">
                                          <Eye size={16} /> Xem chi tiết
                                       </button>
                                       <button 
                                          onClick={() => handleStatusUpdate(t.id, 'ĐANG THỰC HIỆN')}
                                          className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-bold text-[#4A787C] hover:bg-[#F2FCFD] hover:text-[#3B82F6] rounded-xl transition-colors"
                                       >
                                          <Clock size={16} /> Duyệt & Sửa chữa
                                       </button>
                                       <button 
                                          onClick={() => handleStatusUpdate(t.id, 'HOÀN THÀNH')}
                                          className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-bold text-[#4A787C] hover:bg-[#F2FCFD] hover:text-[#14B8A6] rounded-xl transition-colors"
                                       >
                                          <CheckCircle2 size={16} /> Hoàn thành
                                       </button>
                                       <div className="h-px bg-[#BCE1E5]/20 my-1"></div>
                                       <button 
                                          onClick={() => handleDelete(t.id)}
                                          className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-bold text-[#D14D4D] hover:bg-red-50 rounded-xl transition-colors"
                                       >
                                          <Trash2 size={16} /> Xóa yêu cầu
                                       </button>
                                    </div>
                                 )}
                              </td>
                           </tr>
                        ))
                     ) : (
                        <tr>
                           <td colSpan="6" className="py-20 text-center">
                              <div className="flex flex-col items-center gap-3">
                                 <Search className="w-10 h-10 text-[#BCE1E5]" />
                                 <p className="text-[15px] font-bold text-[#0F3A40]">Không tìm thấy phiếu yêu cầu phù hợp</p>
                                 <button 
                                    onClick={() => {setSearchTerm(''); setSelectedStatuses(['CHỜ XỬ LÝ', 'ĐANG THỰC HIỆN', 'HOÀN THÀNH']);}}
                                    className="text-[13px] font-bold text-[#14B8A6] hover:underline"
                                 >
                                    Xóa tất cả bộ lọc
                                 </button>
                              </div>
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>

            <div className="flex justify-between items-center px-8 py-4 border-t border-[#BCE1E5]/30 text-[12px] font-bold text-[#82ABB0]">
               <span>Hiển thị {tickets.length} trong tổng số <span className="text-[#0F3A40]">42 yêu cầu</span></span>
               <div className="flex items-center gap-2">
                  <button className="text-[#82ABB0] hover:text-[#0F3A40] px-2">&lt;</button>
                  <button className="w-8 h-8 rounded-full bg-[#0F3A40] text-white flex items-center justify-center">1</button>
                  <button className="w-8 h-8 rounded-full text-[#4A787C] hover:bg-[#F2FCFD] flex items-center justify-center transition-colors">2</button>
                  <button className="w-8 h-8 rounded-full text-[#4A787C] hover:bg-[#F2FCFD] flex items-center justify-center transition-colors">3</button>
                  <button className="text-[#82ABB0] hover:text-[#0F3A40] px-2">&gt;</button>
               </div>
            </div>
         </div>

         {/* Bottom Layout - Emergency Help */}
         <div className="bg-white rounded-[32px] p-3 shadow-sm border border-[#BCE1E5]/30 flex flex-col md:flex-row gap-10 items-center min-h-[200px]">
            <div className="w-full md:w-[42%] h-[200px] rounded-[24px] overflow-hidden relative shadow-inner group">
               <img
                  src="https://images.unsplash.com/photo-1581092921461-eab62e97a780?q=80&w=800&auto=format&fit=crop"
                  alt="Technical Staff"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-[#0F3A40]/80 via-[#0F3A40]/30 to-transparent flex items-end p-6">
                  <p className="text-white text-[12px] font-medium leading-loose max-w-[90%]">
                     Đội ngũ kỹ thuật túc trực 24/7 để đảm bảo trải nghiệm tốt nhất.
                  </p>
               </div>
            </div>
            <div className="flex-1 px-4 md:px-8 py-6 flex flex-col justify-center">
               <h2 className="text-[24px] font-bold text-[#0F3A40] mb-4">Cần hỗ trợ kỹ thuật gấp?</h2>
               <p className="text-[#4A787C] font-medium text-[15px] leading-relaxed mb-8 max-w-[95%]">
                  Đối với các trường hợp khẩn cấp như hỏa hoạn, rò rỉ khí gas hoặc ngập lụt, vui lòng liên hệ hotline kỹ thuật ngay lập tức.
               </p>
               <button className="bg-white border-2 border-[#EBFDFB] hover:border-[#14B8A6]/50 hover:shadow-lg text-[#0F3A40] flex items-center gap-3 px-6 py-3.5 rounded-full w-fit transition-all group">
                  <div className="w-8 h-8 rounded-full bg-[#EBFDFB] flex items-center justify-center text-[#14B8A6] group-hover:scale-110 transition-transform">
                     <PhoneCall className="w-4 h-4 fill-current" />
                  </div>
                  <span className="font-bold text-[18px] tracking-wide">0123 456 789</span>
               </button>
            </div>
         </div>
      </div>
   );
}
