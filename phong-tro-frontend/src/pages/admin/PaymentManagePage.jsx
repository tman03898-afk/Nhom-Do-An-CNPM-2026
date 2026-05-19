import { useEffect, useMemo, useRef, useState } from 'react';
import { Wallet, Image as ImageIcon, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiFetch, resolveBackendAssetUrl } from '../../lib/api';

function normalizePaymentStatus(s) {
   return String(s ?? '').trim().toUpperCase();
}

export default function PaymentManagePage() {
   const { token } = useAuth();
   const { addToast } = useToast();
   const [payments, setPayments] = useState([]);
   const [isLoading, setIsLoading] = useState(false);
   const [actionLoadingId, setActionLoadingId] = useState(null);
   const [previewImage, setPreviewImage] = useState('');
   const [reminderLoading, setReminderLoading] = useState(false);
   const recentTransactionsRef = useRef(null);

   const refresh = async () => {
      if (!token) return;
      setIsLoading(true);
      try {
         const data = await apiFetch('/admin/payments', { token });
         setPayments(data.payments || []);
      } catch (e) {
         setPayments([]);
      } finally {
         setIsLoading(false);
      }
   };

   useEffect(() => {
      refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [token]);

   const sendInvoiceDueReminders = async () => {
      if (!token) return;
      setReminderLoading(true);
      try {
         const data = await apiFetch('/admin/notifications/send-invoice-due-reminders', {
            token,
            method: 'POST',
            body: {},
         });
         const detail =
            data.sent > 0
               ? ` (${data.overdue ?? 0} quá hạn, ${data.dueSoon ?? 0} sắp đến hạn)`
               : '';
         addToast((data.message || 'Hoàn tất') + detail, 'success');
      } catch (e) {
         addToast(e.message || 'Gửi nhắc nợ thất bại', 'error');
      } finally {
         setReminderLoading(false);
      }
   };

   const pendingApprovals = useMemo(
      () =>
         payments
            .filter((p) => normalizePaymentStatus(p.status) === 'PENDING')
            .sort((a, b) => Number(b.payment_id || 0) - Number(a.payment_id || 0)),
      [payments]
   );

   /** Sau khi duyệt/từ chối: không còn PENDING → hiển thị ở “Giao dịch gần đây”, mới nhất trước. */
   const transactions = useMemo(() => {
      const list = payments.filter((p) => normalizePaymentStatus(p.status) !== 'PENDING');
      const sortKey = (p) => {
         const raw = p.paid_at || p.updated_at || p.created_at;
         const t = raw ? new Date(raw).getTime() : 0;
         return Number.isFinite(t) ? t : 0;
      };
      return [...list].sort((a, b) => sortKey(b) - sortKey(a));
   }, [payments]);

   const formatMoney = (value) => {
      const n = Number(value || 0);
      return Number.isFinite(n) ? n.toLocaleString('vi-VN') : '0';
   };

   const methodLabel = (m) => {
      const v = String(m || '').toUpperCase();
      if (v === 'BANK_TRANSFER') return 'Chuyển khoản';
      if (v === 'CASH') return 'Tiền mặt';
      if (v === 'ZALO_PAY') return 'ZaloPay';
      if (v === 'MOMO') return 'MoMo';
      return v || 'Khác';
   };

   const statusUi = (s) => {
      const v = String(s || '').toUpperCase();
      if (v === 'APPROVED') {
         return { label: 'APPROVED', pill: 'bg-[#EBFDFB] text-[#14B8A6]', dot: 'bg-[#14B8A6]' };
      }
      if (v === 'REJECTED') {
         return { label: 'REJECTED', pill: 'bg-[#FFF0F0] text-[#D14D4D]', dot: 'bg-[#D14D4D]' };
      }
      return { label: 'PENDING', pill: 'bg-[#FFF3E0] text-[#E68A00]', dot: 'bg-[#E68A00]' };
   };

   const handleApprove = async (paymentId) => {
      if (!token) return;
      setActionLoadingId(paymentId);
      try {
         await apiFetch(`/admin/payments/${paymentId}/approve`, { token, method: 'POST' });
         addToast('Đã duyệt thanh toán thành công!', 'success');
         await refresh();
         setTimeout(() => {
            recentTransactionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
         }, 350);
      } catch (e) {
         addToast(e?.message || 'Không thể duyệt thanh toán.', 'error');
      } finally {
         setActionLoadingId(null);
      }
   };

   const handleReject = async (paymentId) => {
      if (!token) return;
      setActionLoadingId(paymentId);
      try {
         await apiFetch(`/admin/payments/${paymentId}/reject`, { token, method: 'POST' });
         addToast('Đã từ chối thanh toán!', 'success');
         await refresh();
         setTimeout(() => {
            recentTransactionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
         }, 350);
      } catch (e) {
         addToast(e?.message || 'Không thể từ chối thanh toán.', 'error');
      } finally {
         setActionLoadingId(null);
      }
   };

   return (
      <div className="w-full max-w-[1200px] mx-auto mt-2 px-4 pb-32 relative flex flex-col gap-10">
         {/* Top Section: Pending Approvals */}
         <section>
            <div className="flex justify-between items-end mb-6 relative z-10">
               <div>
                  {/* <p className="text-[10px] font-bold text-[#14B8A6] uppercase tracking-widest mb-1.5 leading-none">Chờ xử lý</p> */}
                  <h1 className="text-[32px] font-sans font-bold text-[#0F3A40] tracking-tight leading-none">Duyệt thanh toán</h1>
               </div>
               <span className="text-[13px] font-medium text-[#4A787C]">
                  Hiện có <span className="font-bold text-[#14B8A6]">{pendingApprovals.length}</span> yêu cầu mới
               </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               {isLoading ? (
                  <div className="col-span-full bg-[#F2FCFD] rounded-[32px] p-8 border border-transparent text-[#4A787C] font-medium">
                     Đang tải dữ liệu thanh toán...
                  </div>
               ) : pendingApprovals.length === 0 ? (
                  <div className="col-span-full bg-[#F2FCFD] rounded-[32px] p-8 border border-transparent text-[#4A787C] font-medium">
                     Chưa có yêu cầu duyệt nào. Khách gửi minh chứng thanh toán sẽ hiển thị tại đây.
                  </div>
               ) : pendingApprovals.map((item) => (
                  <div key={item.payment_id} className="bg-[#F2FCFD] rounded-[32px] p-6 shadow-sm border border-transparent flex flex-col">
                     <div className="flex justify-between items-start mb-6">
                        <div className="w-10 h-10 rounded-[12px] bg-[#DDF5F7] flex items-center justify-center text-[#14B8A6]">
                           <Wallet className="w-5 h-5" />
                        </div>
                        <span className="bg-[#FFF3E0] text-[#E68A00] px-3 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase">
                           Pending
                        </span>
                     </div>

                     <div className="mb-6">
                        <h3 className="text-[18px] font-bold text-[#0F3A40]">{item.full_name || '—'}</h3>
                        <p className="text-[13px] text-[#4A787C] font-medium mt-1">
                           {item.room_number ? `Phòng ${item.room_number}` : '—'} &bull; HĐ #{item.invoice_id}
                        </p>
                     </div>

                     <div className="mb-6">
                        <h2 className="text-[28px] font-bold text-[#0F3A40] leading-none">
                           {formatMoney(item.amount)} <span className="text-[12px] text-[#4A787C] font-bold">VND</span>
                        </h2>
                     </div>

                     <button
                        type="button"
                        onClick={() => item.proof_url && setPreviewImage(String(item.proof_url))}
                        disabled={!item.proof_url}
                        className="w-full bg-white hover:bg-[#EBFDFB] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 py-3 rounded-2xl shadow-sm text-[13px] font-bold text-[#0F3A40] transition-colors mb-4 border border-[#BCE1E5]/30"
                     >
                        <ImageIcon className="w-4 h-4 text-[#14B8A6]" /> Minh chứng chuyển khoản
                     </button>

                     <div className="grid grid-cols-2 gap-3 mt-auto">
                        <button
                           type="button"
                           disabled={actionLoadingId === item.payment_id}
                           onClick={() => handleApprove(item.payment_id)}
                           className="bg-[#14B8A6] hover:bg-[#0da090] disabled:opacity-70 text-white py-2.5 rounded-full text-[13px] font-bold transition-colors shadow-md"
                        >
                           {actionLoadingId === item.payment_id ? 'Đang duyệt...' : 'Duyệt'}
                        </button>
                        <button
                           type="button"
                           disabled={actionLoadingId === item.payment_id}
                           onClick={() => handleReject(item.payment_id)}
                           className="bg-transparent border border-[#FFD9D9] hover:bg-[#FFF0F0] disabled:opacity-70 text-[#D14D4D] py-2.5 rounded-full text-[13px] font-bold transition-colors"
                        >
                           {actionLoadingId === item.payment_id ? 'Đang xử lý...' : 'Từ chối'}
                        </button>
                     </div>
                  </div>
               ))}
            </div>
         </section>

         {/* Middle Section: Recent Transactions */}
         <section ref={recentTransactionsRef} id="admin-recent-transactions">
            <div className="flex justify-between items-end mb-6 relative z-10">
               <div>
                  <p className="text-[10px] font-bold text-[#14B8A6] uppercase tracking-widest mb-1.5 leading-none">Lịch sử</p>
                  <h2 className="text-[28px] font-sans font-bold text-[#0F3A40] tracking-tight leading-none">Giao dịch gần đây</h2>
               </div>
               <button type="button" onClick={refresh} className="text-[13px] font-bold text-[#0F3A40] hover:text-[#14B8A6] transition-colors flex items-center gap-1.5">
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
                        {isLoading ? (
                           <tr>
                              <td colSpan={6} className="py-10 text-center text-[13px] font-medium text-[#4A787C]">
                                 Đang tải dữ liệu...
                              </td>
                           </tr>
                        ) : transactions.length === 0 ? (
                           <tr>
                              <td colSpan={6} className="py-10 text-center text-[13px] font-medium text-[#4A787C]">
                                 Chưa có giao dịch đã duyệt hoặc đã từ chối. Sau khi xử lý yêu cầu ở trên, giao dịch sẽ hiển thị tại đây.
                              </td>
                           </tr>
                        ) : transactions.map((tx) => {
                           const ui = statusUi(tx.status);
                           return (
                           <tr key={tx.payment_id} className="border-b border-[#BCE1E5]/40 last:border-0 hover:bg-white/50 transition-colors">
                              <td className="py-4 px-2">
                                 <span className="font-bold text-[#82ABB0] text-[13px]">#{tx.payment_id}</span>
                              </td>
                              <td className="py-4 px-2">
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#0F3A40] flex items-center justify-center overflow-hidden">
                                       <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(tx.full_name || 'Tenant')}&background=0F3A40&color=fff`} className="w-full h-full object-cover" alt="avatar" />
                                    </div>
                                    <div className="flex flex-col">
                                       <span className="font-bold text-[#0F3A40] text-[14px] leading-tight">{tx.full_name || '—'}</span>
                                       <span className="text-[11px] text-[#82ABB0] font-medium">{tx.room_number ? `Phòng ${tx.room_number}` : '—'}</span>
                                    </div>
                                 </div>
                              </td>
                              <td className="py-4 px-2">
                                 <span className="text-[#0F3A40] text-[14px] font-medium">
                                    {tx.paid_at ? new Date(tx.paid_at).toLocaleDateString('vi-VN') : '—'}
                                 </span>
                              </td>
                              <td className="py-4 px-2">
                                 <span className="font-bold text-[#0F3A40] text-[14px]">{formatMoney(tx.amount)}</span>
                              </td>
                              <td className="py-4 px-2">
                                 <div className="text-[13px] text-[#4A787C] font-medium leading-tight w-16">
                                    {methodLabel(tx.method)}
                                 </div>
                              </td>
                              <td className="py-4 px-2">
                                 <div className={`${ui.pill} inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase`}>
                                    <span className={`w-1 h-1 rounded-full ${ui.dot}`}></span>
                                    {ui.label}
                                 </div>
                              </td>
                           </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
            </div>
         </section>

         {/* Bottom Section: Revenue & Collection Status */}
         <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-2 mb-12">
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

               <button
                  type="button"
                  disabled={reminderLoading || !token}
                  onClick={sendInvoiceDueReminders}
                  className="w-full bg-white hover:bg-[#F2FCFD] disabled:opacity-60 disabled:cursor-not-allowed text-[#0F3A40] py-4 rounded-2xl text-[14px] font-bold transition-colors mt-12 shadow-md"
               >
                  {reminderLoading ? 'Đang gửi…' : 'Gửi nhắc nợ tự động'}
               </button>
            </div>
         </section>
         {previewImage ? (
            <div
               className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
               onClick={() => setPreviewImage('')}
            >
               <div
                  className="bg-white rounded-2xl p-3 max-w-3xl w-full shadow-xl"
                  onClick={(e) => e.stopPropagation()}
               >
                  <img
                     src={resolveBackendAssetUrl(previewImage)}
                     alt="Minh chứng thanh toán"
                     className="w-full max-h-[80vh] object-contain rounded-xl"
                  />
                  <button
                     type="button"
                     onClick={() => setPreviewImage('')}
                     className="mt-3 w-full py-2.5 rounded-xl bg-[#0F3A40] text-white font-bold text-sm hover:bg-[#1F545B]"
                  >
                     Đóng xem ảnh
                  </button>
               </div>
            </div>
         ) : null}
      </div>
   );
}
