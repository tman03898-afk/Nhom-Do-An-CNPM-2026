import { useParams } from 'react-router-dom';
import { Phone, MessageCircle, MapPin, Wifi, Wind, Box, BedDouble, Droplets, CheckCircle2, Ruler, LayoutGrid, Layers } from 'lucide-react';

export default function RoomDetailPage() {
  const { id } = useParams();

  return (
    <div className="max-w-7xl mx-auto px-8 w-full pb-24">
      {/* Images Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-10 md:h-[450px]">
        {/* Left large image */}
        <div className="md:col-span-5 h-[250px] md:h-full rounded-[2rem] overflow-hidden">
          <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1000&q=80" alt="Room View" className="w-full h-full object-cover" />
        </div>
        {/* Right images column */}
        <div className="md:col-span-7 flex flex-col gap-3">
          {/* Top half horizontal image */}
          <div className="h-[180px] md:h-[217px] rounded-[2rem] overflow-hidden">
            <img src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1000&q=80" alt="Bedroom" className="w-full h-full object-cover" />
          </div>
          {/* Bottom half 2 images */}
          <div className="grid grid-cols-2 gap-3 flex-1 h-[140px] md:h-[217px]">
            <div className="rounded-[2rem] overflow-hidden">
              <img src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=500&q=80" alt="Kitchen" className="w-full h-full object-cover" />
            </div>
            <div className="rounded-[2rem] overflow-hidden">
              <img src="https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&q=80" alt="Bathroom" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left main info */}
        <div className="lg:col-span-2 bg-white/40 backdrop-blur-[16px] border border-white/60 rounded-[3rem] p-8 md:p-12">
          <h1 className="text-4xl md:text-[2.75rem] font-sans font-bold text-nest-text-primary mb-8 leading-[1.1]">Phòng 402</h1>

          <div className="mb-10">
            <div className="text-[10px] font-bold text-nest-text-secondary uppercase tracking-wider mb-2">Giá Thuê Tháng</div>
            <div className="text-4xl md:text-5xl font-sans font-bold text-[#14B8A6]">2.500.000đ</div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8 border-y border-nest-surface-low mb-10">
            <div>
              <div className="text-[10px] font-bold text-nest-text-secondary uppercase tracking-wider mb-2">Diện tích</div>
              <div className="flex items-center gap-2 font-bold text-nest-text-primary text-base"><Ruler className="w-5 h-5 text-[#14B8A6]" /> 20 m²</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-nest-text-secondary uppercase tracking-wider mb-2">Loại phòng</div>
              <div className="flex items-center gap-2 font-bold text-nest-text-primary text-base"><LayoutGrid className="w-5 h-5 text-[#14B8A6]" /> Gác lửng</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-nest-text-secondary uppercase tracking-wider mb-2">Trạng thái</div>
              <div className="flex items-center gap-2 font-bold text-[#0f8b7d] text-base"><CheckCircle2 className="w-5 h-5 text-[#14B8A6]" /> Còn trống</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-nest-text-secondary uppercase tracking-wider mb-2">Tầng</div>
              <div className="flex items-center gap-2 font-bold text-nest-text-primary text-base"><Layers className="w-5 h-5 text-[#14B8A6]" /> 04</div>
            </div>
          </div>

          <h3 className="font-sans font-bold text-lg text-nest-text-primary mb-6">Tiện nghi có sẵn</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {/* Items */}
            {[
              { icon: Wifi, text: 'Wi-Fi Tốc độ cao' },
              { icon: Wind, text: 'Điều hòa Inverter' },
              { icon: Box, text: 'Tủ lạnh 180L' },
              { icon: BedDouble, text: 'Giường Queen Size' },
              { icon: Droplets, text: 'Máy nước nóng' },
              { icon: CheckCircle2, text: 'Máy giặt sấy' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-white/60 px-5 py-3.5 rounded-2xl border border-white/60 shadow-sm">
                <item.icon className="w-5 h-5 text-[#14B8A6]" />
                <span className="text-sm font-bold text-nest-text-primary">{item.text}</span>
              </div>
            ))}
          </div>

          <h3 className="font-sans font-bold text-lg text-nest-text-primary mb-4">Mô tả chi tiết</h3>
          <p className="text-sm text-nest-text-secondary leading-[1.8] pr-4">
            Phòng được thiết kế tối ưu diện tích với kết cấu gác lửng hiện đại, tạo ra sự tách biệt thông minh giữa không gian nghỉ ngơi riêng tư và khu vực làm việc/nấu nướng bên dưới. Hệ thống cửa sổ lớn đón trọn ánh sáng tự nhiên và gió trời, mang lại cảm giác thông thoáng tuyệt đối. Đây là lựa chọn lý tưởng cho các bạn sinh viên hoặc nhân viên văn phòng đang tìm kiếm một "tổ ấm" an ninh, yên tĩnh và đầy đủ tiện nghi ngay tại trung tâm.
          </p>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          <div className="bg-white/40 backdrop-blur-[16px] border border-white/60 rounded-[2.5rem] p-8">
            <h3 className="font-sans font-bold text-lg text-nest-text-primary mb-6">Liên hệ xem phòng</h3>

            <div className="bg-nest-surface-low p-4 rounded-2xl flex items-center gap-4 mb-4 border border-white/60">
              <div className="w-10 h-10 bg-[#14B8A6] rounded-full flex items-center justify-center text-white shrink-0 shadow-sm">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[9px] font-bold text-nest-text-secondary uppercase tracking-wider mb-1">Gọi trực tiếp</div>
                <div className="font-bold text-nest-text-primary text-sm">+84 123 456 789</div>
              </div>
            </div>

            <button className="w-full py-4 rounded-2xl bg-[#14B8A6] hover:bg-[#0fa696] text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md mb-4">
              <MessageCircle className="w-4 h-4" /> Nhắn tin Zalo ngay
            </button>

            <p className="text-[11px] text-nest-text-secondary text-center leading-relaxed">
              Phản hồi nhanh trong vòng 5 phút từ 08:00 đến 21:00 mỗi ngày.
            </p>
          </div>

          <div className="bg-white/40 backdrop-blur-[16px] border border-white/60 rounded-[2.5rem] p-8">
            <h3 className="font-bold text-[11px] text-nest-text-secondary uppercase tracking-wider mb-5">Vị trí</h3>
            <div className="rounded-[1.5rem] overflow-hidden mb-5 bg-[#14B8A6]/10 border border-[#14B8A6]/20 shadow-inner h-32 relative group cursor-pointer">
              <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=500&q=80" alt="Map" className="w-full h-full object-cover mix-blend-luminosity opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <MapPin className="w-8 h-8 text-[#14B8A6] drop-shadow-md pb-1" />
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#14B8A6] shrink-0 fill-[#14B8A6]/20 mt-0.5" />
              <span className="text-[13px] font-bold text-nest-text-primary leading-[1.6]">Thủ Đức, Thành phố Hồ Chí Minh, Việt Nam</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
