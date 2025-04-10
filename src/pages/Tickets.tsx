import React, { useEffect } from 'react';
import { useTickets, Ticket } from '../store/ticketStore';
import { useCompany } from '../store/companyStore';
import { 
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Building2,
  Home,
  Image as ImageIcon,
  ChevronLeft,
  RefreshCw
} from 'lucide-react';
import TicketModal from '../components/TicketModal';

const TicketStatusBadge = ({ isOpen }: { isOpen: boolean }) => (
  <span className={`px-3 py-1 rounded-full text-sm ${
    isOpen 
      ? 'bg-amber-100 text-amber-700'
      : 'bg-emerald-100 text-emerald-700'
  }`}>
    {isOpen ? 'Offen' : 'Geschlossen'}
  </span>
);

const TicketCard = ({ ticket, onClick }: { ticket: Ticket; onClick: () => void }) => (
  <div 
    className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
    onClick={onClick}
  >
    <div className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <TicketStatusBadge isOpen={ticket.is_open} />
            {ticket.damage_type_info && (
              <span className="text-sm text-gray-600">
                {ticket.damage_type_info.name}
              </span>
            )}
          </div>
          <h3 className="text-lg font-medium text-gray-900">{ticket.subject}</h3>
          <p className="mt-1 text-sm text-gray-600 line-clamp-2">{ticket.message}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 hidden sm:block" />
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            {ticket.apartment && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Building2 className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{ticket.apartment.object.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Home className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{ticket.apartment.name}</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            {ticket.images && ticket.images.length > 0 && (
              <div className="flex items-center gap-1 text-gray-600">
                <ImageIcon className="h-4 w-4" />
                <span>{ticket.images.length}</span>
              </div>
            )}
            <span className="text-gray-500">
              {new Date(ticket.created_at).toLocaleDateString('de-DE')}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Tickets = () => {
  const { 
    tickets,
    objects,
    loading,
    error,
    searchTerm,
    statusFilter,
    selectedTicket,
    selectedObjectId,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    setSearchTerm,
    setStatusFilter,
    setSelectedTicket,
    setSelectedObjectId,
    setCurrentPage,
    fetchTickets,
    fetchDamageTypes,
    fetchObjects
  } = useTickets();
  const { company, loading: companyLoading } = useCompany();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    if (company) {
      fetchTickets();
      fetchDamageTypes();
      fetchObjects();
    }
  }, [company, fetchTickets, fetchDamageTypes, fetchObjects]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTickets(true);
    setRefreshing(false);
  };

  if (loading && tickets.length === 0) {
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schadensmeldungen</h1>
          <p className="mt-1 text-sm text-gray-600">
            Verwalten Sie alle Schadensmeldungen Ihrer Immobilien
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Schadensmeldungen durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedObjectId || ''}
            onChange={(e) => setSelectedObjectId(e.target.value || null)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white flex-1 sm:flex-none"
          >
            <option value="">Alle Objekte</option>
            {objects.map((object) => (
              <option key={object.id} value={object.id}>
                {object.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2 flex-1 sm:flex-none">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 flex-1 sm:flex-none justify-center ${
                statusFilter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-200'
              }`}
            >
              <Filter className="h-5 w-5" />
              <span className="hidden sm:inline">Alle</span>
            </button>
            <button
              onClick={() => setStatusFilter('open')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 flex-1 sm:flex-none justify-center ${
                statusFilter === 'open'
                  ? 'bg-amber-500 text-white'
                  : 'bg-white text-gray-700 border border-gray-200'
              }`}
            >
              <AlertCircle className="h-5 w-5" />
              <span className="hidden sm:inline">Offen</span>
            </button>
            <button
              onClick={() => setStatusFilter('closed')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 flex-1 sm:flex-none justify-center ${
                statusFilter === 'closed'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white text-gray-700 border border-gray-200'
              }`}
            >
              <CheckCircle2 className="h-5 w-5" />
              <span className="hidden sm:inline">Geschlossen</span>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {loading && tickets.length > 0 && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        )}

        <div className="grid gap-4">
          {tickets.map((ticket) => (
            <TicketCard 
              key={ticket.id} 
              ticket={ticket} 
              onClick={() => setSelectedTicket(ticket)}
            />
          ))}
          {tickets.length === 0 && !loading && (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Keine Schadensmeldungen gefunden</h3>
              <p className="mt-1 text-gray-500">
                {searchTerm || selectedObjectId
                  ? 'Versuchen Sie es mit anderen Filtereinstellungen'
                  : 'Es wurden noch keine Schadensmeldungen erstellt'}
              </p>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-700 text-center sm:text-left">
              Zeige <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> bis{' '}
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> von{' '}
              <span className="font-medium">{totalItems}</span> Einträgen
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">Zurück</span>
              </button>
              <span className="px-4 py-2 text-sm text-gray-700">
                {currentPage} / {totalPages}
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
        )}
      </div>

      {selectedTicket && (
        <TicketModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  );
};

export default Tickets;