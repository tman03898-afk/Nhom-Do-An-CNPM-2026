import { Wallet, Image as ImageIcon, ArrowRight } from 'lucide-react';

export default function PaymentManagePage() {
  const pendingApprovals = [
    { name: 'Trần Thế Vinh', room: 'Phòng 402', desc: 'Hóa đơn T9', amount: '4.500.000' },
    { name: 'Lê Thị Mai', room: 'Phòng 201', desc: 'Phí dịch vụ', amount: '1.250.000' },
    { name: 'Hoàng Nam', room: 'Phòng 505', desc: 'Đặt cọc', amount: '6.000.000' },
    { name: 'Phạm Anh', room: 'Phòng 103', desc: 'Hóa đơn T9', amount: '3.800.000' },
  ];

  const transactions = [
    { id: '#TN-92831', avatarBg: 'bg-[#0F3A40]', name: 'Nguyễn Bảo An', room: 'Phòng 301', date: '12/09/2023', amount: '5.200.000đ', method: 'Chuyển khoản', status: 'THÀNH CÔNG', statusPill: 'bg-[#EBFDFB] text-[#14B8A6]', dot: 'bg-[#14B8A6]' },
    { id: '#TN-92822', avatarBg: 'bg-[#0F3A40]', name: 'Lê Thu Thảo', room: 'Phòng 404', date: '11/09/2023', amount: '4.150.000đ', method: 'Chuyển khoản', status: 'THÀNH CÔNG', statusPill: 'bg-[#EBFDFB] text-[#14B8A6]', dot: 'bg-[#14B8A6]' },
    { id: '#TN-92815', avatarBg: 'bg-[#0F3A40]', name: 'Vũ Minh Hiếu', room: 'Phòng 102', date: '10/09/2023', amount: '3.900.000đ', method: 'Ví điện tử', status: 'THÀNH CÔNG', statusPill: 'bg-[#EBFDFB] text-[#14B8A6]', dot: 'bg-[#14B8A6]' },
    { id: '#TN-92799', avatarBg: 'bg-[#0F3A40]', name: 'Đặng Mỹ Linh', room: 'Phòng 205', date: '09/09/2023', amount: '4.500.000đ', method: 'Chuyển khoản', status: 'THẤT BẠI', statusPill: 'bg-[#FFF0F0] text-[#D14D4D]', dot: 'bg-[#D14D4D]' },
    { id: '#TN-92780', avatarBg: 'bg-[#0F3A40]', name: 'Phạm Hoàng Đăng', room: 'Phòng 403', date: '08/09/2023', amount: '5.800.000đ', method: 'Chuyển khoản', status: 'THÀNH CÔNG', statusPill: 'bg-[#EBFDFB] text-[#14B8A6]', dot: 'bg-[#14B8A6]' },
  ];

  return (
    <div className="w-full max-w-[1200px] mx-auto mt-2 px-4 pb-12 relative flex flex-col h-full gap-8">
      {/* Top Section: Pending Approvals */}
      <section>
        <div className="flex justify-between items-end mb-6 relative z-10">
          <div>
            <p className="text-[10px] font-bold text-[#14B8A6] uppercase tracking-widest mb-1.5 leading-none">Chờ xử lý</p>
            <h1 className="text-[32px] font-sans font-bold text-[#0F3A40] tracking-tight leading-none">Duyệt thanh toán</h1>
          </div>
          <span className="text-[13px] font-medium text-[#4A787C]">Hiện có <span className="font-bold text-[#14B8A6]">04</span> yêu cầu mới</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pendingApprovals.map((item, idx) => (
            <div key={idx} className="bg-[#F2FCFD] rounded-[32px] p-6 shadow-sm border border-transparent flex flex-col">
               <div className="flex justify-between items-start mb-6">
                  <div className="w-10 h-10 rounded-[12px] bg-[#DDF5F7] flex items-center justify-center text-[#14B8A6]">
                     <Wallet className="w-5 h-5" />
                  </div>
                  <span className="bg-[#FFF3E0] text-[#E68A00] px-3 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase">
                     Pending
                  </span>
               </div>
               
               <div className="mb-6">
                  <h3 className="text-[18px] font-bold text-[#0F3A40]">{item.name}</h3>
                  <p className="text-[13px] text-[#4A787C] font-medium mt-1">{item.room} &bull; {item.desc}</p>
               </div>

               <div className="mb-6">
                  <h2 className="text-[28px] font-bold text-[#0F3A40] leading-none">{item.amount} <span className="text-[12px] text-[#4A787C] font-bold">VND</span></h2>
               </div>

               <button className="w-full bg-white hover:bg-[#EBFDFB] flex items-center justify-center gap-2 py-3 rounded-2xl shadow-sm text-[13px] font-bold text-[#0F3A40] transition-colors mb-4 border border-[#BCE1E5]/30">
                  <ImageIcon className="w-4 h-4 text-[#14B8A6]" /> Minh chứng chuyển khoản
               </button>

               <div className="grid grid-cols-2 gap-3 mt-auto">
                  <button className="bg-[#14B8A6] hover:bg-[#0da090] text-white py-2.5 rounded-full text-[13px] font-bold transition-colors shadow-md">
                     Duyệt
                  </button>
                  <button className="bg-transparent border border-[#FFD9D9] hover:bg-[#FFF0F0] text-[#D14D4D] py-2.5 rounded-full text-[13px] font-bold transition-colors">
                     Từ chối
                  </button>
               </div>
            </div>
          ))}
        </div>
      </section>

      {/* Middle Section: Recent Transactions */}
      <section>
        <div className="flex justify-between items-end mb-6 relative z-10">
          <div>
            <p className="text-[10px] font-bold text-[#14B8A6] uppercase tracking-widest mb-1.5 leading-none">Lịch sử</p>
            <h2 className="text-[28px] font-sans font-bold text-[#0F3A40] tracking-tight leading-none">Giao dịch gần đây</h2>
          </div>
          <button className="text-[13px] font-bold text-[#0F3A40] hover:text-[#14B8A6] transition-colors flex items-center gap-1.5">
            Xem tất cả <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-[#F2FCFD] rounded-[32px] p-8 shadow-sm border border-transparent">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#BCE1E5]/40 text-[10px] font-bold text-[#82ABB0] tracking-widest uppercase">
                  <th className="pb-5 font-bold px-2">Mã giao dịch</th>
                  <th className="pb-5 font-bold px-2">Khách thuê</th>
                  <th className="pb-5 font-bold px-2">Ngày thanh toán</th>
                  <th className="pb-5 font-bold px-2">Số tiền</th>
                  <th className="pb-5 font-bold px-2">Phương thức</th>
                  <th className="pb-5 font-bold px-2">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, idx) => (
                  <tr key={idx} className="border-b border-[#BCE1E5]/40 last:border-0 hover:bg-white/50 transition-colors">
                    <td className="py-4 px-2">
                      <span className="font-bold text-[#82ABB0] text-[13px]">{tx.id}</span>
                    </td>
                    <td className="py-4 px-2">
                       <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${tx.avatarBg} flex items-center justify-center overflow-hidden`}>
                             <img src={`https://ui-avatars.com/api/?name=${tx.name}&background=0F3A40&color=fff`} className="w-full h-full object-cover" alt="avatar"/>
                          </div>
                          <div className="flex flex-col">
                             <span className="font-bold text-[#0F3A40] text-[14px] leading-tight">{tx.name}</span>
                             <span className="text-[11px] text-[#82ABB0] font-medium">{tx.room}</span>
                          </div>
                       </div>
                    </td>
                    <td className="py-4 px-2">
                      <span className="text-[#0F3A40] text-[14px] font-medium">{tx.date}</span>
                    </td>
                    <td className="py-4 px-2">
                      <span className="font-bold text-[#0F3A40] text-[14px]">{tx.amount}</span>
                    </td>
                    <td className="py-4 px-2">
                      <div className="text-[13px] text-[#4A787C] font-medium leading-tight w-16">
                         {tx.method}
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className={`${tx.statusPill} inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase`}>
                         <span className={`w-1 h-1 rounded-full ${tx.dot}`}></span>
                         {tx.status}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Bottom Section: Revenue & Collection Status */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-2">
         {/* Revenue Card (Left) */}
         <div className="lg:col-span-8 bg-[#F2FCFD] rounded-[32px] p-8 shadow-sm flex flex-col justify-between border border-transparent relative overflow-hidden min-h-[220px]">
            {/* Background Bars Decoration */}
            <div className="absolute -bottom-8 right-0 left-0 flex items-end justify-between px-10 gap-4 opacity-70 pointer-events-none">
               <div className="w-full bg-[#BCE1E5] rounded-t-lg h-16"></div>
               <div className="w-full bg-[#BCE1E5] rounded-t-lg h-24"></div>
               <div className="w-full bg-[#BCE1E5] rounded-t-lg h-20"></div>
               <div className="w-full bg-[#BCE1E5] rounded-t-lg h-32"></div>
               <div className="w-full bg-[#BCE1E5] rounded-t-lg h-40"></div>
               <div className="w-full bg-[#0F3A40] rounded-t-lg h-56 shadow-lg"></div>
               <div className="w-full bg-[#BCE1E5] rounded-t-lg h-32"></div>
            </div>

            <div className="relative z-10">
               <h3 className="text-[20px] font-bold text-[#0F3A40] mb-2">Thống kê doanh thu tháng 9</h3>
               <p className="text-[14px] text-[#4A787C] font-medium">Tăng 12.5% so với tháng trước</p>
            </div>
            <div className="relative z-10 mt-16">
               <h1 className="text-[48px] font-bold text-[#0F3A40] tracking-tight leading-none">
                  452.800.000 <span className="text-[20px] text-[#14B8A6] font-bold">VND</span>
               </h1>
            </div>
         </div>

         {/* Collection Status Card (Right) */}
         <div className="lg:col-span-4 bg-[#0F3A40] rounded-[32px] p-8 shadow-xl flex flex-col justify-between border border-transparent text-white relative">
            <div>
               <h3 className="text-[20px] font-bold mb-8">Trạng thái thu hộ</h3>

               <div className="space-y-6">
                  <div>
                     <div className="flex justify-between items-center mb-3">
                        <span className="text-[11px] font-bold tracking-widest uppercase text-[#BCE1E5]">Tiền phòng</span>
                        <span className="text-[14px] font-bold">85%</span>
                     </div>
                     <div className="w-full h-2.5 bg-[#1F545B] rounded-full overflow-hidden">
                        <div className="h-full bg-[#14B8A6] rounded-full" style={{ width: '85%' }}></div>
                     </div>
                  </div>

                  <div>
                     <div className="flex justify-between items-center mb-3">
                        <span className="text-[11px] font-bold tracking-widest uppercase text-[#BCE1E5]">Dịch vụ & Điện nước</span>
                        <span className="text-[14px] font-bold">62%</span>
                     </div>
                     <div className="w-full h-2.5 bg-[#1F545B] rounded-full overflow-hidden">
                        <div className="h-full bg-[#14B8A6] rounded-full" style={{ width: '62%' }}></div>
                     </div>
                  </div>
               </div>
            </div>

            <button className="w-full bg-white hover:bg-[#F2FCFD] text-[#0F3A40] py-4 rounded-2xl text-[14px] font-bold transition-colors mt-12 shadow-md">
               Gửi nhắc nợ tự động
            </button>
         </div>
      </section>
    </div>
  );
}
