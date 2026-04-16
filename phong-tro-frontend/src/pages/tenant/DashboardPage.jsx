import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
    CreditCard, AlertCircle, Megaphone,
    Calendar, Users, Wifi, Phone,
    ArrowRight, Zap, Package, MessageSquare
} from 'lucide-react';

export default function TenantDashboard() {
    const { user } = useAuth();
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Chào buổi sáng');
        else if (hour < 18) setGreeting('Chào buổi chiều');
        else setGreeting('Chào buổi tối');
    }, []);

    return (
        <div className="flex flex-col gap-8 pb-10">
            {/* Welcome Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-[34px] font-sans font-bold text-[#0F3A40] tracking-tight mb-2">
                        {greeting}, {user?.name ? user.name.split(' ').pop() : 'bạn'}!
                    </h1>
                    <p className="text-[#4A787C] font-medium text-[15px] leading-relaxed max-w-[500px]">
                        Chúc bạn một ngày làm việc và học tập tràn đầy năng lượng tại The Nest Living.
                    </p>
                </div>
                <div className="flex gap-4">
                    <button className="bg-[#14B8A6] hover:bg-[#109284] text-white px-6 py-3 rounded-full text-[14.5px] font-bold shadow-lg shadow-[#14B8A6]/20 transition-all flex items-center gap-2">
                        <CreditCard size={18} /> Thanh toán ngay
                    </button>
                    <button className="bg-white/60 hover:bg-white text-[#0F3A40] border border-white px-6 py-3 rounded-full text-[14.5px] font-bold shadow-sm transition-all">
                        Báo sự cố
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left Column: Main Stats & Notifications */}
                <div className="flex-1 flex flex-col gap-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-7 border border-white shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform cursor-pointer group">
                            <span className="text-[11px] font-bold text-[#4A787C] uppercase tracking-[0.1em]">TIỀN CẦN THANH TOÁN</span>
                            <div className="mt-4 mb-8">
                                <h3 className="text-[26px] font-bold text-[#0F3A40]">4.250.000₫</h3>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t border-[#BCE1E5]/30">
                                <span className="text-[12px] font-medium text-[#82ABB0]">Hạn chót: 05/10/2023</span>
                                <div className="w-8 h-8 rounded-full bg-[#14B8A6]/10 flex items-center justify-center text-[#14B8A6] group-hover:bg-[#14B8A6] group-hover:text-white transition-colors">
                                    <CreditCard size={14} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-7 border border-white shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform cursor-pointer group">
                            <span className="text-[11px] font-bold text-[#4A787C] uppercase tracking-[0.1em]">HÓA ĐƠN CHƯA CHI TRẢ</span>
                            <div className="mt-4 mb-8">
                                <h3 className="text-[26px] font-bold text-[#0F3A40]">01</h3>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t border-[#BCE1E5]/30">
                                <span className="text-[12px] font-medium text-[#82ABB0]">Tháng 09/2023</span>
                                <div className="w-8 h-8 rounded-full bg-[#E68A00]/10 flex items-center justify-center text-[#E68A00] group-hover:bg-[#E68A00] group-hover:text-white transition-colors">
                                    <AlertCircle size={14} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-7 border border-white shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform cursor-pointer group text-[#0F3A40]">
                            <span className="text-[11px] font-bold text-[#4A787C] uppercase tracking-[0.1em]">THÔNG BÁO MỚI</span>
                            <div className="mt-4 mb-8">
                                <h3 className="text-[26px] font-bold text-[#0F3A40]">03</h3>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t border-[#BCE1E5]/30">
                                <span className="text-[12px] font-medium text-[#82ABB0]">Cập nhật 2 giờ trước</span>
                                <div className="w-8 h-8 rounded-full bg-[#3B82F6]/10 flex items-center justify-center text-[#3B82F6] group-hover:bg-[#3B82F6] group-hover:text-white transition-colors">
                                    <Megaphone size={14} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white/40 backdrop-blur-md rounded-[40px] p-8 border border-white shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-bold text-[#0F3A40]">Thông báo gần đây</h3>
                            <button className="text-[13px] font-bold text-[#14B8A6] hover:underline transition-all">Xem tất cả</button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-white/60 p-5 rounded-3xl border border-white/50 flex items-start gap-5 hover:bg-white transition-all cursor-pointer group shadow-sm">
                                <div className="w-12 h-12 rounded-2xl bg-[#E8F8F5] flex items-center justify-center text-[#14B8A6] shrink-0 group-hover:scale-110 transition-transform">
                                    <Zap size={22} className="fill-current" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="text-[15px] font-bold text-[#0F3A40]">Bảo trì hệ thống điện</h4>
                                        <span className="text-[11px] font-bold text-[#82ABB0]">10:30 AM</span>
                                    </div>
                                    <p className="text-[13px] text-[#4A787C] leading-relaxed">
                                        Tòa nhà A sẽ tạm ngưng cấp điện từ 14:00 đến 16:00 chiều nay để bảo trì định kỳ.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white/60 p-5 rounded-3xl border border-white/50 flex items-start gap-5 hover:bg-white transition-all cursor-pointer group shadow-sm">
                                <div className="w-12 h-12 rounded-2xl bg-[#F0F4F8] flex items-center justify-center text-[#4A787C] shrink-0 group-hover:scale-110 transition-transform">
                                    <Package size={22} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="text-[15px] font-bold text-[#0F3A40]">Bưu phẩm mới đã đến</h4>
                                        <span className="text-[11px] font-bold text-[#82ABB0]">Hôm qua</span>
                                    </div>
                                    <p className="text-[13px] text-[#4A787C] leading-relaxed">
                                        Bạn có một kiện hàng đang chờ tại quầy lễ tân. Vui lòng nhận trước 22:00.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Promotion Banner */}
                    <div className="relative h-[240px] rounded-[40px] overflow-hidden group shadow-xl">
                        <img
                            src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1200"
                            alt="Banner"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0F3A40] via-[#0F3A40]/40 to-transparent flex flex-col justify-center p-12">
                            <h3 className="text-[28px] font-bold text-white mb-2 leading-tight">Nâng cấp không gian sống</h3>
                            <p className="text-white/80 text-[14px] max-w-[360px] leading-relaxed mb-6">
                                Khám phá các gói trang trí nội thất độc quyền dành riêng cho cư dân The Nest.
                            </p>
                            <button className="flex items-center gap-2 text-white font-bold text-[13.5px] group/btn">
                                Khám phá ngay <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Room Info & Support */}
                <div className="w-full lg:w-[380px] flex flex-col gap-8">
                    {/* Room Info Card */}
                    <div className="bg-white/60 backdrop-blur-md rounded-[40px] p-8 border border-white shadow-sm flex flex-col h-fit">
                        <div className="flex flex-col mb-10">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-[11px] font-bold text-[#4A787C] uppercase tracking-widest">THÔNG TIN PHÒNG</span>
                                <span className="bg-[#0F3A40] text-white text-[9px] font-bold px-2 py-1 rounded-md tracking-wider">BUILDING A</span>
                            </div>
                            <h2 className="text-[32px] font-sans font-bold text-[#0F3A40]">Phòng 301</h2>
                        </div>

                        <div className="space-y-6 mb-12">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-[#EAF7F8] flex items-center justify-center text-[#14B8A6]">
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-wide">Ngày dọn vào</p>
                                    <p className="text-[14.5px] font-bold text-[#0F3A40]">15/05/2023</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-[#EAF7F8] flex items-center justify-center text-[#14B8A6]">
                                    <Users size={18} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-wide">Số người ở</p>
                                    <p className="text-[14.5px] font-bold text-[#0F3A40]">02 người</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-[#EAF7F8] flex items-center justify-center text-[#14B8A6]">
                                    <Wifi size={18} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-wide">Gói Internet</p>
                                    <p className="text-[14.5px] font-bold text-[#0F3A40]">Premium 200Mbps</p>
                                </div>
                            </div>
                        </div>

                        <button className="mt-auto w-full py-4 rounded-3xl bg-white border border-[#BCE1E5]/50 text-[#14B8A6] font-bold text-[14px] hover:bg-[#14B8A6] hover:text-white transition-all shadow-sm">
                            Xem chi tiết hợp đồng
                        </button>
                    </div>

                    {/* Support Card */}
                    <div className="bg-[#F2FCFD] rounded-[40px] p-8 border border-[#BCE1E5]/40 shadow-sm">
                        <h3 className="text-[20px] font-bold text-[#0F3A40] mb-3">Hỗ trợ 24/7</h3>
                        <p className="text-[13.5px] text-[#4A787C] leading-relaxed mb-8">
                            Đội ngũ vận hành luôn sẵn sàng giải đáp mọi thắc mắc của bạn.
                        </p>

                        <div className="flex items-center gap-4 p-4 bg-white/60 rounded-[28px] border border-white/80">
                            <div className="w-11 h-11 rounded-full bg-[#14B8A6] flex items-center justify-center text-white shrink-0 shadow-lg shadow-[#14B8A6]/20">
                                <Phone size={18} className="fill-current" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <p className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-tight">Hotline: 1900 6789</p>
                                <p className="text-[13px] font-bold text-[#0F3A40] truncate">Phản hồi trong 5 phút</p>
                            </div>
                        </div>

                        <button className="w-full mt-6 py-4 rounded-3xl bg-[#0F3A40] text-white font-bold text-[14px] hover:bg-[#1F545B] transition-all flex items-center justify-center gap-2">
                            <MessageSquare size={16} /> Nhắn tin cho Admin
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
