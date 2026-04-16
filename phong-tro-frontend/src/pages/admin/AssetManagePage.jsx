import { useState } from 'react';
import { 
  Plus, Package, Refrigerator, Bed, Shirt, Snowflake, 
  Search, Filter, Download, MoreVertical, Edit3, Trash2, 
  AlertTriangle, CheckCircle2, TrendingUp, Info
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const assetStats = [
  { label: 'TỔNG TÀI SẢN', value: '1,248', detail: '+12% so với tháng trước', icon: <Package className="w-5 h-5" />, color: 'text-[#14B8A6]', bg: 'bg-[#EBFDFB]' },
  { label: 'CẦN BẢO TRÌ', value: '24', detail: '3 trường hợp khẩn cấp', icon: <AlertTriangle className="w-5 h-5" />, color: 'text-[#D14D4D]', bg: 'bg-[#FFF0F0]' },
  { label: 'GIÁ TRỊ TỒN KHO', value: '4.2B', detail: 'VND (Khấu hao ước tính)', icon: <TrendingUp className="w-5 h-5" />, color: 'text-[#3B82F6]', bg: 'bg-[#EBF4FF]' },
  { label: 'MỚI TRANG BỊ', value: '156', detail: 'Trong 30 ngày qua', icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-[#E68A00]', bg: 'bg-[#FFF3E0]' },
];

const maintenanceData = [
  { month: 'Th1', cost: 120 },
  { month: 'Th2', cost: 150 },
  { month: 'Th3', cost: 180 },
  { month: 'Th4', cost: 140 },
  { month: 'Th5', cost: 210 },
  { month: 'Th6', cost: 250 },
];

const assets = [
  {
    id: 1,
    name: 'Điều hòa Daikin Inverter 1.5 HP',
    description: 'SN: DK-2023-88912',
    room: 'P.402 - Studio',
    date: '12/04/2023',
    status: 'MỚI',
    statusColor: 'bg-[#EBFDFB] text-[#14B8A6]',
    value: '12.500.000 đ',
    icon: <Snowflake className="w-4 h-4" />
  },
  {
    id: 2,
    name: 'Tủ lạnh Samsung Bespoke',
    description: 'SN: SS-B-99210',
    room: 'P.205 - Premium Suite',
    date: '20/01/2023',
    status: 'TỐT',
    statusColor: 'bg-[#EBFDFB] text-[#14B8A6]',
    value: '24.800.000 đ',
    icon: <Refrigerator className="w-4 h-4" />
  },
  {
    id: 3,
    name: 'Giường gỗ Sồi cao cấp 1m8',
    description: 'ID: FUR-W-015',
    room: 'P.101 - Master Suite',
    date: '15/06/2021',
    status: 'CẦN BẢO TRÌ',
    statusColor: 'bg-[#FFF3E0] text-[#E68A00]',
    value: '8.200.000 đ',
    icon: <Bed className="w-4 h-4" />
  },
  {
    id: 4,
    name: 'Tủ quần áo gỗ Công nghiệp 3 cánh',
    description: 'ID: FUR-W-104',
    room: 'P.303 - Studio',
    date: '10/02/2024',
    status: 'MỚI',
    statusColor: 'bg-[#EBFDFB] text-[#14B8A6]',
    value: '5.400.000 đ',
    icon: <Shirt className="w-4 h-4" />
  }
];

export default function AssetManagePage() {
  return (
    <div className="w-full max-w-[1400px] mx-auto pb-12">
      {/* Header section */}
      <div className="flex justify-between items-end mb-8 pt-4">
        <div>
          <h1 className="text-[32px] font-bold text-[#0F3A40] leading-none mb-3">Quản lý Tài sản</h1>
          <p className="text-[#4A787C] font-medium text-[14px]">Theo dõi và cập nhật danh mục thiết bị, nội thất trong hệ thống The Nest Living.</p>
        </div>
        <button className="flex items-center gap-2 bg-[#14B8A6] hover:bg-[#0da090] text-white px-6 py-3 rounded-full text-[14px] font-bold transition-all shadow-lg shadow-[#14B8A6]/20">
          <Plus className="w-5 h-5" /> Thêm tài sản mới
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {assetStats.map((stat, i) => (
          <div key={i} className="bg-white/70 backdrop-blur-md border border-white/50 rounded-[28px] p-6 shadow-sm hover:translate-y-[-4px] transition-all duration-300">
            <p className="text-[10px] font-bold text-[#82ABB0] tracking-widest uppercase mb-3">{stat.label}</p>
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-3xl font-bold text-[#0F3A40] mb-1">{stat.value}</h3>
                <p className={`text-[12px] font-bold ${i === 1 ? 'text-[#D14D4D]' : 'text-[#82ABB0]'}`}>
                  {i === 1 && <span className="inline-block mr-1">▲</span>}
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
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-[#82ABB0] ml-3 mb-1 uppercase tracking-tight">Loại tài sản</span>
            <select className="bg-white/80 border border-[#BCE1E5]/30 rounded-2xl px-4 py-2 text-[13px] font-bold text-[#0F3A40] outline-none min-w-[160px]">
              <option>Tất cả loại</option>
              <option>Điện lạnh</option>
              <option>Nội thất</option>
              <option>Điện tử</option>
            </select>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-[#82ABB0] ml-3 mb-1 uppercase tracking-tight">Tình trạng</span>
            <select className="bg-white/80 border border-[#BCE1E5]/30 rounded-2xl px-4 py-2 text-[13px] font-bold text-[#0F3A40] outline-none min-w-[160px]">
              <option>Tất cả tình trạng</option>
              <option>Mới</option>
              <option>Tốt</option>
              <option>Cần bảo trì</option>
            </select>
          </div>
          <button className="mt-5 text-[13px] font-bold text-[#14B8A6] hover:underline px-4">Xóa bộ lọc</button>
        </div>
        <button className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-white border border-[#BCE1E5]/50 rounded-2xl text-[13px] font-bold text-[#4A787C] hover:text-[#0F3A40] transition-all shadow-sm">
          <Download size={16} /> Xuất báo cáo
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-[40px] p-8 shadow-sm mb-10 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-bold text-[#82ABB0] tracking-widest uppercase">
                <th className="pb-6 px-2">Tên tài sản</th>
                <th className="pb-6 px-2">Phòng</th>
                <th className="pb-6 px-2">Ngày mua</th>
                <th className="pb-6 px-2">Tình trạng</th>
                <th className="pb-6 px-2">Giá trị</th>
                <th className="pb-6 px-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id} className="group border-b border-[#BCE1E5]/20 last:border-0 hover:bg-[#F2FCFD]/50 transition-colors">
                  <td className="py-5 px-2">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 bg-[#EBFDFB] rounded-xl flex items-center justify-center text-[#14B8A6] shrink-0 border border-[#14B8A6]/10">
                        {asset.icon}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-[#0F3A40] text-[14px] leading-tight mb-0.5">{asset.name}</span>
                        <span className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-tight">{asset.description}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-2">
                    <span className="text-[13px] font-bold text-[#4A787C]">{asset.room}</span>
                  </td>
                  <td className="py-5 px-2">
                    <span className="text-[13px] font-medium text-[#0F3A40]">{asset.date}</span>
                  </td>
                  <td className="py-5 px-2">
                    <span className={`px-3 py-1.5 rounded-[10px] text-[10px] font-extrabold tracking-widest uppercase ${asset.statusColor}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="py-5 px-2 font-bold text-[#0F3A40] text-[14px]">
                    {asset.value}
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
          <span>Hiển thị 1 - 4 của <span className="text-[#0F3A40]">1,248 tài sản</span></span>
          <div className="flex items-center gap-1.5">
            <button className="w-8 h-8 rounded-lg hover:bg-[#F2FCFD] flex items-center justify-center text-[#82ABB0]">&lt;</button>
            <button className="w-8 h-8 rounded-lg bg-[#14B8A6] text-white flex items-center justify-center shadow-md">1</button>
            <button className="w-8 h-8 rounded-lg hover:bg-[#F2FCFD] flex items-center justify-center text-[#4A787C]">2</button>
            <button className="w-8 h-8 rounded-lg hover:bg-[#F2FCFD] flex items-center justify-center text-[#4A787C]">3</button>
            <span className="px-1 opacity-50">...</span>
            <button className="w-8 h-8 rounded-lg hover:bg-[#F2FCFD] flex items-center justify-center text-[#4A787C]">312</button>
            <button className="w-8 h-8 rounded-lg hover:bg-[#F2FCFD] flex items-center justify-center text-[#82ABB0]">&gt;</button>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-stretch">
        {/* Maintenance Cost Bar Chart */}
        <div className="lg:col-span-3 bg-white/70 backdrop-blur-xl border border-white/50 rounded-[40px] p-8 shadow-sm flex flex-col h-full">
          <h3 className="text-[18px] font-bold text-[#0F3A40] mb-2">Chi phí bảo trì hàng tháng</h3>
          <p className="text-[13px] text-[#4A787C] font-medium mb-8">
            Tăng 15% so với kỳ trước do lịch bảo trì định kỳ điều hòa tập trung vào tháng này.
          </p>
          <div className="flex-1 min-h-[250px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maintenanceData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#BCE1E5" opacity={0.3} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#82ABB0', fontSize: 12, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis axisLine={false} tickLine={false} hide={true} />
                <Tooltip 
                  cursor={{ fill: '#F2FCFD', radius: 10 }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    borderRadius: '16px', 
                    border: '1px solid #BCE1E5',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar 
                  dataKey="cost" 
                  radius={[10, 10, 10, 10]} 
                  barSize={40}
                >
                  {maintenanceData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === maintenanceData.length - 1 ? '#14B8A6' : '#BCE1E5'} 
                      fillOpacity={index === maintenanceData.length - 1 ? 1 : 0.6}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latest Assets List */}
        <div className="lg:col-span-2 bg-[#F2FCFD] border border-[#BCE1E5]/30 rounded-[40px] p-8 shadow-sm flex flex-col h-full">
          <h3 className="text-[18px] font-bold text-[#0F3A40] mb-8">Tài sản mới nhất</h3>
          <div className="space-y-4 flex-1">
            <div className="bg-white rounded-[24px] p-4 flex items-center gap-4 border border-white shadow-sm hover:shadow-md transition-shadow">
               <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-inner shrink-0">
                  <img src="https://images.unsplash.com/photo-1594404341020-431268383f94?w=400&q=80" alt="Washing Machine" className="w-full h-full object-cover" />
               </div>
               <div className="flex flex-col">
                  <h4 className="text-[13px] font-bold text-[#0F3A40] mb-0.5">Máy giặt LG TurboWash</h4>
                  <p className="text-[11px] text-[#82ABB0] font-medium">Đã thêm vào P.501 • 2 giờ trước</p>
               </div>
            </div>

            <div className="bg-white rounded-[24px] p-4 flex items-center gap-4 border border-white shadow-sm hover:shadow-md transition-shadow">
               <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-inner shrink-0">
                  <img src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80" alt="Sofa" className="w-full h-full object-cover" />
               </div>
               <div className="flex flex-col">
                  <h4 className="text-[13px] font-bold text-[#0F3A40] mb-0.5">Sofa Modular Grey</h4>
                  <p className="text-[11px] text-[#82ABB0] font-medium">Đã thêm vào P.202 • 1 ngày trước</p>
               </div>
            </div>
          </div>
          <button className="mt-8 text-[13px] font-bold text-[#14B8A6] hover:underline flex items-center gap-2 group justify-center">
            Xem tất cả hoạt động <CheckCircle2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
