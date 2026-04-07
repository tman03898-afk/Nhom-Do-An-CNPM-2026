import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, BedDouble, Users, FileText,
  CreditCard, Settings, Wrench, Bell, Search,
  Settings as Cog, Leaf
} from 'lucide-react';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const links = [
    { name: 'Bảng điều khiển', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Phòng', path: '/admin/rooms', icon: BedDouble },
    { name: 'Khách thuê', path: '/admin/tenants', icon: Users },
    { name: 'Hóa đơn', path: '/admin/invoices', icon: FileText },
    { name: 'Thanh toán', path: '/admin/payments', icon: CreditCard },
    { name: 'Dịch vụ', path: '/admin/services', icon: Settings },
    { name: 'Bảo trì', path: '/admin/tickets', icon: Wrench },
    { name: 'Thông báo', path: '/admin/notifications', icon: Bell },
  ];

  return (
    <div className="flex min-h-screen bg-[#DDF5F7] overflow-hidden text-[#0F3A40] font-sans">
      {/* Sidebar */}
      <aside className="w-[280px] flex flex-col pt-8 pb-6 px-6 border-r border-[#BCE1E5]">
        {/* Logo */}
        <div className="flex flex-col mb-12 px-2">
           <Link to="/" className="flex items-center gap-3 font-bold text-xl text-[#0F3A40] tracking-tight">
             <div className="w-8 h-8 rounded-lg bg-[#0F3A40] flex items-center justify-center text-[#14B8A6]">
                <Leaf className="w-5 h-5 fill-current" />
             </div>
             The Nest Living
           </Link>
           <span className="text-[10px] font-bold text-[#4A787C] tracking-widest uppercase mt-6">
             Bảng Điều Khiển Quản Trị
           </span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2 flex-1">
          {links.map((link) => {
            const isActive = location.pathname.startsWith(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all ${
                  isActive 
                    ? 'bg-[#F2FCFD] text-[#0F3A40] font-bold shadow-sm' 
                    : 'text-[#4A787C] hover:bg-[#F2FCFD]/60 hover:text-[#0F3A40] font-medium'
                }`}
              >
                <link.icon className={`w-[18px] h-[18px] ${isActive ? 'text-[#14B8A6]' : 'text-[#82ABB0]'}`} />
                <span className="text-sm">{link.name}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Navbar */}
        <header className="h-[90px] flex items-center justify-between px-10 shrink-0 border-b border-transparent">
           {/* Top nav links */}
           <div className="flex items-center gap-8 font-bold text-[#4A787C] text-sm">
             <Link to="/admin/dashboard" className="text-[#0F3A40] border-b-[3px] border-[#14B8A6] pb-[6px] transition-colors">Bảng điều khiển</Link>
             <Link to="/admin/rooms" className="hover:text-[#0F3A40] pb-[6px] border-b-[3px] border-transparent transition-colors">Tài sản</Link>
             <Link to="/admin/analytics" className="hover:text-[#0F3A40] pb-[6px] border-b-[3px] border-transparent transition-colors">Phân tích</Link>
           </div>
           
           {/* User Actions */}
           <div className="flex items-center gap-6">
              <button className="text-[#82ABB0] hover:text-[#0F3A40] transition-colors"><Search className="w-5 h-5" /></button>
              <button className="text-[#82ABB0] hover:text-[#0F3A40] transition-colors"><Cog className="w-5 h-5" /></button>
              
              <div className="flex items-center gap-3 pl-8 ml-2 border-l border-[#BCE1E5]">
                 <div className="w-10 h-10 rounded-full bg-[#14B8A6] text-white flex items-center justify-center font-bold overflow-hidden shadow-md">
                    <img src="https://ui-avatars.com/api/?name=Admin&background=14B8A6&color=fff" alt="Admin" className="w-full h-full object-cover"/>
                 </div>
                 <div className="flex flex-col items-end justify-center">
                    <span className="font-bold text-[#0F3A40] text-sm leading-tight">{user?.name || 'Quản trị viên'}</span>
                    <button onClick={logout} className="text-[#4A787C] text-[11px] hover:text-[#D14D4D] font-medium transition-colors mt-0.5">Đăng xuất</button>
                 </div>
              </div>
           </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-10 pb-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
