import { useState } from 'react';
import { 
  FileSignature, ClipboardList, Search, Filter, 
  Download, MoreVertical, Plus, Calendar, 
  Wallet, AlertCircle, CheckCircle2, XCircle,
  FileText, History, Info
} from 'lucide-react';

const contractStats = [
  { label: 'TỔNG HỢP ĐỒNG', value: '42', detail: 'Đang có hiệu lực', icon: <ClipboardList className="w-5 h-5" />, color: 'text-[#14B8A6]', bg: 'bg-[#EBFDFB]' },
  { label: 'SẮP HẾT HẠN', value: '8', detail: 'Trong 30 ngày tới', icon: <AlertCircle className="w-5 h-5" />, color: 'text-[#E68A00]', bg: 'bg-[#FFF3E0]' },
  { label: 'ĐÃ KẾT THÚC', value: '15', detail: 'Chờ thanh lý/gia hạn', icon: <XCircle className="w-5 h-5" />, color: 'text-[#82ABB0]', bg: 'bg-[#F5F5F5]' },
  { label: 'TỔNG TIỀN CỌC', value: '185.5Tr', detail: 'Tổng ký quỹ đang giữ', icon: <Wallet className="w-5 h-5" />, color: 'text-[#3B82F6]', bg: 'bg-[#EBF4FF]' },
];

const contracts = [
  {
    id: 'HD-2023-001',
    tenant: 'Nguyễn Văn An',
    room: 'P.402',
    startDate: '12/04/2023',
    endDate: '12/04/2024',
    deposit: '9.000.000 đ',
    status: 'ĐANG HIỆU LỰC',
    statusColor: 'bg-[#EBFDFB] text-[#14B8A6]',
    dot: 'bg-[#14B8A6]'
  },
  {
    id: 'HD-2023-045',
    tenant: 'Trần Thị Mỹ Linh',
    room: 'P.205',
    startDate: '20/01/2023',
    endDate: '20/05/2024',
    deposit: '14.400.000 đ',
    status: 'SẮP HẾT HẠN',
    statusColor: 'bg-[#FFF3E0] text-[#E68A00]',
    dot: 'bg-[#E68A00]'
  },
  {
    id: 'HD-2022-112',
    tenant: 'Lê Hoàng Nam',
    room: 'P.101',
    startDate: '15/06/2022',
    endDate: '15/06/2023',
    deposit: '16.000.000 đ',
    status: 'ĐÃ KẾT THÚC',
    statusColor: 'bg-[#F5F5F5] text-[#82ABB0]',
    dot: 'bg-[#82ABB0]'
  },
  {
    id: 'HD-2023-089',
    tenant: 'Phạm Minh Quang',
    room: 'P.308',
    startDate: '10/02/2023',
    endDate: '10/02/2024',
    deposit: '10.200.000 đ',
    status: 'ĐANG HIỆU LỰC',
    statusColor: 'bg-[#EBFDFB] text-[#14B8A6]',
    dot: 'bg-[#14B8A6]'
  }
];

