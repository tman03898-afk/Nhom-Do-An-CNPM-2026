import { Link } from 'react-router-dom';
import { useState } from 'react';
import { ArrowRight, Wifi, Phone, MapPin, MessageCircle, ChevronDown } from 'lucide-react';
import CustomSelect from '../../components/common/CustomSelect';

export default function HomePage() {
  const [roomType, setRoomType] = useState('Tất cả');
  const [priceRange, setPriceRange] = useState('Dưới 5tr');
  const [area, setArea] = useState('Tất cả');
  const [furniture, setFurniture] = useState('Tất cả');

  const featuredRooms = [
    { id: 1, name: 'Phòng 402', price: '2.500.000', size: '25 m²', type: 'Studio', image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80', status: 'Còn phòng' },
    { id: 5, name: 'Phòng 601', price: '3.000.000', size: '40 m²', type: '2 Phòng ngủ', image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80', status: 'Còn phòng' },
    { id: 3, name: 'Phòng 301', price: '2.000.000', size: '20 m²', type: 'Studio', image: '/rooms/room_301.png', status: 'Còn phòng' },
  ];

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative h-[85vh] min-h-[650px] w-full flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1554995207-c18c203602cb?q=80&w=2000"
            alt="Hero Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[#0F3A40]/50 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0F3A40]/80 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-8 w-full pt-12">
          <div className="max-w-2xl">
            <h1 className="text-5xl md:text-6xl font-sans font-bold text-white leading-[1.2] tracking-tight mb-6">
              Nâng Tầm Trải Nghiệm <br />Sống Hiện Đại
            </h1>
            <p className="text-lg text-white/90 mb-10 font-body leading-relaxed max-w-xl">
              Hơn cả một nơi ở, chúng tôi xây dựng mạng lưới cư dân tri thức, nơi giao thoa của những tư duy hiện đại và lối sống năng động
            </p>
            <button onClick={() => document.getElementById('phong-trong')?.scrollIntoView({ behavior: 'smooth' })} className="inline-flex items-center gap-2 bg-nest-primary hover:bg-[#0fa696] text-white px-8 py-4 rounded-full font-semibold transition-all shadow-[0_0_20px_rgba(20,184,166,0.4)] hover:shadow-[0_0_30px_rgba(20,184,166,0.6)]">
              Khám phá phòng ngay <ChevronDown className="w-5 h-5 animate-bounce" />
            </button>
          </div>
        </div>

        {/* Floating Search Bar */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[90%] max-w-5xl z-20">
          <div className="bg-white/80 backdrop-blur-xl border border-white p-4 rounded-2xl shadow-xl flex flex-col md:flex-row gap-4 items-end">
            <CustomSelect
              label="Loại phòng"
              options={['Tất cả', 'Studio', '1 Phòng ngủ', '2 Phòng ngủ']}
              value={roomType}
              onChange={setRoomType}
            />
            <CustomSelect
              label="Giá Thuê"
              options={['Dưới 5tr', '5tr - 8tr', 'Trên 8tr']}
              value={priceRange}
              onChange={setPriceRange}
            />
            <CustomSelect
              label="Diện tích"
              options={['Tất cả', 'Dưới 25 m²', 'Trên 25 m²']}
              value={area}
              onChange={setArea}
            />
            <CustomSelect
              label="Nội thất"
              options={['Tất cả', 'Đầy đủ', 'Cơ bản']}
              value={furniture}
              onChange={setFurniture}
            />

            <div className="w-full md:w-auto">
              <button
                onClick={() => {
                  console.log({ roomType, priceRange, area, furniture });
                  document.getElementById('phong-trong')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full bg-nest-primary hover:bg-[#0fa696] text-white px-8 py-3.5 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 flex justify-center items-center gap-2 shadow-lg shadow-nest-primary/20"
              >
                Tìm kiếm
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-8 pt-36">

        {/* Featured Rooms */}
        <section id="phong-trong" className="min-h-[100vh] flex flex-col justify-center scroll-mt-24 pb-24">
          <div className="flex justify-between items-end mb-10">
            <div>
              <p className="text-[#006B5F] font-bold text-[11px] uppercase tracking-widest mb-2">SẴN SÀNG ĐỂ Ở</p>
              <h2 className="text-3xl md:text-4xl font-sans font-bold text-nest-text-primary">Phòng Nổi Bật</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredRooms.map(room => (
              <div key={room.id} className="bg-[#CFE8EA] bg-opacity-50 rounded-[2rem] overflow-hidden hover:shadow-lg transition-all duration-300 border border-white flex flex-col p-2">
                <div className="relative h-64 md:h-72 overflow-hidden rounded-[1.5rem]">
                  <img src={room.image} alt={room.name} className="w-full h-full object-cover" />
                  <div className={`absolute top-4 right-4 px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-sm backdrop-blur-md ${room.status === 'Còn phòng' ? 'bg-[#14B8A6]/90' : 'bg-gray-500/90'}`}>
                    {room.status}
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col bg-white rounded-b-[1.75rem] mx-1 mb-1 mt-[-10px] z-10 shadow-sm relative">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-lg font-sans font-bold text-nest-text-primary">{room.name}</h3>
                    <div className="text-right">
                      <div className="font-sans font-bold text-[#14B8A6] text-base">{room.price}</div>
                      <div className="text-[11px] text-nest-text-secondary">vnđ/tháng</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-nest-text-secondary mb-4">
                    <span className="bg-[#EBF9F7] text-[#006B5F] px-2 py-0.5 rounded-full font-medium">{room.type}</span>
                    <span>•</span>
                    <span>{room.size}</span>
                  </div>

                  <div className="mt-auto">
                    <Link to={`/rooms/${room.id}`} className={`block w-full py-2.5 rounded-xl text-center text-sm font-bold transition-colors ${room.status === 'Còn phòng' ? 'border border-[#14B8A6] text-[#14B8A6] hover:bg-[#CFE8EA]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                      {room.status === 'Còn phòng' ? 'Xem phòng' : 'Đã cho thuê'}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Tiện Ích */}
      <section id="tien-ich" className="w-full bg-[#DAF9FF] py-20 min-h-[100vh] flex flex-col justify-center scroll-mt-24">
        <div className="max-w-7xl mx-auto px-8 text-center">
          <p className="text-[#006B5F] font-bold text-[11px] uppercase tracking-widest mb-2">CẢM NHẬN SỰ KHÁC BIỆT</p>
          <h2 className="text-3xl md:text-4xl font-sans font-bold text-nest-text-primary mb-12">Tiện Ích Đặc Quyền</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {/* Left tall card */}
            <div className="bg-[#E9FBFF] p-8 md:p-12 rounded-[2.5rem] md:row-span-2 flex flex-col justify-end hover:-translate-y-2 transition-transform shadow-[0_4px_20px_rgba(0,0,0,0.03)] min-h-[380px] lg:min-h-[480px]">
              <div className="w-16 h-16 bg-white rounded-[1.2rem] flex items-center justify-center mb-8 shadow-sm">
                <svg className="w-8 h-8 text-[#0F3A40]" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M12 2v20" />
                  <path d="M4 11h8" />
                </svg>
              </div>
              <h4 className="font-sans font-bold text-xl mb-3 text-nest-text-primary">An ninh 24/7</h4>
              <p className="text-sm text-nest-text-secondary leading-relaxed">Hệ thống camera giám sát và đội ngũ bảo vệ chuyên nghiệp, đảm bảo an toàn tuyệt đối cho bạn.</p>
            </div>

            {/* Top right wide card */}
            <div className="bg-[#E9FBFF] p-8 md:p-12 rounded-[2.5rem] md:col-span-2 hover:-translate-y-2 transition-transform shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-center justify-between gap-8 h-full min-h-[280px]">
              <div className="flex-1">
                <div className="w-16 h-16 bg-white rounded-[1.2rem] flex items-center justify-center mb-8 shadow-sm">
                  <Wifi className="w-8 h-8 text-[#0F3A40]" strokeWidth={2.3} />
                </div>
                <h4 className="font-sans font-bold text-xl mb-3 text-nest-text-primary">Wifi tốc độ cao</h4>
                <p className="text-sm text-nest-text-secondary leading-relaxed max-w-sm">Đường truyền cáp quang riêng từng tầng, hỗ trợ tối đa cho việc học tập và giải trí không giới hạn.</p>
              </div>
              <div className="w-40 h-40 hidden md:flex items-center justify-center rounded-full bg-[#E8F6F8] shrink-0">
                <div className="w-24 h-20 bg-white rounded-xl relative overflow-hidden shadow-inner flex flex-col items-center justify-end pb-2">
                  <div className="w-12 h-10 bg-[#E8F6F8] rounded-lg absolute top-2 flex items-center justify-center border border-white/60 shadow-sm">
                    <Wifi className="w-5 h-5 text-[#14B8A6]" />
                  </div>
                  <div className="w-16 h-1 bg-gray-200 rounded-full mt-auto"></div>
                </div>
              </div>
            </div>

            {/* Bottom right 1 */}
            <div className="bg-[#E9FBFF] p-8 md:p-10 rounded-[2.5rem] hover:-translate-y-2 transition-transform shadow-[0_4px_20px_rgba(0,0,0,0.03)] h-full min-h-[260px]">
              <div className="w-16 h-16 bg-white rounded-[1.2rem] flex items-center justify-center mb-8 shadow-sm">
                <span className="text-[#0F3A40] text-[32px] font-black uppercase tracking-tighter">P</span>
              </div>
              <h4 className="font-sans font-bold text-lg mb-2 text-nest-text-primary">Hầm đỗ xe</h4>
              <p className="text-sm text-nest-text-secondary leading-relaxed">Không gian rộng rãi, sạch sẽ với lối đi riêng tiện cho cư dân.</p>
            </div>

            {/* Bottom right 2 */}
            <div className="bg-[#E9FBFF] p-8 md:p-10 rounded-[2.5rem] hover:-translate-y-2 transition-transform shadow-[0_4px_20px_rgba(0,0,0,0.03)] h-full min-h-[260px]">
              <div className="w-16 h-16 bg-white rounded-[1.2rem] flex items-center justify-center mb-8 shadow-sm">
                <svg className="w-8 h-8 text-[#0F3A40]" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M12 3v4" />
                  <rect width="12" height="4" x="6" y="7" rx="1" />
                  <path d="M8 11v4" />
                  <path d="M12 11v4" />
                  <path d="M16 11v4" />
                </svg>
              </div>
              <h4 className="font-sans font-bold text-lg mb-2 text-nest-text-primary">Dịch vụ vệ sinh</h4>
              <p className="text-sm text-nest-text-secondary leading-relaxed">Duy trì không gian chung luôn sạch đẹp, thường xuyên mỗi ngày.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Quy Trình */}
        <section id="quy-trinh" className="min-h-[100vh] flex flex-col justify-center scroll-mt-24 py-16">

          {/* Header */}
          <div className="text-center mb-16">
            <p className="text-[#006B5F] font-bold text-[11px] uppercase tracking-widest mb-2">ĐƠN GIẢN &amp; NHANH CHÓNG</p>
            <h2 className="text-3xl md:text-4xl font-sans font-bold text-nest-text-primary mb-4">Quy Trình Thuê Phòng</h2>
            <p className="text-sm text-nest-text-secondary max-w-md mx-auto leading-relaxed">Chỉ 3 bước đơn giản để sở hữu không gian sống lý tưởng của riêng bạn tại The Nest.</p>
          </div>

          {/* Steps Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-12">
            {[
              { no: '01', badge: 'Bước 1', title: 'Tìm phòng', desc: 'Dạo quanh danh sách phòng với đầy đủ hình ảnh thực tế, diện tích, mức giá và tiện nghi. Lọc theo đúng nhu cầu của bạn.', color: 'from-[#CCFBF1] to-[#B2EBF2]' },
              { no: '02', badge: 'Bước 2', title: 'Liên hệ & Đặt lịch', desc: 'Gửi tin nhắn Zalo hoặc gọi hotline 24/7. Đội ngũ tư vấn sẽ hỗ trợ bạn đặt lịch xem phòng trực tiếp ngay hôm nay.', color: 'from-[#D1FAE5] to-[#A7F3D0]' },
              { no: '03', badge: 'Bước 3', title: 'Nhận tài khoản', desc: 'Ký hợp đồng và nhận tài khoản cư dân để quản lý hóa đơn và yêu cầu hỗ trợ mọi nơi mọi lúc.', color: 'from-[#FEF3C7] to-[#FDE68A]' },
            ].map((step, idx) => (
              <div key={idx} className="relative bg-white rounded-[2rem] p-8 md:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-white/80 hover:-translate-y-2 transition-all duration-300 group overflow-hidden">
                <div className={`absolute -top-8 -right-8 w-36 h-36 rounded-full bg-gradient-to-br ${step.color} opacity-50 group-hover:opacity-70 transition-opacity`}></div>
                <span className="relative z-10 inline-block text-[10px] font-bold text-[#006B5F] bg-[#CCFBF1] px-3 py-1 rounded-full uppercase tracking-widest mb-6">{step.badge}</span>
                <div className="absolute bottom-4 right-6 text-[72px] font-black text-[#0F3A40]/[0.04] leading-none select-none">{step.no}</div>
                <h4 className="relative z-10 font-sans font-bold text-xl mb-3 text-nest-text-primary">{step.title}</h4>
                <p className="relative z-10 text-sm text-nest-text-secondary leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Bottom Photo Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { src: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&q=80', label: 'Phòng khách' },
              { src: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600&q=80', label: 'Phòng bếp' },
              { src: 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=600&q=80', label: 'Phòng ngủ' },
              { src: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=600&q=80', label: 'Không gian chung' },
            ].map((photo, i) => (
              <div key={i} className="relative h-40 md:h-52 rounded-[1.5rem] overflow-hidden group cursor-pointer">
                <img src={photo.src} alt={photo.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F3A40]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <span className="text-white text-sm font-semibold">{photo.label}</span>
                </div>
              </div>
            ))}
          </div>

        </section>

        {/* Contact */}
        <div id="vi-tri" className="min-h-[100vh] flex flex-col justify-center scroll-mt-24 py-12 mb-20">
          <section className="bg-white/40 backdrop-blur-[16px] rounded-[3rem] p-8 md:p-16 border border-white/60 flex flex-col md:flex-row gap-12 items-center shadow-sm w-full">
            <div className="flex-1 space-y-8 md:pr-12">
              <div>
                <p className="text-[#006B5F] font-bold text-[11px] uppercase tracking-widest mb-3">LIÊN HỆ NGAY</p>
                <h2 className="text-3xl md:text-4xl font-sans font-bold text-nest-text-primary mb-4">Kết Nối Với Chúng Tôi</h2>
                <p className="text-sm text-nest-text-secondary leading-relaxed max-w-sm">
                  Đội ngũ quản lý The Nest luôn sẵn sàng hỗ trợ bạn tìm kiếm một không gian sống lý tưởng nhất.
                </p>
              </div>

              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#14B8A6] rounded-xl text-white flex items-center justify-center shrink-0 shadow-sm"><Phone className="w-5 h-5" /></div>
                  <div>
                    <div className="text-[11px] text-nest-text-secondary uppercase font-bold tracking-widest mb-1">Hotline 24/7</div>
                    <div className="text-base font-bold text-nest-text-primary">+84 123 456 789</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#14B8A6] rounded-xl text-white flex items-center justify-center shrink-0 shadow-sm"><MapPin className="w-5 h-5" /></div>
                  <div>
                    <div className="text-[11px] text-nest-text-secondary uppercase font-bold tracking-widest mb-1">Địa chỉ</div>
                    <div className="text-base font-bold text-nest-text-primary">Ho Chi Minh City, Vietnam</div>
                  </div>
                </div>
              </div>

              <div>
                <button className="bg-[#14B8A6] hover:bg-[#0fa696] text-white px-8 py-3.5 rounded-full text-sm font-bold transition-all hover:scale-105 inline-flex items-center gap-2.5 shadow-[0_4px_20px_rgba(20,184,166,0.3)]">
                  Nhắn tin Zalo ngay <MessageCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 w-full h-[450px] md:h-[550px] rounded-[2.5rem] overflow-hidden bg-gray-200 shadow-inner border border-white/40">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d125406.10705663673!2d106.60262657385558!3d10.823098902096896!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x317529292e8d3dd1%3A0xf15f5aad773c112b!2zSOG7kyBDaMOtIE1pbmgsIFRow6BuaCBwaOG7kSBI4buTIENow60gTWluaCwgVmnhu4d0IE5hbQ!5e0!3m2!1svi!2s!4v1712411982847!5m2!1svi!2s"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full grayscale hover:grayscale-0 transition-all duration-700"
              ></iframe>
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}
