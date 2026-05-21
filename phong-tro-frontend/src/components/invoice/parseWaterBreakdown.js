/**
 * Parse breakdown từ API: { mode: 'tiered', delta_m3, tiers: [...] }
 */
export function parseInvoiceWaterBreakdown(raw) {
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
