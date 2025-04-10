import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  Building2, 
  AlertTriangle,
  Trash2,
  Pencil,
  RefreshCw
} from 'lucide-react';
import { useContacts, Contact } from '../store/contactStore';
import { useCompany } from '../store/companyStore';
import ContactModal from '../components/ContactModal';
import ConfirmDialog from '../components/ConfirmDialog';

const Contacts = () => {
  const { 
    contacts,
    loading,
    error,
    searchTerm,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    selectedContact,
    setSearchTerm,
    setCurrentPage,
    setSelectedContact,
    fetchContacts,
    deleteContact
  } = useContacts();
  const { company } = useCompany();
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Contact | null>(null);

  useEffect(() => {
    if (company) {
      setTimeout(() => {
        fetchContacts(true);
      }, 100); // Force refresh on initial load
    }
  }, [company, fetchContacts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchContacts(true);
    setRefreshing(false);
  };

  const handleDelete = async (contact: Contact) => {
    setConfirmDelete(contact);
  };

  const confirmDeleteContact = async () => {
    if (!confirmDelete) return;
    
    try {
      await deleteContact(confirmDelete.id);
      setConfirmDelete(null);
    } catch (error) {
      console.error('Error deleting contact:', error);
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Kontakte</h1>
          <p className="mt-1 text-sm text-gray-600">
            Verwalten Sie Ihre Kontakte und deren Zuweisungen
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
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus size={20} />
            <span>Neuer Kontakt</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Kontakte durchsuchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="relative">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kontakt
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Beschreibung
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Objekte
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Aktionen</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && contacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                    </div>
                  </td>
                </tr>
              ) : contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {contact.name}
                        </div>
                        {contact.is_emergency && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            Notfall
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {contact.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="h-4 w-4" />
                          <span>{contact.email}</span>
                        </div>
                      )}
                      {contact.phone_number && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="h-4 w-4" />
                          <span>{contact.phone_number}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 line-clamp-2">
                      {contact.description || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {contact.apartments && contact.apartments.length > 0 ? (
                      <div className="space-y-1">
                        {Array.from(new Set(contact.apartments.map(a => a.object.name))).map((objectName) => (
                          <div 
                            key={objectName}
                            className="flex items-center gap-2 text-sm text-gray-600"
                          >
                            <Building2 className="h-4 w-4" />
                            <span>{objectName}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Keine Zuweisungen</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedContact(contact)}
                        className="text-emerald-600 hover:text-emerald-900"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(contact)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && contacts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">Keine Kontakte gefunden</h3>
                    <p className="mt-1 text-gray-500">
                      {searchTerm
                        ? 'Versuchen Sie es mit anderen Suchbegriffen'
                        : 'Erstellen Sie Ihren ersten Kontakt'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {loading && contacts.length > 0 && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-b-lg">
            <div className="text-sm text-gray-700 text-center sm:text-left">
              Zeige <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> bis{' '}
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> von{' '}
              <span className="font-medium">{totalItems}</span> Einträgen
            </div>
          </div>
        )}
      </div>

      {(selectedContact || showCreateModal) && (
        <ContactModal
          contact={selectedContact}
          onClose={() => {
            setSelectedContact(null);
            setShowCreateModal(false);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        title="Kontakt löschen"
        message={`Möchten Sie den Kontakt "${confirmDelete?.name}" wirklich löschen?`}
        confirmText="Löschen"
        cancelText="Abbrechen"
        type="danger"
        onConfirm={confirmDeleteContact}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

export default Contacts;