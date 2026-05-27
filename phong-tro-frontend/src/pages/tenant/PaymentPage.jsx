import { useEffect, useMemo, useState } from 'react';
import { 
  Receipt, QrCode, Download, Upload, 
  Send, ChevronLeft, ChevronRight, Info,
  CheckCircle2, Copy, Sun
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { apiFetch, API_BASE_URL } from '../../lib/api';

const BANK_QR_IMAGE_URL = `${import.meta.env.BASE_URL}images/home/qr.png`;


export default function PaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  const { token } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [invoiceDetail, setInvoiceDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      setIsLoading(true);
      const [invoiceResult, paymentResult] = await Promise.allSettled([
        apiFetch('/tenant/invoices', { token }),
        apiFetch('/tenant/payments', { token }),
      ]);

      if (invoiceResult.status === 'fulfilled') {
        setInvoices(invoiceResult.value?.invoices || []);
      } else {
        setInvoices([]);
      }

      if (paymentResult.status === 'fulfilled') {
        setPayments(paymentResult.value?.payments || []);
      } else {
        // Keep payment list optional: invoice payment flow must still work
        // even if payment-history endpoint has temporary issues.
        setPayments([]);
      }

      setIsLoading(false);
    };
    run();
  }, [token]);

  const isPayableInvoice = (i) => {
    const s = String(i?.status || '').toUpperCase();
    return s !== 'PAID' && s !== 'CANCELLED';
  };

  const invoiceToPay = useMemo(() => {
    const requestedId = Number(searchParams.get('invoiceId'));
    if (Number.isInteger(requestedId) && requestedId > 0) {
      const found = invoices.find((i) => Number(i.invoice_id) === requestedId);
      if (found && isPayableInvoice(found)) return found;
    }

    const unpaid = invoices.find((i) => isPayableInvoice(i));
    if (unpaid) return unpaid;

    return invoices[0] || null;
  }, [invoices, searchParams]);

  useEffect(() => {
    if (!token || !invoiceToPay?.invoice_id) {
      setInvoiceDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch(`/tenant/invoices/${invoiceToPay.invoice_id}`, { token });
        if (!cancelled) setInvoiceDetail(data?.invoice || null);
      } catch {
        if (!cancelled) setInvoiceDetail(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, invoiceToPay?.invoice_id]);

  const invoiceStatus = String(invoiceToPay?.status || '').toUpperCase();
  const isPaid = invoiceStatus === 'PAID';
  const isCancelled = invoiceStatus === 'CANCELLED';
  const needsPayment = Boolean(invoiceToPay) && !isPaid && !isCancelled;
  const latestPaymentForInvoice = useMemo(() => {
    if (!invoiceToPay) return null;
    const invoiceId = Number(invoiceToPay.invoice_id);
    return payments.find((p) => Number(p.invoice_id) === invoiceId) || null;
  }, [payments, invoiceToPay]);
  const latestPaymentStatus = String(latestPaymentForInvoice?.status || '').toUpperCase();
  const isPendingApproval = latestPaymentStatus === 'PENDING';

  const formatMoney = (v) => Number(v || 0).toLocaleString('vi-VN');
  const formatDueDate = (d) => {
    if (!d) return null;
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return null;
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  };

  const dueLabel = needsPayment ? formatDueDate(invoiceToPay?.due_date) : null;

  const transferContent = useMemo(() => {
    if (!invoiceToPay) return 'THE_SUN_PAYMENT';
    const m = String(invoiceToPay.period_month || '').padStart(2, '0');
    const y = String(invoiceToPay.period_year || '');
    const room = invoiceToPay.room_number ? String(invoiceToPay.room_number) : 'ROOM';
    return `INV${invoiceToPay.invoice_id}_${room}_${m}${y}`;
  }, [invoiceToPay]);

  const qrUrl = BANK_QR_IMAGE_URL;

  const notifyThirdPartyGateway = (label) => {
    addToast(
      `${label} chưa tích hợp ví điện tử trong hệ thống. Vui lòng chuyển khoản qua mã QR bên phải hoặc theo thông tin tài khoản.`,
      'info'
    );
  };

  const handleDownloadQr = async () => {
    try {
      const res = await fetch(qrUrl);
      if (!res.ok) throw new Error('fetch');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = invoiceToPay
        ? `qr-thesun-hd-${invoiceToPay.invoice_id}.png`
        : 'qr-thesun-thanh-toan.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      addToast('Đã tải mã QR về máy.');
    } catch {
      window.open(qrUrl, '_blank', 'noopener,noreferrer');
      addToast('Đã mở mã QR trong tab mới — nhấn chuột phải vào ảnh để lưu về máy.', 'info');
    }
  };

  const handleSubmit = async () => {
    if (!invoiceToPay) {
      addToast('Không có hóa đơn để thanh toán.', 'error');
      return;
    }
    if (isPaid) {
      addToast('Hóa đơn này đã được thanh toán.', 'success');
      navigate('/tenant/invoices');
      return;
    }
    if (!uploadedFile) {
      addToast('Vui lòng tải lên ảnh minh chứng thanh toán!', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Upload file trước để lấy URL
      const formData = new FormData();
      formData.append('proof', uploadedFile);
      
      const uploadResponse = await fetch(`${API_BASE_URL}/tenant/payments/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.message || 'Upload failed');
      }
      
      const uploadResult = await uploadResponse.json();
      
      // Gửi payment confirmation với URL từ upload
      await apiFetch('/tenant/payments', {
        token,
        method: 'POST',
        body: {
          invoice_id: invoiceToPay.invoice_id,
          amount: Number(invoiceToPay.total_amount || 0),
          method: 'BANK_TRANSFER',
          proof_url: uploadResult.file_url,
          note: `Proof file: ${uploadedFile?.name || 'uploaded'}`,
        },
      });
      
      addToast('Minh chứng đã được gửi! Chúng tôi sẽ xác nhận sớm.');
      setTimeout(() => navigate('/tenant/invoices'), 1200);
    } catch (e) {
      addToast(e?.message || 'Không thể gửi xác nhận thanh toán.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (file) => {
    if (!file) return;
    if (!String(file.type || '').startsWith('image/')) {
      addToast('Chỉ chấp nhận file ảnh JPG/PNG/WebP.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('Ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.', 'error');
      return;
    }

    setUploadedFile(file);
    addToast('Đã nhận ảnh minh chứng!');
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
                   {isLoading ? (
                      <div className="py-6 text-center text-[13px] font-bold text-[#82ABB0]">Đang tải hóa đơn...</div>
                   ) : !invoiceToPay ? (
                      <div className="py-6 text-center text-[13px] font-bold text-[#82ABB0]">
                        Không có hóa đơn cần thanh toán.
                      </div>
                   ) : (
                      <>
                        <div className="flex justify-between items-center bg-[#F2FCFD]/50 p-4 rounded-2xl border border-[#BCE1E5]/20">
                           <span className="text-[14px] font-medium text-[#4A787C]">
                             Tiền phòng (Tháng {String(invoiceToPay.period_month).padStart(2, '0')}/{invoiceToPay.period_year})
                           </span>
                           <span className="text-[15px] font-bold text-[#0F3A40]">{formatMoney(invoiceToPay.rent_amount)}₫</span>
                        </div>
                        
                        <div className="px-4 space-y-4">
                           <div className="flex justify-between items-center text-[13.5px]">
                              <span className="text-[#82ABB0] font-medium">Điện</span>
                              <span className="text-[#0F3A40] font-bold">{formatMoney(invoiceToPay.electricity_amount)}₫</span>
                           </div>
                           <div className="flex justify-between items-center text-[13.5px]">
                              <span className="text-[#82ABB0] font-medium">Nước</span>
                              <span className="text-[#0F3A40] font-bold">{formatMoney(invoiceToPay.water_amount)}₫</span>
                           </div>
                           <div className="flex justify-between items-center text-[13.5px]">
                              <span className="text-[#82ABB0] font-medium">Dịch vụ khác (tổng)</span>
                              <span className="text-[#0F3A40] font-bold">{formatMoney(invoiceToPay.other_fees_amount)}₫</span>
                           </div>
                           {Array.isArray(invoiceDetail?.subscription_services) &&
                           invoiceDetail.subscription_services.length > 0 ? (
                              <div className="px-4 pt-1 pb-2 space-y-2 border-l-2 border-[#BCE1E5]/40 ml-1">
                                 {invoiceDetail.subscription_services.map((line, idx) => (
                                    <div key={`${line.source}-${line.service_id ?? line.fee_id}-${idx}`} className="flex justify-between text-[12.5px]">
                                       <span className="text-[#4A787C]">{line.service_name}</span>
                                       <span className="font-bold text-[#0F3A40]">{formatMoney(line.monthly_price)}₫</span>
                                    </div>
                                 ))}
                                 {Number(invoiceDetail.other_fees_manual || 0) > 0 ? (
                                    <div className="flex justify-between text-[12.5px]">
                                       <span className="text-[#4A787C]">Phí khác (thủ công)</span>
                                       <span className="font-bold text-[#0F3A40]">{formatMoney(invoiceDetail.other_fees_manual)}₫</span>
                                    </div>
                                 ) : null}
                              </div>
                           ) : null}
                        </div>

                        <div className="pt-8 border-t border-[#BCE1E5]/30">
                           <div className="flex justify-between items-end">
                              <div>
                                 <p className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-wider mb-1">TỔNG CỘNG</p>
                                 <h2 className="text-[32px] font-bold text-[#0F3A40]">{formatMoney(invoiceToPay.total_amount)}₫</h2>
                              </div>
                              {needsPayment && dueLabel ? (
                                <div className="bg-[#FFF3E0] text-[#E68A00] text-[10px] font-bold px-3 py-1.5 rounded-lg mb-2">
                                   HẠN: {dueLabel}
                                </div>
                              ) : isPaid ? (
                                <div className="bg-[#EBFDFB] text-[#14B8A6] text-[10px] font-bold px-3 py-1.5 rounded-lg mb-2">
                                   ĐÃ THANH TOÁN
                                </div>
                              ) : null}
                           </div>
                        </div>
                      </>
                   )}
                </div>
             </div>

             <div className="bg-white/40 rounded-[32px] p-8 border border-white/50 shadow-sm">
                <h4 className="text-[13px] font-bold text-[#82ABB0] uppercase tracking-widest mb-6">CỔNG THANH TOÁN KHÁC</h4>
                <div className="flex gap-4">
                   <button
                     type="button"
                     onClick={() => notifyThirdPartyGateway('VNPay')}
                     className="flex-1 bg-white hover:bg-[#F2FCFD] border border-[#BCE1E5]/30 p-4 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-3"
                   >
                      <div className="w-8 h-8 rounded-lg bg-[#E11D48]/10 flex items-center justify-center text-[#E11D48] text-[10px] font-extrabold italic uppercase">VNPay</div>
                      <span className="text-[13px] font-bold text-[#4A787C]">VNPay</span>
                   </button>
                   <button
                     type="button"
                     onClick={() => notifyThirdPartyGateway('MoMo')}
                     className="flex-1 bg-white hover:bg-[#F2FCFD] border border-[#BCE1E5]/30 p-4 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-3 text-pink-500"
                   >
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
                            src={qrUrl}
                            alt="QR Payment" 
                            className="w-full h-full p-2"
                         />
                         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-white/95 p-2 rounded-lg text-[#1E4D54] shadow-md">
                               <Sun className="w-6 h-6" strokeWidth={2.25} />
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
                         <h4 className="text-[16px] font-bold text-[#0F3A40]">NGUYEN MINH QUAN - THE SUN</h4>
                      </div>

                      <div className="bg-white/40 p-1.5 pl-5 rounded-2xl flex items-center justify-between border border-white">
                         <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-[#82ABB0] uppercase tracking-tight leading-none mb-1">NỘI DUNG CHUYỂN KHOẢN</span>
                            <span className="text-[14px] font-bold text-[#0F3A40]">{transferContent}</span>
                         </div>
                         <button 
                            onClick={() => handleCopy(transferContent)}
                            className="p-3 bg-white text-[#14B8A6] rounded-xl hover:bg-[#14B8A6] hover:text-white transition-all shadow-sm"
                         >
                            <Copy size={16} />
                         </button>
                      </div>

                      <button 
                        type="button"
                        onClick={handleDownloadQr}
                        disabled={isLoading}
                        className="w-full py-3.5 rounded-2xl bg-[#0F3A40] text-white font-bold text-[13.5px] hover:bg-[#1F545B] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                      handleFileChange(e.dataTransfer.files[0]);
                    }
                  }}
                >
                   <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e.target.files?.[0])} />
                   
                   {uploadedFile ? (
                      <div className="flex flex-col items-center">
                         <div className="w-16 h-16 rounded-2xl bg-[#EBFDFB] flex items-center justify-center text-[#14B8A6] mb-4">
                            <CheckCircle2 size={32} />
                         </div>
                         <p className="text-[14px] font-bold text-[#0F3A40] mb-1">{uploadedFile.name}</p>
                         <p className="text-[12px] text-[#82ABB0]">Đã sẵn sàng gửi admin duyệt</p>
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
                  disabled={!invoiceToPay || isPaid || isPendingApproval || isSubmitting}
                  className={`w-full mt-8 py-5 rounded-[24px] font-bold text-[16px] shadow-xl transition-all flex items-center justify-center gap-3 ${
                    !invoiceToPay || isPaid || isPendingApproval || isSubmitting
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed shadow-transparent'
                      : 'bg-[#0F3A40] hover:bg-[#1F545B] text-white shadow-[#0F3A40]/10'
                  }`}
                >
                   {isPaid ? 'Hóa đơn đã thanh toán'
                     : isPendingApproval ? 'Đang chờ admin xác nhận'
                     : isSubmitting ? 'Đang gửi minh chứng...'
                     : 'Gửi xác nhận thanh toán'} <Send size={18} />
                </button>

                {isPendingApproval ? (
                  <p className="text-center mt-4 text-[12px] font-semibold text-[#E68A00]">
                    Minh chứng đã gửi, vui lòng chờ admin duyệt để hóa đơn được xác thực thành công.
                  </p>
                ) : null}
                
                <p className="text-center mt-6 text-[11px] font-medium text-[#82ABB0] leading-relaxed max-w-[500px] mx-auto">
                   Bằng cách nhấn xác nhận, bạn đồng ý với các điều khoản thanh toán của The Sun. 
                   Giao dịch sẽ được xử lý trong vòng 2-4 giờ làm việc.
                </p>
             </div>
          </div>
       </div>
    </div>
  );
}
