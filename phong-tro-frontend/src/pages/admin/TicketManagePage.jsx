import { Plus, BarChart3, ClipboardList, PenTool, CheckCircle2, Filter, Snowflake, Droplet, Lightbulb, Key, MoreVertical, PhoneCall } from 'lucide-react';

export default function TicketManagePage() {
  const stats = [
    { label: 'Tổng phiếu', value: '42', icon: <BarChart3 className="w-4 h-4 text-[#14B8A6]" />, border: 'border-[#14B8A6]/30', bg: 'bg-white' },
    { label: 'Chờ xử lý', value: '12', icon: <ClipboardList className="w-4 h-4 text-[#E68A00]" />, border: 'border-[#E68A00]', bg: 'bg-white' },
    { label: 'Đang thực hiện', value: '08', icon: <PenTool className="w-4 h-4 text-[#3B82F6]" />, border: 'border-[#3B82F6]', bg: 'bg-white' },
    { label: 'Hoàn thành', value: '22', icon: <CheckCircle2 className="w-4 h-4 text-[#14B8A6]" />, border: 'border-[#14B8A6]', bg: 'bg-white' },
  ];

  const tickets = [
    {
      iconBlock: 'bg-[#FFF0F0] text-[#D14D4D]', icon: <Snowflake className="w-4 h-4" />,
      title: 'Điều hòa không mát', room: 'P.304 - Building A', roomColor: 'text-[#4A787C]',
      desc: 'Mới bật lên nhưng chỉ ra gió, không lạnh sau 3...',
      date: '12/10/2023',
      status: 'CHỜ XỬ LÝ', statusColor: 'bg-[#FFF3E0] text-[#E68A00]'
    },
    {
      iconBlock: 'bg-[#EBF4FF] text-[#3B82F6]', icon: <Droplet className="w-4 h-4" />,
      title: 'Rò rỉ vòi nước', room: 'P.102 - Building B', roomColor: 'text-[#4A787C]',
      desc: 'Vòi sen trong nhà tắm bị rỉ nước liên tục...',
      date: '11/10/2023',
      status: 'ĐANG THỰC HIỆN', statusColor: 'bg-[#EBF4FF] text-[#3B82F6]'
    },
    {
      iconBlock: 'bg-[#EBFDFB] text-[#14B8A6]', icon: <Lightbulb className="w-4 h-4" />,
      title: 'Thay bóng đèn hành lang', room: 'Khu vực chung - Tầng 2', roomColor: 'text-[#14B8A6]',
      desc: 'Bóng đèn chớp liên tục gây khó chịu cho cư d...',
      date: '10/10/2023',
      status: 'HOÀN THÀNH', statusColor: 'bg-[#EBFDFB] text-[#14B8A6]'
    },
    {
      iconBlock: 'bg-[#FFF3E0] text-[#E68A00]', icon: <Key className="w-4 h-4" />,
      title: 'Kẹt khóa cửa phòng', room: 'P.505 - Building A', roomColor: 'text-[#4A787C]',
      desc: 'Ổ khóa thông minh bị lỗi không nhận vân tay...',
      date: '09/10/2023',
      status: 'CHỜ XỬ LÝ', statusColor: 'bg-[#FFF3E0] text-[#E68A00]'
    }
  ];

  return (
     <div className="w-full max-w-[1200px] mx-auto mt-2 px-4 pb-12 relative flex flex-col h-full gap-8">
      {/* Header */}
      <div className="flex justify-between items-end relative z-10">
        <div>
          <p className="text-[10px] font-bold text-[#14B8A6] uppercase tracking-widest mb-1.5 leading-none">DỊCH VỤ QUẢN LÝ</p>
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
         <div className="flex justify-between items-center p-6 border-b border-[#BCE1E5]/30">
            <div className="flex items-center gap-2">
               <button className="bg-[#0F3A40] text-white px-5 py-2 rounded-full text-[13px] font-bold shadow-sm">Tất cả</button>
               <button className="text-[#4A787C] hover:text-[#0F3A40] px-5 py-2 text-[13px] font-bold transition-colors">Gần đây</button>
               <button className="text-[#4A787C] hover:text-[#0F3A40] px-5 py-2 text-[13px] font-bold transition-colors">Khẩn cấp</button>
            </div>
            <button className="flex items-center gap-2 text-[#4A787C] hover:text-[#0F3A40] text-[13px] font-bold transition-colors mr-2">
               <Filter className="w-4 h-4" /> Bộ lọc
            </button>
         </div>

         {/* Table Content */}
         <div className="px-6 py-4 w-full overflow-x-auto">
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
                  {tickets.map((t, i) => (
                  <tr key={i} className="border-b border-[#BCE1E5]/40 last:border-0 hover:bg-[#F2FCFD]/50 transition-colors">
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
                     <td className="py-5 px-2 text-right">
                        <button className="text-[#82ABB0] hover:text-[#0F3A40] transition-colors p-2">
                           <MoreVertical className="w-5 h-5" />
                        </button>
                     </td>
                  </tr>
                  ))}
               </tbody>
            </table>
         </div>

         <div className="flex justify-between items-center px-8 py-4 border-t border-[#BCE1E5]/30 text-[12px] font-bold text-[#82ABB0]">
            <span>Hiển thị 1 - 4 trong tổng số <span className="text-[#0F3A40]">42 yêu cầu</span></span>
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
      <div className="bg-white rounded-[32px] p-3 shadow-sm border border-[#BCE1E5]/30 flex flex-col md:flex-row gap-8 items-center min-h-[220px]">
         <div className="w-full md:w-[45%] h-[240px] rounded-[24px] overflow-hidden relative shadow-inner">
            <img 
               src="https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=800&auto=format&fit=crop" 
               alt="Technical Staff" 
               className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F3A40] via-[#0F3A40]/60 to-transparent flex items-end p-6">
               <p className="text-white text-[13px] font-medium leading-relaxed max-w-[80%]">
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
