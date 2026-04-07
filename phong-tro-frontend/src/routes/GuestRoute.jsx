import { Outlet, useLocation } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';

export default function GuestRoute() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="flex flex-col min-h-screen bg-nest-bg">
      <Header />
      <main className={`flex-1 w-full ${!isHome ? 'max-w-7xl mx-auto px-6 py-8' : ''}`}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
