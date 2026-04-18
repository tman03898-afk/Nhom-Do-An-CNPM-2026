import { Zap, Droplet, Info, ChevronDown, Filter, Download, Eye, Bell, Plus, DollarSign, ClipboardList, TrendingUp } from 'lucide-react';

export default function InvoiceManagePage() {
  const invoices = [
    {
      month: '10/2023',
      room: 'P.302', name: 'Nguyễn Văn A',
      elec: '150 kWh', water: '12 m³',
      total: '3.450.000đ',
      status: 'Đã thanh toán', statusColor: 'bg-nest-primary/10 text-nest-primary',
      notifyActive: false
    },
    {
      month: '10/2023',
      room: 'P.105', name: 'Trần Thị B',
      elec: '210 kWh', water: '15 m³',
      total: '4.210.000đ',
      status: 'Chưa thanh toán', statusColor: 'bg-amber-50 text-amber-600',
      notifyActive: true
    },
    {
      month: '10/2023',
      room: 'P.410', name: 'Lê Văn C',
      elec: '185 kWh', water: '10 m³',
      total: '3.890.000đ',
      status: 'Đã thanh toán', statusColor: 'bg-nest-primary/10 text-nest-primary',
      notifyActive: false
    }
  ];

  return (
    <div className="w-full max-w-[1200px] mx-auto mt-2 px-4 pb-20 relative flex flex-col">
      {/* Floating Action Button */}
      <button className="fixed bottom-10 right-10 w-14 h-14 bg-nest-text-primary text-nest-primary rounded-full shadow-2xl flex items-center justify-center hover:bg-nest-primary hover:text-white transition-all z-50">
         <Plus className="w-6 h-6" />
      </button>

      {/* Page Header */}
      <div className="flex justify-between items-end mb-8 relative z-10">
        <div>
          <h1 className="text-[32px] font-sans font-bold text-nest-text-primary tracking-tight leading-none">Quản lý Hóa đơn</h1>
        </div>
      </div>

      {/* Top Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
         {/* Form Card (Left) */}
         <div className="lg:col-span-5 bg-white rounded-[32px] p-8 shadow-[0_4px_24px_rgba(15,58,64,0.04)] border border-slate-200/60 flex flex-col">
            <div className="flex items-center gap-4 mb-8">
               <div className="w-10 h-10 rounded-[12px] bg-nest-primary flex items-center justify-center">
                  <div className="w-4 h-4 bg-white rounded-sm relative">
                     <div className="absolute top-[3px] right-[3px] w-1.5 h-1.5 bg-nest-primary rounded-full"></div>
                  </div>
               </div>
               <h3 className="text-[20px] font-bold text-nest-text-primary">Nhập chỉ số điện nước</h3>
            </div>

            <div className="mb-6">
               <label className="block text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-2">Chọn phòng</label>
               <div className="bg-nest-bg rounded-xl px-4 py-3 flex items-center justify-between text-nest-text-primary font-bold text-[14px] border border-nest-primary/5">
                  <span>Phòng 302 - Nguyễn Văn A</span>
                  <ChevronDown className="w-4 h-4 text-nest-text-secondary" />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
               <div>
                  <label className="block text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-2">Chỉ số điện (kWh)</label>
                  <input type="text" placeholder="0" className="w-full bg-nest-bg rounded-xl px-4 py-3 text-nest-text-primary font-bold text-[14px] outline-none border border-nest-primary/5 focus:border-nest-primary/50 placeholder-nest-text-secondary/50" />
               </div>
               <div>
                  <label className="block text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-2">Chỉ số nước (m³)</label>
                  <input type="text" placeholder="0" className="w-full bg-nest-bg rounded-xl px-4 py-3 text-nest-text-primary font-bold text-[14px] outline-none border border-nest-primary/5 focus:border-nest-primary/50 placeholder-nest-text-secondary/50" />
               </div>
            </div>

            <div className="bg-nest-primary/5 rounded-xl p-4 flex gap-3 mb-8">
               <Info className="w-4 h-4 text-nest-primary shrink-0 mt-0.5" />
               <p className="text-[12px] text-nest-text-secondary font-medium leading-relaxed">
                 Hệ thống sẽ tự động tính toán số tiền dựa trên đơn giá đã cấu hình trong mục Dịch vụ.
               </p>
            </div>

            <button className="w-full bg-nest-primary hover:bg-[#0da090] text-white py-3.5 rounded-full text-[15px] font-bold transition-colors shadow-lg shadow-nest-primary/10 mt-auto">
               Xác nhận chỉ số
            </button>
         </div>

         {/* Metrics & Banner (Right) */}
         <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-6">
               {/* Total Revenue */}
               <div className="bg-white rounded-[32px] p-8 shadow-[0_4px_24px_rgba(15,58,64,0.04)] relative overflow-hidden flex flex-col justify-between border border-slate-200/60 min-h-[160px]">
                  <DollarSign className="absolute -bottom-8 -right-8 w-40 h-40 text-nest-primary/5 pointer-events-none" />
                  <div className="relative z-10">
                     <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-3">Tổng doanh thu tháng</p>
                     <h3 className="text-3xl font-bold text-nest-text-primary">45.200.000đ</h3>
                  </div>
                  <div className="relative z-10 flex items-center gap-2 mt-4 text-[12px] font-bold text-nest-primary">
                     <TrendingUp className="w-4 h-4" /> <span className="text-nest-text-secondary font-medium">+12% so với tháng trước</span>
                  </div>
               </div>
               
               {/* Unpaid */}
               <div className="bg-white rounded-[32px] p-8 shadow-[0_4px_24px_rgba(15,58,64,0.04)] relative overflow-hidden flex flex-col justify-between border border-slate-200/60 min-h-[160px]">
                  <ClipboardList className="absolute -bottom-4 -right-4 w-32 h-32 text-nest-primary/5 pointer-events-none" />
                  <div className="relative z-10">
                     <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest mb-3">Hóa đơn chưa đóng</p>
                     <h3 className="text-3xl font-bold text-red-500">08</h3>
                  </div>
                  <div className="relative z-10 flex items-center gap-2 mt-4 bg-nest-bg w-fit px-3 py-1.5 rounded-lg shadow-sm border border-nest-primary/10">
                     <Info className="w-3.5 h-3.5 text-nest-text-secondary" />
                     <span className="text-[11px] font-bold text-nest-text-secondary">Cần gửi thông báo nhắc nhở</span>
                  </div>
               </div>
            </div>

            {/* Visual Banner Card */}
            <div className="bg-white rounded-[32px] shadow-lg shadow-black/5 overflow-hidden relative flex-1 min-h-[180px] border border-slate-200/60 group">
               <img src="https://images.unsplash.com/photo-1558227031-60292723aa92?w=800&q=80" alt="Energy" className="w-full h-full object-cover opacity-80 mix-blend-multiply transition-transform duration-700 group-hover:scale-105" />
               <div className="absolute inset-0 bg-gradient-to-t from-nest-text-primary via-nest-text-primary/40 to-transparent flex items-end p-8">
                  <h3 className="text-2xl font-bold text-white tracking-wide">Dữ liệu tiêu thụ điện nước Quý 3</h3>
               </div>
            </div>
         </div>
      </div>

      {/* History Table */}
      <div className="bg-white/80 rounded-[32px] p-8 shadow-[0_8px_30px_rgba(15,58,64,0.04)] border border-slate-200/60 backdrop-blur-sm mb-6">
        <div className="flex justify-between items-center mb-8">
           <h3 className="text-[20px] font-bold text-nest-text-primary">Lịch sử hóa đơn</h3>
           <div className="flex bg-white rounded-full p-1 border border-slate-200 shadow-sm">
             <button className="flex items-center gap-1.5 px-4 py-2 rounded-full text-nest-text-secondary hover:text-nest-text-primary text-[12px] font-bold transition-colors">
                <Filter className="w-3.5 h-3.5" /> Bộ lọc
             </button>
             <button className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-50 text-nest-text-primary text-[12px] font-bold shadow-sm">
                <Download className="w-3.5 h-3.5" /> Xuất PDF
             </button>
           </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-nest-primary/10 text-[10px] font-bold text-nest-text-secondary tracking-widest uppercase">
                <th className="pb-5 font-bold px-2">Tháng</th>
                <th className="pb-5 font-bold px-2">Phòng</th>
                <th className="pb-5 font-bold px-2 text-center">Tiêu thụ (Điện/Nước)</th>
                <th className="pb-5 font-bold px-2">Tổng tiền</th>
                <th className="pb-5 font-bold px-2">Trạng thái</th>
                <th className="pb-5 font-bold px-2 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, idx) => (
                <tr key={idx} className="border-b border-nest-primary/5 last:border-0 hover:bg-nest-bg/50 transition-colors">
                  <td className="py-5 px-2">
                    <span className="font-bold text-nest-text-primary text-[14px]">{inv.month}</span>
                  </td>
                  <td className="py-5 px-2">
                    <div className="flex flex-col">
                       <span className="font-bold text-nest-text-primary text-[14px]">{inv.room}</span>
                       <span className="text-[12px] text-nest-text-secondary font-medium">{inv.name}</span>
                    </div>
                  </td>
                  <td className="py-5 px-2 text-center">
                    <div className="flex items-center justify-center gap-4">
                       <div className="flex items-center gap-1 text-nest-text-primary font-bold text-[13px]">
                          <Zap className="w-4 h-4 text-amber-500" fill="currentColor" /> {inv.elec}
                       </div>
                       <div className="flex items-center gap-1 text-nest-text-primary font-bold text-[13px]">
                          <Droplet className="w-4 h-4 text-blue-500" fill="currentColor" /> {inv.water}
                       </div>
                    </div>
                  </td>
                  <td className="py-5 px-2">
                    <span className="font-bold text-nest-text-primary text-[15px]">{inv.total}</span>
                  </td>
                  <td className="py-5 px-2">
                    <div className={`${inv.statusColor} inline-flex items-center px-4 py-1.5 rounded-2xl text-[11px] font-bold tracking-wide`}>
                       {inv.status}
                    </div>
                  </td>
                  <td className="py-5 px-2 text-right">
                    <div className="flex items-center justify-end gap-5 text-nest-text-secondary">
                       <button className="hover:text-nest-primary transition-colors"><Eye className="w-5 h-5" /></button>
                       <button className={`${inv.notifyActive ? 'text-amber-600 hover:text-amber-700' : 'hover:text-nest-text-primary'} transition-colors`}>
                          <Bell className={`w-5 h-5 ${inv.notifyActive ? 'fill-current' : ''}`} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-transparent text-[12px] font-bold text-nest-text-secondary">
           <span>Hiển thị 1-10 trên <span className="text-nest-text-primary">45 hóa đơn</span></span>
           <div className="flex items-center gap-2">
              <button className="text-nest-text-secondary hover:text-nest-text-primary px-2">&lt;</button>
              <button className="w-8 h-8 rounded-full bg-nest-primary text-white flex items-center justify-center">1</button>
              <button className="w-8 h-8 rounded-full text-nest-text-primary hover:bg-nest-bg flex items-center justify-center transition-colors">2</button>
              <button className="w-8 h-8 rounded-full text-nest-text-primary hover:bg-nest-bg flex items-center justify-center transition-colors">3</button>
              <button className="text-nest-text-secondary hover:text-nest-text-primary px-2">&gt;</button>
           </div>
        </div>
      </div>
      {/* Spacing to lift the table from the bottom */}
      <div className="h-10 w-full shrink-0"></div>
    </div>
  );
}
