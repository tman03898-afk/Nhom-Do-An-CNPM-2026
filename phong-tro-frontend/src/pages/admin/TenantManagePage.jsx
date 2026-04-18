import { UserPlus, Pencil, MoreVertical, Key, DoorOpen, CalendarX, TrendingUp, ChevronRight } from 'lucide-react';

export default function TenantManagePage() {
  const tenants = [
    {
      avatarText: 'NH', avatarBg: 'bg-nest-primary/10', avatarColor: 'text-nest-primary',
      name: 'Nguyễn Văn Hiếu', email: 'hieu.nv@gmail.com',
      phone: '090 123 4567',
      room: 'P.402 (Gác lửng)', roomColor: 'text-nest-primary',
      status: 'Đang hoạt động', statusPill: 'bg-[#EBFDFB] text-[#14B8A6]', dot: 'bg-[#14B8A6]'
    },
    {
      avatarText: 'PT', avatarBg: 'bg-amber-100', avatarColor: 'text-amber-600',
      name: 'Phạm Thị Tú', email: 'tu.pham@outlook.com',
      phone: '091 888 9999',
      room: 'P.601 (Ban công)', roomColor: 'text-nest-primary',
      status: 'Sắp hết hạn', statusPill: 'bg-amber-50 text-amber-600', dot: 'bg-amber-500'
    },
    {
      avatarText: 'LĐ', avatarBg: 'bg-slate-100', avatarColor: 'text-slate-600',
      name: 'Lê Đại', email: 'dai.le@me.com',
      phone: '093 456 7890',
      room: 'P.301 (Thường)', roomColor: 'text-nest-primary',
      status: 'Đã kết thúc', statusPill: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400'
    }
  ];

  return (
    <div className="w-full max-w-[1200px] mx-auto mt-2 px-4 pb-12">
      {/* Page Header */}
      <div className="flex justify-between items-end mb-8 relative z-10">
        <div>
          <h1 className="text-[32px] font-sans font-bold text-nest-text-primary tracking-tight leading-none">Quản lý Khách thuê</h1>
        </div>
        <button className="bg-nest-primary hover:bg-[#0da090] text-white px-6 py-2.5 rounded-full text-[14px] font-bold transition-colors shadow-lg shadow-nest-primary/20 flex items-center gap-2">
          <UserPlus className="w-[18px] h-[18px]" /> Thêm khách
        </button>
      </div>

      {/* Main Table Area (Premium White Layout) */}
      <div className="bg-white/80 rounded-[32px] p-8 shadow-[0_4px_24px_rgba(15,58,64,0.04)] border border-slate-200/60 backdrop-blur-sm mb-8">
        {/* Header Row */}
        <div className="flex text-[10px] font-bold text-nest-text-secondary tracking-widest uppercase px-6 mb-6">
          <div className="w-[30%]">Họ và tên</div>
          <div className="w-[20%]">Số điện thoại</div>
          <div className="w-[15%]">Phòng</div>
          <div className="w-[25%] pl-4">Trạng thái hợp đồng</div>
          <div className="w-[10%] text-center">Thao tác</div>
        </div>

        {/* Rows */}
        <div className="flex flex-col gap-4">
          {tenants.map((tenant, idx) => (
            <div key={idx} className="bg-white rounded-full flex items-center px-6 py-4 shadow-[0_2px_10px_rgba(0,31,36,0.02)] hover:shadow-md transition-shadow border border-slate-100/80">
              <div className="w-[30%] flex items-center gap-4">
                <div className={`w-[46px] h-[46px] rounded-full ${tenant.avatarBg} ${tenant.avatarColor} flex items-center justify-center font-bold text-[16px]`}>
                  {tenant.avatarText}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-nest-text-primary text-[15px]">{tenant.name}</span>
                  <span className="text-nest-text-secondary text-[12px] font-medium leading-tight">{tenant.email}</span>
                </div>
              </div>
              <div className="w-[20%]">
                <span className="font-bold text-nest-text-primary text-[14px]">{tenant.phone}</span>
              </div>
              <div className="w-[15%]">
                <span className={`bg-nest-primary/5 ${tenant.roomColor} border-[0.5px] border-nest-primary/10 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase`}>
                  {tenant.room}
                </span>
              </div>
              <div className="w-[25%] pl-4">
                <div className={`${tenant.statusPill} inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-bold tracking-wide`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${tenant.dot}`}></span>
                  {tenant.status}
                </div>
              </div>
              <div className="w-[10%] flex items-center justify-center gap-4 text-nest-text-secondary">
                <button className="hover:text-nest-primary transition-colors"><Pencil className="w-4 h-4" /></button>
                <button className="hover:text-nest-text-primary transition-colors"><MoreVertical className="w-5 h-5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Layout Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Flash Actions */}
        <div className="lg:col-span-4 bg-white/80 rounded-[32px] p-8 shadow-[0_4px_24px_rgba(15,58,64,0.04)] border border-slate-200/60 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between mb-8">
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-nest-primary/5 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 mb-8">
            <h3 className="text-xl font-bold text-nest-text-primary mb-1">Thao tác nhanh</h3>
            <p className="text-[12px] text-nest-text-secondary font-medium">Quản lý khách thuê và cài đặt</p>
          </div>
          <div className="flex flex-col gap-3 relative z-10">
            <button className="w-full bg-nest-bg/50 hover:bg-nest-primary/10 flex items-center justify-between p-4 rounded-2xl transition-all group border border-slate-200/50 hover:border-nest-primary/30 shadow-sm hover:shadow-md">
              <div className="flex items-center gap-4">
                <Key className="w-5 h-5 text-nest-primary" />
                <span className="font-bold text-nest-text-primary text-[14px]">Tạo tài khoản đăng nhập</span>
              </div>
              <ChevronRight className="w-4 h-4 text-nest-text-secondary group-hover:text-nest-primary transition-colors" />
            </button>
            <button className="w-full bg-nest-bg/50 hover:bg-nest-primary/10 flex items-center justify-between p-4 rounded-2xl transition-all group border border-slate-200/50 hover:border-nest-primary/30 shadow-sm hover:shadow-md">
              <div className="flex items-center gap-4">
                <DoorOpen className="w-5 h-5 text-nest-primary" />
                <span className="font-bold text-nest-text-primary text-[14px]">Gán phòng (Assign)</span>
              </div>
              <ChevronRight className="w-4 h-4 text-nest-text-secondary group-hover:text-nest-primary transition-colors" />
            </button>
            <button className="w-full bg-red-50/30 hover:bg-red-50 flex items-center justify-between p-4 rounded-2xl transition-all group border border-red-100/50 hover:border-red-200 shadow-sm hover:shadow-md">
              <div className="flex items-center gap-4">
                <CalendarX className="w-5 h-5 text-red-500" />
                <span className="font-bold text-nest-text-primary text-[14px]">Kết thúc hợp đồng</span>
              </div>
              <ChevronRight className="w-4 h-4 text-nest-text-secondary group-hover:text-red-500 transition-colors" />
            </button>
          </div>
        </div>

        {/* Composite Statistics */}
        <div className="lg:col-span-8 bg-white rounded-[32px] p-10 shadow-[0_4px_24px_rgba(15,58,64,0.04)] border border-slate-200/60 flex items-center">
          <div className="flex-1 flex flex-col justify-center border-r border-slate-100 pr-8">
            <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-3">Tổng khách thuê</p>
            <h2 className="text-5xl font-bold text-nest-primary mb-3">1,284</h2>
            <div className="flex items-center gap-2 text-nest-primary font-bold text-[12px] bg-nest-primary/10 w-fit px-3 py-1.5 rounded-full shadow-sm">
              <TrendingUp className="w-3.5 h-3.5" /> +12% Tháng này
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center border-r border-slate-100 px-10">
            <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-3">Sắp hết hạn</p>
            <h2 className="text-5xl font-bold text-amber-500 mb-3">42</h2>
            <p className="text-[12px] font-medium text-nest-text-secondary leading-snug">
              Yêu cầu gia hạn ngay lập tức
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-center pl-10">
            <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-3">Chờ cấp quyền</p>
            <h2 className="text-5xl font-bold text-nest-text-primary mb-3">18</h2>
            <p className="text-[12px] font-medium text-nest-text-secondary leading-snug">
              Đang chờ thiết lập<br />ứng dụng
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
