import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowRight, Wifi, Phone, MapPin, MessageCircle, ChevronDown, ShieldCheck, ParkingCircle, BrushCleaning, Maximize, Armchair, Home, CircleDollarSign, Search } from 'lucide-react';
import CustomSelect from '../../components/common/CustomSelect';

export default function HomePage() {
  const [roomType, setRoomType] = useState('Tất cả');
  const [priceRange, setPriceRange] = useState('Dưới 5tr');
  const [area, setArea] = useState('Tất cả');
  const [furniture, setFurniture] = useState('Tất cả');
  const [currentSlide, setCurrentSlide] = useState(0);

  const heroSlides = [
    { src: '/images/home/mezzanine.png', alt: 'Không gian sống hiện đại' },
    { src: '/images/home/workspace.png', alt: 'Góc làm việc tri thức' },
    { src: '/images/home/balcony.png', alt: 'Ban công thoáng đãng' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const featuredRooms = [
    { id: 1, name: 'Phòng 402', price: 2500000, size: 20, category: 'Phòng gác lửng', tag: 'Thêm không gian, thêm riêng tư', furniture: 'Đầy đủ', image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80', status: 'Còn phòng' },
    { id: 5, name: 'Phòng 601', price: 3000000, size: 25, category: 'Phòng ban công', tag: 'View thoáng, đón nắng tự nhiên', furniture: 'Đầy đủ', image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80', status: 'Còn phòng' },
    { id: 3, name: 'Phòng 301', price: 2000000, size: 18, category: 'Phòng thường', tag: 'Gọn gàng & Tiết kiệm', furniture: 'Cơ bản', image: '/rooms/room_301.png', status: 'Còn phòng' },
  ];

  const filteredRooms = featuredRooms.filter(room => {
    // Filter Type
    if (roomType !== 'Tất cả' && room.category !== roomType) return false;
    
    // Filter Furniture
    if (furniture !== 'Tất cả' && room.furniture !== furniture) return false;

    // Filter Price
    if (priceRange !== 'Tất cả') {
      const price = room.price;
      if (priceRange === 'Dưới 2tr' && price >= 2000000) return false;
      if (priceRange === '2tr - 2.5tr' && (price < 2000000 || price > 2500000)) return false;
      if (priceRange === '2.5tr - 3tr' && (price < 2500000 || price > 3000000)) return false;
      if (priceRange === 'Trên 3tr' && price <= 3000000) return false;
    }

    // Filter Area
    if (area !== 'Tất cả') {
      const size = room.size;
      if (area === 'Dưới 20 m²' && size >= 20) return false;
      if (area === '20 m² - 25 m²' && (size < 20 || size > 25)) return false; // Fixed typo in previous room size filter options
      if (area === '25 m² - 30 m²' && (size < 25 || size > 30)) return false;
      if (area === 'Trên 30 m²' && size <= 30) return false;
    }

    return true;
  });

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative h-[85vh] min-h-[650px] w-full flex items-center">
        {/* Background Slider */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {heroSlides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={slide.src}
                alt={slide.alt}
                className={`w-full h-full object-cover transition-transform duration-[5000ms] ease-linear ${
                  index === currentSlide ? 'scale-110' : 'scale-100'
                }`}
              />
            </div>
          ))}
          <div className="absolute inset-0 bg-[#0F3A40]/50 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0F3A40]/80 to-transparent"></div>
          
          {/* Slider Indicators */}
          <div className="absolute bottom-12 left-8 md:left-24 flex gap-2 z-20">
            {heroSlides.map((_, i) => (
              <div 
                key={i} 
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === currentSlide ? 'w-8 bg-[#14B8A6]' : 'w-4 bg-white/30'
                }`}
              />
            ))}
          </div>
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
              icon={Home}
              options={['Tất cả', 'Phòng thường', 'Phòng gác lửng', 'Phòng ban công']}
              value={roomType}
              onChange={setRoomType}
            />
            <CustomSelect
              label="Giá Thuê"
              icon={CircleDollarSign}
              options={['Tất cả', 'Dưới 2tr', '2tr - 2.5tr', '2.5tr - 3tr', 'Trên 3tr']}
              value={priceRange}
              onChange={setPriceRange}
            />
            <CustomSelect
              label="Diện tích"
              icon={Maximize}
              options={['Tất cả', 'Dưới 25 m²', '25 m² - 30 m²', '30 m² - 35 m²', 'Trên 35 m²']}
              value={area}
              onChange={setArea}
            />
            <CustomSelect
              label="Nội thất"
              icon={Armchair}
              options={['Tất cả', 'Cơ bản', 'Đầy đủ']}
              value={furniture}
              onChange={setFurniture}
            />

            <div className="w-full md:w-auto">
              <button
                onClick={() => {
                  console.log({ roomType, priceRange, area, furniture });
                  document.getElementById('phong-trong')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full bg-nest-primary hover:bg-[#0fa696] text-white px-8 py-3.5 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 flex justify-center items-center gap-2 shadow-lg shadow-nest-primary/20 group"
              >
                <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
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
            {filteredRooms.length > 0 ? (
              filteredRooms.map(room => (
                <div key={room.id} className="group relative flex flex-col items-stretch h-full">
                  {/* Image Container */}
                  <div className="relative aspect-[1.1] overflow-hidden rounded-[2rem] shadow-sm z-0">
                    <img
                      src={room.image}
                      alt={room.name}
                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-nest-text-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="absolute top-4 left-4">
                      <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md shadow-sm border border-white/20 ${room.status === 'Còn phòng' ? 'bg-[#14B8A6] text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {room.status}
                      </div>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col bg-white rounded-b-[1.75rem] mx-1 mb-1 mt-[-10px] z-10 shadow-sm relative">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-sans font-bold text-nest-text-primary mb-0.5">{room.name}</h3>
                        <p className="text-[11px] text-[#14B8A6] font-medium italic">{room.tag}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-sans font-bold text-nest-text-primary text-base">{room.price.toLocaleString('vi-VN')}</div>
                        <div className="text-[10px] text-nest-text-secondary uppercase tracking-wider">vnđ / tháng</div>
                      </div>
                    </div>

                    {/* 4 Basic Info Grid */}
                    <div className="grid grid-cols-2 gap-y-2 gap-x-3 mb-5 mt-2 pt-3 border-t border-gray-50">
                      <div className="flex items-center gap-2 text-nest-text-secondary">
                        <div className="w-7 h-7 bg-nest-surface-low rounded-lg flex items-center justify-center shrink-0">
                          <Maximize className="w-3.5 h-3.5 text-[#14B8A6]" />
                        </div>
                        <span className="text-xs font-medium">{room.size} m²</span>
                      </div>
                      <div className="flex items-center gap-2 text-nest-text-secondary">
                        <div className="w-7 h-7 bg-nest-surface-low rounded-lg flex items-center justify-center shrink-0">
                          <Armchair className="w-3.5 h-3.5 text-[#14B8A6]" />
                        </div>
                        <span className="text-xs font-medium">Nội thất: {room.furniture}</span>
                      </div>
                      <div className="flex items-center gap-2 text-nest-text-secondary col-span-2">
                        <div className="w-7 h-7 bg-nest-surface-low rounded-lg flex items-center justify-center shrink-0">
                          <MapPin className="w-3.5 h-3.5 text-[#14B8A6]" />
                        </div>
                        <span className="text-xs font-medium truncate">{room.category}</span>
                      </div>
                    </div>

                    <div className="mt-auto">
                      <Link to={`/rooms/${room.id}`} className={`block w-full py-2.5 rounded-xl text-center text-sm font-bold transition-all ${room.status === 'Còn phòng' ? 'bg-nest-primary text-white hover:bg-[#0fa696] hover:scale-[1.02]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                        {room.status === 'Còn phòng' ? 'Xem chi tiết' : 'Đã cho thuê'}
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-nest-surface-low rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10 text-nest-primary/20" />
                </div>
                <h3 className="text-xl font-bold text-nest-text-primary mb-2">Không tìm thấy phòng phù hợp</h3>
                <p className="text-nest-text-secondary mb-8">Hãy thử điều chỉnh bộ lọc để tìm thấy nhiều lựa chọn hơn nhé!</p>
                <button 
                  onClick={() => {
                    setRoomType('Tất cả');
                    setPriceRange('Tất cả');
                    setArea('Tất cả');
                    setFurniture('Tất cả');
                  }}
                  className="text-nest-primary font-bold hover:underline"
                >
                  Xóa bộ lọc
                </button>
              </div>
            )}
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
            <div className="bg-white p-8 md:p-12 rounded-[2.5rem] md:row-span-2 flex flex-col justify-end hover:-translate-y-2 transition-transform shadow-[0_10px_40px_rgba(15,58,64,0.05)] min-h-[380px] lg:min-h-[480px] border border-white/80">
              <div className="w-16 h-16 bg-nest-surface-low rounded-[1.2rem] flex items-center justify-center mb-8 shadow-sm">
                <ShieldCheck className="w-8 h-8 text-[#14B8A6]" strokeWidth={2.3} />
              </div>
              <h4 className="font-sans font-bold text-xl mb-3 text-nest-text-primary">An ninh 24/7</h4>
              <p className="text-sm text-nest-text-secondary leading-relaxed">Hệ thống camera giám sát và đội ngũ bảo vệ chuyên nghiệp, đảm bảo an toàn tuyệt đối cho bạn.</p>
            </div>

            {/* Top right wide card */}
            <div className="bg-white p-8 md:p-12 rounded-[2.5rem] md:col-span-2 hover:-translate-y-2 transition-transform shadow-[0_10px_40px_rgba(15,58,64,0.05)] flex flex-col md:flex-row items-center justify-between gap-8 h-full min-h-[280px] border border-white/80">
              <div className="flex-1">
                <div className="w-16 h-16 bg-nest-surface-low rounded-[1.2rem] flex items-center justify-center mb-8 shadow-sm">
                  <Wifi className="w-8 h-8 text-[#14B8A6]" strokeWidth={2.3} />
                </div>
                <h4 className="font-sans font-bold text-xl mb-3 text-nest-text-primary">Wifi tốc độ cao</h4>
                <p className="text-sm text-nest-text-secondary leading-relaxed max-w-sm">Đường truyền cáp quang riêng từng tầng, hỗ trợ tối đa cho việc học tập và giải trí không giới hạn.</p>
              </div>
              <div className="w-40 h-40 hidden md:flex items-center justify-center rounded-full bg-nest-surface-low/50 shadow-inner shrink-0">
                <div className="w-24 h-20 bg-white rounded-xl relative overflow-hidden shadow-sm flex flex-col items-center justify-end pb-2">
                  <div className="w-12 h-10 bg-nest-surface-low rounded-lg absolute top-2 flex items-center justify-center border border-white/60 shadow-sm">
                    <Wifi className="w-5 h-5 text-[#14B8A6]" />
                  </div>
                  <div className="w-16 h-1 bg-gray-100 rounded-full mt-auto"></div>
                </div>
              </div>
            </div>

            {/* Bottom right 1 */}
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] hover:-translate-y-2 transition-transform shadow-[0_10px_40px_rgba(15,58,64,0.05)] h-full min-h-[260px] border border-white/80">
              <div className="w-16 h-16 bg-nest-surface-low rounded-[1.2rem] flex items-center justify-center mb-8 shadow-sm">
                <ParkingCircle className="w-8 h-8 text-[#14B8A6]" strokeWidth={2.3} />
              </div>
              <h4 className="font-sans font-bold text-lg mb-2 text-nest-text-primary">Hầm đỗ xe</h4>
              <p className="text-sm text-nest-text-secondary leading-relaxed">Không gian rộng rãi, sạch sẽ với lối đi riêng tiện cho cư dân.</p>
            </div>

            {/* Bottom right 2 */}
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] hover:-translate-y-2 transition-transform shadow-[0_10px_40px_rgba(15,58,64,0.05)] h-full min-h-[260px] border border-white/80">
              <div className="w-16 h-16 bg-nest-surface-low rounded-[1.2rem] flex items-center justify-center mb-8 shadow-sm">
                <BrushCleaning className="w-8 h-8 text-[#14B8A6]" strokeWidth={2.3} />
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
              { no: '01', badge: 'Bước 1', title: 'Khám Phá Không Gian', desc: 'Trải nghiệm trực quan qua hệ thống hình ảnh thực tế và thông số chi tiết. Bộ lọc thông minh giúp bạn tìm thấy "tổ ấm" lý tưởng chỉ trong vài giây.', color: 'from-[#F0FBFA] to-[#E6F8F7]' },
              { no: '02', badge: 'Bước 2', title: 'Kết Nối & Trải Nghiệm', desc: 'Tương tác tức thì qua Zalo hoặc Hotline 24/7. Đội ngũ hỗ trợ luôn sẵn sàng đồng hành cùng bạn trải nghiệm thực tế không gian sống.', color: 'from-[#E6F8F7] to-[#CCFBF1]' },
              { no: '03', badge: 'Bước 3', title: 'Khởi Đầu Sống Chất', desc: 'Tận hưởng đặc quyền cư dân với tài khoản riêng biệt. Quản lý hóa đơn, hợp đồng và gửi yêu cầu hỗ trợ ngay trên ứng dụng mọi lúc, mọi nơi.', color: 'from-[#CCFBF1] to-[#14B8A6]/20' },
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
              { src: '/images/home/workspace.png', label: 'Góc làm việc tri thức' },
              { src: '/images/home/mezzanine.png', label: 'Không gian nghỉ ngơi' },
              { src: '/images/home/kitchenette.png', label: 'Khu vực nấu nướng' },
              { src: '/images/home/balcony.png', label: 'Ban công thoáng đãng' },
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
                    <div className="text-base font-bold text-nest-text-primary">Thành phố Thủ Đức, TP. Hồ Chí Minh</div>
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
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d62711.0116893693!2d106.7208!3d10.8491!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3175276336365d75%3A0x6e9d6515efbb5083!2zVGjhu6cgxJDhu6ljLCBUaMOgbmggcGjhu5EgSOG7kyBDaMOtIE1pbmgsIFZp4buHdCBOYW0!5e0!3m2!1svi!2s!4v1713431982847!5m2!1svi!2s"
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
