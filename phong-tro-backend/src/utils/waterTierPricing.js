/**
 * Tính tiền nước theo bậc thang (m³ trong kỳ → cộng dồn từng bậc × đơn giá bậc).
 *
 * - WATER_USE_TIERED=0 → tắt bậc, dùng đơn giá phẳng (logic cũ trong services.js).
 * - WATER_TIERS_JSON → JSON mảng bậc tùy chỉnh (upTo = m³ tích lũy tối đa mỗi bậc).
 */

const { computeElectricityCostTiered, tiersAreValid } = require('./electricityTierPricing');

/** Biểu 4 bậc nước sinh hoạt (m³ tích lũy trong kỳ) — giá đ/m³ */
const DEFAULT_WATER_TIERS_REF = [
  { upTo: 10, price: 5973 },
  { upTo: 20, price: 7052 },
  { upTo: 30, price: 8669 },
  { upTo: null, price: 15929 },
];

function normalizeTiers(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const out = [];
  for (const row of raw) {
    const price = Number(row.price ?? row.priceVndPerM3 ?? 0);
    let upTo = row.upTo;
    if (upTo === undefined || upTo === null || upTo === '') {
      upTo = null;
    } else {
      upTo = Number(upTo);
      if (Number.isNaN(upTo) || upTo <= 0) continue;
    }
    if (Number.isNaN(price) || price < 0) continue;
    out.push({ upTo, price });
  }
  return out;
}

function useWaterTieredFromEnv() {
  const v = String(process.env.WATER_USE_TIERED ?? '1').trim().toLowerCase();
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false;
  return true;
}

function getWaterTiers() {
  const json = process.env.WATER_TIERS_JSON;
  if (json && String(json).trim()) {
    try {
      const parsed = JSON.parse(String(json));
      const n = normalizeTiers(parsed);
      if (n.length) return n;
    } catch {
      /* fall through */
    }
  }
  return normalizeTiers(DEFAULT_WATER_TIERS_REF);
}

/** Cùng thuật toán bậc tích lũy như điện; đơn vị là m³. */
function computeWaterCostTiered(deltaM3, tiers) {
  return computeElectricityCostTiered(deltaM3, tiers);
}

module.exports = {
  getWaterTiers,
  useWaterTieredFromEnv,
  computeWaterCostTiered,
  tiersAreValid,
  DEFAULT_WATER_TIERS_REF,
};
