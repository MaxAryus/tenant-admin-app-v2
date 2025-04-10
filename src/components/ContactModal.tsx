import React, { useState, useEffect } from 'react';
import { 
  X, 
  Loader2, 
  Mail, 
  Phone, 
  User, 
  AlertTriangle,
  Building2,
  Home,
  Search,
  ChevronDown,
  ChevronRight,
  Check
} from 'lucide-react';
import { useContacts, Contact } from '../store/contactStore';
import { useCompany } from '../store/companyStore';
import { supabase } from '../lib/supabase';

interface ContactModalProps {
  contact: Contact | null;
  onClose: () => void;
}

interface Object {
  id: string;
  name: string;
}

interface Apartment {
  id: string;
  name: string;
  object: {
    id: string;
    name: string;
  };
}

const ContactModal: React.FC<ContactModalProps> = ({ contact, onClose }) => {
  const { company } = useCompany();
  const { createContact, updateContact } = useContacts();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [objects, setObjects] = useState<Object[]>([]);
  const [apartments, setApartments] = useState<Record<string, Apartment[]>>({});
  const [expandedObjects, setExpandedObjects] = useState<Set<string>>(new Set());
  const [selectedApartmentIds, setSelectedApartmentIds] = useState<Set<string>>(new Set());
  const [objectSearchTerm, setObjectSearchTerm] = useState('');
  const [filteredObjects, setFilteredObjects] = useState<Object[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    email: '',
    phone_number: '',
    is_emergency: false
  });

  useEffect(() => {
    fetchObjects();
    if (contact) {
      setFormData({
        name: contact.name,
        description: contact.description || '',
        email: contact.email || '',
        phone_number: contact.phone_number || '',
        is_emergency: contact.is_emergency || false
      });
      if (contact.apartments) {
        setSelectedApartmentIds(new Set(contact.apartments.map(a => a.id)));
      }
    }
  }, [contact]);

  useEffect(() => {
    if (objectSearchTerm.length >= 2) {
      const filtered = objects.filter(obj =>
        obj.name.toLowerCase().includes(objectSearchTerm.toLowerCase())
      );
      setFilteredObjects(filtered);
    } else {
      setFilteredObjects([]);
    }
  }, [objectSearchTerm, objects]);

  const fetchObjects = async () => {
    try {
      if (!company) return;

      const { data, error } = await supabase
        .from('objects')
        .select('id, name')
        .eq('company_id', company.id)
        .order('name');

      if (error) throw error;
      setObjects(data || []);

      // Fetch apartments for all objects
      for (const object of data || []) {
        await fetchApartments(object.id);
      }
    } catch (error: any) {
      console.error('Error fetching objects:', error);
      setError('Fehler beim Laden der Objekte');
    }
  };

  const fetchApartments = async (objectId: string) => {
    try {
      const { data: apartmentsData, error: apartmentsError } = await supabase
        .from('apartments')
        .select(`
          id,
          name,
          object:objects (
            id,
            name
          )
        `)
        .eq('object_id', objectId);

      if (apartmentsError) throw apartmentsError;

      setApartments(prev => ({
        ...prev,
        [objectId]: apartmentsData || []
      }));
    } catch (error: any) {
      console.error('Error fetching apartments:', error);
      setError('Fehler beim Laden der Wohnungen');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const contactData = {
        ...formData,
        apartmentIds: Array.from(selectedApartmentIds)
      };

      if (contact) {
        await updateContact(contact.id, contactData);
      } else {
        await createContact(contactData);
      }
      onClose();
    } catch (error: any) {
      console.error('Error saving contact:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const toggleObjectExpansion = (objectId: string) => {
    setExpandedObjects(prev => {
      const next = new Set(prev);
      if (next.has(objectId)) {
        next.delete(objectId);
      } else {
        next.add(objectId);
      }
      return next;
    });
  };

  const toggleApartmentSelection = (apartmentId: string) => {
    setSelectedApartmentIds(prev => {
      const next = new Set(prev);
      if (next.has(apartmentId)) {
        next.delete(apartmentId);
      } else {
        next.add(apartmentId);
      }
      return next;
    });
  };

  const toggleAllApartmentsForObject = (objectId: string) => {
    const objectApartments = apartments[objectId] || [];
    const allSelected = objectApartments.every(apt => selectedApartmentIds.has(apt.id));
    
    setSelectedApartmentIds(prev => {
      const next = new Set(prev);
      objectApartments.forEach(apt => {
        if (allSelected) {
          next.delete(apt.id);
        } else {
          next.add(apt.id);
        }
      });
      return next;
    });
  };

  const displayedObjects = objectSearchTerm.length >= 2 ? filteredObjects : objects;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="min-h-screen py-8 px-4 flex items-center justify-center w-full">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>

          <div className="p-6">
            <div className="mb-6 pt-4">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <User className="h-10 w-10 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {contact ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}
                  </h2>
                  {contact && (
                    <p className="text-gray-500 mt-1">
                      {contact.is_emergency ? 'Notfallkontakt' : 'Standardkontakt'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900">Kontaktinformationen</h3>
                
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Beschreibung
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      E-Mail
                    </label>
                    <div className="mt-1 relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <input
                        type="email"
                        id="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="block w-full pl-10 rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Telefon
                    </label>
                    <div className="mt-1 relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <input
                        type="tel"
                        id="phone"
                        value={formData.phone_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                        className="block w-full pl-10 rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_emergency"
                    checked={formData.is_emergency}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_emergency: e.target.checked }))}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_emergency" className="ml-2 block text-sm text-gray-900">
                    Als Notfallkontakt markieren
                  </label>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900">Objekte und Wohnungen</h3>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Objekte durchsuchen..."
                    value={objectSearchTerm}
                    onChange={(e) => setObjectSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {displayedObjects.map((object) => {
                    const objectApartments = apartments[object.id] || [];
                    const isExpanded = expandedObjects.has(object.id);
                    const selectedApartmentsCount = objectApartments.filter(apt => 
                      selectedApartmentIds.has(apt.id)
                    ).length;
                    const allSelected = objectApartments.length > 0 && 
                      selectedApartmentsCount === objectApartments.length;

                    return (
                      <div key={object.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-3 bg-gray-50">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-gray-500" />
                            <span className="font-medium">{object.name}</span>
                            {selectedApartmentsCount > 0 && (
                              <span className="text-sm text-gray-500">
                                ({selectedApartmentsCount} ausgewählt)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleAllApartmentsForObject(object.id)}
                              className={`text-sm px-2 py-1 rounded ${
                                allSelected 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {allSelected ? 'Alle abwählen' : 'Alle auswählen'}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleObjectExpansion(object.id)}
                              className="p-1 hover:bg-gray-100 rounded-lg"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5 text-gray-500" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-gray-500" />
                              )}
                            </button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="p-2 bg-white">
                            <div className="grid grid-cols-2 gap-2">
                              {objectApartments.map((apartment) => (
                                <label
                                  key={apartment.id}
                                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedApartmentIds.has(apartment.id)}
                                    onChange={() => toggleApartmentSelection(apartment.id)}
                                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                                  />
                                  <Home className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm">{apartment.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-lg bg-red-50 flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-5 w-5" />
                  <p>{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Wird gespeichert...</span>
                    </>
                  ) : (
                    <span>Speichern</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactModal;