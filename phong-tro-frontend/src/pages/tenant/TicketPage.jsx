import { useEffect, useMemo, useState, useRef } from 'react';
import {
   Upload, Send,
   PhoneCall,
   Image as ImageIcon, X, SearchX, Search, Loader2
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { apiFetch, API_BASE_URL, resolveBackendAssetUrl } from '../../lib/api';

const MAX_FILES = 5;
const MAX_MB = 5;

function statusVi(s) {
   const u = String(s || '').toUpperCase();
   if (u === 'OPEN') return 'CHỜ XỬ LÝ';
   if (u === 'IN_PROGRESS') return 'ĐANG XỬ LÝ';
   if (u === 'RESOLVED') return 'ĐÃ XỬ LÝ';
   if (u === 'CLOSED') return 'ĐÃ ĐÓNG';
   return u || '—';
}

function statusColor(s) {
   const u = String(s || '').toUpperCase();
   if (u === 'OPEN') return 'bg-[#F5F5F5] text-[#82ABB0]';
   if (u === 'IN_PROGRESS') return 'bg-[#FFF3E0] text-[#E68A00]';
   if (u === 'RESOLVED' || u === 'CLOSED') return 'bg-[#EBFDFB] text-[#14B8A6]';
   return 'bg-[#F5F5F5] text-[#82ABB0]';
}

export default function TenantTicketPage() {
   const [searchQuery, setSearchQuery] = useState('');
   const { addToast } = useToast();
   const { token } = useAuth();
   const [tenantProfile, setTenantProfile] = useState(null);
   const [dragActive, setDragActive] = useState(false);
   const [title, setTitle] = useState('');
   const [desc, setDesc] = useState('');
   const [history, setHistory] = useState([]);
   const [loadingHistory, setLoadingHistory] = useState(true);
   const [isSubmitting, setIsSubmitting] = useState(false);
   /** { id: string, file: File, preview: string } */
   const [attachments, setAttachments] = useState([]);
   const fileInputRef = useRef(null);

   const refreshHistory = async () => {
      if (!token) return;
      setLoadingHistory(true);
      try {
         const data = await apiFetch('/tenant/tickets', { token });
         const rows = data.tickets || [];
         setHistory(rows);
      } catch {
         setHistory([]);
      } finally {
         setLoadingHistory(false);
      }
   };

   useEffect(() => {
      const fetchTenant = async () => {
         if (!token) return;
         try {
            const data = await apiFetch('/tenant/me', { token });
            setTenantProfile(data.tenant || null);
         } catch {
            setTenantProfile(null);
         }
      };
      fetchTenant();
   }, [token]);

   useEffect(() => {
      refreshHistory();
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [token]);

   useEffect(() => {
      return () => {
         attachments.forEach((a) => {
            if (a.preview?.startsWith('blob:')) URL.revokeObjectURL(a.preview);
         });
      };
   }, [attachments]);

   const roomLabel = useMemo(() => {
      if (tenantProfile?.room_number) return `Phòng ${tenantProfile.room_number}`;
      return '—';
   }, [tenantProfile]);

   const addFiles = (fileList) => {
      const incoming = Array.from(fileList || []).filter((f) => String(f.type || '').startsWith('image/'));
      if (!incoming.length) {
         addToast('Chỉ chấp nhận file ảnh (JPG, PNG…)', 'error');
         return;
      }
      setAttachments((prev) => {
         const next = [...prev];
         for (const file of incoming) {
            if (next.length >= MAX_FILES) {
               addToast(`Tối đa ${MAX_FILES} ảnh.`, 'error');
               break;
            }
            if (file.size > MAX_MB * 1024 * 1024) {
               addToast(`Ảnh "${file.name}" vượt quá ${MAX_MB}MB.`, 'error');
               continue;
            }
            next.push({
               id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
               file,
               preview: URL.createObjectURL(file),
            });
         }
         return next;
      });
   };

   const removeAttachment = (id) => {
      setAttachments((prev) => {
         const item = prev.find((a) => a.id === id);
         if (item?.preview?.startsWith('blob:')) URL.revokeObjectURL(item.preview);
         return prev.filter((a) => a.id !== id);
      });
   };

   const filteredHistory = useMemo(() => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return history;
      return history.filter((item) => {
         const hay = `${item.title || ''} ${item.description || ''} ${item.status || ''}`.toLowerCase();
         return hay.includes(q);
      });
   }, [history, searchQuery]);

   const handleSubmit = async (e) => {
      e.preventDefault();
      if (!token) return;
      if (!title.trim() || !desc.trim()) {
         addToast('Vui lòng điền đầy đủ tiêu đề và mô tả!', 'error');
         return;
      }

      setIsSubmitting(true);
      try {
         let attachment_urls = [];
         if (attachments.length > 0) {
            const formData = new FormData();
            attachments.forEach((a) => formData.append('images', a.file));
            const uploadRes = await fetch(`${API_BASE_URL}/tenant/tickets/upload`, {
               method: 'POST',
               headers: { Authorization: `Bearer ${token}` },
               body: formData,
            });
            const uploadJson = await uploadRes.json().catch(() => ({}));
            if (!uploadRes.ok || !uploadJson?.ok) {
               throw new Error(uploadJson?.message || 'Không thể tải ảnh lên');
            }
            attachment_urls = uploadJson.file_urls || [];
         }

         await apiFetch('/tenant/tickets', {
            token,
            method: 'POST',
            body: {
               title: title.trim(),
               description: desc.trim(),
               room_id: tenantProfile?.room_id ?? null,
               priority: 'MEDIUM',
               attachment_urls,
            },
         });

         attachments.forEach((a) => {
            if (a.preview?.startsWith('blob:')) URL.revokeObjectURL(a.preview);
         });
         setAttachments([]);
         setTitle('');
         setDesc('');
         addToast('Gửi yêu cầu thành công! Đội ngũ kỹ thuật sẽ sớm phản hồi.');
         await refreshHistory();
      } catch (err) {
         addToast(err?.message || 'Gửi yêu cầu thất bại.', 'error');
      } finally {
         setIsSubmitting(false);
      }
   };

   return (
      <div className="flex flex-col gap-8 pb-10">
         {/* Header */}
         <div>
            <h1 className="text-[34px] font-sans font-bold text-[#0F3A40] tracking-tight">Yêu cầu sửa chữa</h1>
            <p className="text-[14.5px] text-[#4A787C] font-medium mt-2 max-w-[600px]">
               Chúng tôi luôn sẵn sàng hỗ trợ bạn. Vui lòng cung cấp chi tiết sự cố để đội ngũ kỹ thuật xử lý nhanh nhất có thể.
            </p>
         </div>

         <div className="flex flex-col lg:flex-row gap-10">
            {/* Form Section (Left) */}
            <div className="flex-1 bg-white/60 backdrop-blur-md rounded-[40px] p-10 border border-white shadow-sm h-fit">
               <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="space-y-3">
                     <label className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-widest pl-2">TIÊU ĐỀ SỰ CỐ</label>
                     <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ví dụ: Vòi nước bị rò rỉ"
                        className="w-full bg-[#F2FCFD] border border-[#BCE1E5]/40 rounded-2xl px-6 py-4 text-[14px] outline-none focus:border-[#14B8A6]/30 transition-all text-[#0F3A40] font-medium"
                     />
                  </div>

                  <div className="space-y-3">
                     <label className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-widest pl-2">MÔ TẢ CHI TIẾT</label>
                     <textarea
                        rows={5}
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        placeholder="Mô tả cụ thể tình trạng và vị trí sự cố..."
                        className="w-full bg-[#F2FCFD] border border-[#BCE1E5]/40 rounded-3xl px-6 py-4 text-[14px] outline-none focus:border-[#14B8A6]/30 transition-all text-[#0F3A40] font-medium resize-none"
                     />
                  </div>

                  <div className="space-y-3">
                     <label className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-widest pl-2">
                        HÌNH ẢNH ĐÍNH KÈM ({attachments.length}/{MAX_FILES})
                     </label>
                     <div
                        className={`relative min-h-[160px] rounded-[32px] border-2 border-dashed transition-all flex flex-col items-center justify-center bg-[#F2FCFD]/40 p-4 ${dragActive ? 'border-[#14B8A6] bg-[#EAF7F8]' : 'border-[#BCE1E5]/50 hover:border-[#14B8A6]/50'
                           }`}
                        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={(e) => {
                           e.preventDefault();
                           setDragActive(false);
                           addFiles(e.dataTransfer.files);
                        }}
                     >
                        <input
                           ref={fileInputRef}
                           type="file"
                           accept="image/jpeg,image/png,image/gif,image/webp"
                           multiple
                           className="absolute inset-0 opacity-0 cursor-pointer z-10"
                           onChange={(e) => {
                              addFiles(e.target.files);
                              e.target.value = '';
                           }}
                        />
                        {attachments.length === 0 ? (
                           <>
                              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-[#14B8A6] shadow-sm mb-4 pointer-events-none">
                                 <Upload size={24} />
                              </div>
                              <p className="text-[14px] font-bold text-[#0F3A40] mb-1 pointer-events-none">
                                 Kéo thả ảnh hoặc <span className="text-[#14B8A6] underline">chọn tệp</span>
                              </p>
                              <p className="text-[11px] text-[#82ABB0] font-medium pointer-events-none">JPG, PNG, GIF, WebP — tối đa {MAX_FILES} ảnh, mỗi ảnh ≤ {MAX_MB}MB</p>
                           </>
                        ) : (
                           <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                              {attachments.map((a) => (
                                 <div key={a.id} className="relative aspect-square rounded-2xl overflow-hidden border border-[#BCE1E5]/50 bg-white group/img">
                                    <img src={a.preview} alt="" className="w-full h-full object-cover" />
                                    <button
                                       type="button"
                                       onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); removeAttachment(a.id); }}
                                       className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-500 transition-colors z-20"
                                       aria-label="Xóa ảnh"
                                    >
                                       <X size={16} />
                                    </button>
                                 </div>
                              ))}
                              {attachments.length < MAX_FILES ? (
                                 <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square rounded-2xl border-2 border-dashed border-[#BCE1E5] flex flex-col items-center justify-center text-[#82ABB0] hover:border-[#14B8A6] hover:text-[#14B8A6] transition-colors text-[12px] font-bold gap-1 z-20"
                                 >
                                    <ImageIcon size={22} /> Thêm ảnh
                                 </button>
                              ) : null}
                           </div>
                        )}
                     </div>
                  </div>

                  <button
                     type="submit"
                     disabled={isSubmitting}
                     className="w-full py-5 rounded-[24px] bg-[#0F3A40] hover:bg-[#1F545B] disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold text-[16px] shadow-xl shadow-[#0F3A40]/10 transition-all flex items-center justify-center gap-3"
                  >
                     {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                     {isSubmitting ? 'Đang gửi…' : 'Gửi yêu cầu'}
                  </button>
               </form>
            </div>

            {/* History & Support (Right) */}
            <div className="w-full lg:w-[420px] flex flex-col gap-10">
               {/* History List */}
               <div className="flex flex-col gap-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                     <h3 className="text-xl font-bold text-[#0F3A40]">Lịch sử báo cáo</h3>

                     <div className="relative w-full md:w-[200px] group">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#82ABB0] group-focus-within:text-[#14B8A6] transition-colors" />
                        <input
                           type="text"
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           placeholder="Tìm sự cố..."
                           className="w-full bg-white/80 border border-[#BCE1E5]/40 rounded-2xl pl-10 pr-8 py-2 text-[12px] outline-none focus:border-[#14B8A6]/30 transition-all font-bold text-[#0F3A40]"
                        />
                        {searchQuery && (
                           <button
                              type="button"
                              onClick={() => setSearchQuery('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#82ABB0] hover:text-[#D14D4D] transition-colors"
                           >
                              <X size={12} />
                           </button>
                        )}
                     </div>
                  </div>

                  <div className="space-y-4">
                     {loadingHistory ? (
                        <p className="text-[13px] text-[#82ABB0] font-medium py-8 text-center">Đang tải lịch sử…</p>
                     ) : filteredHistory.length > 0 ? (
                        filteredHistory.map((item) => {
                           const urls = Array.isArray(item.attachment_urls)
                              ? item.attachment_urls
                              : typeof item.attachment_urls === 'string'
                                 ? (() => {
                                    try {
                                       return JSON.parse(item.attachment_urls);
                                    } catch {
                                       return [];
                                    }
                                 })()
                                 : [];
                           const imgs = Array.isArray(urls) ? urls.slice(0, 3) : [];
                           return (
                              <div key={item.incident_id} className="bg-white/60 backdrop-blur-md p-6 rounded-[32px] border border-white shadow-sm group hover:scale-[1.02] transition-all cursor-pointer">
                                 <div className="flex justify-between items-start mb-4">
                                    <h4 className="text-[15px] font-bold text-[#0F3A40]">{item.title}</h4>
                                    <span className={`${statusColor(item.status)} text-[9px] font-extrabold px-3 py-1 rounded-full tracking-wider uppercase`}>
                                       {statusVi(item.status)}
                                    </span>
                                 </div>
                                 <div className="flex items-center gap-3 text-[12px] text-[#82ABB0] font-medium mb-3">
                                    <span>{item.room_number ? `Phòng ${item.room_number}` : roomLabel}</span>
                                    <div className="w-1 h-1 rounded-full bg-[#BCE1E5]" />
                                    <span>
                                       {item.created_at
                                          ? new Date(item.created_at).toLocaleDateString('vi-VN')
                                          : '—'}
                                    </span>
                                 </div>
                                 <p className="text-[13px] text-[#4A787C] font-medium leading-relaxed italic mb-3">
                                    {item.description || '—'}
                                 </p>
                                 {imgs.length > 0 ? (
                                    <div className="flex gap-2 flex-wrap">
                                       {imgs.map((u, i) => (
                                          <img
                                             key={i}
                                             src={resolveBackendAssetUrl(u)}
                                             alt=""
                                             className="w-16 h-16 rounded-xl object-cover border border-[#BCE1E5]/40"
                                          />
                                       ))}
                                    </div>
                                 ) : null}
                              </div>
                           );
                        })
                     ) : (
                        <div className="flex flex-col items-center justify-center py-10 bg-white/40 rounded-[32px] border border-white/50 text-center">
                           <div className="w-16 h-16 rounded-full bg-[#F2FCFD] flex items-center justify-center text-[#82ABB0] mb-4">
                              <SearchX size={32} />
                           </div>
                           <p className="text-[15px] font-bold text-[#0F3A40]">
                              {history.length === 0 ? 'Chưa có báo cáo nào' : 'Không tìm thấy báo cáo nào'}
                           </p>
                           <p className="text-[13px] text-[#82ABB0] mt-1">Thử tìm kiếm với nội dung khác</p>
                        </div>
                     )}
                  </div>
               </div>
               {/* Support Visual Card */}
               <div className="bg-[#0F3A40] rounded-[40px] overflow-hidden shadow-xl group">
                  <div className="h-[220px] relative">
                     <img
                        src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=800"
                        alt="Technicians"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-60"
                     />
                     <div className="absolute inset-0 bg-gradient-to-t from-[#0F3A40] to-transparent" />
                     <div className="absolute inset-x-0 bottom-0 p-8 flex flex-col gap-2">
                        <h3 className="text-[22px] font-bold text-white">Hỗ trợ 24/7</h3>
                        <p className="text-white/70 text-[13px] leading-relaxed">
                           Đội ngũ kỹ thuật luôn túc trực để đảm bảo không gian sống của bạn tốt nhất.
                        </p>
                     </div>
                  </div>
                  <div className="p-8 pt-0">
                     <button type="button" className="w-full py-4 rounded-3xl bg-[#14B8A6] hover:bg-[#109284] text-white font-bold text-[14px] shadow-lg shadow-[#14B8A6]/20 transition-all flex items-center justify-center gap-3">
                        <PhoneCall size={18} className="fill-current" /> Gọi hỗ trợ gấp
                     </button>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}
