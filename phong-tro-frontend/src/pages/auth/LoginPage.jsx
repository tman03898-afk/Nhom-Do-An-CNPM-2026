import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Bird, Mail, Lock, LogIn, 
  ShieldCheck, HelpCircle
} from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    const loginRole = email.toLowerCase().includes('admin') ? 'admin' : 'tenant';
    login(loginRole);
    if (loginRole === 'admin') navigate('/admin');
    else navigate('/tenant');
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
            <Bird size={36} strokeWidth={2.5}/>
          </div>
          <h1 className="text-[28px] md:text-32px font-sans font-bold text-nest-text-primary tracking-tight leading-tight">
            The Nest <span className="text-nest-primary">Living</span>
          </h1>
          <p className="text-nest-text-secondary font-medium text-sm mt-2">Nơi khởi đầu của những trải nghiệm sống chất</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
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
              <button type="button" className="text-[11px] font-bold text-nest-primary hover:underline uppercase tracking-wide">Quên mật khẩu?</button>
            </div>
            <div className="relative group">
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full h-14 bg-white border border-gray-100 focus:border-nest-primary/30 rounded-2xl px-6 py-4 text-[14px] outline-none shadow-sm transition-all text-nest-text-primary font-medium placeholder-gray-300"
                placeholder="••••••••"
              />
              <Lock className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-nest-primary transition-colors" />
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center gap-3 px-1">
            <input type="checkbox" id="remember" className="w-5 h-5 rounded-md border-gray-200 text-nest-primary focus:ring-nest-primary cursor-pointer" />
            <label htmlFor="remember" className="text-[13px] font-semibold text-nest-text-secondary cursor-pointer">Ghi nhớ đăng nhập</label>
          </div>

          {/* Login Button */}
          <button 
            type="submit"
            className="w-full h-15 py-4 rounded-full bg-nest-primary hover:bg-[#0fa696] text-white font-bold text-base shadow-xl shadow-nest-primary/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98] group"
          >
            Đăng nhập 
            <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-10 text-center">
          <p className="text-[14px] text-nest-text-secondary font-medium">
            Bạn chưa có tài khoản? <button className="text-nest-primary font-bold hover:underline">Liên hệ quản lý</button>
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
