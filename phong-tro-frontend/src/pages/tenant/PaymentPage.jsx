import { useState } from 'react';
import { 
  Receipt, QrCode, Download, Upload, 
  Send, ChevronLeft, ChevronRight, Info,
  CheckCircle2, Copy, Leaf
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';

export default function PaymentPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    addToast('Đã sao chép nội dung chuyển khoản!');
  };

  const handleSubmit = () => {
    if (!uploadedFile) {
      addToast('Vui lòng tải lên ảnh minh chứng thanh toán!', 'error');
      return;
    }
    addToast('Minh chứng đã được gửi! Chúng tôi sẽ xác nhận trong vòng 2-4h.');
    setTimeout(() => navigate('/tenant/invoices'), 2000);
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
       {/* Header */}
       <div className="flex justify-between items-end">
          <div>
             <p className="text-[11px] font-bold text-[#14B8A6] uppercase tracking-widest mb-1.5">THANH TOÁN TRỰC TUYẾN</p>
             <h1 className="text-[34px] font-sans font-bold text-[#0F3A40] tracking-tight">Thanh toán Hóa đơn</h1>
          </div>
          <button 
            onClick={() => navigate('/tenant/invoices')}
            className="flex items-center gap-2 text-[#4A787C] hover:text-[#0F3A40] font-bold text-[14px] transition-all"
          >
             <ChevronLeft size={18} /> Quay lại lịch sử
          </button>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Invoice Details */}
          <div className="lg:col-span-5 flex flex-col gap-8">
             <div className="bg-white/60 backdrop-blur-md rounded-[40px] p-8 border border-white shadow-sm h-fit">
                <div className="flex items-center gap-4 mb-8">
                   <div className="w-10 h-10 rounded-2xl bg-[#EAF7F8] flex items-center justify-center text-[#14B8A6]">
                      <Receipt size={18} />
                   </div>
                   <h3 className="text-xl font-bold text-[#0F3A40]">Chi tiết hóa đơn</h3>
                </div>

                <div className="space-y-5">
                   <div className="flex justify-between items-center bg-[#F2FCFD]/50 p-4 rounded-2xl border border-[#BCE1E5]/20">
                      <span className="text-[14px] font-medium text-[#4A787C]">Tiền phòng (Tháng 10)</span>
                      <span className="text-[15px] font-bold text-[#0F3A40]">5.500.000₫</span>
                   </div>
                   
                   <div className="px-4 space-y-4">
                      <div className="flex justify-between items-center text-[13.5px]">
                         <span className="text-[#82ABB0] font-medium">Điện (245 kWh × 3,500đ)</span>
                         <span className="text-[#0F3A40] font-bold">857,500₫</span>
                      </div>
                      <div className="flex justify-between items-center text-[13.5px]">
                         <span className="text-[#82ABB0] font-medium">Nước (4 người × 100,000đ)</span>
                         <span className="text-[#0F3A40] font-bold">400,000₫</span>
                      </div>
                      <div className="flex justify-between items-center text-[13.5px]">
                         <span className="text-[#82ABB0] font-medium">Internet (Gói High-Speed)</span>
                         <span className="text-[#0F3A40] font-bold">250,000₫</span>
                      </div>
                   </div>

                   <div className="pt-8 border-t border-[#BCE1E5]/30">
                      <div className="flex justify-between items-end">
                         <div>
                            <p className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-wider mb-1">TỔNG CỘNG</p>
                            <h2 className="text-[32px] font-bold text-[#0F3A40]">7.007.500₫</h2>
                         </div>
                         <div className="bg-[#EBFDFB] text-[#14B8A6] text-[10px] font-bold px-3 py-1.5 rounded-lg mb-2">
                            HẠN: 05/11/2023
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             <div className="bg-white/40 rounded-[32px] p-8 border border-white/50 shadow-sm">
                <h4 className="text-[13px] font-bold text-[#82ABB0] uppercase tracking-widest mb-6">CỔNG THANH TOÁN KHÁC</h4>
                <div className="flex gap-4">
                   <button className="flex-1 bg-white hover:bg-[#F2FCFD] border border-[#BCE1E5]/30 p-4 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#E11D48]/10 flex items-center justify-center text-[#E11D48] text-[10px] font-extrabold italic uppercase">VNPay</div>
                      <span className="text-[13px] font-bold text-[#4A787C]">VNPay</span>
                   </button>
                   <button className="flex-1 bg-white hover:bg-[#F2FCFD] border border-[#BCE1E5]/30 p-4 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-3 text-pink-500">
                      <div className="w-8 h-8 rounded-lg bg-pink-500 flex items-center justify-center text-white text-[10px] font-extrabold uppercase">MoMo</div>
                      <span className="text-[13px] font-bold text-[#4A787C]">Momo</span>
                   </button>
                </div>
             </div>
          </div>

          {/* Right Column: QR Code & Proof Upload */}
          <div className="lg:col-span-7 flex flex-col gap-8">
             {/* QR Section */}
             <div className="bg-[#14B8A6] rounded-[40px] overflow-hidden shadow-xl shadow-[#14B8A6]/10">
                <div className="p-8 border-b border-white/10 flex items-center gap-4 text-white">
                   <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                      <QrCode size={18} />
                   </div>
                   <div>
                      <h3 className="text-xl font-bold">Chuyển khoản qua QR Code</h3>
                      <p className="text-white/70 text-[13px]">Số tiền và nội dung đã được tích hợp</p>
                   </div>
                </div>
                
                <div className="bg-[#DDF5F7]/95 p-10 flex flex-col items-center">
                   <div className="bg-white p-6 rounded-[32px] shadow-2xl relative mb-8 group">
                      <div className="w-[200px] h-[200px] bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden relative">
                         <img 
                            src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TN402_T10_2023_7007500" 
                            alt="QR Payment" 
                            className="w-full h-full p-2"
                         />
                         <div className="absolute inset-0 flex items-center justify-center bg-[#1E4D54] opacity-80 rounded-xl">
                            <div className="bg-white p-2 rounded-lg text-[#1E4D54]">
                               <Leaf className="fill-current w-6 h-6" />
                            </div>
                         </div>
                      </div>
                      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-[#0F3A40] text-white px-5 py-2 rounded-full text-[11px] font-bold shadow-xl border border-[#14B8A6]/30">
                         Scan with Banking App
                      </div>
                   </div>

                   <div className="w-full max-w-[400px] space-y-4">
                      <div className="flex flex-col items-center mb-6">
                         <p className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-widest mb-1">CHỦ TÀI KHOẢN</p>
                         <h4 className="text-[16px] font-bold text-[#0F3A40]">NGUYEN MINH QUAN - THE NEST</h4>
                      </div>

                      <div className="bg-white/40 p-1.5 pl-5 rounded-2xl flex items-center justify-between border border-white">
                         <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-[#82ABB0] uppercase tracking-tight leading-none mb-1">NỘI DUNG CHUYỂN KHOẢN</span>
                            <span className="text-[14px] font-bold text-[#0F3A40]">TN402_T10_2023</span>
                         </div>
                         <button 
                            onClick={() => handleCopy('TN402_T10_2023')}
                            className="p-3 bg-white text-[#14B8A6] rounded-xl hover:bg-[#14B8A6] hover:text-white transition-all shadow-sm"
                         >
                            <Copy size={16} />
                         </button>
                      </div>

                      <button 
                        onClick={() => addToast('Đã lưu mã QR vào thư viện ảnh!')}
                        className="w-full py-3.5 rounded-2xl bg-[#0F3A40] text-white font-bold text-[13.5px] hover:bg-[#1F545B] transition-all flex items-center justify-center gap-2 shadow-lg"
                      >
                         <Download size={16} /> Lưu mã QR
                      </button>
                   </div>
                </div>
             </div>

             {/* Proof Upload */}
             <div className="bg-white/60 backdrop-blur-md rounded-[40px] p-10 border border-white shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                   <div className="w-10 h-10 rounded-2xl bg-[#EAF7F8] flex items-center justify-center text-[#14B8A6]">
                      <Upload size={18} />
                   </div>
                   <h3 className="text-xl font-bold text-[#0F3A40]">Tải lên minh chứng</h3>
                </div>

                <div 
                  className={`relative h-[220px] rounded-[32px] border-2 border-dashed transition-all flex flex-col items-center justify-center p-8 text-center ${
                    dragActive ? 'border-[#14B8A6] bg-[#EAF7F8]' : 'border-[#BCE1E5]/50 bg-[#F2FCFD]/40 hover:border-[#14B8A6]/50 hover:bg-[#F2FCFD]/60'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      setUploadedFile(e.dataTransfer.files[0]);
                      addToast('Đã nhận ảnh minh chứng!');
                    }
                  }}
                >
                   <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setUploadedFile(e.target.files[0])} />
                   
                   {uploadedFile ? (
                      <div className="flex flex-col items-center">
                         <div className="w-16 h-16 rounded-2xl bg-[#EBFDFB] flex items-center justify-center text-[#14B8A6] mb-4">
                            <CheckCircle2 size={32} />
                         </div>
                         <p className="text-[14px] font-bold text-[#0F3A40] mb-1">{uploadedFile.name}</p>
                         <p className="text-[12px] text-[#82ABB0]">Đã sẵn sàng tải lên</p>
                      </div>
                   ) : (
                      <>
                        <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-[#14B8A6] shadow-sm mb-4">
                           <Upload size={28} />
                        </div>
                        <p className="text-[15px] font-bold text-[#0F3A40] mb-2">Nhấn để tải lên hoặc kéo thả hình ảnh</p>
                        <p className="text-[12px] text-[#82ABB0] font-medium leading-relaxed max-w-[280px]">
                           Hỗ trợ định dạng JPG, PNG (Tối đa 5MB) giúp bộ phận kế toán xác nhận nhanh chóng.
                        </p>
                      </>
                   )}
                </div>

                <button 
                  onClick={handleSubmit}
                  className="w-full mt-8 py-5 rounded-[24px] bg-[#0F3A40] hover:bg-[#1F545B] text-white font-bold text-[16px] shadow-xl shadow-[#0F3A40]/10 transition-all flex items-center justify-center gap-3"
                >
                   Gửi xác nhận thanh toán <Send size={18} />
                </button>
                
                <p className="text-center mt-6 text-[11px] font-medium text-[#82ABB0] leading-relaxed max-w-[500px] mx-auto">
                   Bằng cách nhấn xác nhận, bạn đồng ý với các điều khoản thanh toán của The Nest Living. 
                   Giao dịch sẽ được xử lý trong vòng 2-4 giờ làm việc.
                </p>
             </div>
          </div>
       </div>
    </div>
  );
}
