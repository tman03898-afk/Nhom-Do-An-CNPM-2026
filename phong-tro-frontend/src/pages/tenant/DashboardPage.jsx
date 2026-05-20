import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/api';
import { SUPPORT_HOTLINE, contactHotline, contactZalo } from '../../lib/supportContact';
import {
    CreditCard, AlertCircle, Megaphone,
    Calendar, Users, Wifi, Phone,
    ArrowRight, Zap, Package, MessageSquare
} from 'lucide-react';

function isUnpaidInvoice(status) {
    const s = String(status ?? '').toUpperCase();
    return s !== 'PAID' && s !== 'CANCELLED';
}

function fmtMoney(n) {
    const x = Number(n || 0);
    return Number.isFinite(x) ? `${x.toLocaleString('vi-VN')}đ` : '—';
}

function fmtDateShort(d) {
    if (!d) return '—';
    const x = new Date(d);
    return Number.isNaN(x.getTime()) ? String(d) : x.toLocaleDateString('vi-VN');
}

export default function TenantDashboard() {
    const { user, token } = useAuth();
    const { addToast } = useToast();
    const [greeting, setGreeting] = useState('');
    const [tenantProfile, setTenantProfile] = useState(null);
    const [dashLoading, setDashLoading] = useState(true);
    const [invoices, setInvoices] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [contract, setContract] = useState(null);
    const [room, setRoom] = useState(null);
    const [activeServiceCount, setActiveServiceCount] = useState(0);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Chào buổi sáng');
        else if (hour < 18) setGreeting('Chào buổi chiều');
        else setGreeting('Chào buổi tối');
    }, []);

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
        if (!token) return;
        let cancelled = false;
        (async () => {
            setDashLoading(true);
            try {
                const [inv, notif, cont, subs] = await Promise.allSettled([
                    apiFetch('/tenant/invoices', { token }),
                    apiFetch('/tenant/notifications', { token }),
                    apiFetch('/tenant/contract', { token }),
                    apiFetch('/tenant/fee-subscriptions', { token }),
                ]);
                if (cancelled) return;
                setInvoices(inv.status === 'fulfilled' ? inv.value?.invoices || [] : []);
                setNotifications(notif.status === 'fulfilled' ? notif.value?.notifications || [] : []);
                if (cont.status === 'fulfilled') {
                    setContract(cont.value?.contract ?? null);
                    setRoom(cont.value?.room ?? null);
                } else {
                    setContract(null);
                    setRoom(null);
                }
                const subsList = subs.status === 'fulfilled' ? subs.value?.subscriptions || [] : [];
                setActiveServiceCount(
                    subsList.filter((s) => String(s.status || '').toUpperCase() === 'ACTIVE').length
                );
            } finally {
                if (!cancelled) setDashLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [token]);

    const unpaidInvoices = useMemo(
        () => invoices.filter((i) => isUnpaidInvoice(i.status)),
        [invoices]
    );

    const invoiceSummary = useMemo(() => {
        const amountDue = unpaidInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
        const withDue = unpaidInvoices.filter((i) => i.due_date).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
        const nextDue = withDue[0];
        const urgent = nextDue || unpaidInvoices[0];
        let monthLabel = '—';
        if (urgent?.period_month != null && urgent?.period_year != null) {
            monthLabel = `Tháng ${urgent.period_month}/${urgent.period_year}`;
        }
        return {
            amountDue,
            nextDueDate: nextDue?.due_date || null,
            unpaidCount: unpaidInvoices.length,
            monthLabel,
            firstUnpaidId: urgent?.invoice_id ?? null,
        };
    }, [unpaidInvoices]);

    const notificationSummary = useMemo(() => {
        const unread = notifications.filter((n) => !n.is_read).length;
        const latest = notifications[0];
        const updatedLabel = latest?.created_at
            ? fmtDateShort(latest.created_at) + ' · ' + new Date(latest.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            : '—';
        return { unread, updatedLabel };
    }, [notifications]);

    const recentNotifications = useMemo(() => notifications.slice(0, 3), [notifications]);

    const view = useMemo(() => {
        const nameFromProfile = tenantProfile?.full_name?.trim();
        const nameFromUser = user?.name?.trim();
        const displayName =
            nameFromProfile?.split(/\s+/).pop() ||
            nameFromUser?.split(/\s+/).pop() ||
            'bạn';
        const roomNumber =
            contract?.room_number ||
            tenantProfile?.room_number ||
            '—';
        const moveIn = contract?.start_date ? fmtDateShort(contract.start_date) : '—';
        const maxPeople =
            contract?.max_tenants != null && contract.max_tenants !== ''
                ? `Tối đa ${contract.max_tenants} người`
                : '—';
        return {
            displayName,
            roomNumber,
            moveIn,
            maxPeople,
            rentPrice: contract?.rent_price != null ? fmtMoney(contract.rent_price) : null,
            contractEnd: contract?.end_date ? fmtDateShort(contract.end_date) : null,
            roomArea: room?.area != null ? `${Number(room.area).toLocaleString('vi-VN')} m²` : null,
        };
    }, [tenantProfile, user, contract, room]);

    const paymentHref = useMemo(() => {
        if (invoiceSummary.firstUnpaidId) {
            return `/tenant/payment?invoiceId=${invoiceSummary.firstUnpaidId}`;
        }
        return '/tenant/invoices';
    }, [invoiceSummary.firstUnpaidId]);

    const amountDisplay = dashLoading ? '…' : fmtMoney(invoiceSummary.amountDue);
    const dueDisplay = dashLoading ? '…' : invoiceSummary.nextDueDate ? fmtDateShort(invoiceSummary.nextDueDate) : '—';
    const unpaidCountDisplay = dashLoading ? '…' : String(invoiceSummary.unpaidCount);
    const monthLineDisplay = dashLoading ? '…' : invoiceSummary.monthLabel;
    const notifCountDisplay = dashLoading ? '…' : String(notificationSummary.unread);
    const notifUpdatedDisplay = dashLoading ? '…' : notificationSummary.updatedLabel;

    return (
        <div className="flex flex-col gap-8 pb-10">
            {/* Welcome Header */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
                <div>
                    <h1 className="text-[34px] font-sans font-bold text-[#0F3A40] tracking-tight mb-2">
                        {greeting}, {view.displayName}!
                    </h1>
                    <p className="text-[#4A787C] font-medium text-[15px] leading-relaxed max-w-[500px]">
                        Chúc bạn một ngày làm việc và học tập tràn đầy năng lượng tại The Nest Living.
                    </p>
                </div>
                <div className="flex flex-wrap gap-4 shrink-0">
                    <Link
                        to={paymentHref}
                        className="bg-[#14B8A6] hover:bg-[#109284] text-white px-6 py-3 rounded-full text-[14.5px] font-bold shadow-lg shadow-[#14B8A6]/20 transition-all flex items-center gap-2"
                    >
                        <CreditCard size={18} /> Thanh toán ngay
                    </Link>
                    <Link
                        to="/tenant/tickets"
                        className="bg-white/60 hover:bg-white text-[#0F3A40] border border-white px-6 py-3 rounded-full text-[14.5px] font-bold shadow-sm transition-all inline-flex items-center"
                    >
                        Báo sự cố
                    </Link>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left Column: Main Stats & Notifications */}
                <div className="flex-1 flex flex-col gap-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Link
                            to="/tenant/invoices"
                            className="bg-white/60 backdrop-blur-md rounded-[32px] p-7 border border-white shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform cursor-pointer group"
                        >
                            <span className="text-[11px] font-bold text-[#4A787C] uppercase tracking-[0.1em]">TIỀN CẦN THANH TOÁN</span>
                            <div className="mt-4 mb-8">
                                <h3 className="text-[26px] font-bold text-[#0F3A40]">{amountDisplay}</h3>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t border-[#BCE1E5]/30">
                                <span className="text-[12px] font-medium text-[#82ABB0]">Hạn chót: {dueDisplay}</span>
                                <div className="w-8 h-8 rounded-full bg-[#14B8A6]/10 flex items-center justify-center text-[#14B8A6] group-hover:bg-[#14B8A6] group-hover:text-white transition-colors">
                                    <CreditCard size={14} />
                                </div>
                            </div>
                        </Link>

                        <Link
                            to="/tenant/invoices"
                            className="bg-white/60 backdrop-blur-md rounded-[32px] p-7 border border-white shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform cursor-pointer group"
                        >
                            <span className="text-[11px] font-bold text-[#4A787C] uppercase tracking-[0.1em]">HÓA ĐƠN CHƯA CHI TRẢ</span>
                            <div className="mt-4 mb-8">
                                <h3 className="text-[26px] font-bold text-[#0F3A40]">{unpaidCountDisplay}</h3>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t border-[#BCE1E5]/30">
                                <span className="text-[12px] font-medium text-[#82ABB0]">{monthLineDisplay}</span>
                                <div className="w-8 h-8 rounded-full bg-[#E68A00]/10 flex items-center justify-center text-[#E68A00] group-hover:bg-[#E68A00] group-hover:text-white transition-colors">
                                    <AlertCircle size={14} />
                                </div>
                            </div>
                        </Link>

                        <Link
                            to="/tenant/notifications"
                            className="bg-white/60 backdrop-blur-md rounded-[32px] p-7 border border-white shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform cursor-pointer group text-[#0F3A40]"
                        >
                            <span className="text-[11px] font-bold text-[#4A787C] uppercase tracking-[0.1em]">THÔNG BÁO CHƯA ĐỌC</span>
                            <div className="mt-4 mb-8">
                                <h3 className="text-[26px] font-bold text-[#0F3A40]">{notifCountDisplay}</h3>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t border-[#BCE1E5]/30">
                                <span className="text-[12px] font-medium text-[#82ABB0] line-clamp-2">Cập nhật {notifUpdatedDisplay}</span>
                                <div className="w-8 h-8 rounded-full bg-[#3B82F6]/10 flex items-center justify-center text-[#3B82F6] group-hover:bg-[#3B82F6] group-hover:text-white transition-colors shrink-0">
                                    <Megaphone size={14} />
                                </div>
                            </div>
                        </Link>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white/40 backdrop-blur-md rounded-[40px] p-8 border border-white shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-bold text-[#0F3A40]">Thông báo gần đây</h3>
                            <Link to="/tenant/notifications" className="text-[13px] font-bold text-[#14B8A6] hover:underline transition-all">
                                Xem tất cả
                            </Link>
                        </div>

                        <div className="space-y-4">
                            {dashLoading ? (
                                <p className="text-[13px] text-[#82ABB0] font-medium py-4">Đang tải thông báo…</p>
                            ) : recentNotifications.length === 0 ? (
                                <p className="text-[13px] text-[#4A787C] font-medium py-4">Chưa có thông báo.</p>
                            ) : (
                                recentNotifications.map((n, idx) => (
                                    <Link
                                        key={n.notification_id ?? idx}
                                        to="/tenant/notifications"
                                        className="bg-white/60 p-5 rounded-3xl border border-white/50 flex items-start gap-5 hover:bg-white transition-all cursor-pointer group shadow-sm"
                                    >
                                        <div
                                            className={`w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center group-hover:scale-110 transition-transform ${
                                                idx % 2 === 0
                                                    ? 'bg-[#E8F8F5] text-[#14B8A6]'
                                                    : 'bg-[#F0F4F8] text-[#4A787C]'
                                            }`}
                                        >
                                            {idx % 2 === 0 ? <Zap size={22} className="fill-current" /> : <Package size={22} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center gap-2 mb-1">
                                                <h4 className="text-[15px] font-bold text-[#0F3A40] truncate">{n.title || 'Thông báo'}</h4>
                                                <span className="text-[11px] font-bold text-[#82ABB0] shrink-0">
                                                    {n.created_at ? fmtDateShort(n.created_at) : '—'}
                                                </span>
                                            </div>
                                            <p className="text-[13px] text-[#4A787C] leading-relaxed line-clamp-2">
                                                {n.body || '—'}
                                            </p>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>

                    <Link
                        to="/tenant/contract"
                        className="relative h-[240px] rounded-[40px] overflow-hidden shadow-xl bg-gradient-to-br from-[#0F3A40] via-[#1F545B] to-[#14B8A6] flex flex-col justify-center p-12 group"
                    >
                        <h3 className="text-[28px] font-bold text-white mb-2 leading-tight">
                            {view.roomNumber !== '—' ? `Phòng ${view.roomNumber}` : 'Hợp đồng thuê phòng'}
                        </h3>
                        <p className="text-white/80 text-[14px] max-w-[360px] leading-relaxed mb-4">
                            {view.rentPrice ? `Giá thuê ${view.rentPrice}/tháng` : 'Xem thông tin hợp đồng và phòng'}
                            {view.contractEnd ? ` · Hết hạn ${view.contractEnd}` : ''}
                            {view.roomArea ? ` · ${view.roomArea}` : ''}
                        </p>
                        <span className="flex items-center gap-2 text-white font-bold text-[13.5px] group-hover:gap-3 transition-all">
                            Xem hợp đồng <ArrowRight size={16} />
                        </span>
                    </Link>
                </div>

                {/* Right Column: Room Info & Support */}
                <div className="w-full lg:w-[380px] flex flex-col gap-8">
                    {/* Room Info Card */}
                    <div className="bg-white/60 backdrop-blur-md rounded-[40px] p-8 border border-white shadow-sm flex flex-col h-fit">
                        <div className="flex flex-col mb-10">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-[11px] font-bold text-[#4A787C] uppercase tracking-widest">THÔNG TIN PHÒNG</span>
                                <span className="bg-[#0F3A40] text-white text-[9px] font-bold px-2 py-1 rounded-md tracking-wider">
                                    {contract?.status === 'ACTIVE' ? 'Đang thuê' : contract ? contract.status : '—'}
                                </span>
                            </div>
                            <h2 className="text-[32px] font-sans font-bold text-[#0F3A40]">
                                {view.roomNumber !== '—' ? `Phòng ${view.roomNumber}` : '—'}
                            </h2>
                        </div>

                        <div className="space-y-6 mb-12">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-[#EAF7F8] flex items-center justify-center text-[#14B8A6]">
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-wide">Ngày dọn vào</p>
                                    <p className="text-[14.5px] font-bold text-[#0F3A40]">{dashLoading ? '…' : view.moveIn}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-[#EAF7F8] flex items-center justify-center text-[#14B8A6]">
                                    <Users size={18} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-wide">Số người ở</p>
                                    <p className="text-[14.5px] font-bold text-[#0F3A40]">{dashLoading ? '…' : view.maxPeople}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-[#EAF7F8] flex items-center justify-center text-[#14B8A6]">
                                    <Wifi size={18} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-wide">Dịch vụ đăng ký</p>
                                    <p className="text-[14.5px] font-bold text-[#0F3A40]">
                                        {dashLoading
                                            ? '…'
                                            : activeServiceCount > 0
                                              ? `${activeServiceCount} gói đang hoạt động`
                                              : 'Chưa đăng ký gói phí'}
                                    </p>
                                </div>
                            </div>

                            {view.rentPrice ? (
                                <p className="text-[12px] font-medium text-[#82ABB0]">
                                    Giá thuê tham chiếu: <span className="text-[#0F3A40] font-bold">{view.rentPrice}</span>
                                </p>
                            ) : null}
                            {!dashLoading && activeServiceCount === 0 ? (
                                <Link to="/tenant/services" className="text-[12px] font-bold text-[#14B8A6] hover:underline">
                                    Đăng ký dịch vụ & phí →
                                </Link>
                            ) : null}
                        </div>

                        <Link
                            to="/tenant/contract"
                            className="mt-auto w-full py-4 rounded-3xl bg-white border border-[#BCE1E5]/50 text-[#14B8A6] font-bold text-[14px] hover:bg-[#14B8A6] hover:text-white transition-all shadow-sm text-center block"
                        >
                            Xem chi tiết hợp đồng
                        </Link>
                    </div>

                    {/* Support Card */}
                    <div className="bg-[#F2FCFD] rounded-[40px] p-8 border border-[#BCE1E5]/40 shadow-sm">
                        <h3 className="text-[20px] font-bold text-[#0F3A40] mb-3">Hỗ trợ 24/7</h3>
                        <p className="text-[13.5px] text-[#4A787C] leading-relaxed mb-8">
                            Đội ngũ vận hành luôn sẵn sàng giải đáp mọi thắc mắc của bạn.
                        </p>

                        <button
                            type="button"
                            onClick={() => contactHotline(addToast)}
                            className="w-full flex items-center gap-4 p-4 bg-white/60 rounded-[28px] border border-white/80 hover:bg-white transition-colors text-left"
                            title="Gọi hotline"
                        >
                            <div className="w-11 h-11 rounded-full bg-[#14B8A6] flex items-center justify-center text-white shrink-0 shadow-lg shadow-[#14B8A6]/20">
                                <Phone size={18} className="fill-current" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <p className="text-[11px] font-bold text-[#82ABB0] uppercase tracking-tight">Hotline: {SUPPORT_HOTLINE}</p>
                                <p className="text-[13px] font-bold text-[#0F3A40] truncate">Bấm để gọi — phản hồi trong 5 phút</p>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => contactZalo(addToast)}
                            className="w-full mt-3 py-4 rounded-3xl bg-[#14B8A6] text-white font-bold text-[14px] hover:bg-[#109284] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#14B8A6]/20"
                        >
                            <MessageSquare size={16} /> Nhắn Zalo ban quản lý
                        </button>

                        <Link
                            to="/tenant/tickets"
                            className="w-full mt-3 py-4 rounded-3xl bg-[#0F3A40] text-white font-bold text-[14px] hover:bg-[#1F545B] transition-all flex items-center justify-center gap-2"
                        >
                            <MessageSquare size={16} /> Gửi phiếu sửa chữa
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
