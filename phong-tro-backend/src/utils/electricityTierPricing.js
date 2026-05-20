/**
 * Tính tiền điện theo bậc thang (kWh trong kỳ → cộng dồn từng bậc × đơn giá bậc).
 *
 * Cấu hình:
 * - ELECTRICITY_USE_TIERED=0  → tắt bậc thang, dùng đơn giá phẳng (logic cũ trong services.js).
 * - ELECTRICITY_TIERS_JSON    → JSON mảng bậc, ví dụ (kWh tích lũy tối đa mỗi bậc):
 *   [{"upTo":50,"price":1984},{"upTo":100,"price":2050},{"upTo":200,"price":2380},{"upTo":300,"price":2998},{"upTo":400,"price":3350},{"upTo":null,"price":3460}]
 *   upTo: mức tích lũy kWh tối đa của bậc (bậc cuối dùng null hoặc số rất lớn = hết phần còn lại).
 *
 * Giá mặc định: biểu 6 bậc (kWh tích lũy trong kỳ → đơn giá từng bậc).
 * Có thể ghi đè bằng ELECTRICITY_TIERS_JSON.
 */

/** @typedef {{ upTo: number | null, price: number }} TierRow */

/** Tích lũy kWh tối đa của mỗi bậc: 1→50, 2→100, …, 6→401+ */
const DEFAULT_TIERS_REF = [
  { upTo: 50, price: 1984 },
  { upTo: 100, price: 2050 },
  { upTo: 200, price: 2380 },
  { upTo: 300, price: 2998 },
  { upTo: 400, price: 3350 },
  { upTo: null, price: 3460 },
];

function normalizeTiers(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const out = [];
  for (const row of raw) {
    const price = Number(row.price ?? row.priceVndPerKwh ?? 0);
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

function useTieredFromEnv() {
  const v = String(process.env.ELECTRICITY_USE_TIERED ?? '1').trim().toLowerCase();
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false;
  return true;
}

/**
 * @returns {TierRow[]}
 */
function getElectricityTiers() {
  const json = process.env.ELECTRICITY_TIERS_JSON;
  if (json && String(json).trim()) {
    try {
      const parsed = JSON.parse(String(json));
      const n = normalizeTiers(parsed);
      if (n.length) return n;
    } catch {
      /* fall through */
    }
  }
  return normalizeTiers(DEFAULT_TIERS_REF);
}

/**
 * @param {number} deltaKwh  Tiêu thụ kỳ (kWh), >= 0
 * @param {TierRow[]} tiers
 * @returns {{ total: number, breakdown: Array<{ bandFrom: number, bandTo: number, kwh: number, pricePerKwh: number, amount: number }> }}
 */
function computeElectricityCostTiered(deltaKwh, tiers) {
  const c = Math.max(Number(deltaKwh) || 0, 0);
  if (c <= 0 || !tiers.length) {
    return { total: 0, breakdown: [] };
  }

  let total = 0;
  let prev = 0;
  const breakdown = [];

  for (let i = 0; i < tiers.length; i++) {
    if (c <= prev) break;
    const tier = tiers[i];
    const cap =
      tier.upTo == null || tier.upTo === Infinity || !Number.isFinite(Number(tier.upTo))
        ? Infinity
        : Number(tier.upTo);
    const ceiling = Math.min(c, cap);
    const kwhInBand = ceiling - prev;
    if (kwhInBand <= 0) {
      prev = Math.max(prev, cap);
      continue;
    }
    const rate = Number(tier.price);
    const amount = kwhInBand * rate;
    total += amount;
    breakdown.push({
      bandFrom: prev + 1,
      bandTo: prev + kwhInBand,
      kwh: kwhInBand,
      pricePerKwh: rate,
      amount,
    });
    prev = ceiling;
  }

  if (c > prev) {
    const last = tiers[tiers.length - 1];
    const rate = Number(last.price);
    const kwhInBand = c - prev;
    const amount = kwhInBand * rate;
    total += amount;
    breakdown.push({
      bandFrom: prev + 1,
      bandTo: prev + kwhInBand,
      kwh: kwhInBand,
      pricePerKwh: rate,
      amount,
    });
  }

  return { total, breakdown };
}

function tiersAreValid(tiers) {
  if (!tiers.length) return false;
  return tiers.every((t) => Number(t.price) > 0);
}

module.exports = {
  getElectricityTiers,
  useTieredFromEnv,
  computeElectricityCostTiered,
  tiersAreValid,
  DEFAULT_TIERS_REF,
};
