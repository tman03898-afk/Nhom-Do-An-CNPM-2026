/**
 * Gửi email qua SMTP (nodemailer).
 *
 * SMTP_HOST, SMTP_PORT (mặc 587), SMTP_SECURE ('true' nếu 465),
 * SMTP_USER, SMTP_PASS, MAIL_FROM (địa chỉ người gửi)
 */

const nodemailer = require('nodemailer');

let cachedTransport = null;

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function allowMailFallbackLog() {
  return process.env.MAIL_FALLBACK_LOG === '1' || process.env.NODE_ENV === 'development';
}

function getTransport() {
  if (!smtpConfigured()) return null;
  if (cachedTransport) return cachedTransport;

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;

  cachedTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return cachedTransport;
}

function maskEmail(email) {
  const s = String(email || '');
  const at = s.indexOf('@');
  if (at < 2) return '***';
  return `${s.slice(0, 2)}***${s.slice(at)}`;
}

async function sendTenantEmailVerificationCode(toEmail, code, displayName) {
  const subject = 'Mã xác nhận đổi email — The Sun';
  const text = `Xin chào${displayName ? ` ${displayName}` : ''},

Mã xác nhận đổi email tài khoản của bạn là: ${code}

Mã có hiệu lực 10 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.`;

  const html = `
  <p>Xin chào${displayName ? ` <strong>${escapeHtml(displayName)}</strong>` : ''},</p>
  <p>Mã xác nhận đổi email tài khoản của bạn là:</p>
  <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${escapeHtml(code)}</p>
  <p>Mã có hiệu lực 10 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
  `;

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;

  const transport = getTransport();
  if (transport) {
    await transport.sendMail({
      from: `"The Sun" <${from}>`,
      to: toEmail,
      subject,
      text,
      html,
    });
    return { ok: true, provider: 'smtp', to: maskEmail(toEmail) };
  }

  if (allowMailFallbackLog()) {
    console.warn(`[MAIL fallback — chưa cấu hình SMTP] tới ${toEmail}:\n${text}`);
    return { ok: true, provider: 'log', to: maskEmail(toEmail) };
  }

  throw new Error(
    'MAIL_NOT_CONFIGURED — Thiết lập SMTP_HOST, SMTP_USER, SMTP_PASS (và MAIL_FROM) trong .env'
  );
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendPasswordResetOtpEmail(toEmail, code, displayName) {
  const subject = 'Mã đặt lại mật khẩu — The Sun';
  const text = `Xin chào${displayName ? ` ${displayName}` : ''},

Mã xác nhận đặt lại mật khẩu của bạn là: ${code}

Mã có hiệu lực 15 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này — mật khẩu không đổi.`;

  const html = `
  <p>Xin chào${displayName ? ` <strong>${escapeHtml(displayName)}</strong>` : ''},</p>
  <p>Mã xác nhận đặt lại mật khẩu của bạn là:</p>
  <p style="font-size:24px;font-weight:bold;letter-spacing:6px;">${escapeHtml(code)}</p>
  <p>Mã có hiệu lực <strong>15 phút</strong>. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
  `;

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const transport = getTransport();
  if (transport) {
    await transport.sendMail({
      from: `"The Sun" <${from}>`,
      to: toEmail,
      subject,
      text,
      html,
    });
    return { ok: true, provider: 'smtp', to: maskEmail(toEmail) };
  }

  if (allowMailFallbackLog()) {
    console.warn(`[MAIL fallback — mã đặt lại mật khẩu] tới ${toEmail}:\n${text}`);
    return { ok: true, provider: 'log', to: maskEmail(toEmail) };
  }

  throw new Error(
    'MAIL_NOT_CONFIGURED — Thiết lập SMTP_HOST, SMTP_USER, SMTP_PASS (và MAIL_FROM) trong .env'
  );
}

async function sendPasswordResetEmail(toEmail, resetUrl, displayName) {
  const subject = 'Đặt lại mật khẩu — The Sun';
  const text = `Xin chào${displayName ? ` ${displayName}` : ''},

Bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu. Mở liên kết sau (có hiệu lực 1 giờ):

${resetUrl}

Nếu bạn không yêu cầu, hãy bỏ qua email này — mật khẩu không đổi.`;

  const html = `
  <p>Xin chào${displayName ? ` <strong>${escapeHtml(displayName)}</strong>` : ''},</p>
  <p>Bạn đã yêu cầu đặt lại mật khẩu. Nhấn vào liên kết dưới đây (hiệu lực <strong>1 giờ</strong>):</p>
  <p><a href="${escapeHtml(resetUrl)}">${escapeHtml(resetUrl)}</a></p>
  <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
  `;

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const transport = getTransport();
  if (transport) {
    await transport.sendMail({
      from: `"The Sun" <${from}>`,
      to: toEmail,
      subject,
      text,
      html,
    });
    return { ok: true, provider: 'smtp', to: maskEmail(toEmail) };
  }

  if (allowMailFallbackLog()) {
    console.warn(`[MAIL fallback — đặt lại mật khẩu] tới ${toEmail}:\n${text}`);
    return { ok: true, provider: 'log', to: maskEmail(toEmail) };
  }

  throw new Error(
    'MAIL_NOT_CONFIGURED — Thiết lập SMTP_HOST, SMTP_USER, SMTP_PASS (và MAIL_FROM) trong .env'
  );
}

/** Mã 6 số đổi mật khẩu từ trang hồ sơ (email đăng ký). */
async function sendTenantPasswordRecoveryEmail(toEmail, code, displayName) {
  return sendPasswordResetOtpEmail(toEmail, code, displayName);
}

/** Gửi thông tin đăng nhập tenant sau khi admin tạo hợp đồng */
async function sendTenantAccountCredentialsEmail(toEmail, { fullName, email, password, roomNumber, contractId }) {
  const subject = 'Tài khoản cổng khách thuê — The Sun';
  const text = `Xin chào${fullName ? ` ${fullName}` : ''},

Hợp đồng #${contractId || '—'} — phòng ${roomNumber || '—'} đã được tạo.

Đăng nhập cổng khách thuê The Sun:
- Email: ${email}
- Mật khẩu: ${password}

Vui lòng đổi mật khẩu sau lần đăng nhập đầu.`;

  const html = `
  <p>Xin chào${fullName ? ` <strong>${escapeHtml(fullName)}</strong>` : ''},</p>
  <p>Hợp đồng <strong>#${escapeHtml(String(contractId || '—'))}</strong> — phòng <strong>${escapeHtml(roomNumber || '—')}</strong> đã được tạo.</p>
  <p><strong>Đăng nhập cổng khách thuê The Sun:</strong></p>
  <ul>
    <li>Email: <code>${escapeHtml(email)}</code></li>
    <li>Mật khẩu: <code>${escapeHtml(password)}</code></li>
  </ul>
  <p>Vui lòng đổi mật khẩu sau lần đăng nhập đầu.</p>
  `;

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const transport = getTransport();
  if (transport) {
    await transport.sendMail({
      from: `"The Sun" <${from}>`,
      to: toEmail,
      subject,
      text,
      html,
    });
    return { ok: true, provider: 'smtp', to: maskEmail(toEmail) };
  }

  if (allowMailFallbackLog()) {
    console.warn(`[MAIL — tài khoản tenant] tới ${toEmail}:\n${text}`);
    return { ok: true, provider: 'log', to: maskEmail(toEmail) };
  }

  throw new Error(
    'MAIL_NOT_CONFIGURED — Thiết lập SMTP_HOST, SMTP_USER, SMTP_PASS (và MAIL_FROM) trong .env'
  );
}

module.exports = {
  sendTenantEmailVerificationCode,
  sendTenantPasswordRecoveryEmail,
  sendPasswordResetOtpEmail,
  sendPasswordResetEmail,
  sendTenantAccountCredentialsEmail,
  smtpConfigured,
  maskEmail,
};
