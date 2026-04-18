import { MapPin, CheckCircle2, UserCheck, BarChart3, Edit3, Trash2, ArrowUpRight, Plus } from 'lucide-react';

export default function RoomManagePage() {
  const rooms = [
    { id: 'P.402', type: 'Gác lửng', typeColor: 'bg-nest-primary/10', area: '20 m²', price: '2.500.000đ', status: 'TRỐNG', statusPill: 'bg-[#EBFDFB] text-[#14B8A6]', dot: 'bg-[#14B8A6]' },
    { id: 'P.601', type: 'Ban công', typeColor: 'bg-nest-primary/10', area: '25 m²', price: '3.000.000đ', status: 'ĐANG THUÊ', statusPill: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
    { id: 'P.301', type: 'Thường', typeColor: 'bg-nest-primary/10', area: '18 m²', price: '2.000.000đ', status: 'TRỐNG', statusPill: 'bg-[#EBFDFB] text-[#14B8A6]', dot: 'bg-[#14B8A6]' },
    { id: 'P.205', type: 'Ban công', typeColor: 'bg-nest-primary/10', area: '24 m²', price: '2.800.000đ', status: 'BẢO TRÌ', statusPill: 'bg-[#FFF3E0] text-[#E68A00]', dot: 'bg-[#E68A00]' },
    { id: 'P.512', type: 'Gác lửng', typeColor: 'bg-nest-primary/10', area: '22 m²', price: '2.600.000đ', status: 'TRỐNG', statusPill: 'bg-[#EBFDFB] text-[#14B8A6]', dot: 'bg-[#14B8A6]' },
  ];

  return (
    <div className="w-full max-w-[1200px] mx-auto mt-2 px-4 pb-12">
      {/* Page Header */}
      <div className="flex justify-between items-end mb-8 relative z-10">
        <div>
          <h1 className="text-[32px] font-sans font-bold text-nest-text-primary tracking-tight">Quản lý Phòng</h1>
          <p className="text-[13px] font-bold text-nest-text-secondary mt-2 flex items-center gap-1.5">
            <MapPin className="w-[14px] h-[14px]" /> Lâm Đồng Campus • 124 Phòng
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex bg-white/50 backdrop-blur-md rounded-full p-1 border border-nest-primary/10 shadow-sm">
            <button className="px-5 py-2.5 rounded-full bg-white text-nest-text-primary text-[13px] font-bold shadow-sm">Tất cả</button>
            <button className="px-5 py-2.5 rounded-full text-nest-text-secondary hover:text-nest-text-primary text-[13px] font-bold transition-colors">Thường</button>
            <button className="px-5 py-2.5 rounded-full text-nest-text-secondary hover:text-nest-text-primary text-[13px] font-bold transition-colors">Gác lửng</button>
            <button className="px-5 py-2.5 rounded-full text-nest-text-secondary hover:text-nest-text-primary text-[13px] font-bold transition-colors">Ban công</button>
          </div>
          <button className="bg-nest-primary hover:bg-[#0da090] text-white px-6 py-2.5 rounded-full text-[14px] font-bold transition-colors shadow-lg shadow-nest-primary/20 flex items-center gap-2">
             <Plus className="w-[18px] h-[18px]" /> Thêm phòng
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 relative z-10">
        <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_23px_rgba(15,58,64,0.06)] border border-slate-200/60 flex justify-between items-center">
           <div>
              <p className="text-[10px] font-bold text-nest-text-secondary uppercase tracking-widest mb-2">Sẵn sàng</p>
              <h3 className="text-3xl font-bold text-nest-primary">42</h3>
           </div>
           <div className="w-[42px] h-[42px] rounded-full bg-nest-primary/10 text-nest-primary border border-nest-primary/20 flex items-center justify-center">
              <CheckCircle2 className="w-[22px] h-[22px]" />
           </div>
        </div>
        <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_23px_rgba(15,58,64,0.06)] border border-slate-200/60 flex justify-between items-center">
           <div>
              <p className="text-[10px] font-bold text-nest-text-secondary uppercase tracking-widest mb-2">Đang thuê</p>
              <h3 className="text-3xl font-bold text-nest-text-primary">78</h3>
           </div>
           <div className="w-[42px] h-[42px] rounded-full bg-gray-50 text-gray-400 flex items-center justify-center border border-gray-100">
              <UserCheck className="w-[20px] h-[20px]" />
           </div>
        </div>
        <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_23px_rgba(15,58,64,0.06)] border border-slate-200/60 flex justify-between items-center">
           <div>
              <p className="text-[10px] font-bold text-nest-text-secondary uppercase tracking-widest mb-2">Tỉ lệ lấp đầy</p>
              <h3 className="text-3xl font-bold text-nest-text-primary">62%</h3>
           </div>
           <div className="w-[42px] h-[42px] rounded-full bg-nest-primary/10 text-nest-text-primary flex items-center justify-center text-nest-primary border border-nest-primary/20">
              <BarChart3 className="w-[20px] h-[20px]" />
           </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white/80 rounded-[32px] p-8 shadow-[0_4px_24px_rgba(15,58,64,0.04)] border border-slate-200/60 backdrop-blur-sm mb-8">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#BCE1E5]/40 text-[10px] font-bold text-[#82ABB0] tracking-widest uppercase">
                <th className="pb-5 font-bold px-2">Số phòng</th>
                <th className="pb-5 font-bold px-2 text-center">Loại phòng</th>
                <th className="pb-5 font-bold px-2 text-center">Diện tích</th>
                <th className="pb-5 font-bold px-2">Giá thuê</th>
                <th className="pb-5 font-bold px-2">Trạng thái</th>
                <th className="pb-5 font-bold px-2 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room, idx) => (
                <tr key={idx} className="border-b border-[#BCE1E5]/40 last:border-0 hover:bg-white/50 transition-colors">
                  <td className="py-5 px-2">
                    <span className="font-bold text-[#0F3A40] text-[15px]">{room.id}</span>
                  </td>
                  <td className="py-5 px-2 text-center">
                    <span className={`${room.typeColor} text-[#0F3A40] px-3 py-1 rounded-full text-[11px] font-bold tracking-wide`}>
                      {room.type}
                    </span>
                  </td>
                  <td className="py-5 px-2 text-[#4A787C] text-[13px] font-bold text-center">
                    {room.area}
                  </td>
                  <td className="py-5 px-2 text-[#0F3A40] font-bold text-[14px]">
                    {room.price}
                  </td>
                  <td className="py-5 px-2">
                    <div className={`${room.statusPill} inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide`}>
                       <span className={`w-1.5 h-1.5 rounded-full ${room.dot}`}></span>
                       {room.status}
                    </div>
                  </td>
                  <td className="py-5 px-2 text-right">
                    <div className="flex items-center justify-end gap-3 text-[#82ABB0]">
                       <button className="hover:text-[#14B8A6] transition-colors p-1"><Edit3 className="w-[18px] h-[18px]" /></button>
                       <button className="hover:text-[#D14D4D] transition-colors p-1"><Trash2 className="w-[18px] h-[18px]" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-transparent text-[12px] font-bold text-[#82ABB0]">
           <span>Hiển thị 5 trên <span className="text-[#0F3A40]">124 phòng</span></span>
           <div className="flex items-center gap-2">
              <button className="text-[#82ABB0] hover:text-[#0F3A40] px-2">&lt;</button>
              <button className="w-8 h-8 rounded-full bg-[#14B8A6] text-white flex items-center justify-center">1</button>
              <button className="w-8 h-8 rounded-full text-[#4A787C] hover:bg-[#EBFDFB] flex items-center justify-center transition-colors">2</button>
              <button className="w-8 h-8 rounded-full text-[#4A787C] hover:bg-[#EBFDFB] flex items-center justify-center transition-colors">3</button>
              <button className="text-[#82ABB0] hover:text-[#0F3A40] px-2">&gt;</button>
           </div>
        </div>
      </div>

      {/* Bottom Layout sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Market Analysis Insight Card */}
        <div className="bg-white rounded-[32px] p-10 flex flex-col justify-between shadow-[0_8px_30px_rgba(15,58,64,0.04)] border border-slate-200/60 self-stretch relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-nest-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
           <div className="relative z-10">
              <p className="text-[11px] font-bold text-nest-primary uppercase tracking-widest mb-6">Phân tích thị trường</p>
              <h3 className="text-2xl font-bold text-nest-text-primary leading-snug mb-5">
                 Xu hướng tăng trưởng mạnh
              </h3>
              <p className="text-[14px] text-nest-text-secondary font-medium leading-relaxed">
                 Dựa trên dữ liệu 30 ngày qua, nhu cầu tìm kiếm phòng tại khu vực này đã tăng 15%. Xem xét điều chỉnh chiến lược giá cho các phòng trống.
              </p>
           </div>
           <button className="text-nest-primary hover:text-[#0da090] font-bold text-[14px] items-center gap-1.5 flex mt-10 w-fit transition-colors group relative z-10">
              Xem báo cáo chi tiết <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
           </button>
        </div>

        {/* Penthouse Spotlight */}
        <div className="bg-[#F2FCFD] rounded-[32px] shadow-sm overflow-hidden flex flex-col self-stretch border border-transparent">
           <div className="h-[220px] relative w-full overflow-hidden relative">
              <img src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80" alt="Penthouse" className="w-full h-full object-cover" />
              <div className="absolute top-4 left-4 bg-white/40 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] font-bold text-white uppercase tracking-widest shadow-sm border border-white/20">
                 Căn hộ cao cấp
              </div>
           </div>
           <div className="p-8 flex-1 flex flex-col justify-between">
              <div>
                 <h4 className="text-[20px] font-bold text-[#0F3A40] mb-3">P.601 Penthouse Suite</h4>
                 <p className="text-[13px] text-[#4A787C] font-medium leading-relaxed mb-6">
                    Mẫu thiết kế mới cho phân khúc cao cấp đã hoàn thiện và sẵn sàng để giới thiệu.
                 </p>
              </div>
              <div className="flex items-center gap-3">
                 <div className="flex -space-x-3">
                    <img className="w-8 h-8 rounded-full border-2 border-white object-cover" src="https://ui-avatars.com/api/?name=Jane&background=14B8A6&color=fff" />
                    <img className="w-8 h-8 rounded-full border-2 border-white object-cover" src="https://ui-avatars.com/api/?name=Mark&background=0F3A40&color=fff" />
                 </div>
                 <span className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-wider">+12 Đăng ký xem</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
