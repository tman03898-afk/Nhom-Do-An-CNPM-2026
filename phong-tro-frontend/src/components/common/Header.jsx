import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeNav, setActiveNav] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      if (window.scrollY < 100) setActiveNav(null);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isHome = location.pathname === '/';
  const isTransparent = isHome && !isScrolled;

  const headerClass = isHome 
    ? `fixed top-0 left-0 w-full z-50 px-8 py-6 flex flex-col md:flex-row justify-between items-center transition-all duration-300 ${isScrolled ? 'glass-panel shadow-sm !py-4' : 'bg-gradient-to-b from-black/60 to-transparent pb-12'}`
    : "glass-panel sticky top-0 z-50 px-8 py-4 flex flex-col md:flex-row justify-between items-center w-full shadow-sm";

  const textColor = isTransparent ? "text-white" : "text-nest-primary";
  const btnClass = "bg-nest-primary text-white";

  const navItems = [
    { id: 'phong-trong', label: 'Phòng nổi bật' },
    { id: 'tien-ich',   label: 'Tiện ích' },
    { id: 'quy-trinh', label: 'Quy trình' },
    { id: 'vi-tri',    label: 'Vị trí' },
  ];

  const handleNavClick = (id) => {
    setActiveNav(id);
    if (location.pathname !== '/') {
      window.location.href = `/#${id}`;
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getNavClass = (id) => {
    const isActive = activeNav === id;
    if (isTransparent) {
      return isActive
        ? 'text-white underline underline-offset-4 decoration-2'
        : 'text-white/80 hover:text-white transition-colors';
    }
    return isActive
      ? 'text-nest-primary font-bold underline underline-offset-4 decoration-2 decoration-nest-primary'
      : 'text-nest-text-secondary hover:text-nest-primary transition-colors';
  };

  return (
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
        className={`${textColor} font-sans font-bold text-2xl tracking-wide flex items-center gap-2`}
      >
        The Nest
      </Link>
      
      <nav className="hidden md:flex items-center gap-8 text-base font-bold">
        {navItems.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => handleNavClick(id)}
            className={getNavClass(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="flex gap-4 items-center mt-4 md:mt-0">
        {user ? (
          <>
            <span className={`${textColor} text-sm hidden lg:inline-block`}>Xin chào, {user.name}</span>
            <Link to={user.role === 'ADMIN' ? '/admin' : '/tenant'} className={`${isTransparent ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-[#EBF4F6] text-[#14B8A6] border border-[#14B8A6]/20 hover:bg-[#CFE8EA]'} backdrop-blur-md transition-colors flex items-center gap-2 px-5 py-2 rounded-full font-medium`}>
               <User className="w-4 h-4"/> {user.role === 'ADMIN' ? 'Admin' : 'Khách thuê'}
            </Link>
            <button onClick={logout} className={`${textColor} ${isTransparent ? 'hover:bg-white/20' : 'hover:bg-[#EBF4F6]'} p-2 rounded-full transition-colors backdrop-blur-md`}>
              <LogOut className="w-5 h-5" />
            </button>
          </>
        ) : (
          <Link to="/login" className={`${btnClass} hover:opacity-90 px-6 py-2.5 rounded-full text-base font-semibold transition-colors shadow-lg flex items-center gap-2`}>
            <User className="w-4 h-4" /> Đăng nhập
          </Link>
        )}
      </div>
    </header>
  );
}
