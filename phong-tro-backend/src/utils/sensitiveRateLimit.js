/**
 * Giới hạn thao tác nhạy cảm (quên mật khẩu, reset token, đổi mật khẩu):
 * tối đa 5 lần, sau đó chặn 5 phút (theo key, ví dụ IP hoặc user_id).
 */

const MAX_ACTIONS = 5;
const BLOCK_MS = 5 * 60 * 1000;

/** @type {Map<string, { n: number, blockedUntil: number }>} */
const buckets = new Map();

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || '0.0.0.0';
}

function retryAfterSec(blockedUntil) {
  return Math.max(1, Math.ceil((blockedUntil - Date.now()) / 1000));
}

/**
 * Mỗi lần gọi = một lần "nhập" (dùng cho quên mật khẩu).
 * @returns {{ ok: true } | { ok: false, retryAfterSec: number }}
 */
function registerAttempt(key) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b) b = { n: 0, blockedUntil: 0 };

  if (b.blockedUntil > now) {
    return { ok: false, retryAfterSec: retryAfterSec(b.blockedUntil) };
  }
  if (b.blockedUntil && b.blockedUntil <= now) {
    b = { n: 0, blockedUntil: 0 };
  }

  if (b.n >= MAX_ACTIONS) {
    b.blockedUntil = now + BLOCK_MS;
    b.n = 0;
    buckets.set(key, b);
    return { ok: false, retryAfterSec: retryAfterSec(b.blockedUntil) };
  }

  b.n += 1;
  buckets.set(key, b);
  return { ok: true };
}

/**
 * Chỉ tăng khi thất bại (token reset sai, mật khẩu hiện tại sai).
 * @returns {{ ok: true } | { ok: false, retryAfterSec: number, lockedOut?: boolean }}
 */
function registerFailure(key) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b) b = { n: 0, blockedUntil: 0 };

  if (b.blockedUntil > now) {
    return { ok: false, retryAfterSec: retryAfterSec(b.blockedUntil) };
  }
  if (b.blockedUntil && b.blockedUntil <= now) {
    b = { n: 0, blockedUntil: 0 };
  }

  b.n += 1;
  if (b.n > MAX_ACTIONS) {
    b.blockedUntil = now + BLOCK_MS;
    b.n = 0;
    buckets.set(key, b);
    return { ok: false, retryAfterSec: retryAfterSec(b.blockedUntil), lockedOut: true };
  }
  buckets.set(key, b);
  return { ok: true };
}

function assertNotBlocked(key) {
  const now = Date.now();
  const b = buckets.get(key);
  if (b && b.blockedUntil > now) {
    return { blocked: true, retryAfterSec: retryAfterSec(b.blockedUntil) };
  }
  return { blocked: false };
}

function clearRateLimit(key) {
  buckets.delete(key);
}

module.exports = {
  clientIp,
  registerAttempt,
  registerFailure,
  assertNotBlocked,
  clearRateLimit,
  MAX_ACTIONS,
  BLOCK_MS,
};
