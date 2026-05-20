import ElectricityTierDetail from './ElectricityTierDetail';
import { parseInvoiceElectricityBreakdown } from './parseElectricityBreakdown';

function fmtNum(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return n.toLocaleString('vi-VN');
}

/**
 * Chỉ số điện/nước đã nhập trong kỳ + bậc tiền điện (electricity_breakdown tiered).
 * @param {{ electricity_breakdown?: unknown, utility_meter_snapshot?: unknown, className?: string }} props
 */
export default function InvoiceUtilityDetails({
  electricity_breakdown: breakdown,
  utility_meter_snapshot: snapshot,
  emptyHint = '',
  className = '',
}) {
  const ms = snapshot && typeof snapshot === 'object' ? snapshot : null;
  const tierParsed = parseInvoiceElectricityBreakdown(breakdown);

  const hasMeters =
    ms &&
    [
      ms.electricity_previous_kwh,
      ms.electricity_current_kwh,
      ms.water_previous_m3,
      ms.water_current_m3,
    ].some((x) => x !== undefined && x !== null);

  if (!hasMeters && !tierParsed) {
    if (emptyHint) {
      return (
        <div className={className}>
          <p className="text-[13px] text-nest-text-secondary font-medium leading-relaxed">{emptyHint}</p>
        </div>
      );
    }
    return null;
  }

  const mode = ms?.electricity_pricing_mode;
  const elDelta = ms?.electricity_delta_kwh;
  const waDelta = ms?.water_delta_m3;

  return (
    <div className={className}>
      {hasMeters ? (
        <div className="rounded-2xl border border-nest-primary/15 bg-nest-bg/60 p-4 space-y-3">
          <p className="text-[11px] font-bold text-nest-text-secondary uppercase tracking-widest">
            Chỉ số điện — nước (đã nhập trong kỳ)
          </p>
          <p className="text-[13px] text-nest-text-primary font-medium leading-relaxed">
            <span className="text-nest-text-secondary font-bold">Điện:</span> chỉ số cũ{' '}
            <span className="font-bold">{fmtNum(ms.electricity_previous_kwh) ?? '—'} kWh</span>
            {' → '}
            chỉ số mới <span className="font-bold">{fmtNum(ms.electricity_current_kwh) ?? '—'} kWh</span>
            {elDelta != null && Number(elDelta) >= 0 ? (
              <>
                {' '}
                — tiêu thụ{' '}
                <span className="font-bold text-nest-text-primary">{Number(elDelta).toLocaleString('vi-VN')} kWh</span>
              </>
            ) : null}
          </p>
          <p className="text-[13px] text-nest-text-primary font-medium leading-relaxed">
            <span className="text-nest-text-secondary font-bold">Nước:</span> chỉ số cũ{' '}
            <span className="font-bold">{fmtNum(ms.water_previous_m3) ?? '—'} m³</span>
            {' → '}
            chỉ số mới <span className="font-bold">{fmtNum(ms.water_current_m3) ?? '—'} m³</span>
            {waDelta != null && Number(waDelta) >= 0 ? (
              <>
                {' '}
                — tiêu thụ{' '}
                <span className="font-bold text-nest-text-primary">{Number(waDelta).toLocaleString('vi-VN')} m³</span>
              </>
            ) : null}
          </p>
          {mode === 'flat' && Number(ms?.electricity_delta_kwh) > 0 && !tierParsed ? (
            <p className="text-[12px] text-nest-text-secondary font-medium italic">
              Tiền điện kỳ này tính theo đơn giá không bậc thang (VNĐ/kWh theo dịch vụ / hợp đồng).
            </p>
          ) : null}
        </div>
      ) : null}

      <ElectricityTierDetail breakdown={breakdown} className={hasMeters ? 'mt-4' : ''} />
    </div>
  );
}
