import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  ChevronRight, 
  ChevronLeft,
  Search, 
  Plus,
  RefreshCw,
  Home,
  UserPlus,
  Upload,
  Download
} from 'lucide-react';
import { useObjects } from '../store/objectStore';
import { useCompany } from '../store/companyStore';
import InviteModal from '../components/InviteModal';
import ImportModal from '../components/ImportModal';
import DownloadCodesModal from '../components/DownloadCodesModal';
import { downloadAllTokens } from '../services/tokenService';

interface InviteModalState {
  isOpen: boolean;
  apartmentId: string;
  apartmentName: string;
  objectName: string;
}

const Objects = () => {
  const { 
    objects,
    apartments,
    loading, 
    error, 
    searchTerm,
    selectedObjectId,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    setSearchTerm,
    setSelectedObjectId,
    setCurrentPage,
    fetchObjects,
    fetchApartments
  } = useObjects();
  const { company, loading: companyLoading } = useCompany();
  const [refreshing, setRefreshing] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [showDownloadCodesModal, setShowDownloadCodesModal] = useState(false);
  const [downloadingTokens, setDownloadingTokens] = useState(false);
  const [inviteModal, setInviteModal] = useState<InviteModalState>({
    isOpen: false,
    apartmentId: '',
    apartmentName: '',
    objectName: ''
  });

  useEffect(() => {
    if (company) {
      fetchObjects();
      fetchApartments(apartments.length === 0);
    }
  }, [company, fetchObjects, fetchApartments, apartments.length]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchApartments(true);
    setRefreshing(false);
  };

  const handleInvite = (apartmentId: string, apartmentName: string, objectName: string) => {
    setInviteModal({
      isOpen: true,
      apartmentId,
      apartmentName,
      objectName
    });
  };

  const handleImport = async (file: File) => {
    if (!company) return;

    setImporting(true);
    try {
      const content = await file.text();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-data`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            csvContent: content,
            companyId: company.id,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Import failed');
      }

      const result = await response.json();
      alert(`Import successful!\nCreated:\n${result.results.objects} objects\n${result.results.apartments} apartments\n${result.results.invitations} invitations`);
      
      // Refresh the data
      await fetchObjects();
      await fetchApartments(true);
    } catch (error: any) {
      console.error('Import error:', error);
      throw new Error('Error during import: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  if ((loading || companyLoading) && apartments.length === 0) {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wohnungen</h1>
          <p className="mt-1 text-sm text-gray-600">
            Verwalten Sie alle Wohnungen Ihrer Immobilien
          </p>
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
            onClick={() => setShowImportModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Upload size={20} />
            <span className="hidden sm:inline">CSV Import</span>
          </button>
          <button 
            onClick={() => setShowDownloadCodesModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Download size={20} />
            <span className="hidden sm:inline">Codes herunterladen</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Wohnungen durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
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
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="relative">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wohnung
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Objekt
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Adresse
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PLZ
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Aktionen</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {apartments.map((apartment) => (
                <tr key={apartment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <Home className="h-5 w-5 text-emerald-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{apartment.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-600">
                      <Building2 className="h-4 w-4 mr-1" />
                      {apartment.object.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {apartment.object.street}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {apartment.object.zip_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-4">
                      <button 
                        onClick={() => handleInvite(apartment.id, apartment.name, apartment.object.name)}
                        className="text-emerald-600 hover:text-emerald-900 flex items-center gap-1"
                      >
                        <UserPlus className="h-4 w-4" />
                        <span>Einladen</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {apartments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">Keine Wohnungen gefunden</h3>
                    <p className="mt-1 text-gray-500">
                      {searchTerm || selectedObjectId
                        ? 'Versuchen Sie es mit anderen Filtereinstellungen'
                        : 'Es wurden noch keine Wohnungen angelegt'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {loading && apartments.length > 0 && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50">
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

      {inviteModal.isOpen && (
        <InviteModal
          apartmentId={inviteModal.apartmentId}
          apartmentName={inviteModal.apartmentName}
          objectName={inviteModal.objectName}
          onClose={() => setInviteModal(prev => ({ ...prev, isOpen: false }))}
        />
      )}

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
        />
      )}

      {showDownloadCodesModal && (
        <DownloadCodesModal
          onClose={() => setShowDownloadCodesModal(false)}
        />
      )}
    </div>
  );
};

export default Objects;