import { useState } from 'react';
import { 
  Camera, Phone, Mail, CreditCard, 
  Calendar, PhoneCall, MessageCircle, 
  UserRound, Lock, ShieldCheck, LogOut,
  ChevronRight, BadgeCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ProfilePage() {
  const { user, logout } = useAuth();

  const settingsItems = [
    {
      title: 'Cập nhật số điện thoại',
      desc: 'Xác thực qua OTP tin nhắn',
      icon: <Phone size={18} />,
      color: 'bg-[#E6F8F6] text-[#14B8A6]'
    },
    {
      title: 'Đổi mật khẩu',
      desc: 'Tăng cường bảo mật tài khoản',
      icon: <Lock size={18} />,
      color: 'bg-[#EBF4FF] text-[#3B82F6]'
    },
    {
      title: 'Xác thực 2 bước',
      desc: 'Bảo vệ thông tin cá nhân',
      icon: <ShieldCheck size={18} />,
      color: 'bg-[#EAFDFB] text-[#14B8A6]'
    },
    {
      title: 'Đăng xuất',
      desc: 'Thoát khỏi phiên làm việc',
      icon: <LogOut size={18} />,
      color: 'bg-[#FFF0F0] text-[#D14D4D]',
      onClick: logout
    }
  ];

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div>
         <h1 className="text-[34px] font-sans font-bold text-[#0F3A40] tracking-tight">Thông tin cá nhân</h1>
      </div>
      {/* Header Info Banner */}
      <div className="relative bg-[#BDDEE2] rounded-[40px] p-10 flex items-center gap-8 overflow-hidden">
         {/* Decorative Circles */}
         <div className="absolute top-[-50px] right-[-50px] w-64 h-64 border-[40px] border-white/10 rounded-full"></div>
         <div className="absolute bottom-[-30px] right-[100px] w-32 h-32 bg-white/5 rounded-full"></div>

         <div className="relative">
            <div className="w-[180px] h-[180px] rounded-full border-[6px] border-white shadow-xl overflow-hidden relative group cursor-pointer">
               <img 
                 src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=400" 
                 alt="Profile" 
                 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
               />
               <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="text-white" size={32} />
               </div>
               <div className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-[#1E4D54] border-4 border-white flex items-center justify-center text-white shadow-lg">
                  <Camera size={16} />
               </div>
            </div>
         </div>

         <div className="relative flex flex-col gap-2">
            <span className="text-[12px] font-bold text-[#1E4D54]/60 uppercase tracking-[0.2em]">CƯ DÂN CAO CẤP</span>
            <h1 className="text-[48px] font-sans font-extrabold text-[#1E4D54] tracking-tight leading-none mb-2">
               {user?.name || 'Nguyễn Văn A'}
            </h1>
            <div className="flex items-center gap-4">
               <div className="bg-white/40 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-2 border border-white/30 shadow-sm">
                  <span className="text-[13px] font-bold text-[#1E4D54]/60 tracking-wider">ID: TN-8829</span>
               </div>
               <div className="bg-white/40 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-2 border border-white/30 shadow-sm">
                  <BadgeCheck size={16} className="text-[#14B8A6] fill-[#14B8A6]/10" />
                  <span className="text-[13px] font-bold text-[#1E4D54]">Đã xác thực</span>
               </div>
            </div>
         </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
         {/* Details Card */}
         <div className="flex-1 bg-white/60 backdrop-blur-md rounded-[40px] p-10 border border-white shadow-sm flex flex-col h-full">
            <div className="flex justify-between items-center mb-10">
               <h3 className="text-[20px] font-bold text-[#0F3A40]">Thông tin chi tiết</h3>
               <button className="text-[13px] font-bold text-[#14B8A6] hover:underline">Chỉnh sửa</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-12">
               <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#EAF7F8] flex items-center justify-center text-[#14B8A6]">
                     <Phone size={18} className="fill-current" />
                  </div>
                  <div>
                     <p className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-widest mb-1.5">SỐ ĐIỆN THOẠI</p>
                     <p className="text-[16px] font-bold text-[#0F3A40]">090 123 4567</p>
                  </div>
               </div>

               <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#EAF7F8] flex items-center justify-center text-[#14B8A6]">
                     <Mail size={18} className="fill-current" />
                  </div>
                  <div>
                     <p className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-widest mb-1.5">EMAIL CÁ NHÂN</p>
                     <p className="text-[16px] font-bold text-[#0F3A40]">an.nguyen@gmail.com</p>
                  </div>
               </div>

               <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#EAF7F8] flex items-center justify-center text-[#14B8A6]">
                     <CreditCard size={18} className="fill-current" />
                  </div>
                  <div>
                     <p className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-widest mb-1.5">CCCD/CMND</p>
                     <p className="text-[16px] font-bold text-[#0F3A40]">079123456789</p>
                  </div>
               </div>

               <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#EAF7F8] flex items-center justify-center text-[#14B8A6]">
                     <Calendar size={18} className="fill-current" />
                  </div>
                  <div>
                     <p className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-widest mb-1.5">NGÀY SINH</p>
                     <p className="text-[16px] font-bold text-[#0F3A40]">15/06/2002</p>
                  </div>
               </div>
            </div>
         </div>

         {/* Help Card */}
         <div className="w-full lg:w-[380px] bg-[#1E4D54] rounded-[40px] p-8 flex flex-col shadow-xl shadow-[#1E4D54]/20 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
            
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-2">HỖ TRỢ KỸ THUẬT</span>
            <h3 className="text-[28px] font-bold mb-4 tracking-tight">Cần giúp đỡ?</h3>
            <p className="text-white/70 text-[14px] leading-relaxed mb-10">
               Đội ngũ CSKH luôn sẵn sàng hỗ trợ bạn 24/7 cho mọi vấn đề.
            </p>

            <div className="space-y-4">
               <div className="bg-white rounded-full py-4 px-8 flex items-center justify-between text-[#1E4D54] shadow-lg">
                  <span className="font-extrabold text-[18px]">1800 1234</span>
                  <PhoneCall size={20} className="fill-current" />
               </div>
               <button className="w-full bg-[#14B8A6] hover:bg-[#109284] text-white py-4 px-8 rounded-full flex items-center justify-center gap-3 font-bold text-[15px] transition-all shadow-lg shadow-[#14B8A6]/20 group/btn">
                  Nhắn tin Zalo ngay 
                  <MessageCircle size={20} className="fill-current group-hover/btn:rotate-12 transition-transform" />
               </button>
            </div>
         </div>
      </div>

      {/* Account Settings Grid */}
      <div className="space-y-6">
         <h3 className="text-[18px] font-bold text-[#0F3A40] px-2">Cài đặt tài khoản</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {settingsItems.map((item, idx) => (
               <div 
                 key={idx} 
                 onClick={item.onClick}
                 className="bg-white/60 backdrop-blur-md p-6 rounded-[32px] border border-white shadow-sm hover:bg-white hover:scale-[1.02] transition-all cursor-pointer group flex items-center gap-5"
               >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${item.color}`}>
                     {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                     <h4 className="text-[16px] font-bold text-[#0F3A40] mb-0.5">{item.title}</h4>
                     <p className="text-[13px] text-[#82ABB0] font-medium">{item.desc}</p>
                  </div>
                  <div className="text-[#BCE1E5] group-hover:text-[#14B8A6] transition-colors pr-2">
                     <ChevronRight size={20} />
                  </div>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
}