export default function ContractManagePage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="w-full max-w-[1400px] mx-auto pb-12">
      {/* Header section */}
      <div className="flex justify-between items-end mb-8 pt-4">
        <div>
          <h1 className="text-[32px] font-bold text-[#0F3A40] leading-none mb-3">Quản lý Hợp đồng</h1>
          <p className="text-[#4A787C] font-medium text-[14px]">Theo dõi, gia hạn và quản lý các thỏa thuận thuê phòng trong hệ thống.</p>
        </div>
        <button className="flex items-center gap-2 bg-[#14B8A6] hover:bg-[#0da090] text-white px-6 py-3 rounded-full text-[14px] font-bold transition-all shadow-lg shadow-[#14B8A6]/20">
          <Plus className="w-5 h-5" /> Tạo hợp đồng mới
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {contractStats.map((stat, i) => (
          <div key={i} className="bg-white/70 backdrop-blur-md border border-white/50 rounded-[28px] p-6 shadow-sm hover:translate-y-[-4px] transition-all duration-300">
            <p className="text-[10px] font-bold text-[#82ABB0] tracking-widest uppercase mb-3">{stat.label}</p>
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-3xl font-bold text-[#0F3A40] mb-1">{stat.value}</h3>
                <p className="text-[12px] font-bold text-[#82ABB0]">
                  {stat.detail}
                </p>
              </div>
              <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white/40 backdrop-blur-sm border border-white/50 rounded-[32px] p-4 flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#82ABB0] group-focus-within:text-[#14B8A6] transition-colors" />
            <input 
              type="text"
              placeholder="Tìm khách thuê, số phòng..."
              className="bg-white/80 border border-[#BCE1E5]/30 rounded-2xl pl-11 pr-4 py-2.5 text-[13px] font-bold text-[#0F3A40] outline-none min-w-[280px] focus:border-[#14B8A6]/50 transition-all"
            />
          </div>
          <div className="flex flex-col">
            <select className="bg-white/80 border border-[#BCE1E5]/30 rounded-2xl px-4 py-2.5 text-[13px] font-bold text-[#0F3A40] outline-none min-w-[160px]">
              <option>Tất cả trạng thái</option>
              <option>Đang hiệu lực</option>
              <option>Sắp hết hạn</option>
              <option>Đã kết thúc</option>
            </select>
          </div>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#BCE1E5]/50 rounded-2xl text-[13px] font-bold text-[#4A787C] hover:text-[#0F3A40] transition-all shadow-sm">
          <Download size={16} /> Xuất danh sách
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-[40px] p-8 shadow-sm mb-10 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-bold text-[#82ABB0] tracking-widest uppercase">
                <th className="pb-6 px-2">Mã Hợp đồng</th>
                <th className="pb-6 px-2">Khách thuê</th>
                <th className="pb-6 px-2">Phòng</th>
                <th className="pb-6 px-2">Thời hạn</th>
                <th className="pb-6 px-2">Tiền cọc</th>
                <th className="pb-6 px-2">Trạng thái</th>
                <th className="pb-6 px-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => (
                <tr key={contract.id} className="group border-b border-[#BCE1E5]/20 last:border-0 hover:bg-[#F2FCFD]/50 transition-colors">
                  <td className="py-5 px-2">
                    <span className="font-bold text-[#0F3A40] text-[13px]">{contract.id}</span>
                  </td>
                  <td className="py-5 px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-[#14B8A6]/10 flex items-center justify-center text-[#14B8A6] font-bold text-[11px] border border-[#14B8A6]/20">
                        {contract.tenant.charAt(0)}
                      </div>
                      <span className="font-bold text-[#0F3A40] text-[14px]">{contract.tenant}</span>
                    </div>
                  </td>
                  <td className="py-5 px-2">
                    <span className="text-[13px] font-bold text-[#4A787C]">{contract.room}</span>
                  </td>
                  <td className="py-5 px-2">
                    <div className="flex flex-col">
                      <span className="text-[12px] font-medium text-[#0F3A40]">{contract.startDate} - {contract.endDate}</span>
                      <span className="text-[10px] text-[#82ABB0] font-bold">Thời hạn 12 tháng</span>
                    </div>
                  </td>
                  <td className="py-5 px-2">
                    <span className="text-[13px] font-bold text-[#3B82F6]">{contract.deposit}</span>
                  </td>
                  <td className="py-5 px-2">
                    <div className={`${contract.statusColor} inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest uppercase`}>
                      <span className={`w-1 h-1 rounded-full ${contract.dot}`}></span>
                      {contract.status}
                    </div>
                  </td>
                  <td className="py-5 px-2 text-right relative">
                    <button className="p-2 text-[#82ABB0] hover:text-[#0F3A40] hover:bg-white rounded-xl transition-all">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-8 flex justify-between items-center text-[12px] font-bold text-[#82ABB0] border-t border-[#BCE1E5]/20 pt-6">
          <span>Đang hiển thị 4 trên <span className="text-[#0F3A40]">42 hợp đồng</span></span>
          <div className="flex items-center gap-1.5">
            <button className="w-8 h-8 rounded-lg bg-[#14B8A6] text-white flex items-center justify-center shadow-md">1</button>
            <button className="w-8 h-8 rounded-lg hover:bg-[#F2FCFD] flex items-center justify-center text-[#4A787C]">2</button>
            <button className="w-8 h-8 rounded-lg hover:bg-[#F2FCFD] flex items-center justify-center text-[#4A787C]">3</button>
          </div>
        </div>
      </div>

      {/* Warning/Info Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#FFF3E0] rounded-[32px] p-8 border border-[#E68A00]/10 flex gap-6 items-start">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#E68A00] shrink-0 shadow-sm">
            <AlertCircle size={24} />
          </div>
          <div>
            <h4 className="text-[16px] font-bold text-[#0F3A40] mb-2">Lưu ý gia hạn hợp đồng</h4>
            <p className="text-[13px] text-[#4A787C] font-medium leading-relaxed">
              Có 8 hợp đồng sẽ hết hạn trong vòng 30 ngày tới. Hệ thống đã tự động gửi thông báo nhắc nhở đến khách thuê. Vui lòng kiểm tra phản hồi để chuẩn bị thủ tục gia hạn hoặc thanh lý.
            </p>
          </div>
        </div>

        <div className="bg-[#F2FCFD] rounded-[32px] p-8 border border-[#BCE1E5]/30 flex gap-6 items-start">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#14B8A6] shrink-0 shadow-sm">
            <Info size={24} />
          </div>
          <div>
            <h4 className="text-[16px] font-bold text-[#0F3A40] mb-2">Hợp đồng điện tử mẫu</h4>
            <p className="text-[13px] text-[#4A787C] font-medium leading-relaxed">
               Bạn có thể sử dụng các mẫu hợp đồng chuẩn đã được phê duyệt để tạo nhanh hợp đồng mới cho khách thuê. Mọi thay đổi về điều khoản cần được lưu lại thành bản phụ lục.
            </p>
            <button className="mt-4 text-[13px] font-bold text-[#14B8A6] hover:underline flex items-center gap-1.5 group">
              Tải xuống biểu mẫu <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
