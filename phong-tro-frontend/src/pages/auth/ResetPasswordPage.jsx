import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Bird, Lock, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { apiFetch } from '../../lib/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get('token')?.trim() || '', [searchParams]);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (password.length < 8) {
      setErrorMessage('Mật khẩu tối thiểu 8 ký tự');
      return;
    }
    if (password !== confirm) {
      setErrorMessage('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: { token, password },
      });
      navigate('/login', { replace: true, state: { resetOk: true } });
    } catch (err) {
      setErrorMessage(err.message || 'Không đặt lại được mật khẩu');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-nest-bg font-sans p-6">
        <div className="w-full max-w-[460px] bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-10 border border-white shadow-xl text-center">
          <p className="text-nest-text-primary font-semibold mb-6">Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.</p>
          <Link to="/forgot-password" className="text-nest-primary font-bold hover:underline">
            Yêu cầu liên kết mới
          </Link>
          <div className="mt-6">
            <Link to="/login" className="text-sm text-nest-text-secondary hover:text-nest-primary">
              Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            Đặt lại mật khẩu
          </h1>
          <p className="text-nest-text-secondary font-medium text-sm mt-2">Nhập mật khẩu mới cho tài khoản của bạn.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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
            {isSubmitting ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            <CheckCircle size={18} />
          </button>

          {errorMessage && (
            <p className="text-red-500 text-sm font-medium text-center">{errorMessage}</p>
          )}
        </form>

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
