import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User2, Mail, Phone, Calendar, ChevronLeft, ChevronRight, Search, RefreshCw } from 'lucide-react';
import { useUsers } from '../store/userStore';
import { useCompany } from '../store/companyStore';
import UserModal from '../components/UserModal';
import NewUserModal from '../components/NewUserModal';

const Users = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    users, 
    loading, 
    error, 
    searchTerm, 
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    setSearchTerm, 
    setCurrentPage,
    fetchUsers, 
    selectedUser, 
    setSelectedUser 
  } = useUsers();
  const { company, loading: companyLoading } = useCompany();
  const [refreshing, setRefreshing] = React.useState(false);
  const [showNewUserModal, setShowNewUserModal] = React.useState(false);

  useEffect(() => {
    if (company) {
      fetchUsers();
    }
  }, [fetchUsers, company]);

  useEffect(() => {
    const state = location.state as { userId?: string };
    if (state?.userId) {
      const user = users.find(u => u.user_id === state.userId);
      if (user) {
        setSelectedUser(user);
      }
      navigate(location.pathname, { replace: true });
    }
  }, [location, users, setSelectedUser, navigate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers(true);
    setRefreshing(false);
  };

  // Only show loading indicator on initial load
  if ((companyLoading || loading) && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800">
        Bitte wählen Sie zuerst ein Unternehmen aus.
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
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Benutzerverwaltung</h1>
          <p className="mt-1 text-sm text-gray-600">Verwalten Sie Ihre Firmenbenutzer und deren Zugriff</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => setShowNewUserModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <User2 size={20} />
            Neuer Benutzer
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Benutzer suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kontakt</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beigetreten</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.user_id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedUser(user)}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-emerald-100 flex items-center justify-center">
                      <span className="text-emerald-600 font-medium">
                        {user.first_name[0]}{user.last_name[0]}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    {user.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail size={16} />
                        {user.email}
                      </div>
                    )}
                    {user.phone_number && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone size={16} />
                        {user.phone_number}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar size={16} />
                    {new Date(user.created_at).toLocaleDateString('de-DE')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button className="text-emerald-600 hover:text-emerald-800 font-medium">
                    Bearbeiten
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && users.length > 0 && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        )}

        <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">
              Zeige <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> bis{' '}
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> von{' '}
              <span className="font-medium">{totalItems}</span> Einträgen
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Zurück</span>
            </button>
            <span className="px-4 py-2 text-sm text-gray-700">
              Seite {currentPage} von {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="hidden sm:inline">Weiter</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {selectedUser && (
        <UserModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}

      {showNewUserModal && (
        <NewUserModal
          onClose={() => setShowNewUserModal(false)}
        />
      )}
    </div>
  );
};

export default Users;