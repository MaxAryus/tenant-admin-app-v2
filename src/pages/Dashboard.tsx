import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Building2, Home, ArrowRight, Eye, Calendar, TicketCheck } from 'lucide-react';
import { useDashboard } from '../store/dashboardStore';
import { useCompany } from '../store/companyStore';
import { useTickets } from '../store/ticketStore';
import { useUsers } from '../store/userStore';
import UserModal from '../components/UserModal';

const StatCard = ({ title, value, icon: Icon, link, color, badge }: {
  title: string;
  value: number;
  icon: React.ElementType;
  link: string;
  color: string;
  badge?: number;
}) => (
  <Link
    to={link}
    className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      </div>
      <div className="relative">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-2 -right-2 bg-amber-500 text-white px-2 py-0.5 rounded-full text-xs font-medium min-w-[20px] text-center">
            {badge}
          </span>
        )}
      </div>
    </div>
    <div className="mt-4 flex items-center text-sm text-gray-600 hover:text-gray-900">
      <span>Details anzeigen</span>
      <ArrowRight className="ml-2 h-4 w-4" />
    </div>
  </Link>
);

const Dashboard = () => {
  const { stats, loading, error, fetchStats } = useDashboard();
  const { company } = useCompany();
  const { openTicketsCount, fetchOpenTicketsCount } = useTickets();
  const { setSelectedUser, selectedUser } = useUsers();
  const navigate = useNavigate();

  useEffect(() => {
    if (company) {
      fetchStats();
      fetchOpenTicketsCount();
    }
  }, [company, fetchStats, fetchOpenTicketsCount]);

  const handleUserClick = (user: any) => {
    navigate('/users');
    // Small delay to ensure navigation completes before showing modal
    setTimeout(() => {
      setSelectedUser(user);
    }, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Übersicht</h1>
        <p className="mt-1 text-sm text-gray-600">
          Willkommen zurück bei {company?.name}! Hier ist der aktuelle Stand Ihrer Firma.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Benutzer Gesamt"
          value={stats?.totalUsers || 0}
          icon={Users}
          link="/users"
          color="bg-blue-500"
        />
        <StatCard
          title="Objekte Gesamt"
          value={stats?.totalObjects || 0}
          icon={Building2}
          link="/objects"
          color="bg-emerald-500"
        />
        <StatCard
          title="Wohnungen Gesamt"
          value={stats?.totalApartments || 0}
          icon={Home}
          link="/objects"
          color="bg-purple-500"
        />
        <StatCard
          title="Schadensmeldungen"
          value={openTicketsCount || 0}
          icon={TicketCheck}
          link="/tickets"
          color="bg-amber-500"
          badge={openTicketsCount}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Neue Benutzer</h2>
          <Link
            to="/users"
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
          >
            Alle anzeigen
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="divide-y divide-gray-100">
          {stats?.recentUsers.map((user) => (
            <div
              key={user.user_id}
              className="py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              onClick={() => handleUserClick(user)}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-600 font-medium">
                    {user.first_name[0]}{user.last_name[0]}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {user.first_name} {user.last_name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Beigetreten am {new Date(user.created_at).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                </div>
              </div>
              <button
                className="p-2 text-gray-400 hover:text-emerald-600 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUserClick(user);
                }}
              >
                <Eye className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {selectedUser && (
        <UserModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;