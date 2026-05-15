import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bird, Mail, ArrowLeft, Send, KeyRound, Lock, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../lib/api';

const RESEND_COOLDOWN_SEC = 60;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  /** @type {'email' | 'code' | 'password'} */
  const [phase, setPhase] = useState('email');
  const [email, setEmail] = useState('');
  const [lockedEmail, setLockedEmail] = useState('');
  const [resetSessionToken, setResetSessionToken] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resendSec, setResendSec] = useState(0);

  const tickResend = useCallback(() => {
    setResendSec((s) => (s <= 1 ? 0 : s - 1));
  }, []);

  useEffect(() => {
    if (resendSec <= 0) return undefined;
    const id = setInterval(tickResend, 1000);
    return () => clearInterval(id);
  }, [resendSec, tickResend]);

  const startResendCooldown = () => setResendSec(RESEND_COOLDOWN_SEC);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const trimmed = email.trim();
      const data = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: { email: trimmed },
      });
      setSuccessMessage(data?.message || 'Nếu email tồn tại, bạn sẽ nhận mã 6 số.');
      setLockedEmail(trimmed.toLowerCase());
      setPhase('code');
      setCode('');
      setResetSessionToken('');
      setPassword('');
      setConfirm('');
      startResendCooldown();
    } catch (err) {
      setErrorMessage(err.message || 'Không thể gửi mã');
      if (err.status === 429 && err.data?.retry_after_sec != null) {
        setResendSec(Number(err.data.retry_after_sec) || RESEND_COOLDOWN_SEC);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendSec > 0 || !lockedEmail) return;
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);
    try {
      const data = await apiFetch('/auth/forgot-password-resend', {
        method: 'POST',
        body: { email: lockedEmail },
      });
      setSuccessMessage(data?.message || 'Đã gửi lại mã.');
      if (phase === 'code') setCode('');
      if (phase === 'password') {
        setResetSessionToken('');
        setPhase('code');
        setPassword('');
        setConfirm('');
      }
      startResendCooldown();
    } catch (err) {
      setErrorMessage(err.message || 'Không gửi lại được mã');
      if (err.status === 429 && err.data?.retry_after_sec != null) {
        setResendSec(Number(err.data.retry_after_sec) || RESEND_COOLDOWN_SEC);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!/^\d{6}$/.test(code.trim())) {
      setErrorMessage('Nhập đúng mã 6 chữ số.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await apiFetch('/auth/forgot-password-verify-code', {
        method: 'POST',
        body: { email: lockedEmail, code: code.trim() },
      });
      const token = data?.reset_session_token;
      if (!token || typeof token !== 'string') {
        setErrorMessage('Phản hồi máy chủ không hợp lệ. Thử lại.');
        return;
      }
      setResetSessionToken(token);
      setSuccessMessage(data?.message || 'Mã đúng. Nhập mật khẩu mới bên dưới.');
      setPhase('password');
      setPassword('');
      setConfirm('');
    } catch (err) {
      setErrorMessage(err.message || 'Mã không đúng');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (password.length < 8) {
      setErrorMessage('Mật khẩu mới tối thiểu 8 ký tự.');
      return;
    }
    if (password !== confirm) {
      setErrorMessage('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (!resetSessionToken) {
      setErrorMessage('Phiên đặt lại mật khẩu hết hạn. Xác nhận mã lại.');
      setPhase('code');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch('/auth/forgot-password-set-password', {
        method: 'POST',
        body: {
          email: lockedEmail,
          reset_session_token: resetSessionToken,
          password,
          password_confirm: confirm,
        },
      });
      navigate('/login', { replace: true, state: { resetOk: true } });
    } catch (err) {
      setErrorMessage(err.message || 'Không đặt lại được mật khẩu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goChangeEmail = () => {
    setPhase('email');
    setErrorMessage('');
    setSuccessMessage('');
    setCode('');
    setPassword('');
    setConfirm('');
    setResetSessionToken('');
    setResendSec(0);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-nest-bg font-sans p-6 overflow-hidden relative">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-nest-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-nest-primary/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-[460px] bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-10 md:p-12 border border-white shadow-2xl shadow-nest-primary/5 relative z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-nest-primary/10 flex items-center justify-center text-nest-primary mb-6 shadow-sm border border-nest-primary/5">
            <Bird size={36} strokeWidth={2.5} />
          </div>
          <h1 className="text-[24px] md:text-[28px] font-bold text-nest-text-primary tracking-tight">
            Quên mật khẩu
          </h1>
          <p className="text-nest-text-secondary font-medium text-sm mt-2 px-2">
            {phase === 'email' &&
              'Nhập email đã đăng ký — chúng tôi gửi mã 6 số (nếu tài khoản tồn tại).'}
            {phase === 'code' && `Nhập mã 6 số đã gửi tới ${lockedEmail}.`}
            {phase === 'password' && 'Đặt mật khẩu mới cho tài khoản của bạn.'}
          </p>
        </div>

        {phase === 'email' && (
          <form onSubmit={handleSendCode} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-nest-text-primary uppercase tracking-[0.2em] px-1">
                Email
              </label>
              <div className="relative group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="w-full h-14 bg-white border border-gray-100 focus:border-nest-primary/30 rounded-2xl px-6 py-4 text-[14px] outline-none shadow-sm text-nest-text-primary font-medium placeholder-gray-300"
                  placeholder="email@example.com"
                />
                <Mail className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-nest-primary transition-colors" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-full bg-nest-primary hover:bg-[#0fa696] text-white font-bold text-base shadow-xl shadow-nest-primary/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              {isSubmitting ? 'Đang gửi...' : 'Gửi mã'}
              <Send size={18} />
            </button>

            {successMessage && (
              <p className="text-emerald-600 text-sm font-medium text-center">{successMessage}</p>
            )}
            {errorMessage && (
              <p className="text-red-500 text-sm font-medium text-center">{errorMessage}</p>
            )}
          </form>
        )}

        {phase === 'code' && (
          <form onSubmit={handleVerifyCode} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-nest-text-primary uppercase tracking-[0.2em] px-1">
                Mã 6 số
              </label>
              <div className="relative group">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  className="w-full h-14 bg-white border border-gray-100 focus:border-nest-primary/30 rounded-2xl px-6 py-4 text-[18px] tracking-[0.35em] text-center font-bold outline-none shadow-sm text-nest-text-primary"
                  placeholder="••••••"
                />
                <KeyRound className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-nest-primary" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-full bg-nest-primary hover:bg-[#0fa696] text-white font-bold text-base shadow-xl shadow-nest-primary/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {isSubmitting ? 'Đang kiểm tra...' : 'Xác nhận mã'}
            </button>

            <div className="flex flex-col items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleResend}
                disabled={isSubmitting || resendSec > 0}
                className="inline-flex items-center gap-2 text-nest-primary font-bold text-sm hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
              >
                <RefreshCw size={16} className={isSubmitting ? 'animate-spin' : ''} />
                {resendSec > 0 ? `Gửi lại mã (${resendSec}s)` : 'Gửi lại mã xác nhận'}
              </button>
              <button
                type="button"
                onClick={goChangeEmail}
                className="text-nest-text-secondary text-xs font-medium hover:text-nest-primary"
              >
                Đổi email khác
              </button>
            </div>

            {successMessage && (
              <p className="text-emerald-600 text-sm font-medium text-center">{successMessage}</p>
            )}
            {errorMessage && (
              <p className="text-red-500 text-sm font-medium text-center">{errorMessage}</p>
            )}
          </form>
        )}

        {phase === 'password' && (
          <form onSubmit={handleSetPassword} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-nest-text-primary uppercase tracking-[0.2em] px-1">
                Mật khẩu mới
              </label>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="w-full h-14 bg-white border border-gray-100 focus:border-nest-primary/30 rounded-2xl px-6 py-4 pr-14 text-[14px] outline-none shadow-sm text-nest-text-primary font-medium"
                  placeholder="Tối thiểu 8 ký tự"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center text-gray-300 hover:text-nest-primary"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-nest-text-primary uppercase tracking-[0.2em] px-1">
                Xác nhận mật khẩu
              </label>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="w-full h-14 bg-white border border-gray-100 focus:border-nest-primary/30 rounded-2xl px-6 py-4 pr-14 text-[14px] outline-none shadow-sm text-nest-text-primary font-medium"
                  placeholder="Nhập lại mật khẩu"
                />
                <Lock className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-nest-primary" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-full bg-nest-primary hover:bg-[#0fa696] text-white font-bold text-base shadow-xl shadow-nest-primary/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {isSubmitting ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
            </button>

            <div className="flex flex-col items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleResend}
                disabled={isSubmitting || resendSec > 0}
                className="inline-flex items-center gap-2 text-nest-primary font-bold text-sm hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
              >
                <RefreshCw size={16} className={isSubmitting ? 'animate-spin' : ''} />
                {resendSec > 0 ? `Gửi lại mã (${resendSec}s)` : 'Gửi lại mã xác nhận'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhase('code');
                  setResetSessionToken('');
                  setPassword('');
                  setConfirm('');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="text-nest-text-secondary text-xs font-medium hover:text-nest-primary"
              >
                ← Quay lại nhập mã
              </button>
            </div>

            {successMessage && (
              <p className="text-emerald-600 text-sm font-medium text-center">{successMessage}</p>
            )}
            {errorMessage && (
              <p className="text-red-500 text-sm font-medium text-center">{errorMessage}</p>
            )}
          </form>
        )}

        <div className="mt-8 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-nest-primary font-bold text-sm hover:underline"
          >
            <ArrowLeft size={16} />
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
