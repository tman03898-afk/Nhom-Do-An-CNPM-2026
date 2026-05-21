const { sendTenantAccountCredentialsEmail } = require('./mail');
const { sendTenantAccountCredentialsSms } = require('./sms');

function isValidEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  return e.length > 3 && /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(e);
}

function normalizePhoneDigits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

/** Có email → ưu tiên email; chỉ SĐT → SMS */
function pickCredentialNotifyChannel(guestEmail, guestPhone) {
  if (isValidEmail(guestEmail)) return 'email';
  if (normalizePhoneDigits(guestPhone).length >= 8) return 'sms';
  return null;
}

async function deliverTenantCredentials({ guestEmail, guestPhone, fullName, loginEmail, password, roomNumber, contractId }) {
  const channel = pickCredentialNotifyChannel(guestEmail, guestPhone);
  if (!channel) {
    return { ok: false, channel: null, message: 'Không có email hoặc SĐT để gửi thông tin đăng nhập' };
  }

  const payload = {
    fullName,
    email: loginEmail,
    password,
    roomNumber,
    contractId,
  };

  try {
    if (channel === 'email') {
      const to = isValidEmail(guestEmail) ? String(guestEmail).trim().toLowerCase() : loginEmail;
      const sent = await sendTenantAccountCredentialsEmail(to, payload);
      return { ok: true, channel: 'email', ...sent };
    }
    const sent = await sendTenantAccountCredentialsSms(guestPhone, payload);
    return { ok: true, channel: 'sms', ...sent };
  } catch (err) {
    console.error('deliverTenantCredentials:', err);
    return { ok: false, channel, message: err.message || 'Gửi thông tin đăng nhập thất bại' };
  }
}

module.exports = {
  isValidEmail,
  pickCredentialNotifyChannel,
  deliverTenantCredentials,
};
