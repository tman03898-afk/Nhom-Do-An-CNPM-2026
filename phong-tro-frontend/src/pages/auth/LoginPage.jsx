import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Mail, Lock, LogIn, 
  ShieldCheck, HelpCircle, ChevronRight
} from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    // Determine role based on email (for mock/prototype purposes)
    const loginRole = email.toLowerCase().includes('admin') ? 'admin' : 'tenant';
    
    login(loginRole);
    if (loginRole === 'admin') navigate('/admin');
    else navigate('/tenant');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#DDF5F7] bg-gradient-to-tr from-[#DDF5F7] via-[#DDF5F7] to-[#B2E2E6] font-sans p-6 overflow-hidden relative">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#14B8A6]/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#0F3A40]/10 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-[480px] bg-white/70 backdrop-blur-xl rounded-[40px] p-10 md:p-12 border border-white shadow-2xl shadow-[#14B8A6]/10 relative z-10 transition-all duration-500 hover:shadow-[#14B8A6]/20">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-full bg-[#0F3A40] flex items-center justify-center text-white mb-6 shadow-xl shadow-[#0F3A40]/20">
            <Building2 size={32} />
          </div>
          <h1 className="text-[32px] font-sans font-extrabold text-[#0F3A40] tracking-tight leading-tight">The Nest Living</h1>
          <p className="text-[#4A787C] font-medium text-[15px] mt-1">Chào mừng bạn quay trở lại</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Email Field */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[11px] font-bold text-[#0F3A40] uppercase tracking-widest">EMAIL</label>
            </div>
            <div className="relative group">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full h-14 bg-[#EAF7F8]/80 border border-white focus:bg-white focus:border-[#14B8A6]/30 rounded-2xl px-6 py-4 text-[14.5px] outline-none shadow-sm transition-all text-[#0F3A40] font-medium placeholder-[#82ABB0]"
                placeholder="email@vi-du.com"
              />
              <Mail className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#82ABB0] group-focus-within:text-[#14B8A6] transition-colors" />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[11px] font-bold text-[#0F3A40] uppercase tracking-widest">MẬT KHẨU</label>
              <button type="button" className="text-[11px] font-bold text-[#14B8A6] hover:underline uppercase tracking-wide">Quên mật khẩu?</button>
            </div>
            <div className="relative group">
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full h-14 bg-[#EAF7F8]/80 border border-white focus:bg-white focus:border-[#14B8A6]/30 rounded-2xl px-6 py-4 text-[14.5px] outline-none shadow-sm transition-all text-[#0F3A40] font-medium placeholder-[#82ABB0]"
                placeholder="********"
              />
              <Lock className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#82ABB0] group-focus-within:text-[#14B8A6] transition-colors" />
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center gap-3 px-1">
            <input type="checkbox" id="remember" className="w-5 h-5 rounded-md border-[#BCE1E5] text-[#14B8A6] focus:ring-[#14B8A6]" />
            <label htmlFor="remember" className="text-[13.5px] font-semibold text-[#4A787C] cursor-pointer">Ghi nhớ đăng nhập</label>
          </div>

          {/* Login Button */}
          <button 
            type="submit"
            className="w-full h-15 py-4 rounded-3xl bg-[#14B8A6] hover:bg-[#12a191] text-white font-extrabold text-[16px] shadow-xl shadow-[#14B8A6]/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98] group"
          >
            Đăng nhập 
            <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-10 text-center">
          <p className="text-[14px] text-[#4A787C] font-medium">
            Bạn chưa có tài khoản? <button className="text-[#14B8A6] font-bold hover:underline">Liên hệ quản lý</button>
          </p>
        </div>
      </div>

      {/* Security Info */}
      <div className="mt-10 flex items-center gap-8 text-[#82ABB0] relative z-10">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} />
          <span className="text-[12px] font-bold uppercase tracking-widest">Bảo mật 256-bit</span>
        </div>
        <div className="flex items-center gap-2">
          <HelpCircle size={16} />
          <span className="text-[12px] font-bold uppercase tracking-widest">Hỗ trợ 24/7</span>
        </div>
      </div>

      {/* Background Sub-Image Decor (as seen in mockup bottom) */}
      <div className="absolute bottom-[-150px] w-full max-w-[800px] aspect-[16/9] bg-[#BDDEE2] rounded-[100px] opacity-40 blur-sm -z-0"></div>
    </div>
  );
}
