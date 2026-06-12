/**
 * Gửi email qua Resend API (https://resend.com) — không bị Render chặn.
 *
 * Biến môi trường cần thiết:
 *   RESEND_API_KEY  — API key từ resend.com
 *   MAIL_FROM       — Địa chỉ người gửi (mặc định: onboarding@resend.dev nếu chưa có domain riêng)
 *
 * Chế độ dev (fallback):
 *   MAIL_FALLBACK_LOG=1  — In email ra console thay vì gửi thật
 */

const { Resend } = require('resend');

let _resend = null;

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

function smtpConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

function allowMailFallbackLog() {
  return process.env.MAIL_FALLBACK_LOG === '1' || process.env.NODE_ENV === 'development';
}

function getMailFrom() {
  return process.env.MAIL_FROM || 'onboarding@resend.dev';
}

function maskEmail(email) {
  const s = String(email || '');
  const at = s.indexOf('@');
  if (at < 2) return '***';
  return `${s.slice(0, 2)}***${s.slice(at)}`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendMail({ to, subject, text, html }) {
  const resend = getResend();
  if (resend) {
    const { error } = await resend.emails.send({
      from: `The Sun <${getMailFrom()}>`,
      to,
      subject,
      text,
      html,
    });
    if (error) throw new Error(error.message || 'Resend error');
    return { ok: true, provider: 'resend', to: maskEmail(to) };
  }

  if (allowMailFallbackLog()) {
    console.warn(`[MAIL fallback] Tới ${to} | ${subject}\n${text}`);
    return { ok: true, provider: 'log', to: maskEmail(to) };
  }

  throw new Error(
    'MAIL_NOT_CONFIGURED — Thiết lập RESEND_API_KEY trong .env hoặc bật MAIL_FALLBACK_LOG=1'
  );
}

async function sendTenantEmailVerificationCode(toEmail, code, displayName) {
  const subject = 'Mã xác nhận đổi email — The Sun';
  const text = `Xin chào${displayName ? ` ${displayName}` : ''},\n\nMã xác nhận đổi email tài khoản của bạn là: ${code}\n\nMã có hiệu lực 10 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.`;
  const html = `<p>Xin chào${displayName ? ` <strong>${escapeHtml(displayName)}</strong>` : ''},</p><p>Mã xác nhận đổi email tài khoản của bạn là:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${escapeHtml(code)}</p><p>Mã có hiệu lực 10 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`;
  return sendMail({ to: toEmail, subject, text, html });
}

async function sendPasswordResetOtpEmail(toEmail, code, displayName) {
  const subject = 'Mã đặt lại mật khẩu — The Sun';
  const text = `Xin chào${displayName ? ` ${displayName}` : ''},\n\nMã xác nhận đặt lại mật khẩu của bạn là: ${code}\n\nMã có hiệu lực 15 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này — mật khẩu không đổi.`;
  const html = `<p>Xin chào${displayName ? ` <strong>${escapeHtml(displayName)}</strong>` : ''},</p><p>Mã xác nhận đặt lại mật khẩu của bạn là:</p><p style="font-size:24px;font-weight:bold;letter-spacing:6px;">${escapeHtml(code)}</p><p>Mã có hiệu lực <strong>15 phút</strong>. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`;
  return sendMail({ to: toEmail, subject, text, html });
}

async function sendPasswordResetEmail(toEmail, resetUrl, displayName) {
  const subject = 'Đặt lại mật khẩu — The Sun';
  const text = `Xin chào${displayName ? ` ${displayName}` : ''},\n\nBạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu. Mở liên kết sau (có hiệu lực 1 giờ):\n\n${resetUrl}\n\nNếu bạn không yêu cầu, hãy bỏ qua email này — mật khẩu không đổi.`;
  const html = `<p>Xin chào${displayName ? ` <strong>${escapeHtml(displayName)}</strong>` : ''},</p><p>Bạn đã yêu cầu đặt lại mật khẩu. Nhấn vào liên kết dưới đây (hiệu lực <strong>1 giờ</strong>):</p><p><a href="${escapeHtml(resetUrl)}">${escapeHtml(resetUrl)}</a></p><p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`;
  return sendMail({ to: toEmail, subject, text, html });
}

async function sendTenantPasswordRecoveryEmail(toEmail, code, displayName) {
  return sendPasswordResetOtpEmail(toEmail, code, displayName);
}

async function sendTenantAccountCredentialsEmail(toEmail, { fullName, email, password, roomNumber, contractId }) {
  const subject = 'Tài khoản cổng khách thuê — The Sun';
  const text = `Xin chào${fullName ? ` ${fullName}` : ''},\n\nHợp đồng #${contractId || '—'} — phòng ${roomNumber || '—'} đã được tạo.\n\nĐăng nhập cổng khách thuê The Sun:\n- Email: ${email}\n- Mật khẩu: ${password}\n\nVui lòng đổi mật khẩu sau lần đăng nhập đầu.`;
  const html = `<p>Xin chào${fullName ? ` <strong>${escapeHtml(fullName)}</strong>` : ''},</p><p>Hợp đồng <strong>#${escapeHtml(String(contractId || '—'))}</strong> — phòng <strong>${escapeHtml(roomNumber || '—')}</strong> đã được tạo.</p><p><strong>Đăng nhập cổng khách thuê The Sun:</strong></p><ul><li>Email: <code>${escapeHtml(email)}</code></li><li>Mật khẩu: <code>${escapeHtml(password)}</code></li></ul><p>Vui lòng đổi mật khẩu sau lần đăng nhập đầu.</p>`;
  return sendMail({ to: toEmail, subject, text, html });
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
