import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  Calendar, Download, ArrowUpRight, ArrowDownRight, 
  Users, Home, TrendingUp, AlertTriangle, Info, CheckCircle2,
  TrendingDown, DollarSign
} from 'lucide-react';

const revenueData = [
  { name: 'Th1', revenue: 400, expense: 240 },
  { name: 'Th3', revenue: 500, expense: 280 },
  { name: 'Th5', revenue: 450, expense: 320 },
  { name: 'Th7', revenue: 650, expense: 380 },
  { name: 'Th9', revenue: 850, expense: 420 },
  { name: 'Th11', revenue: 750, expense: 390 },
];

const tenantSegmentData = [
  { name: 'Sinh viên', value: 65, color: '#14B8A6' },
  { name: 'Người đi làm', value: 25, color: '#0F3A40' },
  { name: 'Khác', value: 10, color: '#BCE1E5' },
];

const floorOccupancy = [
  { floor: 'Tầng 1 (Premium)', percent: 100, color: '#14B8A6' },
  { floor: 'Tầng 2 (Studio)', percent: 92, color: '#14B8A6' },
  { floor: 'Tầng 3 (Standard)', percent: 88, color: '#14B8A6' },
  { floor: 'Tầng 4 (Loft)', percent: 96, color: '#14B8A6' },
  { floor: 'Penthouse', percent: 75, color: '#14B8A6' },
];

