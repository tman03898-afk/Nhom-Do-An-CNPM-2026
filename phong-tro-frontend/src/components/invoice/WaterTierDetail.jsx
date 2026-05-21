import { parseInvoiceWaterBreakdown } from './parseWaterBreakdown';

/**
 * @param {{ className?: string, breakdown: unknown, compact?: boolean }} props
 */
export default function WaterTierDetail({ breakdown, className = '', compact = false }) {
  const b = parseInvoiceWaterBreakdown(breakdown);
  if (!b) return null;

  return (
    <div className={className}>
      <p className={`font-bold text-nest-text-primary ${compact ? 'text-[11px] mb-2' : 'text-[12px] mb-3'}`}>
        Chi tiết tiền nước (bậc thang)
      </p>
      <p className={`text-nest-text-secondary font-medium mb-2 ${compact ? 'text-[11px]' : 'text-[12px]'}`}>
        Tiêu thụ kỳ:{' '}
        <span className="text-nest-text-primary font-bold">{Number(b.delta_m3 || 0).toLocaleString('vi-VN')} m³</span>
      </p>
      <div className={`overflow-x-auto rounded-xl border border-nest-primary/15 ${compact ? '' : ''}`}>
        <table className="w-full text-left text-[12px] border-collapse min-w-[280px]">
          <thead>
            <tr className="bg-nest-bg/80 text-[10px] font-bold text-nest-text-secondary uppercase tracking-wide">
              <th className="px-3 py-2">Bậc</th>
              <th className="px-3 py-2">m³ (trong bậc)</th>
              <th className="px-3 py-2 text-right">Đơn giá</th>
              <th className="px-3 py-2 text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {b.tiers.map((row, idx) => {
              const bac = row.bac ?? idx + 1;
              const m3 = row.m3 ?? 0;
              const price = row.price_per_m3 ?? row.pricePerM3 ?? 0;
              const amount = row.amount ?? 0;
              const from = row.band_from_m3 ?? row.bandFrom;
              const to = row.band_to_m3 ?? row.bandTo;
              const range =
                from != null && to != null
                  ? `${Number(from).toLocaleString('vi-VN')}–${Number(to).toLocaleString('vi-VN')} m³`
                  : `${Number(m3).toLocaleString('vi-VN')} m³`;
              return (
                <tr key={`${bac}-${idx}`} className="border-t border-nest-primary/10">
                  <td className="px-3 py-2 font-bold text-nest-text-primary">Bậc {bac}</td>
                  <td className="px-3 py-2 text-nest-text-secondary font-medium">{range}</td>
                  <td className="px-3 py-2 text-right text-nest-text-secondary">
                    {Number(price).toLocaleString('vi-VN')}đ/m³
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-nest-text-primary">
                    {Number(amount).toLocaleString('vi-VN')}đ
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
