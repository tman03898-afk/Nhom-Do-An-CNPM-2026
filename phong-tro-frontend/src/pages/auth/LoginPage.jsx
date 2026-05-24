import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Sun, Mail, Lock, LogIn, 
  ShieldCheck, HelpCircle, Eye, EyeOff
} from 'lucide-react';
import { callSupportHotline, openSupportZalo, SUPPORT_HOTLINE } from '../../lib/supportContact';
import {
  clearRememberedCredentials,
  isRememberLoginEnabled,
  readRememberedCredentials,
} from '../../lib/authStorage';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(() => readRememberedCredentials().email);
  const [password, setPassword] = useState(() => readRememberedCredentials().password);
  const [rememberMe, setRememberMe] = useState(() => isRememberLoginEnabled());
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resetNotice, setResetNotice] = useState(false);

  useEffect(() => {
    if (location.state?.resetOk) {
      setResetNotice(true);
      clearRememberedCredentials();
      setPassword('');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const user = await login({ email, password, remember: rememberMe });
      if (user.role === 'ADMIN') navigate('/admin');
      else navigate('/tenant');
    } catch (error) {
      setErrorMessage(error.message || 'Đăng nhập thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-nest-bg font-sans p-6 overflow-hidden relative">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-nest-primary/5 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-nest-primary/10 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-[460px] bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-10 md:p-12 border border-white shadow-2xl shadow-nest-primary/5 relative z-10 transition-all duration-500">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-nest-primary/10 flex items-center justify-center text-nest-primary mb-6 shadow-sm border border-nest-primary/5">
            <Sun size={36} strokeWidth={2.5}/>
          </div>
          <h1 className="text-[28px] md:text-32px font-sans font-bold text-nest-text-primary tracking-tight leading-tight">
            The <span className="text-nest-primary">Sun</span>
          </h1>
          <p className="text-nest-text-secondary font-medium text-sm mt-2">Nơi khởi đầu của những trải nghiệm sống chất</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {resetNotice && (
            <p className="text-emerald-600 text-sm font-medium text-center bg-emerald-50 rounded-2xl py-3 px-4 border border-emerald-100">
              Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.
            </p>
          )}
          {/* Email Field */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-nest-text-primary uppercase tracking-[0.2em] px-1">Email</label>
            <div className="relative group">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full h-14 bg-white border border-gray-100 focus:border-nest-primary/30 rounded-2xl px-6 py-4 text-[14px] outline-none shadow-sm transition-all text-nest-text-primary font-medium placeholder-gray-300"
                placeholder="email@example.com"
              />
              <Mail className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-nest-primary transition-colors" />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[11px] font-bold text-nest-text-primary uppercase tracking-[0.2em]">Mật khẩu</label>
              <Link
                to="/forgot-password"
                className="text-[11px] font-bold text-nest-primary hover:underline uppercase tracking-wide"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative group">
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full h-14 bg-white border border-gray-100 focus:border-nest-primary/30 rounded-2xl px-6 py-4 pr-14 text-[14px] outline-none shadow-sm transition-all text-nest-text-primary font-medium placeholder-gray-300"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center text-gray-300 hover:text-nest-primary transition-colors"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center gap-3 px-1">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => {
                const checked = e.target.checked;
                setRememberMe(checked);
                if (!checked) {
                  clearRememberedCredentials();
                }
              }}
              className="w-5 h-5 rounded-md border-gray-200 text-nest-primary focus:ring-nest-primary cursor-pointer"
            />
            <label htmlFor="remember" className="text-[13px] font-semibold text-nest-text-secondary cursor-pointer">
              Ghi nhớ đăng nhập
            </label>
          </div>

          {/* Login Button */}
          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full h-15 py-4 rounded-full bg-nest-primary hover:bg-[#0fa696] text-white font-bold text-base shadow-xl shadow-nest-primary/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98] group"
          >
            {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>

          {errorMessage && (
            <p className="text-red-500 text-sm font-medium text-center">{errorMessage}</p>
          )}
        </form>

        {/* Footer Link */}
        <div className="mt-10 text-center">
          <p className="text-[14px] text-nest-text-secondary font-medium">
            Bạn chưa có tài khoản?{' '}
            <button
              type="button"
              onClick={() => callSupportHotline() || openSupportZalo()}
              className="text-nest-primary font-bold hover:underline"
              title={`Hotline ${SUPPORT_HOTLINE}`}
            >
              Liên hệ quản lý
            </button>
          </p>
        </div>
      </div>

      {/* Security Info */}
      <div className="mt-12 flex items-center gap-8 text-nest-text-secondary/60 relative z-10">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Bảo mật 256-bit</span>
        </div>
        <div className="flex items-center gap-2">
          <HelpCircle size={16} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Hỗ trợ 24/7</span>
        </div>
      </div>
    </div>
  );
}