export default function AnalyticsPage() {
  return (
    <div className="w-full max-w-[1400px] mx-auto pb-12">
      {/* Header section */}
      <div className="flex justify-between items-end mb-8 pt-4">
        <div>
          <h1 className="text-[36px] font-bold text-[#0F3A40] leading-none mb-3">Phân tích Dữ liệu</h1>
          <p className="text-[#4A787C] font-medium">Cập nhật hiệu suất kinh doanh thời gian thực</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white border border-[#BCE1E5]/50 px-5 py-3 rounded-2xl text-[14px] font-bold text-[#0F3A40] shadow-sm hover:shadow-md transition-all">
            <Calendar className="w-4 h-4 text-[#14B8A6]" /> 30 ngày qua
          </button>
          <button className="flex items-center gap-2 bg-[#0F3A40] text-white px-5 py-3 rounded-2xl text-[14px] font-bold shadow-lg shadow-[#0F3A40]/20 hover:bg-[#1F545B] transition-all">
            <Download className="w-4 h-4" /> Xuất báo cáo
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Card 1 */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-[32px] p-6 shadow-sm flex flex-col justify-between min-h-[160px]">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-[#DDF5F7] rounded-2xl flex items-center justify-center text-[#14B8A6]">
              <Home className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-1 bg-[#EBFDFB] text-[#14B8A6] px-2 py-1 rounded-full text-[12px] font-bold">
              <ArrowUpRight size={14} /> +2.4%
            </div>
          </div>
          <div>
            <p className="text-[14px] font-bold text-[#4A787C] mb-1">Tỷ lệ lấp đầy phòng (%)</p>
            <h3 className="text-3xl font-bold text-[#0F3A40]">94.8%</h3>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-[32px] p-6 shadow-sm flex flex-col justify-between min-h-[160px]">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-[#EBF4FF] rounded-2xl flex items-center justify-center text-[#3B82F6]">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-1 bg-[#EBF4FF] text-[#3B82F6] px-2 py-1 rounded-full text-[12px] font-bold">
              <ArrowUpRight size={14} /> +12%
            </div>
          </div>
          <div>
            <p className="text-[14px] font-bold text-[#4A787C] mb-1">Doanh thu trung bình (ARPU)</p>
            <div className="flex items-baseline gap-1">
              <h3 className="text-3xl font-bold text-[#0F3A40]">5.2Tr</h3>
              <span className="text-[14px] font-medium text-[#82ABB0]">/phòng</span>
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-[32px] p-6 shadow-sm flex flex-col justify-between min-h-[160px]">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-[#FFF3E0] rounded-2xl flex items-center justify-center text-[#E68A00]">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-1 bg-[#FFF3E0] text-[#E68A00] px-2 py-1 rounded-full text-[12px] font-bold">
              <ArrowDownRight size={14} /> -5%
            </div>
          </div>
          <div>
            <p className="text-[14px] font-bold text-[#4A787C] mb-1">Tổng chi phí vận hành</p>
            <h3 className="text-3xl font-bold text-[#0F3A40]">128.5Tr</h3>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-[32px] p-6 shadow-sm flex flex-col justify-between min-h-[160px]">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-[#EBFDFB] rounded-2xl flex items-center justify-center text-[#14B8A6]">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-1 bg-[#EBFDFB] text-[#14B8A6] px-2 py-1 rounded-full text-[12px] font-bold">
              <ArrowUpRight size={14} /> +18.5%
            </div>
          </div>
          <div>
            <p className="text-[14px] font-bold text-[#4A787C] mb-1">Lợi nhuận ròng</p>
            <h3 className="text-3xl font-bold text-[#0F3A40]">452.0Tr</h3>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Main Line Chart */}
        <div className="lg:col-span-2 bg-white/70 backdrop-blur-xl border border-white/50 rounded-[40px] p-8 shadow-sm">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-[18px] font-bold text-[#0F3A40]">Tăng trưởng Doanh thu vs Chi phí</h3>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#14B8A6]"></div>
                <span className="text-[12px] font-bold text-[#4A787C]">Doanh thu</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#0F3A40] opacity-60"></div>
                <span className="text-[12px] font-bold text-[#4A787C]">Chi phí</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#BCE1E5" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#82ABB0', fontSize: 12, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis hide={true} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                    borderRadius: '16px', 
                    border: '1px solid #BCE1E5',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                  itemStyle={{ fontSize: '13px', fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#14B8A6" 
                  strokeWidth={4} 
                  dot={{ r: 6, fill: '#14B8A6', strokeWidth: 3, stroke: '#fff' }}
                  activeDot={{ r: 8, strokeWidth: 0 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="expense" 
                  stroke="#0F3A40" 
                  strokeWidth={2} 
                  strokeDasharray="5 5"
                  opacity={0.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Segment Donut Chart */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-[40px] p-8 shadow-sm flex flex-col items-center">
          <h3 className="text-[18px] font-bold text-[#0F3A40] w-full text-left mb-8">Cơ cấu Khách thuê</h3>
          <div className="relative w-full h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tenantSegmentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {tenantSegmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-[#0F3A40]">1,280</span>
              <span className="text-[10px] font-bold text-[#82ABB0] tracking-widest uppercase">NGƯỜI</span>
            </div>
          </div>
          <div className="w-full space-y-3 mt-6">
            {tenantSegmentData.map((item, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full`} style={{ backgroundColor: item.color }}></div>
                  <span className="text-[13px] font-bold text-[#4A787C]">{item.name}</span>
                </div>
                <span className="text-[14px] font-bold text-[#0F3A40]">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Floor occupancy list */}
        <div className="lg:col-span-3 bg-white/70 backdrop-blur-xl border border-white/50 rounded-[40px] p-8 shadow-sm">
          <h3 className="text-[18px] font-bold text-[#0F3A40] mb-8">Tỷ lệ lấp đầy theo tầng</h3>
          <div className="space-y-7">
            {floorOccupancy.map((floor, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-[14px] font-bold">
                  <span className="text-[#0F3A40]">{floor.floor}</span>
                  <span className="text-[#14B8A6]">{floor.percent}%</span>
                </div>
                <div className="h-2 w-full bg-[#EBFDFB] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#14B8A6] rounded-full transition-all duration-1000"
                    style={{ width: `${floor.percent}%`, backgroundColor: i === 4 ? '#82ABB0' : '#14B8A6' }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Market Insights */}
        <div className="lg:col-span-2 bg-[#F2FCFD]/60 backdrop-blur-xl border border-[#BCE1E5]/30 rounded-[40px] p-8 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-[18px] font-bold text-[#0F3A40]">Thông tin thị trường</h3>
            <div className="w-10 h-10 bg-[#0F3A40] rounded-2xl flex items-center justify-center text-white shadow-lg">
              <TrendingUp size={18} />
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="flex gap-4 p-4 rounded-[24px] bg-white/40 border border-white/50">
              <div className="w-10 h-10 bg-[#EBFDFB] rounded-xl flex items-center justify-center text-[#14B8A6] shrink-0">
                <Users size={18} />
              </div>
              <div>
                <h4 className="text-[13px] font-bold text-[#0F3A40] mb-1">Nhu cầu sinh viên tăng cao</h4>
                <p className="text-[12px] text-[#4A787C] leading-relaxed">Nhu cầu thuê phòng khu vực lân cận Đại học Quốc gia tăng 15% trong tháng 8 do kỳ nhập học mới.</p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-[24px] bg-white/40 border border-white/50">
              <div className="w-10 h-10 bg-[#FFF3E0] rounded-xl flex items-center justify-center text-[#E68A00] shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h4 className="text-[13px] font-bold text-[#0F3A40] mb-1">Cảnh báo chi phí điện</h4>
                <p className="text-[12px] text-[#4A787C] leading-relaxed">Hệ thống ghi nhận chi phí điện tại Tòa A tăng bất thường. Đề xuất kiểm tra bảo trì hệ thống điều hòa.</p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-[24px] bg-white/40 border border-white/50">
              <div className="w-10 h-10 bg-[#EBFDFB] rounded-xl flex items-center justify-center text-[#14B8A6] shrink-0">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <h4 className="text-[13px] font-bold text-[#0F3A40] mb-1">Xếp hạng tin cậy cao</h4>
                <p className="text-[12px] text-[#4A787C] leading-relaxed">The Nest Living đạt 4.8/5 sao trên Google Maps nhờ dịch vụ hỗ trợ khách thuê nhanh chóng.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
