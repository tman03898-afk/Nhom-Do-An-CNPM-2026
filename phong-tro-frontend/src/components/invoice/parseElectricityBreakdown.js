/**
 * Parse breakdown từ API: { mode: 'tiered', delta_kwh, tiers: [...] }
 */
export function parseInvoiceElectricityBreakdown(raw) {
  if (raw == null) return null;
  const o =
    typeof raw === 'string'
      ? (() => {
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        })()
      : raw;
  if (!o || o.mode !== 'tiered' || !Array.isArray(o.tiers) || o.tiers.length === 0) return null;
  return o;
}
