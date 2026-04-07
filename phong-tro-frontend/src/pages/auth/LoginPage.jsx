import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (role) => {
    login(role);
    if (role === 'admin') navigate('/admin');
    else navigate('/tenant');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-nest-bg bg-gradient-to-br from-nest-bg to-[#A5D8DD]">
      <div className="glass-card max-w-md w-full p-8 text-center relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-nest-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#0F3A40]/10 rounded-full blur-3xl"></div>
        
        <h1 className="text-3xl font-sans font-bold text-nest-primary-container mb-2 relative z-10">The Nest Living</h1>
        <p className="text-nest-text-secondary mb-8 relative z-10">Một trải nghiệm sống tĩnh tại và thanh bình.</p>
        
        <div className="space-y-4 relative z-10">
          <button 
            onClick={() => handleLogin('tenant')}
            className="w-full py-4 rounded-xl bg-white/50 hover:bg-white text-nest-text-primary font-medium transition-all shadow-sm border border-white/60 hover:shadow-md"
          >
            Đăng nhập Khách Thuê
          </button>
          
          <button 
            onClick={() => handleLogin('admin')}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-nest-primary to-nest-primary-container text-white font-medium hover:scale-[1.02] transition-transform shadow-md"
          >
            Đăng nhập Quản Trị
          </button>
        </div>
        
        <div className="mt-8 text-sm text-nest-text-secondary relative z-10 italic">
           * Mock Login: Click vào nút phía trước để truy cập dashboard.
        </div>
      </div>
    </div>
  );
}
