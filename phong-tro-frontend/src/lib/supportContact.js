/** Hotline & Zalo hỗ trợ — cấu hình qua biến môi trường Vite (tuỳ chọn). */
export const SUPPORT_HOTLINE = String(
  import.meta.env.VITE_SUPPORT_HOTLINE || '1900 6789'
).trim();

export const SUPPORT_ZALO_URL = String(
  import.meta.env.VITE_SUPPORT_ZALO_URL || 'https://zalo.me/84857667533'
).trim();

export function openSupportZalo() {
  if (!SUPPORT_ZALO_URL) return false;
  window.open(SUPPORT_ZALO_URL, '_blank', 'noopener,noreferrer');
  return true;
}

export function callSupportHotline() {
  if (!SUPPORT_HOTLINE) return false;
  window.location.href = `tel:${SUPPORT_HOTLINE.replace(/\s/g, '')}`;
  return true;
}

/** Gọi Zalo / hotline kèm toast lỗi (dùng chung tenant). */
export function contactZalo(addToast) {
  if (openSupportZalo()) return true;
  addToast?.('Chưa cấu hình liên kết Zalo.', 'error');
  return false;
}

export function contactHotline(addToast) {
  if (callSupportHotline()) return true;
  addToast?.('Chưa cấu hình số hotline.', 'error');
  return false;
}
