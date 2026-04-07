import { Megaphone, Send, Paperclip, MoreVertical, TrendingUp, Bell } from 'lucide-react';

export default function NotificationManagePage() {
  const notifications = [
    {
      id: 1,
      time: '2 GIỜ TRƯỚC',
      audience: 'TOÀN BỘ TÒA NHÀ',
      title: 'Thông báo bảo trì thang máy tòa A',
      content: 'Chúng tôi xin thông báo lịch bảo trì định kỳ cho thang máy tại tòa nhà A vào sáng thứ 7 tuần này. Mong cư dân sắp xếp thời gian di chuyển...',
      status: 'active',
    },
    {
      id: 2,
      time: 'HÔM QUA',
      audience: 'TẦNG 5 & 6',
      title: 'Nhắc nhở thanh toán tiền phòng tháng 10',
      content: 'Kính gửi quý cư dân, vui lòng hoàn tất các hóa đơn dịch vụ và tiền phòng trước ngày 05/10 để tránh các khoản phí chậm trễ phát sinh...',
      status: 'inactive',
    },
    {
      id: 3,
      time: '01/10/2023',
      audience: 'TẤT CẢ NGƯỜI DÙNG',
      title: 'Chào mừng cư dân mới đến với The Nest Living',
      content: 'The Nest hân hoan chào đón 15 cư dân mới gia nhập cộng đồng của chúng ta trong tháng này. Hãy cùng tham gia buổi tiệc trà vào tối nay...',
      status: 'inactive',
    }
  ];

  const stats = [
    { label: 'TỶ LỆ XEM', value: '88%', trend: '+4.2%', color: 'text-[#14B8A6]', bg: 'bg-[#EBFDFB]', borderColor: 'border-[#0F3A40]' },
    { label: 'THÔNG BÁO/THÁNG', value: '24', trend: 'ổn định', color: 'text-[#4A787C]', bg: 'bg-[#F2FCFD]', borderColor: 'border-[#14B8A6]' },
    { label: 'PHẢN HỒI CƯ DÂN', value: '156', trend: '+12', color: 'text-[#14B8A6]', bg: 'bg-[#EBFDFB]', borderColor: 'border-[#0F3A40]' }
  ];

  return (
    <div className="w-full max-w-[1200px] mx-auto mt-2 px-4 pb-12 flex flex-col gap-10">
      {/* Header Section */}
      <header className="flex flex-col gap-3">
        <h1 className="text-[36px] font-sans font-bold text-[#0F3A40] tracking-tight leading-none">
          Trung tâm Thông báo
        </h1>
        <p className="text-[15px] font-medium text-[#4A787C] leading-relaxed max-w-[600px]">
          Quản lý và gửi thông tin quan trọng đến tất cả cư dân tại The Nest Living một cách nhanh chóng và hiệu quả.
        </p>
      </header>

      {/* Main Content: 2-column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* Left Column: Create Notification Form */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-[#F2FCFD] rounded-[32px] p-8 shadow-sm flex flex-col gap-6 border border-transparent h-full">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-[16px] bg-[#EBFDFB] text-[#14B8A6] flex items-center justify-center shadow-sm">
                <Megaphone className="w-6 h-6" />
              </div>
              <h2 className="text-[22px] font-bold text-[#0F3A40]">Tạo thông báo mới</h2>
            </div>

            <div className="flex flex-col gap-6">
              <div>
                <label className="block text-[11px] font-bold text-[#4A787C] uppercase tracking-widest mb-3 pr-2">TIÊU ĐỀ THÔNG BÁO</label>
                <input
                  type="text"
                  placeholder="Nhập tiêu đề ngắn gọn..."
                  className="w-full bg-[#D7F2F5]/40 rounded-2xl px-6 py-4 text-[#0F3A40] font-bold text-[14px] outline-none border border-transparent focus:border-[#14B8A6]/40 transition-colors placeholder-[#82ABB0]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#4A787C] uppercase tracking-widest mb-3 pr-2">NỘI DUNG CHI TIẾT</label>
                <textarea
                  rows={6}
                  placeholder="Viết nội dung thông báo tại đây..."
                  className="w-full bg-[#D7F2F5]/40 rounded-3xl px-6 py-5 text-[#0F3A40] font-medium text-[14px] outline-none border border-transparent focus:border-[#14B8A6]/40 transition-colors placeholder-[#82ABB0] resize-none leading-relaxed"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-auto pt-4 items-center">
              <button className="flex-1 bg-[#0F3A40] hover:bg-[#1F545B] text-white py-4 rounded-full text-[15px] font-bold transition-all shadow-md flex items-center justify-center gap-3">
                <Send className="w-5 h-5 text-[#14B8A6]" /> Gửi thông báo
              </button>
              <button className="w-[56px] h-[56px] rounded-full bg-white text-[#4A787C] flex items-center justify-center shadow-sm border border-[#BCE1E5]/30 hover:bg-[#EBFDFB] hover:text-[#14B8A6] transition-all">
                <Paperclip className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>

        {/* Right Column: Sent Notifications List */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-[22px] font-bold text-[#0F3A40]">Thông báo đã gửi</h2>
            <div className="flex gap-2">
              <button className="bg-[#0F3A40] text-white px-5 py-2 rounded-full text-[11px] font-bold shadow-sm uppercase tracking-wider">MỚI NHẤT</button>
              <button className="bg-white text-[#4A787C] px-5 py-2 rounded-full text-[11px] font-bold border border-[#BCE1E5]/30 hover:bg-[#F2FCFD] hover:text-[#0F3A40] transition-all uppercase tracking-wider">QUAN TRỌNG</button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {notifications.map((notif) => (
              <div key={notif.id} className="bg-white rounded-[24px] p-6 shadow-[0_4px_20px_rgba(15,58,64,0.02)] border-2 border-[#14B8A6]/20 flex flex-col gap-3 group relative transition-all">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className={`w-2 h-2 rounded-full ${notif.status === 'active' ? 'bg-[#14B8A6]' : 'bg-[#CFDEE0]'}`}></span>
                    <span className="text-[11px] font-bold text-[#82ABB0] tracking-widest uppercase truncate">{notif.time} • {notif.audience}</span>
                  </div>
                  <button className="text-[#82ABB0] hover:text-[#0F3A40] p-1 transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-col gap-1 pr-4">
                  <h3 className="text-[17px] font-bold text-[#0F3A40] group-hover:text-[#14B8A6] transition-colors">{notif.title}</h3>
                  <p className="text-[13.5px] text-[#4A787C] font-medium leading-relaxed line-clamp-2">
                    {notif.content}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full py-4 border-2 border-dashed border-[#BCE1E5]/60 hover:border-[#14B8A6]/60 rounded-[24px] text-[13px] font-bold text-[#82ABB0] hover:text-[#14B8A6] transition-all mt-2">
            Xem thêm các thông báo cũ
          </button>
        </section>

      </div>

      {/* Bottom Section: Statistics */}
      <footer className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {stats.map((stat, i) => (
          <div key={i} className={`bg-white rounded-[24px] p-8 shadow-[0_4px_20px_rgba(15,58,64,0.02)] border-2 ${stat.borderColor} flex flex-col gap-4 justify-between min-h-[140px]`}>
            <span className="text-[11px] font-bold text-[#4A787C] uppercase tracking-widest">{stat.label}</span>
            <div className="flex items-baseline gap-4">
              <span className="text-[42px] font-bold text-[#0F3A40] leading-none">{stat.value}</span>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${stat.bg} ${stat.color} text-[12px] font-bold shadow-sm`}>
                {stat.trend.startsWith('+') && <TrendingUp className="w-3.5 h-3.5" />}
                {stat.trend}
              </div>
            </div>
          </div>
        ))}
      </footer>

    </div>
  );
}
