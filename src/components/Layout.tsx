import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutGrid, 
  Users, 
  Building2, 
  TicketCheck, 
  LogOut, 
  Settings as SettingsIcon,
  ChevronDown,
  User,
  Newspaper,
  Phone
} from 'lucide-react';
import { useAuth } from '../store/authStore';
import { useCompany } from '../store/companyStore';
import { useTickets } from '../store/ticketStore';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { company, loading, fetchCompany } = useCompany();
  const { openTicketsCount, fetchOpenTicketsCount } = useTickets();
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  useEffect(() => {
    if (company) {
      fetchOpenTicketsCount();
    }
  }, [company, fetchOpenTicketsCount]);

  const isActive = (path: string) => {
    return location.pathname === path ? 'bg-white/10' : '';
  };

  const isMobileActive = (path: string) => {
    return location.pathname === path ? 'text-emerald-600' : 'text-gray-600';
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-full w-64 bg-emerald-600 text-white z-40">
        <div className="h-full flex flex-col w-full">
          <div className="p-6">
            <div className="flex items-center gap-4">
              {company?.logo_url ? (
                <img 
                  src={company.logo_url} 
                  alt={company.name}
                  className="h-10 w-10 rounded-lg object-contain bg-white"
                />
              ) : (
                <Building2 className="h-10 w-10" />
              )}
              <div>
                <h1 className="text-xl font-bold">
                  {loading ? 'Lädt...' : company?.name || 'Firmen Dashboard'}
                </h1>
                <span className="text-sm text-white/80">
                  {company ? `${company.city}, ${company.land}` : 'Admin-Bereich'}
                </span>
              </div>
            </div>
          </div>

          <div className="px-4">
            <div className="bg-white/10 rounded-xl p-4">
              <h2 className="text-xl font-semibold">Verwaltung</h2>
            </div>
          </div>

          <div className="mt-6 flex-1">
            <p className="px-6 text-sm text-white/60 uppercase">Navigation</p>
            <nav className="mt-2 space-y-1">
              <Link
                to="/dashboard"
                className={`flex items-center gap-3 px-6 py-3 hover:bg-white/10 transition-colors ${isActive('/dashboard')}`}
              >
                <LayoutGrid size={20} />
                <span>Übersicht</span>
              </Link>
              <Link
                to="/users"
                className={`flex items-center gap-3 px-6 py-3 hover:bg-white/10 transition-colors ${isActive('/users')}`}
              >
                <Users size={20} />
                <span>Benutzer</span>
              </Link>
              <Link
                to="/objects"
                className={`flex items-center gap-3 px-6 py-3 hover:bg-white/10 transition-colors ${isActive('/objects')}`}
              >
                <Building2 size={20} />
                <span>Objekte</span>
              </Link>
              <Link
                to="/contacts"
                className={`flex items-center gap-3 px-6 py-3 hover:bg-white/10 transition-colors ${isActive('/contacts')}`}
              >
                <Phone size={20} />
                <span>Kontakte</span>
              </Link>
              <Link
                to="/tickets"
                className={`flex items-center justify-between px-6 py-3 hover:bg-white/10 transition-colors ${isActive('/tickets')}`}
              >
                <div className="flex items-center gap-3">
                  <TicketCheck size={20} />
                  <span>Schadensmeldungen</span>
                </div>
                {openTicketsCount > 0 && (
                  <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-xs font-medium">
                    {openTicketsCount}
                  </span>
                )}
              </Link>
              <Link
                to="/news"
                className={`flex items-center gap-3 px-6 py-3 hover:bg-white/10 transition-colors ${isActive('/news')}`}
              >
                <Newspaper size={20} />
                <span>Neuigkeiten</span>
              </Link>
            </nav>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-64 pb-20 lg:pb-0">
        {/* Top Navigation Bar */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-end">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
              >
                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <User size={18} className="text-emerald-600" />
                </div>
                <ChevronDown size={16} />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
                  <Link
                    to="/settings"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <SettingsIcon size={16} />
                    Einstellungen
                  </Link>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 w-full"
                  >
                    <LogOut size={16} />
                    Abmelden
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="grid grid-cols-6 h-16">
          <Link
            to="/dashboard"
            className={`flex flex-col items-center justify-center ${isMobileActive('/dashboard')}`}
          >
            <LayoutGrid size={24} />
            <span className="text-xs mt-1">Übersicht</span>
          </Link>
          <Link
            to="/users"
            className={`flex flex-col items-center justify-center ${isMobileActive('/users')}`}
          >
            <Users size={24} />
            <span className="text-xs mt-1">Benutzer</span>
          </Link>
          <Link
            to="/objects"
            className={`flex flex-col items-center justify-center ${isMobileActive('/objects')}`}
          >
            <Building2 size={24} />
            <span className="text-xs mt-1">Objekte</span>
          </Link>
          <Link
            to="/contacts"
            className={`flex flex-col items-center justify-center ${isMobileActive('/contacts')}`}
          >
            <Phone size={24} />
            <span className="text-xs mt-1">Kontakte</span>
          </Link>
          <Link
            to="/tickets"
            className={`relative flex flex-col items-center justify-center ${isMobileActive('/tickets')}`}
          >
            <TicketCheck size={24} />
            <span className="text-xs mt-1">Tickets</span>
            {openTicketsCount > 0 && (
              <span className="absolute top-1 right-2 bg-amber-500 text-white px-1.5 py-0.5 rounded-full text-xs font-medium min-w-[20px] text-center">
                {openTicketsCount}
              </span>
            )}
          </Link>
          <Link
            to="/news"
            className={`flex flex-col items-center justify-center ${isMobileActive('/news')}`}
          >
            <Newspaper size={24} />
            <span className="text-xs mt-1">News</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default Layout;