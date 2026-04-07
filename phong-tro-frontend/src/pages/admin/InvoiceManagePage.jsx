import { Zap, Droplet, Info, ChevronDown, Filter, Download, Eye, Bell, Plus, DollarSign, ClipboardList, TrendingUp } from 'lucide-react';

export default function InvoiceManagePage() {
  const invoices = [
    {
      month: '10/2023',
      room: 'P.302', name: 'Nguyễn Văn A',
      elec: '150 kWh', water: '12 m³',
      total: '3.450.000đ',
      status: 'Đã thanh toán', statusColor: 'bg-[#EBFDFB] text-[#14B8A6]',
      notifyActive: false
    },
    {
      month: '10/2023',
      room: 'P.105', name: 'Trần Thị B',
      elec: '210 kWh', water: '15 m³',
      total: '4.210.000đ',
      status: 'Chưa thanh toán', statusColor: 'bg-[#FFF3E0] text-[#E68A00]',
      notifyActive: true
    },
    {
      month: '10/2023',
      room: 'P.410', name: 'Lê Văn C',
      elec: '185 kWh', water: '10 m³',
      total: '3.890.000đ',
      status: 'Đã thanh toán', statusColor: 'bg-[#EBFDFB] text-[#14B8A6]',
      notifyActive: false
    }
  ];

  return (
    <div className="w-full max-w-[1200px] mx-auto mt-2 px-4 pb-12 relative flex flex-col h-full">
      {/* Floating Action Button */}
      <button className="fixed bottom-10 right-10 w-14 h-14 bg-[#0F3A40] text-[#14B8A6] rounded-full shadow-xl flex items-center justify-center hover:bg-[#0da090] hover:text-white transition-all z-50">
         <Plus className="w-6 h-6" />
      </button>

      {/* Page Header */}
      <div className="flex justify-between items-end mb-8 relative z-10">
        <div>
          <h1 className="text-[32px] font-sans font-bold text-[#0F3A40] tracking-tight leading-none">Quản lý Hóa đơn</h1>
        </div>
      </div>

      {/* Top Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
         {/* Form Card (Left) */}
         <div className="lg:col-span-5 bg-[#F2FCFD] rounded-[32px] p-8 shadow-sm flex flex-col border border-transparent">
            <div className="flex items-center gap-4 mb-8">
               <div className="w-10 h-10 rounded-[12px] bg-[#14B8A6] flex items-center justify-center">
                  <div className="w-4 h-4 bg-white rounded-sm relative">
                     <div className="absolute top-[3px] right-[3px] w-1.5 h-1.5 bg-[#14B8A6] rounded-full"></div>
                  </div>
               </div>
               <h3 className="text-[20px] font-bold text-[#0F3A40]">Nhập chỉ số điện nước</h3>
            </div>

            <div className="mb-6">
               <label className="block text-[11px] font-bold text-[#4A787C] uppercase tracking-widest mb-2">Chọn phòng</label>
               <div className="bg-[#DDF5F7] rounded-xl px-4 py-3 flex items-center justify-between text-[#0F3A40] font-bold text-[14px]">
                  <span>Phòng 302 - Nguyễn Văn A</span>
                  <ChevronDown className="w-4 h-4 text-[#4A787C]" />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
               <div>
                  <label className="block text-[11px] font-bold text-[#4A787C] uppercase tracking-widest mb-2">Chỉ số điện (kWh)</label>
                  <input type="text" placeholder="0" className="w-full bg-[#DDF5F7] rounded-xl px-4 py-3 text-[#0F3A40] font-bold text-[14px] outline-none border border-transparent focus:border-[#14B8A6]/50 placeholder-[#82ABB0]" />
               </div>
               <div>
                  <label className="block text-[11px] font-bold text-[#4A787C] uppercase tracking-widest mb-2">Chỉ số nước (m³)</label>
                  <input type="text" placeholder="0" className="w-full bg-[#DDF5F7] rounded-xl px-4 py-3 text-[#0F3A40] font-bold text-[14px] outline-none border border-transparent focus:border-[#14B8A6]/50 placeholder-[#82ABB0]" />
               </div>
            </div>

            <div className="bg-[#DDF5F7] rounded-xl p-4 flex gap-3 mb-8">
               <Info className="w-4 h-4 text-[#4A787C] shrink-0 mt-0.5" />
               <p className="text-[12px] text-[#4A787C] font-medium leading-relaxed">
                 Hệ thống sẽ tự động tính toán số tiền dựa trên đơn giá đã cấu hình trong mục Dịch vụ.
               </p>
            </div>

            <button className="w-full bg-[#14B8A6] hover:bg-[#0da090] text-white py-3.5 rounded-full text-[15px] font-bold transition-colors shadow-md mt-auto">
               Xác nhận chỉ số
            </button>
         </div>

         {/* Metrics & Banner (Right) */}
         <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-6">
               {/* Total Revenue */}
               <div className="bg-[#F2FCFD] rounded-[32px] p-8 shadow-sm relative overflow-hidden flex flex-col justify-between border border-transparent min-h-[160px]">
                  <DollarSign className="absolute -bottom-8 -right-8 w-40 h-40 text-[#BCE1E5]/20 pointer-events-none" />
                  <div className="relative z-10">
                     <p className="text-[11px] font-bold text-[#4A787C] uppercase tracking-widest mb-3">Tổng doanh thu tháng</p>
                     <h3 className="text-3xl font-bold text-[#0F3A40]">45.200.000đ</h3>
                  </div>
                  <div className="relative z-10 flex items-center gap-2 mt-4 text-[12px] font-bold text-[#14B8A6]">
                     <TrendingUp className="w-4 h-4" /> <span className="text-[#4A787C] font-medium">+12% so với tháng trước</span>
                  </div>
               </div>
               
               {/* Unpaid */}
               <div className="bg-[#F2FCFD] rounded-[32px] p-8 shadow-sm relative overflow-hidden flex flex-col justify-between border border-transparent min-h-[160px]">
                  <ClipboardList className="absolute -bottom-4 -right-4 w-32 h-32 text-[#BCE1E5]/20 pointer-events-none" />
                  <div className="relative z-10">
                     <p className="text-[11px] font-bold text-[#4A787C] uppercase tracking-widest mb-3">Hóa đơn chưa đóng</p>
                     <h3 className="text-3xl font-bold text-[#D14D4D]">08</h3>
                  </div>
                  <div className="relative z-10 flex items-center gap-2 mt-4 bg-white w-fit px-3 py-1.5 rounded-lg shadow-sm border border-[#BCE1E5]/30">
                     <Info className="w-3.5 h-3.5 text-[#4A787C]" />
                     <span className="text-[11px] font-bold text-[#4A787C]">Cần gửi thông báo nhắc nhở</span>
                  </div>
               </div>
            </div>

            {/* Visual Banner Card */}
            <div className="bg-[#F2FCFD] rounded-[32px] shadow-sm overflow-hidden relative flex-1 min-h-[180px] border border-transparent group">
               <img src="https://images.unsplash.com/photo-1558227031-60292723aa92?w=800&q=80" alt="Energy" className="w-full h-full object-cover opacity-80 mix-blend-multiply transition-transform duration-700 group-hover:scale-105" />
               <div className="absolute inset-0 bg-gradient-to-t from-[#0F3A40] via-[#0F3A40]/40 to-transparent flex items-end p-8">
                  <h3 className="text-2xl font-bold text-white tracking-wide">Dữ liệu tiêu thụ điện nước Quý 3</h3>
               </div>
            </div>
         </div>
      </div>

      {/* History Table */}
      <div className="bg-[#F2FCFD] rounded-[32px] p-8 shadow-sm border border-transparent">
        <div className="flex justify-between items-center mb-8">
           <h3 className="text-[20px] font-bold text-[#0F3A40]">Lịch sử hóa đơn</h3>
           <div className="flex bg-white rounded-full p-1 border border-[#BCE1E5]/40 shadow-sm">
             <button className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[#4A787C] hover:text-[#0F3A40] text-[12px] font-bold transition-colors">
                <Filter className="w-3.5 h-3.5" /> Bộ lọc
             </button>
             <button className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-[#0F3A40] text-[12px] font-bold shadow-sm">
                <Download className="w-3.5 h-3.5" /> Xuất PDF
             </button>
           </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#BCE1E5]/40 text-[10px] font-bold text-[#82ABB0] tracking-widest uppercase">
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
                <tr key={idx} className="border-b border-[#BCE1E5]/40 last:border-0 hover:bg-white/50 transition-colors">
                  <td className="py-5 px-2">
                    <span className="font-bold text-[#0F3A40] text-[14px]">{inv.month}</span>
                  </td>
                  <td className="py-5 px-2">
                    <div className="flex flex-col">
                       <span className="font-bold text-[#0F3A40] text-[14px]">{inv.room}</span>
                       <span className="text-[12px] text-[#82ABB0] font-medium">{inv.name}</span>
                    </div>
                  </td>
                  <td className="py-5 px-2 text-center">
                    <div className="flex items-center justify-center gap-4">
                       <div className="flex items-center gap-1 text-[#4A787C] font-bold text-[13px]">
                          <Zap className="w-4 h-4 text-[#E68A00]" fill="currentColor" /> {inv.elec}
                       </div>
                       <div className="flex items-center gap-1 text-[#4A787C] font-bold text-[13px]">
                          <Droplet className="w-4 h-4 text-[#3B82F6]" fill="currentColor" /> {inv.water}
                       </div>
                    </div>
                  </td>
                  <td className="py-5 px-2">
                    <span className="font-bold text-[#0F3A40] text-[15px]">{inv.total}</span>
                  </td>
                  <td className="py-5 px-2">
                    <div className={`${inv.statusColor} inline-flex items-center px-4 py-1.5 rounded-2xl text-[11px] font-bold tracking-wide`}>
                       {inv.status}
                    </div>
                  </td>
                  <td className="py-5 px-2 text-right">
                    <div className="flex items-center justify-end gap-5 text-[#82ABB0]">
                       <button className="hover:text-[#14B8A6] transition-colors"><Eye className="w-5 h-5" /></button>
                       <button className={`${inv.notifyActive ? 'text-[#E68A00] hover:text-[#d37e00]' : 'hover:text-[#0F3A40]'} transition-colors`}>
                          <Bell className={`w-5 h-5 ${inv.notifyActive ? 'fill-current' : ''}`} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-transparent text-[12px] font-bold text-[#82ABB0]">
           <span>Hiển thị 1-10 trên <span className="text-[#0F3A40]">45 hóa đơn</span></span>
           <div className="flex items-center gap-2">
              <button className="text-[#82ABB0] hover:text-[#0F3A40] px-2">&lt;</button>
              <button className="w-8 h-8 rounded-full bg-[#14B8A6] text-white flex items-center justify-center">1</button>
              <button className="w-8 h-8 rounded-full text-[#4A787C] hover:bg-[#EBFDFB] flex items-center justify-center transition-colors">2</button>
              <button className="w-8 h-8 rounded-full text-[#4A787C] hover:bg-[#EBFDFB] flex items-center justify-center transition-colors">3</button>
              <button className="text-[#82ABB0] hover:text-[#0F3A40] px-2">&gt;</button>
           </div>
        </div>
      </div>
    </div>
  );
}
