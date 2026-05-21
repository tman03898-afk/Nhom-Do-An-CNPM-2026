import { useEffect, useMemo, useState } from 'react';
import {
   ClipboardList, Download, MessageSquare,
   ShieldCheck,
   Home, ChevronRight, SearchX, Search, X, Eye,
   Package, Ruler, Layers, Users, Phone
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/api';
import { SUPPORT_HOTLINE, contactHotline, contactZalo } from '../../lib/supportContact';
import { parseContractNotesToRules } from '../../lib/contractRules';
import { RoomHeroPanel } from '../../lib/roomHero';

function formatDate(value) {
   if (!value) return '—';
   const date = new Date(value);
   if (Number.isNaN(date.getTime())) return '—';
   return date.toLocaleDateString('vi-VN');
}

function formatMoney(value) {
   if (value === null || value === undefined) return '—';
   const num = Number(value);
   if (Number.isNaN(num)) return '—';
   return `${num.toLocaleString('vi-VN')}đ`;
}

function formatArea(value) {
   if (value === null || value === undefined) return '—';
   const num = Number(value);
   if (Number.isNaN(num)) return '—';
   return `${num.toLocaleString('vi-VN')} m²`;
}

function roomStatusLabel(status) {
   if (status === 'AVAILABLE') return 'Còn trống';
   if (status === 'RENTED') return 'Đang cho thuê';
   if (status === 'MAINTENANCE') return 'Đang bảo trì';
   return status || '—';
}

function assetStatusLabel(status) {
   if (status === 'OK') return 'Tốt';
   if (status === 'BROKEN') return 'Hỏng';
   if (status === 'MAINTENANCE') return 'Bảo trì';
   if (status === 'LOST') return 'Mất';
   return status || '—';
}

function assetStatusClass(status) {
   if (status === 'OK') return 'bg-[#EBFDFB] text-[#14B8A6] border-[#14B8A6]/20';
   if (status === 'BROKEN') return 'bg-[#FFF0F0] text-[#D14D4D] border-[#D14D4D]/20';
   if (status === 'MAINTENANCE') return 'bg-[#FFF8E6] text-[#E68A00] border-[#E68A00]/20';
   if (status === 'LOST') return 'bg-slate-100 text-slate-600 border-slate-200';
   return 'bg-slate-100 text-slate-600 border-slate-200';
}

function RoomAndAssetsSection({ room, assets, roomNumber, roomArea, roomFloor, roomDescription, roomPrice }) {
   return (
      <div className="flex flex-col gap-8">
         <div className="bg-white/60 backdrop-blur-md rounded-[40px] p-8 lg:p-10 border border-white shadow-sm">
            <div className="flex items-center gap-4 mb-8">
               <div className="w-14 h-14 rounded-[22px] bg-[#EAF7F8] flex items-center justify-center text-[#14B8A6]">
                  <Home size={28} />
               </div>
               <div>
                  <p className="text-[10px] font-extrabold text-[#82ABB0] uppercase tracking-widest">Phòng của bạn</p>
                  <h2 className="text-[26px] font-bold text-[#0F3A40]">{roomNumber}</h2>
                  <p className="text-[13px] text-[#82ABB0] font-medium mt-0.5">{roomStatusLabel(room?.status)}</p>
               </div>
            </div>

            {!room ? (
               <p className="text-[#82ABB0] text-center py-10 text-[14px]">
                  Chưa gán phòng hoặc chưa có dữ liệu phòng. Vui lòng liên hệ ban quản lý.
               </p>
            ) : (
               <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                     <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-[#F2FCFD]/80 border border-[#BCE1E5]/30">
                        <p className="text-[10px] font-extrabold text-[#82ABB0] uppercase tracking-widest flex items-center gap-1">
                           <Ruler size={12} /> Diện tích
                        </p>
                        <p className="text-[17px] font-bold text-[#0F3A40]">{roomArea}</p>
                     </div>
                     <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-[#F2FCFD]/80 border border-[#BCE1E5]/30">
                        <p className="text-[10px] font-extrabold text-[#82ABB0] uppercase tracking-widest flex items-center gap-1">
                           <Layers size={12} /> Tầng
                        </p>
                        <p className="text-[17px] font-bold text-[#0F3A40]">{roomFloor}</p>
                     </div>
                     <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-[#F2FCFD]/80 border border-[#BCE1E5]/30">
                        <p className="text-[10px] font-extrabold text-[#82ABB0] uppercase tracking-widest flex items-center gap-1">
                           <Users size={12} /> Tối đa
                        </p>
                        <p className="text-[17px] font-bold text-[#0F3A40]">{room.max_tenants ?? '—'} người</p>
                     </div>
                     <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-[#F2FCFD]/80 border border-[#BCE1E5]/30">
                        <p className="text-[10px] font-extrabold text-[#82ABB0] uppercase tracking-widest">Giá niêm yết</p>
                        <p className="text-[17px] font-bold text-[#14B8A6]">{roomPrice}</p>
                     </div>
                  </div>
                  <div className="rounded-3xl bg-[#F2FCFD]/60 border border-[#BCE1E5]/30 p-6">
                     <p className="text-[10px] font-extrabold text-[#82ABB0] uppercase tracking-widest mb-3">Mô tả phòng</p>
                     <p className="text-[14px] text-[#4A787C] leading-relaxed whitespace-pre-wrap">{roomDescription}</p>
                  </div>
               </>
            )}
         </div>

         <div className="bg-white/60 backdrop-blur-md rounded-[40px] p-8 lg:p-10 border border-white shadow-sm">
            <div className="flex items-center gap-4 mb-8">
               <div className="w-12 h-12 rounded-2xl bg-[#EAF7F8] flex items-center justify-center text-[#14B8A6]">
                  <Package size={22} />
               </div>
               <div>
                  <h3 className="text-xl font-bold text-[#0F3A40]">Tài sản bàn giao</h3>
                  <p className="text-[13px] text-[#82ABB0] font-medium">Nội thất và thiết bị kèm theo phòng {roomNumber}</p>
               </div>
            </div>

            {assets.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#F2FCFD] flex items-center justify-center text-[#82ABB0] mb-4">
                     <Package size={32} />
                  </div>
                  <p className="text-[15px] font-bold text-[#0F3A40]">Chưa có tài sản bàn giao</p>
                  <p className="text-[13px] text-[#82ABB0] mt-1 max-w-sm">
                     Ban quản lý sẽ cập nhật danh sách khi bàn giao phòng.
                  </p>
               </div>
            ) : (
               <div className="overflow-x-auto -mx-2">
                  <table className="w-full min-w-[520px] text-left text-[14px]">
                     <thead>
                        <tr className="text-[10px] font-extrabold text-[#82ABB0] uppercase tracking-widest border-b border-[#BCE1E5]/40">
                           <th className="pb-4 px-3">Tên tài sản</th>
                           <th className="pb-4 px-3 text-center">SL</th>
                           <th className="pb-4 px-3">Trạng thái</th>
                           <th className="pb-4 px-3">Ghi chú</th>
                        </tr>
                     </thead>
                     <tbody>
                        {assets.map((a) => (
                           <tr key={a.asset_id} className="border-b border-[#BCE1E5]/20 last:border-0">
                              <td className="py-4 px-3 font-bold text-[#0F3A40]">{a.name}</td>
                              <td className="py-4 px-3 text-center font-semibold text-[#4A787C]">{a.quantity ?? 1}</td>
                              <td className="py-4 px-3">
                                 <span className={`inline-flex px-3 py-1 rounded-full text-[11px] font-extrabold border ${assetStatusClass(a.status)}`}>
                                    {assetStatusLabel(a.status)}
                                 </span>
                              </td>
                              <td className="py-4 px-3 text-[#4A787C]">{a.note?.trim() || '—'}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}
         </div>
      </div>
   );
}

export default function ContractPage() {
   const [searchQuery, setSearchQuery] = useState('');
   const { token } = useAuth();
   const { addToast } = useToast();
   const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
   const [tenantProfile, setTenantProfile] = useState(null);
   const [contract, setContract] = useState(null);
   const [room, setRoom] = useState(null);
   const [assets, setAssets] = useState([]);
   const [activeTab, setActiveTab] = useState('contract');
   const [detailOpen, setDetailOpen] = useState(false);
   const [contactOpen, setContactOpen] = useState(false);
   const [pdfBusy, setPdfBusy] = useState(false);

   useEffect(() => {
      const fetchTenant = async () => {
         if (!token) return;
         try {
            const response = await fetch(`${API_BASE_URL}/tenant/me`, {
               headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok && data?.ok) setTenantProfile(data.tenant);
         } catch {
            setTenantProfile(null);
         }
      };
      fetchTenant();
   }, [API_BASE_URL, token]);

   useEffect(() => {
      const fetchContractContext = async () => {
         if (!token) return;
         try {
            const [contractData, assetsData] = await Promise.all([
               apiFetch('/tenant/contract', { token }),
               apiFetch('/tenant/assets', { token }),
            ]);
            setContract(contractData?.contract || null);
            setRoom(contractData?.room || null);
            setAssets(assetsData?.assets || []);
         } catch {
            setContract(null);
            setRoom(null);
            setAssets([]);
         }
      };
      fetchContractContext();
   }, [token]);

   const roomNumber = useMemo(
      () => room?.room_number || contract?.room_number || tenantProfile?.room_number || '—',
      [room, contract, tenantProfile]
   );
   const roomArea = useMemo(() => formatArea(room?.area), [room]);
   const roomFloor = useMemo(() => {
      if (room?.floor === null || room?.floor === undefined) return '—';
      return `Tầng ${room.floor}`;
   }, [room]);
   const roomDescription = useMemo(
      () => (room?.description && String(room.description).trim()) || 'Chưa có mô tả phòng.',
      [room]
   );
   const roomPrice = useMemo(() => formatMoney(room?.price), [room]);
   const startDate = useMemo(() => formatDate(contract?.start_date), [contract]);
   const endDate = useMemo(() => formatDate(contract?.end_date), [contract]);
   const rentPrice = useMemo(() => formatMoney(contract?.rent_price), [contract]);
   const deposit = useMemo(() => formatMoney(contract?.deposit), [contract]);
   const contractStatus = useMemo(() => {
      const status = contract?.status;
      if (!status) return 'Đang cập nhật';
      if (status === 'ACTIVE') return 'Đang hiệu lực';
      if (status === 'EXPIRED') return 'Hết hạn';
      if (status === 'TERMINATED') return 'Đã thanh lý';
      return status;
   }, [contract]);
   const rules = useMemo(() => parseContractNotesToRules(contract?.notes), [contract?.notes]);

   const filteredRules = rules.filter((rule) =>
      rule.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      rule.desc.toLowerCase().includes(searchQuery.toLowerCase())
   );

   const handleOpenZalo = () => {
      if (contactZalo(addToast)) setContactOpen(false);
   };

   const handleCallHotline = () => {
      if (contactHotline(addToast)) setContactOpen(false);
   };

   const handleDownloadPdf = async () => {
      if (!contract) {
         addToast('Chưa có hợp đồng để tải PDF.', 'error');
         return;
      }
      setPdfBusy(true);
      try {
         const { exportContractPdf } = await import('../../lib/exportContractPdf');
         const ok = exportContractPdf({
            contract,
            room,
            assets,
            tenant: tenantProfile,
            rules,
         });
         if (ok) addToast('Đã tải file PDF hợp đồng.', 'success');
         else addToast('Không xuất được PDF hợp đồng.', 'error');
      } catch (err) {
         console.error('Export contract PDF:', err);
         addToast('Không xuất được PDF hợp đồng.', 'error');
      } finally {
         setPdfBusy(false);
      }
   };

   return (
      <div className="flex flex-col gap-8 pb-10">
         {/* Header */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
               {/* <p className="text-[11px] font-bold text-[#14B8A6] uppercase tracking-widest mb-1.5">QUẢN LÝ THUÊ NHÀ</p> */}
               <h1 className="text-[34px] font-sans font-bold text-[#0F3A40] tracking-tight">Hợp đồng thuê nhà</h1>
            </div>
            <div className="flex flex-wrap gap-4">
               <button
                  type="button"
                  onClick={() => setDetailOpen(true)}
                  disabled={!contract}
                  className="bg-white/80 hover:bg-white text-[#0F3A40] border border-[#BCE1E5] px-6 py-3 rounded-full text-[14px] font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Xem chi tiết hợp đồng"
               >
                  <Eye size={18} /> Chi tiết
               </button>
               <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={!contract || pdfBusy}
                  className="bg-[#0F3A40] hover:bg-[#1F545B] text-white px-6 py-3 rounded-full text-[14px] font-bold shadow-lg shadow-[#0F3A40]/10 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Tải hợp đồng dạng PDF"
               >
                  <Download size={18} /> {pdfBusy ? 'Đang tạo PDF...' : 'Tải PDF'}
               </button>
               <button
                  type="button"
                  onClick={() => setContactOpen(true)}
                  className="bg-white/60 hover:bg-white text-[#0F3A40] border border-white px-6 py-3 rounded-full text-[14px] font-bold shadow-sm transition-all flex items-center gap-2"
                  title="Liên hệ ban quản lý qua Zalo hoặc hotline"
               >
                  <MessageSquare size={18} /> Liên hệ Admin
               </button>
            </div>
         </div>

         <div className="flex flex-wrap gap-2 p-1.5 bg-white/50 border border-white rounded-full w-fit shadow-sm">
            <button
               type="button"
               onClick={() => setActiveTab('contract')}
               className={`px-5 py-2.5 rounded-full text-[13px] font-bold transition-all ${activeTab === 'contract' ? 'bg-[#0F3A40] text-white shadow-md' : 'text-[#4A787C] hover:bg-white/80'}`}
            >
               Hợp đồng
            </button>
            <button
               type="button"
               onClick={() => setActiveTab('room')}
               className={`px-5 py-2.5 rounded-full text-[13px] font-bold transition-all flex items-center gap-2 ${activeTab === 'room' ? 'bg-[#0F3A40] text-white shadow-md' : 'text-[#4A787C] hover:bg-white/80'}`}
            >
               <Package size={15} /> Phòng & Tài sản bàn giao
            </button>
         </div>

         {activeTab === 'room' ? (
            <RoomAndAssetsSection
               room={room}
               assets={assets}
               roomNumber={roomNumber}
               roomArea={roomArea}
               roomFloor={roomFloor}
               roomDescription={roomDescription}
               roomPrice={roomPrice}
            />
         ) : (
         <div className="flex flex-col lg:flex-row gap-8">
            {/* Main Contract Details (Left) */}
            <div className="flex-1 bg-white/60 backdrop-blur-md rounded-[40px] p-10 border border-white shadow-sm h-fit">
               <div className="flex justify-between items-start mb-12">
                  <div className="flex items-center gap-6">
                     <div className="w-16 h-16 rounded-[24px] bg-[#EAF7F8] flex items-center justify-center text-[#14B8A6] shadow-sm">
                        <Home size={32} />
                     </div>
                     <div>
                        <h2 className="text-[24px] font-bold text-[#0F3A40]">Khu trọ The Sun</h2>
                        <p className="text-[#82ABB0] font-medium text-[15px]">{roomNumber !== '—' ? `${roomNumber}` : '—'}</p>
                     </div>
                  </div>
                  <div className="bg-[#EBFDFB] text-[#14B8A6] text-[11px] font-extrabold px-5 py-2 rounded-full tracking-widest uppercase border border-[#14B8A6]/20 shadow-sm">
                     {contractStatus}
                  </div>
               </div>

               {/* Metrics Grid */}
               <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
                  <div className="flex flex-col gap-1.5">
                     <p className="text-[10px] font-extrabold text-[#82ABB0] uppercase tracking-widest">NGÀY BẮT ĐẦU</p>
                     <p className="text-[18px] font-bold text-[#0F3A40]">{startDate}</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                     <p className="text-[10px] font-extrabold text-[#82ABB0] uppercase tracking-widest">NGÀY KẾT THÚC</p>
                     <p className="text-[18px] font-bold text-[#0F3A40]">{endDate}</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                     <p className="text-[10px] font-extrabold text-[#82ABB0] uppercase tracking-widest">TIỀN THUÊ</p>
                     <p className="text-[18px] font-bold text-[#14B8A6]">{rentPrice}</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                     <p className="text-[10px] font-extrabold text-[#82ABB0] uppercase tracking-widest">TIỀN CỌC</p>
                     <p className="text-[18px] font-bold text-[#0F3A40]">{deposit}</p>
                  </div>
               </div>

               <div className="mb-12">
                  <RoomHeroPanel
                     roomNumber={roomNumber !== '—' ? `Phòng ${roomNumber}` : 'Phòng của bạn'}
                     subtitle={[roomArea, roomFloor, roomPrice !== '—' ? `Giá phòng ${roomPrice}` : null].filter(Boolean).join(' · ') || roomDescription}
                     badge={contractStatus}
                     footer={
                        <div className="flex items-center gap-3 text-white/90">
                           <ShieldCheck size={20} className="text-[#14B8A6]" />
                           <span className="font-medium text-[14px]">
                              {assets.length > 0
                                 ? `${assets.length} tài sản bàn giao đã ghi nhận`
                                 : 'Xem tab Phòng & Tài sản để kiểm tra bàn giao'}
                           </span>
                        </div>
                     }
                     className="h-full min-h-[280px]"
                  />
               </div>
            </div>

            {/* Rules & Support (Right) */}
            <div className="w-full lg:w-[420px] flex flex-col gap-8">
               {/* Rules Card */}
               <div className="bg-white/60 backdrop-blur-md rounded-[40px] p-8 border border-white shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-[#EAF7F8] flex items-center justify-center text-[#14B8A6]">
                           <ClipboardList size={18} />
                        </div>
                        <h3 className="text-xl font-bold text-[#0F3A40]">Điều khoản & Quy định</h3>
                     </div>
                     
                     {/* Local Search Bar */}
                     <div className="relative w-full md:w-[200px] group">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#82ABB0] group-focus-within:text-[#14B8A6] transition-colors" />
                        <input 
                           type="text"
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           placeholder="Tìm nhanh..."
                           className="w-full bg-[#F2FCFD] border border-[#BCE1E5]/40 rounded-2xl pl-10 pr-8 py-2 text-[12px] outline-none focus:border-[#14B8A6]/30 transition-all font-bold text-[#0F3A40]"
                        />
                        {searchQuery && (
                           <button 
                              onClick={() => setSearchQuery('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#82ABB0] hover:text-[#D14D4D] transition-colors"
                           >
                              <X size={12} />
                           </button>
                        )}
                     </div>
                  </div>

                  <div className="space-y-8">
                     {filteredRules.length > 0 ? (
                        filteredRules.map((rule) => (
                           <div key={rule.id} className="flex flex-col gap-2">
                              <h4 className="text-[15px] font-bold text-[#0F3A40] leading-tight">{rule.title}</h4>
                              <p className="text-[13px] text-[#4A787C] leading-relaxed font-medium">
                                 {rule.desc}
                              </p>
                           </div>
                        ))
                     ) : searchQuery ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                           <div className="w-16 h-16 rounded-full bg-[#F2FCFD] flex items-center justify-center text-[#82ABB0] mb-4">
                              <SearchX size={32} />
                           </div>
                           <p className="text-[15px] font-bold text-[#0F3A40]">Không tìm thấy quy định nào</p>
                           <p className="text-[13px] text-[#82ABB0] mt-1">Vui lòng thử từ khóa khác</p>
                        </div>
                     ) : (
                        <div className="py-8 text-center">
                           <p className="text-[15px] font-bold text-[#0F3A40]">Chưa có điều khoản trên hợp đồng</p>
                           <p className="text-[13px] text-[#82ABB0] mt-2 leading-relaxed">
                              Ban quản lý sẽ cập nhật ghi chú hợp đồng. Liên hệ hotline {SUPPORT_HOTLINE} nếu cần hỗ trợ.
                           </p>
                        </div>
                     )}
                  </div>

                  <button
                     type="button"
                     onClick={() => setDetailOpen(true)}
                     disabled={!contract}
                     className="w-full mt-12 py-4 rounded-3xl bg-white border border-[#BCE1E5]/50 text-[#14B8A6] font-bold text-[14px] hover:bg-[#F2FCFD] transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                     <Eye size={16} /> Xem chi tiết hợp đồng <ChevronRight size={16} />
                  </button>
               </div>

               {/* Support Quick Help */}
               <div className="bg-[#14B8A6] rounded-[40px] p-8 border border-white shadow-xl shadow-[#14B8A6]/20 text-white">
                  <h3 className="text-[20px] font-bold mb-3">Hỗ trợ nhanh</h3>
                  <p className="text-white/80 text-[14px] leading-relaxed mb-8">
                     Mọi thắc mắc về hợp đồng vui lòng liên hệ Admin qua Zalo hoặc Hotline.
                  </p>
                  <div className="flex gap-4">
                     <button
                        type="button"
                        onClick={handleOpenZalo}
                        className="flex-1 py-3.5 rounded-2xl bg-white/15 hover:bg-white/25 transition-all text-white font-bold text-[13.5px] border border-white/20"
                     >
                        Zalo hỗ trợ
                     </button>
                     <button
                        type="button"
                        onClick={handleCallHotline}
                        className="flex-1 py-3.5 rounded-2xl bg-white text-[#0F3A40] hover:bg-[#DDF5F7] transition-all font-bold text-[13.5px] shadow-lg"
                     >
                        Hotline
                     </button>
                  </div>
               </div>
            </div>
         </div>
         )}

         {contactOpen ? (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0F3A40]/40 backdrop-blur-sm">
               <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full border border-white p-8">
                  <div className="flex items-center justify-between mb-6">
                     <h3 className="text-lg font-bold text-[#0F3A40]">Liên hệ Admin</h3>
                     <button
                        type="button"
                        onClick={() => setContactOpen(false)}
                        className="p-2 rounded-xl hover:bg-[#F2FCFD] text-[#4A787C]"
                        aria-label="Đóng"
                     >
                        <X size={20} />
                     </button>
                  </div>
                  <p className="text-[14px] text-[#4A787C] leading-relaxed mb-6">
                     Mọi thắc mắc về hợp đồng phòng{' '}
                     <strong className="text-[#0F3A40]">{roomNumber}</strong>
                     {contract?.contract_id ? <> (HĐ #{contract.contract_id})</> : null}
                     , vui lòng chọn kênh liên hệ:
                  </p>
                  <div className="flex flex-col gap-3">
                     <button
                        type="button"
                        onClick={handleOpenZalo}
                        className="w-full py-4 rounded-2xl bg-[#14B8A6] hover:bg-[#109284] text-white font-bold text-[14px] flex items-center justify-center gap-2 shadow-lg shadow-[#14B8A6]/20"
                     >
                        <MessageSquare size={18} /> Nhắn Zalo ban quản lý
                     </button>
                     <button
                        type="button"
                        onClick={handleCallHotline}
                        className="w-full py-4 rounded-2xl bg-[#0F3A40] hover:bg-[#1F545B] text-white font-bold text-[14px] flex items-center justify-center gap-2"
                     >
                        <Phone size={18} /> Gọi hotline {SUPPORT_HOTLINE}
                     </button>
                  </div>
               </div>
            </div>
         ) : null}

         {detailOpen ? (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0F3A40]/40 backdrop-blur-sm">
               <div className="bg-white rounded-[32px] shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col border border-white">
                  <div className="flex items-center justify-between px-8 py-6 border-b border-[#BCE1E5]/30">
                     <h3 className="text-lg font-bold text-[#0F3A40]">Chi tiết hợp đồng</h3>
                     <button
                        type="button"
                        onClick={() => setDetailOpen(false)}
                        className="p-2 rounded-xl hover:bg-[#F2FCFD] text-[#4A787C]"
                        aria-label="Đóng"
                     >
                        <X size={20} />
                     </button>
                  </div>
                  <div className="px-8 py-6 overflow-y-auto text-[14px] space-y-4">
                     {!contract ? (
                        <p className="text-[#82ABB0] text-center py-6">Chưa có dữ liệu hợp đồng.</p>
                     ) : (
                        <>
                           <div className="grid grid-cols-2 gap-3 text-[13px]">
                              <div>
                                 <p className="text-[10px] font-extrabold text-[#82ABB0] uppercase tracking-widest">Mã HĐ</p>
                                 <p className="font-bold text-[#0F3A40] mt-1">#{contract.contract_id}</p>
                              </div>
                              <div>
                                 <p className="text-[10px] font-extrabold text-[#82ABB0] uppercase tracking-widest">Phòng</p>
                                 <p className="font-bold text-[#0F3A40] mt-1">{contract.room_number || roomNumber}</p>
                              </div>
                              <div>
                                 <p className="text-[10px] font-extrabold text-[#82ABB0] uppercase tracking-widest">Bắt đầu</p>
                                 <p className="font-bold text-[#0F3A40] mt-1">{formatDate(contract.start_date)}</p>
                              </div>
                              <div>
                                 <p className="text-[10px] font-extrabold text-[#82ABB0] uppercase tracking-widest">Kết thúc</p>
                                 <p className="font-bold text-[#0F3A40] mt-1">{formatDate(contract.end_date)}</p>
                              </div>
                              <div>
                                 <p className="text-[10px] font-extrabold text-[#82ABB0] uppercase tracking-widest">Tiền thuê</p>
                                 <p className="font-bold text-[#14B8A6] mt-1">{formatMoney(contract.rent_price)}</p>
                              </div>
                              <div>
                                 <p className="text-[10px] font-extrabold text-[#82ABB0] uppercase tracking-widest">Tiền cọc</p>
                                 <p className="font-bold text-[#0F3A40] mt-1">{formatMoney(contract.deposit)}</p>
                              </div>
                              <div>
                                 <p className="text-[10px] font-extrabold text-[#82ABB0] uppercase tracking-widest">Trạng thái</p>
                                 <p className="font-bold text-[#0F3A40] mt-1">{contractStatus}</p>
                              </div>
                              {contract.max_tenants != null ? (
                                 <div>
                                    <p className="text-[10px] font-extrabold text-[#82ABB0] uppercase tracking-widest">Số người tối đa</p>
                                    <p className="font-bold text-[#0F3A40] mt-1">{contract.max_tenants}</p>
                                 </div>
                              ) : null}
                           </div>
                           {contract.notes ? (
                              <div className="rounded-2xl bg-[#F2FCFD]/80 border border-[#BCE1E5]/30 p-4">
                                 <p className="text-[10px] font-extrabold text-[#82ABB0] uppercase tracking-widest mb-2">Ghi chú</p>
                                 <p className="text-[#4A787C] leading-relaxed whitespace-pre-wrap">{contract.notes}</p>
                              </div>
                           ) : null}
                           <p className="text-[11px] text-[#82ABB0]">
                              Cập nhật: {formatDate(contract.updated_at || contract.created_at)}
                           </p>
                        </>
                     )}
                  </div>
               </div>
            </div>
         ) : null}
      </div>
   );
}
