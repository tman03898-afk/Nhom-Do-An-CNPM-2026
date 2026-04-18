import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, LogOut, Bird, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeNav, setActiveNav] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu when location changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const isHome = location.pathname === '/';
  const isTransparent = isHome && !isScrolled && !isMenuOpen;

  const headerClass = isHome 
    ? `fixed top-0 left-0 w-full z-50 px-6 md:px-8 py-4 md:py-6 flex justify-between items-center transition-all duration-[0.4s] ${isScrolled || isMenuOpen ? 'bg-white/80 backdrop-blur-xl shadow-sm border-b border-nest-primary/5' : 'bg-gradient-to-b from-black/40 to-transparent pb-16'}`
    : "bg-white/90 backdrop-blur-xl sticky top-0 z-50 px-6 md:px-8 py-4 flex justify-between items-center w-full shadow-sm border-b border-nest-primary/5";

  const textColor = isTransparent ? "text-white" : "text-nest-text-primary";
  const navItems = [
    { id: 'phong-trong', label: 'Phòng nổi bật' },
    { id: 'tien-ich',   label: 'Tiện ích' },
    { id: 'quy-trinh', label: 'Quy trình' },
    { id: 'vi-tri',    label: 'Vị trí' },
  ];

  const handleNavClick = (id) => {
    setActiveNav(id);
    setIsMenuOpen(false);
    if (location.pathname !== '/') {
      window.location.href = `/#${id}`;
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getNavClass = (id) => {
    const isActive = activeNav === id;
    const base = "relative py-1 transition-all duration-300 group text-sm md:text-[15px] font-bold";
    const status = isTransparent 
      ? isActive ? 'text-white' : 'text-white/80 hover:text-white'
      : isActive ? 'text-nest-primary' : 'text-nest-text-secondary hover:text-nest-primary';
    
    return `${base} ${status}`;
  };

  return (
    <>
      <header className={headerClass}>
        <Link 
          to="/" 
          onClick={(e) => {
            if (location.pathname === '/') {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setActiveNav(null);
            }
          }}
          className={`${textColor} font-sans font-bold text-xl md:text-2xl tracking-tight flex items-center gap-2.5 transition-transform hover:scale-[1.02] active:scale-95`}
        >
          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center ${isTransparent ? 'bg-white/10' : 'bg-nest-primary/10'}`}>
            <Bird className={`w-5 h-5 md:w-6 md:h-6 ${isTransparent ? 'text-white' : 'text-nest-primary'}`} />
          </div>
          <span>The Nest<span className={isTransparent ? 'text-white/60' : 'text-nest-primary'}>Living</span></span>
        </Link>
        
        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-10">
          {navItems.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => handleNavClick(id)}
              className={getNavClass(id)}
            >
              {label}
              <span className={`absolute bottom-0 left-0 w-0 h-[2px] bg-current transition-all duration-300 group-hover:w-full ${activeNav === id ? 'w-full' : ''}`}></span>
            </button>
          ))}
        </nav>

        <div className="flex gap-3 md:gap-4 items-center">
          {/* Desktop User Actions */}
          <div className="hidden md:flex gap-4 items-center">
            {user ? (
              <>
                <span className={`${textColor} text-sm hidden lg:inline-block font-medium`}>Xin chào, {user.name}</span>
                <Link to={user.role === 'ADMIN' ? '/admin' : '/tenant'} className={`${isTransparent ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-nest-surface-low text-nest-primary border border-nest-primary/10 hover:bg-nest-primary/10'} backdrop-blur-md transition-all flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm shadow-sm`}>
                   <User className="w-4 h-4"/> {user.role === 'ADMIN' ? 'Admin' : 'Khách thuê'}
                </Link>
                <button onClick={logout} className={`${textColor} ${isTransparent ? 'hover:bg-white/10' : 'hover:bg-nest-surface-low'} p-2.5 rounded-full transition-all`}>
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <Link to="/login" className={`px-7 py-3 rounded-full text-sm font-bold transition-all flex items-center gap-2 shadow-lg ${isTransparent ? 'bg-white text-nest-text-primary hover:bg-white/90' : 'bg-nest-primary text-white hover:bg-[#0fa696] shadow-nest-primary/20'}`}>
                <User className="w-4 h-4" /> Đăng nhập
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`md:hidden p-2 rounded-xl transition-colors ${isTransparent ? 'text-white hover:bg-white/10' : 'text-nest-primary hover:bg-nest-primary/5'}`}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-nest-text-primary/20 backdrop-blur-md" onClick={() => setIsMenuOpen(false)}></div>
          <div className="absolute top-0 right-0 w-[80%] h-full bg-white shadow-2xl p-8 pt-24 animate-in slide-in-from-right duration-500">
            <nav className="flex flex-col gap-6">
              {navItems.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => handleNavClick(id)}
                  className="text-left text-lg font-bold text-nest-text-primary hover:text-nest-primary transition-colors py-2 border-b border-gray-50"
                >
                  {label}
                </button>
              ))}
              <div className="pt-6 mt-6 border-t border-gray-100 flex flex-col gap-4">
                {user ? (
                   <>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-nest-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-nest-primary" />
                      </div>
                      <div>
                        <div className="text-xs text-nest-text-secondary">Xin chào,</div>
                        <div className="text-sm font-bold text-nest-text-primary">{user.name}</div>
                      </div>
                    </div>
                    <Link to={user.role === 'ADMIN' ? '/admin' : '/tenant'} className="w-full bg-nest-primary text-white px-6 py-4 rounded-2xl font-bold text-center shadow-lg shadow-nest-primary/20">
                      Vào Dashboard
                    </Link>
                    <button onClick={logout} className="w-full bg-gray-50 text-nest-text-secondary px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2">
                       <LogOut className="w-5 h-5" /> Đăng xuất
                    </button>
                   </>
                ) : (
                  <Link to="/login" className="w-full bg-nest-primary text-white px-6 py-4 rounded-2xl font-bold text-center shadow-lg shadow-nest-primary/20 flex items-center justify-center gap-2">
                    <User className="w-5 h-5" /> Đăng nhập
                  </Link>
                )}
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
