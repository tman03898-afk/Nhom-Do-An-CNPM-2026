import { useEffect, useMemo, useState } from 'react';
import {
  BedDouble,
  Calendar,
  CreditCard,
  Download,
  FileText,
  Gauge,
  Loader2,
  Percent,
  Users,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [overview, setOverview] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [contracts, setContracts] = useState([]);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      setIsLoading(true);
      setLoadError('');
      try {
        const results = await Promise.allSettled([
          apiFetch('/admin/analytics/overview', { token }),
          apiFetch('/rooms', { token }),
          apiFetch('/admin/invoices', { token }),
          apiFetch('/admin/tickets', { token }),
          apiFetch('/admin/contracts', { token }),
        ]);

        const [ov, roomRes, invoiceRes, ticketRes, contractRes] = results;
        const failed = [];

        if (ov.status === 'fulfilled') {
          setOverview(ov.value?.overview || null);
        } else {
          setOverview(null);
          failed.push('overview');
        }

        if (roomRes.status === 'fulfilled') {
          setRooms(roomRes.value?.rooms || []);
        } else {
          setRooms([]);
          failed.push('rooms');
        }

        if (invoiceRes.status === 'fulfilled') {
          setInvoices(invoiceRes.value?.invoices || []);
        } else {
          setInvoices([]);
          failed.push('invoices');
        }

        if (ticketRes.status === 'fulfilled') {
          setTickets(ticketRes.value?.tickets || []);
        } else {
          setTickets([]);
          failed.push('tickets');
        }

        if (contractRes.status === 'fulfilled') {
          setContracts(contractRes.value?.contracts || []);
        } else {
          setContracts([]);
          failed.push('contracts');
        }

        if (failed.length > 0) {
          setLoadError(`Một số nguồn dữ liệu lỗi (${failed.join(', ')}), số liệu đang hiển thị phần còn lại.`);
        }
      } catch (error) {
        setLoadError(error?.message || 'Không tải được dữ liệu phân tích');
      } finally {
        setIsLoading(false);
      }
    };

    run();
  }, [token]);

  const metrics = useMemo(() => {
    const toNum = (v) => Number(v || 0);
    const roomsTotal = toNum(overview?.rooms_total || rooms.length);
    const roomsRented = toNum(overview?.rooms_rented || rooms.filter((r) => r.status === 'RENTED').length);
    const roomsAvailable = toNum(overview?.rooms_available || rooms.filter((r) => r.status === 'AVAILABLE').length);
    const tenantsTotal = toNum(overview?.tenants_total);

    const occupancyRate = roomsTotal > 0 ? Math.round((roomsRented / roomsTotal) * 100) : 0;

    const activeContracts = contracts.filter((c) => c.status === 'ACTIVE').length;
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringSoon = contracts.filter(
      (c) => c.status === 'ACTIVE' && c.end_date && new Date(c.end_date) <= in30Days
    ).length;

    const paidInvoices = invoices.filter((i) => i.status === 'PAID');
    const unpaidInvoices = invoices.filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED');
    const totalRevenue = paidInvoices.reduce((sum, i) => sum + toNum(i.total_amount), 0);
    const outstandingAmount = unpaidInvoices.reduce((sum, i) => sum + toNum(i.total_amount), 0);

    const openTickets = tickets.filter((t) => t.status === 'OPEN').length;

    return {
      roomsTotal,
      roomsRented,
      roomsAvailable,
      tenantsTotal,
      occupancyRate,
      activeContracts,
      expiringSoon,
      totalRevenue,
      outstandingAmount,
      openTickets,
      unpaidCount: unpaidInvoices.length,
    };
  }, [overview, rooms, invoices, tickets, contracts]);

  const insights = useMemo(() => {
    const list = [];

    if (metrics.occupancyRate >= 90) {
      list.push(`Tỷ lệ lấp đầy đạt ${metrics.occupancyRate}%, công suất phòng đang rất cao.`);
    } else if (metrics.occupancyRate >= 70) {
      list.push(`Tỷ lệ lấp đầy hiện ${metrics.occupancyRate}%, trạng thái vận hành ổn định.`);
    } else {
      list.push(`Tỷ lệ lấp đầy mới ${metrics.occupancyRate}%, nên ưu tiên chiến dịch lấp phòng trống.`);
    }

    if (metrics.unpaidCount > 0) {
      list.push(
        `Có ${metrics.unpaidCount} hóa đơn chưa thanh toán với tổng ${metrics.outstandingAmount.toLocaleString('vi-VN')}đ cần theo dõi.`
      );
    } else {
      list.push('Hiện không có hóa đơn tồn đọng, dòng tiền thu phí đang tốt.');
    }

    if (metrics.expiringSoon > 0) {
      list.push(`Có ${metrics.expiringSoon} hợp đồng sắp hết hạn trong 30 ngày tới, nên nhắc gia hạn sớm.`);
    } else {
      list.push('Chưa có hợp đồng sắp hết hạn trong 30 ngày tới.');
    }

    if (metrics.openTickets > 0) {
      list.push(`Có ${metrics.openTickets} yêu cầu bảo trì đang mở, cần ưu tiên xử lý để giữ trải nghiệm thuê.`);
    } else {
      list.push('Không có yêu cầu bảo trì mở, chất lượng vận hành đang ổn định.');
    }

    return list;
  }, [metrics]);

  const cards = [
    {
      id: 'occupancy',
      title: 'Tỷ lệ lấp đầy',
      value: `${metrics.occupancyRate}%`,
      helper: `${metrics.roomsRented}/${metrics.roomsTotal} phòng đang thuê`,
      icon: Gauge,
    },
    {
      id: 'revenue',
      title: 'Doanh thu đã thu',
      value: `${metrics.totalRevenue.toLocaleString('vi-VN')}đ`,
      helper: 'Tổng từ hóa đơn đã thanh toán',
      icon: CreditCard,
    },
    {
      id: 'unpaid',
      title: 'Công nợ cần thu',
      value: `${metrics.outstandingAmount.toLocaleString('vi-VN')}đ`,
      helper: `${metrics.unpaidCount} hóa đơn chưa thanh toán`,
      icon: FileText,
    },
    {
      id: 'tenants',
      title: 'Tổng người thuê',
      value: `${metrics.tenantsTotal}`,
      helper: `${metrics.activeContracts} hợp đồng đang hiệu lực`,
      icon: Users,
    },
    {
      id: 'available',
      title: 'Phòng trống',
      value: `${metrics.roomsAvailable}`,
      helper: 'Phòng sẵn sàng khai thác',
      icon: BedDouble,
    },
    {
      id: 'tickets',
      title: 'Bảo trì đang mở',
      value: `${metrics.openTickets}`,
      helper: `${metrics.expiringSoon} hợp đồng sắp hết hạn`,
      icon: Wrench,
    },
  ];

  const handleExportCsv = () => {
    const toDateTime = (input) => {
      if (!input) return '';
      const parsed = new Date(input);
      if (Number.isNaN(parsed.getTime())) return '';
      return parsed.toLocaleString('vi-VN');
    };
    const escapeCsv = (value) => {
      const normalized = String(value ?? '');
      return `"${normalized.replace(/"/g, '""')}"`;
    };
    const row = (values) => values.map(escapeCsv).join(',');
    const nowText = new Date().toLocaleString('vi-VN');

    const lines = [];
    lines.push(row(['Mục', 'Giá trị']));
    lines.push(row(['Thời gian xuất báo cáo', nowText]));
    lines.push(row(['Tổng số phòng', metrics.roomsTotal]));
    lines.push(row(['Phòng đang thuê', metrics.roomsRented]));
    lines.push(row(['Phòng trống', metrics.roomsAvailable]));
    lines.push(row(['Tỷ lệ lấp đầy (%)', metrics.occupancyRate]));
    lines.push(row(['Tổng người thuê', metrics.tenantsTotal]));
    lines.push(row(['Hợp đồng đang hiệu lực', metrics.activeContracts]));
    lines.push(row(['Hợp đồng sắp hết hạn 30 ngày', metrics.expiringSoon]));
    lines.push(row(['Tổng doanh thu đã thu', metrics.totalRevenue]));
    lines.push(row(['Công nợ cần thu', metrics.outstandingAmount]));
    lines.push(row(['Số hóa đơn chưa thanh toán', metrics.unpaidCount]));
    lines.push(row(['Yêu cầu bảo trì đang mở', metrics.openTickets]));
    lines.push('');

    lines.push(row(['Nhận định']));
    insights.forEach((insight) => lines.push(row([insight])));
    lines.push('');

    lines.push(row(['PHÒNG']));
    lines.push(row(['room_id', 'room_number', 'status', 'price', 'area', 'max_tenants']));
    rooms.forEach((room) => {
      lines.push(
        row([
          room.room_id,
          room.room_number,
          room.status,
          room.price,
          room.area,
          room.max_tenants,
        ])
      );
    });
    lines.push('');

    lines.push(row(['HÓA ĐƠN']));
    lines.push(row(['invoice_id', 'contract_id', 'status', 'total_amount', 'due_date', 'created_at']));
    invoices.forEach((invoice) => {
      lines.push(
        row([
          invoice.invoice_id,
          invoice.contract_id,
          invoice.status,
          invoice.total_amount,
          toDateTime(invoice.due_date),
          toDateTime(invoice.created_at),
        ])
      );
    });
    lines.push('');

    lines.push(row(['HỢP ĐỒNG']));
    lines.push(row(['contract_id', 'tenant_id', 'room_id', 'status', 'start_date', 'end_date', 'monthly_rent']));
    contracts.forEach((contract) => {
      lines.push(
        row([
          contract.contract_id,
          contract.tenant_id,
          contract.room_id,
          contract.status,
          toDateTime(contract.start_date),
          toDateTime(contract.end_date),
          contract.monthly_rent,
        ])
      );
    });
    lines.push('');

    lines.push(row(['BẢO TRÌ']));
    lines.push(row(['ticket_id', 'room_id', 'tenant_id', 'status', 'title', 'created_at']));
    tickets.forEach((ticket) => {
      lines.push(
        row([
          ticket.ticket_id,
          ticket.room_id,
          ticket.tenant_id,
          ticket.status,
          ticket.title,
          toDateTime(ticket.created_at),
        ])
      );
    });

    const csvContent = `\uFEFF${lines.join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `bao-cao-phan-tich-admin-${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto pb-12">
      <div className="flex justify-between items-end mb-8 pt-4">
        <div>
          <h1 className="text-[36px] font-bold text-[#0F3A40] leading-none mb-3">Phân tích Dữ liệu</h1>
          <p className="text-[#4A787C] font-medium">Cập nhật hiệu suất kinh doanh thời gian thực</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 bg-white border border-[#BCE1E5]/50 px-5 py-3 rounded-2xl text-[14px] font-bold text-[#4A787C] shadow-sm">
            <Calendar className="w-4 h-4 text-[#14B8A6]" />
            Toàn bộ dữ liệu hệ thống
          </span>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isLoading}
            className="flex items-center gap-2 bg-[#0F3A40] text-white px-5 py-3 rounded-2xl text-[14px] font-bold shadow-lg shadow-[#0F3A40]/20 hover:bg-[#1F545B] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" /> Xuất báo cáo CSV
          </button>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-[40px] p-10 shadow-sm">
        {isLoading ? (
          <div className="min-h-[320px] flex items-center justify-center text-[#4A787C]">
            <div className="flex items-center gap-3 text-[15px] font-semibold">
              <Loader2 className="w-5 h-5 animate-spin" />
              Đang tổng hợp dữ liệu phân tích...
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {loadError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700 text-sm font-medium">
                {loadError}
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {cards.map((card) => {
                const Icon = card.icon;
                return (
                  <article key={card.id} className="rounded-[28px] bg-white border border-[#BCE1E5]/40 p-6">
                    <div className="w-11 h-11 rounded-full bg-[#EAF7F8] flex items-center justify-center text-[#14B8A6] mb-5">
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="text-[11px] font-bold text-[#4A787C] uppercase tracking-wider mb-2">{card.title}</p>
                    <h3 className="text-[30px] font-bold text-[#0F3A40] leading-tight">{card.value}</h3>
                    <p className="text-[13px] text-[#4A787C] font-medium mt-2">{card.helper}</p>
                  </article>
                );
              })}
            </div>

            <div className="rounded-[28px] bg-[#F8FAFC] border border-slate-200 p-6">
              <div className="flex items-center gap-2 text-[#0F3A40] mb-4">
                <Percent className="w-5 h-5 text-[#14B8A6]" />
                <h3 className="text-[18px] font-bold">Nhận định tự động từ dữ liệu hiện có</h3>
              </div>
              <ul className="space-y-3">
                {insights.map((text) => (
                  <li key={text} className="text-[14px] text-[#4A787C] leading-relaxed font-medium flex items-start gap-3">
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-[#14B8A6] shrink-0" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[28px] bg-[#F2FCFD] border border-[#BCE1E5]/40 p-6">
              <h3 className="text-[16px] font-bold text-[#0F3A40] mb-3">Tóm tắt vận hành</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl bg-white/80 border border-[#BCE1E5]/50 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wide font-bold text-[#4A787C]">Phòng</p>
                  <p className="text-[14px] font-semibold text-[#0F3A40] mt-1">
                    {metrics.roomsRented} đang thuê / {metrics.roomsAvailable} trống
                  </p>
                </div>
                <div className="rounded-2xl bg-white/80 border border-[#BCE1E5]/50 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wide font-bold text-[#4A787C]">Hóa đơn</p>
                  <p className="text-[14px] font-semibold text-[#0F3A40] mt-1">
                    {metrics.unpaidCount} chưa thanh toán
                  </p>
                </div>
                <div className="rounded-2xl bg-white/80 border border-[#BCE1E5]/50 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wide font-bold text-[#4A787C]">Hợp đồng</p>
                  <p className="text-[14px] font-semibold text-[#0F3A40] mt-1">
                    {metrics.activeContracts} hiệu lực / {metrics.expiringSoon} sắp hết hạn
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
