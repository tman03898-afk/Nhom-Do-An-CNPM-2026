import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle, ShieldCheck } from 'lucide-react';
import LoginForm from '../../components/common/LoginForm';
import { clearRememberedCredentials } from '../../lib/authStorage';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [resetNotice] = useState(() => Boolean(location.state?.resetOk));

  useEffect(() => {
    if (location.state?.resetOk) {
      clearRememberedCredentials();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const handleLoginSuccess = (user) => {
    navigate(user.role === 'ADMIN' ? '/admin' : '/tenant');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-nest-bg font-sans p-6 overflow-hidden relative">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-nest-primary/5 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-nest-primary/10 rounded-full blur-[120px]"></div>

      <LoginForm resetNotice={resetNotice} onSuccess={handleLoginSuccess} className="relative z-10" />

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
