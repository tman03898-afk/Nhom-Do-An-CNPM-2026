/**
 * Gửi SMS — cấu hình Twilio (khuyến nghị).
 *
 * Khi chưa cấu hình Twilio: mặc định **ghi log ra terminal** và coi như gửi thành công (để dev/demo).
 * Bắt buộc SMS thật (trả lỗi nếu chưa có Twilio): đặt `SMS_REQUIRE_REAL=1`.
 *
 * Tuỳ chọn bật log rõ hơn: `SMS_FALLBACK_LOG=1`.
 *
 * Biến môi trường Twilio:
 * - TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
 * - TWILIO_MESSAGING_SERVICE_SID (tuỳ chọn) hoặc TWILIO_PHONE_NUMBER (số gửi)
 */

function digitsOnly(s) {
  return String(s || '').replace(/\D/g, '');
}

/** Chuẩn hoá SĐT VN sang E.164 (+84...) cho Twilio */
function toE164Vietnam(phone) {
  const d = digitsOnly(phone);
  if (!d) return null;
  if (d.startsWith('84') && d.length >= 11) return `+${d}`;
  if (d.startsWith('0') && d.length >= 9) return `+84${d.slice(1)}`;
  if (d.length >= 9 && d.length <= 11) return `+84${d.replace(/^84/, '')}`;
  return `+${d}`;
}

function twilioConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      (process.env.TWILIO_MESSAGING_SERVICE_SID || process.env.TWILIO_PHONE_NUMBER)
  );
}

async function sendViaTwilio(toE164, bodyText) {
  const twilio = require('twilio');
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  const payload = {
    body: bodyText,
    to: toE164,
  };

  if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
    payload.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  } else {
    payload.from = process.env.TWILIO_PHONE_NUMBER;
  }

  await client.messages.create(payload);
}

/**
 * @param {string} phone — SĐT kiểu người dùng nhập (VD 0912..., +84912...)
 * @param {string} code — mã OTP 6 số
 */
async function sendProfileOtpSms(phone, code) {
  const to = toE164Vietnam(phone);
  if (!to || digitsOnly(phone).length < 9) {
    throw new Error('INVALID_PHONE');
  }

  const text = `[The Sun] Ma xac thuc ho so: ${code}. Hieu luc 10 phut. Khong chia se ma nay.`;

  if (twilioConfigured()) {
    await sendViaTwilio(to, text);
    return { ok: true, provider: 'twilio', to: maskPhoneLog(to) };
  }

  if (process.env.SMS_REQUIRE_REAL === '1') {
    throw new Error(
      'SMS_NOT_CONFIGURED — Thiết lập TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN và TWILIO_PHONE_NUMBER hoặc TWILIO_MESSAGING_SERVICE_SID trong .env'
    );
  }

  console.warn(
    `[SMS demo — chưa cấu hình Twilio, không gửi tin nhắn thật] → ${maskPhoneLog(to)}: ${text}`
  );
  return { ok: true, provider: 'log', to: maskPhoneLog(to) };
}

function maskPhoneLog(e164) {
  const d = digitsOnly(e164);
  if (d.length < 6) return '***';
  return `${d.slice(0, 4)}***${d.slice(-2)}`;
}

/**
 * Mã đổi mật khẩu khi tenant chọn xác thực SMS (đã đăng nhập).
 */
async function sendPasswordRecoverySms(phone, code) {
  const to = toE164Vietnam(phone);
  if (!to || digitsOnly(phone).length < 9) {
    throw new Error('INVALID_PHONE');
  }

  const text = `[The Sun] Ma doi mat khau tai khoan: ${code}. Hieu luc 10 phut. Khong chia se ma nay.`;

  if (twilioConfigured()) {
    await sendViaTwilio(to, text);
    return { ok: true, provider: 'twilio', to: maskPhoneLog(to) };
  }

  if (process.env.SMS_REQUIRE_REAL === '1') {
    throw new Error(
      'SMS_NOT_CONFIGURED — Thiết lập TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN và TWILIO_PHONE_NUMBER hoặc TWILIO_MESSAGING_SERVICE_SID trong .env'
    );
  }

  console.warn(
    `[SMS demo — đổi mật khẩu, chưa cấu hình Twilio] → ${maskPhoneLog(to)}: ${text}`
  );
  return { ok: true, provider: 'log', to: maskPhoneLog(to) };
}

/**
 * Gửi thông tin đăng nhập tenant qua SMS (khi guest chỉ để SĐT).
 */
async function sendTenantAccountCredentialsSms(phone, { fullName, email, password, roomNumber, contractId }) {
  const to = toE164Vietnam(phone);
  if (!to || digitsOnly(phone).length < 8) {
    throw new Error('INVALID_PHONE');
  }

  const text = `[The Sun] HD #${contractId || ''} phong ${roomNumber || ''}. Dang nhap: ${email} / MK: ${password}. Doi MK sau lan dau.`;

  if (twilioConfigured()) {
    await sendViaTwilio(to, text);
    return { ok: true, provider: 'twilio', to: maskPhoneLog(to) };
  }

  if (process.env.SMS_REQUIRE_REAL === '1') {
    throw new Error(
      'SMS_NOT_CONFIGURED — Thiết lập TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN và TWILIO_PHONE_NUMBER hoặc TWILIO_MESSAGING_SERVICE_SID trong .env'
    );
  }

  console.warn(`[SMS — tài khoản tenant] → ${maskPhoneLog(to)}: ${text}`);
  return { ok: true, provider: 'log', to: maskPhoneLog(to) };
}

module.exports = {
  sendProfileOtpSms,
  sendPasswordRecoverySms,
  sendTenantAccountCredentialsSms,
  twilioConfigured,
  toE164Vietnam,
};
