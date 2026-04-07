import { UserPlus, Pencil, MoreVertical, Key, DoorOpen, CalendarX, TrendingUp, ChevronRight } from 'lucide-react';

export default function TenantManagePage() {
  const tenants = [
    { 
      avatarText: 'NH', avatarBg: 'bg-[#D1EDF1]', avatarColor: 'text-[#0F3A40]',
      name: 'Nguyễn Văn Hiếu', email: 'hieu.nv@gmail.com',
      phone: '090 123 4567',
      room: 'STUDIO 402', roomColor: 'text-[#14B8A6]',
      status: 'Đang hoạt động', statusPill: 'bg-[#EBFDFB] text-[#14B8A6]', dot: 'bg-[#14B8A6]'
    },
    { 
      avatarText: 'PT', avatarBg: 'bg-[#FFF3E0]', avatarColor: 'text-[#E68A00]',
      name: 'Phạm Thị Tú', email: 'tu.pham@outlook.com',
      phone: '091 888 9999',
      room: 'SUITE 201', roomColor: 'text-[#14B8A6]',
      status: 'Sắp hết hạn', statusPill: 'bg-[#FFF3E0] text-[#E68A00]', dot: 'bg-[#E68A00]'
    },
    { 
      avatarText: 'LĐ', avatarBg: 'bg-[#E2E8F0]', avatarColor: 'text-[#64748B]',
      name: 'Lê Đại', email: 'dai.le@me.com',
      phone: '093 456 7890',
      room: 'UNASSIGNED', roomColor: 'text-[#64748B]',
      status: 'Đã kết thúc', statusPill: 'bg-[#E2E8F0] text-[#64748B]', dot: 'bg-[#64748B]'
    }
  ];

  return (
    <div className="w-full max-w-[1200px] mx-auto mt-2 px-4 pb-12">
      {/* Page Header */}
      <div className="flex justify-between items-end mb-8 relative z-10">
        <div>
          <p className="text-[10px] font-bold text-[#14B8A6] uppercase tracking-widest mb-1.5 leading-none">THE NEST LIVING</p>
          <h1 className="text-[32px] font-sans font-bold text-[#0F3A40] tracking-tight leading-none">Quản lý Khách thuê</h1>
        </div>
        <button className="bg-[#14B8A6] hover:bg-[#0da090] text-white px-6 py-2.5 rounded-full text-[14px] font-bold transition-colors shadow-md flex items-center gap-2">
           <UserPlus className="w-[18px] h-[18px]" /> Thêm khách
        </button>
      </div>

      {/* Main Table Area (Custom Pill Layout) */}
      <div className="bg-[#F2FCFD] rounded-[32px] p-8 shadow-sm mb-8 border border-transparent">
        {/* Header Row */}
        <div className="flex text-[10px] font-bold text-[#82ABB0] tracking-widest uppercase px-6 mb-6">
           <div className="w-[30%]">Họ và tên</div>
           <div className="w-[20%]">Số điện thoại</div>
           <div className="w-[15%]">Phòng</div>
           <div className="w-[25%] pl-4">Trạng thái hợp đồng</div>
           <div className="w-[10%] text-center">Thao tác</div>
        </div>

        {/* Rows */}
        <div className="flex flex-col gap-4">
           {tenants.map((tenant, idx) => (
             <div key={idx} className="bg-white rounded-full flex items-center px-6 py-4 shadow-[0_2px_10px_rgba(0,31,36,0.02)] hover:shadow-md transition-shadow">
                <div className="w-[30%] flex items-center gap-4">
                   <div className={`w-[46px] h-[46px] rounded-full ${tenant.avatarBg} ${tenant.avatarColor} flex items-center justify-center font-bold text-[16px]`}>
                      {tenant.avatarText}
                   </div>
                   <div className="flex flex-col">
                      <span className="font-bold text-[#0F3A40] text-[15px]">{tenant.name}</span>
                      <span className="text-[#82ABB0] text-[12px] font-medium leading-tight">{tenant.email}</span>
                   </div>
                </div>
                <div className="w-[20%]">
                   <span className="font-bold text-[#0F3A40] text-[14px]">{tenant.phone}</span>
                </div>
                <div className="w-[15%]">
                   <span className={`bg-[#EBFDFB]/50 ${tenant.roomColor} border-[0.5px] border-[#BCE1E5]/50 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase`}>
                      {tenant.room}
                   </span>
                </div>
                <div className="w-[25%] pl-4">
                   <div className={`${tenant.statusPill} inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-bold tracking-wide`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${tenant.dot}`}></span>
                      {tenant.status}
                   </div>
                </div>
                <div className="w-[10%] flex items-center justify-center gap-4 text-[#82ABB0]">
                   <button className="hover:text-[#14B8A6] transition-colors"><Pencil className="w-4 h-4" /></button>
                   <button className="hover:text-[#0F3A40] transition-colors"><MoreVertical className="w-5 h-5" /></button>
                </div>
             </div>
           ))}
        </div>
      </div>

      {/* Bottom Layout Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* Flash Actions */}
         <div className="lg:col-span-4 bg-[#F2FCFD] rounded-[32px] p-8 shadow-sm relative overflow-hidden flex flex-col justify-between border border-transparent">
            {/* Subtle background decoration */}
            <div className="absolute -bottom-10 -right-10 w-48 h-48 border-[20px] border-white/40 rounded-full opacity-50 blur-sm pointer-events-none"></div>
            
            <div className="relative z-10 mb-8">
               <h3 className="text-xl font-bold text-[#0F3A40] mb-1">Thao tác nhanh</h3>
               <p className="text-[12px] text-[#4A787C] font-medium">Quản lý khách thuê và cài đặt</p>
            </div>
            <div className="flex flex-col gap-3 relative z-10">
               <button className="w-full bg-white hover:bg-[#EBFDFB] flex items-center justify-between p-4 rounded-2xl shadow-sm transition-colors group border border-transparent border-b-[#BCE1E5]/30">
                  <div className="flex items-center gap-4">
                     <Key className="w-5 h-5 text-[#14B8A6]" />
                     <span className="font-bold text-[#0F3A40] text-[14px]">Tạo tài khoản đăng nhập</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#82ABB0] group-hover:text-[#14B8A6] transition-colors" />
               </button>
               <button className="w-full bg-white hover:bg-[#EBFDFB] flex items-center justify-between p-4 rounded-2xl shadow-sm transition-colors group border border-transparent border-b-[#BCE1E5]/30">
                  <div className="flex items-center gap-4">
                     <DoorOpen className="w-5 h-5 text-[#14B8A6]" />
                     <span className="font-bold text-[#0F3A40] text-[14px]">Gán phòng (Assign)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#82ABB0] group-hover:text-[#14B8A6] transition-colors" />
               </button>
               <button className="w-full bg-white hover:bg-[#FFF3E0] flex items-center justify-between p-4 rounded-2xl shadow-sm transition-colors group border border-transparent border-b-[#BCE1E5]/30">
                  <div className="flex items-center gap-4">
                     <CalendarX className="w-5 h-5 text-[#D14D4D]" />
                     <span className="font-bold text-[#0F3A40] text-[14px]">Kết thúc hợp đồng</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#82ABB0] group-hover:text-[#D14D4D] transition-colors" />
               </button>
            </div>
         </div>

         {/* Composite Statistics */}
         <div className="lg:col-span-8 bg-[#F2FCFD] rounded-[32px] p-10 shadow-sm flex items-center border border-transparent">
            {/* Stat Col 1 */}
            <div className="flex-1 flex flex-col justify-center border-r border-[#BCE1E5]/40 pr-8">
               <p className="text-[11px] font-bold text-[#4A787C] uppercase tracking-widest mb-3">Tổng khách thuê</p>
               <h2 className="text-5xl font-bold text-[#14B8A6] mb-3">1,284</h2>
               <div className="flex items-center gap-2 text-[#14B8A6] font-bold text-[12px] bg-[#EBFDFB] w-fit px-3 py-1.5 rounded-full shadow-sm">
                  <TrendingUp className="w-3.5 h-3.5" /> +12% Tháng này
               </div>
            </div>

            {/* Stat Col 2 */}
            <div className="flex-1 flex flex-col justify-center border-r border-[#BCE1E5]/40 px-10">
               <p className="text-[11px] font-bold text-[#4A787C] uppercase tracking-widest mb-3">Sắp hết hạn</p>
               <h2 className="text-5xl font-bold text-[#E68A00] mb-3">42</h2>
               <p className="text-[12px] font-medium text-[#4A787C] leading-snug">
                  Yêu cầu gia hạn ngay lập tức
               </p>
            </div>

            {/* Stat Col 3 */}
            <div className="flex-1 flex flex-col justify-center pl-10">
               <p className="text-[11px] font-bold text-[#4A787C] uppercase tracking-widest mb-3">Chờ cấp quyền</p>
               <h2 className="text-5xl font-bold text-[#0F3A40] mb-3">18</h2>
               <p className="text-[12px] font-medium text-[#4A787C] leading-snug">
                  Đang chờ thiết lập<br/>ứng dụng
               </p>
            </div>
         </div>
      </div>
    </div>
  );
}
