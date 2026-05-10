import { useEffect, useState } from 'react';
import { Bell, Zap, Package, CreditCard, MessageSquare, ChevronRight, SearchX, Search, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';

export default function TenantNotificationPage() {
   const { token } = useAuth();
   const [searchQuery, setSearchQuery] = useState('');
   const [notifications, setNotifications] = useState([]);
   const [isLoading, setIsLoading] = useState(false);

   const fetchNotifications = async () => {
      if (!token) return;
      setIsLoading(true);
      try {
         const data = await apiFetch('/tenant/notifications', { token });
         setNotifications(data.notifications || []);
      } catch (e) {
         setNotifications([]);
      } finally {
         setIsLoading(false);
      }
   };

   useEffect(() => {
      fetchNotifications();
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [token]);

   const filteredNotifications = notifications
      .map((n) => ({
         id: n.notification_id,
         title: n.title,
         desc: n.body || '',
         time: n.created_at ? new Date(n.created_at).toLocaleString('vi-VN') : '',
         isNew: !n.is_read,
      }))
      .filter((n) =>
         n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
         n.desc.toLowerCase().includes(searchQuery.toLowerCase())
      );

   const markRead = async (id) => {
      if (!token) return;
      try {
         await apiFetch(`/tenant/notifications/${id}/read`, { token, method: 'POST' });
      } catch (e) {}
      await fetchNotifications();
   };

   return (
      <div className="flex flex-col gap-8 pb-10">
         <div>
            <h1 className="text-[34px] font-sans font-bold text-[#0F3A40] tracking-tight">Thông báo</h1>
            <p className="text-[14.5px] text-[#4A787C] font-medium mt-2">Cập nhật những tin tức mới nhất từ ban quản lý tòa nhà.</p>
         </div>

         <div className="bg-white/60 backdrop-blur-md rounded-[40px] p-6 border border-white shadow-sm overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 p-4 border-b border-[#BCE1E5]/30 mb-4">
               <div className="flex gap-4">
                  <button className="px-6 py-2 rounded-full bg-[#0F3A40] text-white text-[13px] font-bold shadow-lg shadow-[#0F3A40]/10">Tất cả</button>
                  <button className="px-6 py-2 rounded-full text-[#4A787C] hover:bg-[#F2FCFD] text-[13px] font-bold transition-all">Chưa đọc</button>
                  <button className="px-6 py-2 rounded-full text-[#4A787C] hover:bg-[#F2FCFD] text-[13px] font-bold transition-all">Quản lý</button>
               </div>

               {/* Local Search Bar */}
               <div className="relative w-full md:w-[280px] group">
                  <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#82ABB0] group-focus-within:text-[#14B8A6] transition-colors" />
                  <input
                     type="text"
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     placeholder="Tìm kiếm thông báo..."
                     className="w-full bg-[#F2FCFD] border border-[#BCE1E5]/40 rounded-2xl pl-12 pr-12 py-2.5 text-[13px] outline-none focus:border-[#14B8A6]/30 transition-all font-bold text-[#0F3A40]"
                  />
                  {searchQuery && (
                     <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-[#82ABB0] hover:text-[#D14D4D] transition-colors"
                     >
                        <X size={14} />
                     </button>
                  )}
               </div>
            </div>

            <div className="space-y-2">
               {isLoading ? (
                  <div className="py-10 text-center text-[13px] font-medium text-[#4A787C]">Đang tải thông báo...</div>
               ) : filteredNotifications.length > 0 ? (
                  filteredNotifications.map((n) => (
                     <div key={n.id} onClick={() => markRead(n.id)} className={`flex items-center gap-6 p-6 rounded-[32px] transition-all cursor-pointer group ${n.isNew ? 'bg-white/80' : 'hover:bg-[#F2FCFD]/40'}`}>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${n.isNew ? 'bg-yellow-100 text-yellow-600' : 'bg-slate-100 text-slate-500'} group-hover:scale-110 transition-transform`}>
                           <Zap size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-3 mb-1">
                              <h4 className={`text-[15px] font-bold text-[#0F3A40] ${n.isNew ? '' : 'opacity-70'}`}>{n.title}</h4>
                              {n.isNew && <div className="w-2 h-2 rounded-full bg-[#14B8A6] shadow-[0_0_8px_rgba(20,184,166,0.5)]"></div>}
                           </div>
                           <p className="text-[13.5px] text-[#4A787C] font-medium truncate">{n.desc}</p>
                        </div>
                        <div className="text-right shrink-0">
                           <p className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-tighter mb-2">{n.time}</p>
                           <ChevronRight size={16} className="text-[#BCE1E5] group-hover:text-[#14B8A6] group-hover:translate-x-1 transition-all inline-block" />
                        </div>
                     </div>
                  ))
               ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                     <div className="w-16 h-16 rounded-full bg-[#F2FCFD] flex items-center justify-center text-[#82ABB0] mb-4">
                        <SearchX size={32} />
                     </div>
                     <p className="text-[15px] font-bold text-[#0F3A40]">Không tìm thấy thông báo nào</p>
                     <p className="text-[13px] text-[#82ABB0] mt-1">Vui lòng thử từ khóa khác</p>
                  </div>
               )}
            </div>
         </div>
      </div>
   );
}
