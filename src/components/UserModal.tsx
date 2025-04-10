import React, { useState, useEffect } from 'react';
import { X, Mail, Phone, Calendar, Building2, Home, Plus, Trash2, Loader2, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../store/companyStore';
import { useUsers } from '../store/userStore';

interface Apartment {
  id: string;
  name: string;
  object: {
    id: string;
    name: string;
    street: string;
    zip_code: number | null;
  };
}

interface User {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  created_at: string;
  apartments?: Apartment[];
}

interface UserModalProps {
  user: User;
  onClose: () => void;
}

interface Object {
  id: string;
  name: string;
}

interface AvailableApartment extends Apartment {
  object_name: string;
}

const UserModal: React.FC<UserModalProps> = ({ user, onClose }) => {
  const { company } = useCompany();
  const { fetchUsers, fetchUserDetails } = useUsers();
  const [objects, setObjects] = useState<Object[]>([]);
  const [availableApartments, setAvailableApartments] = useState<AvailableApartment[]>([]);
  const [filteredObjects, setFilteredObjects] = useState<Object[]>([]);
  const [filteredApartments, setFilteredApartments] = useState<AvailableApartment[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string>('');
  const [selectedApartmentId, setSelectedApartmentId] = useState<string>('');
  const [objectSearchTerm, setObjectSearchTerm] = useState('');
  const [apartmentSearchTerm, setApartmentSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User>(user);

  useEffect(() => {
    fetchObjects();
  }, []);

  useEffect(() => {
    if (selectedObjectId) {
      fetchAvailableApartments(selectedObjectId);
    } else {
      setAvailableApartments([]);
      setFilteredApartments([]);
    }
  }, [selectedObjectId]);

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

  useEffect(() => {
    if (apartmentSearchTerm.length >= 2) {
      const filtered = availableApartments.filter(apt =>
        apt.name.toLowerCase().includes(apartmentSearchTerm.toLowerCase())
      );
      setFilteredApartments(filtered);
    } else {
      setFilteredApartments([]);
    }
  }, [apartmentSearchTerm, availableApartments]);

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
    } catch (error: any) {
      console.error('Error fetching objects:', error);
      setError('Fehler beim Laden der Objekte');
    }
  };

  const fetchAvailableApartments = async (objectId: string) => {
    try {
      const { data: apartments, error: apartmentsError } = await supabase
        .from('apartments')
        .select(`
          id,
          name,
          object:objects (
            id,
            name,
            street,
            zip_code
          )
        `)
        .eq('object_id', objectId);

      if (apartmentsError) throw apartmentsError;

      const userApartmentIds = new Set(currentUser.apartments?.map(a => a.id) || []);
      const available = apartments
        .filter(a => !userApartmentIds.has(a.id))
        .map(a => ({
          ...a,
          object_name: a.object.name
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setAvailableApartments(available);
      setFilteredApartments([]);
      setApartmentSearchTerm('');
    } catch (error: any) {
      console.error('Error fetching available apartments:', error);
      setError('Fehler beim Laden der verfügbaren Wohnungen');
    }
  };

  const handleAddApartment = async () => {
    if (!selectedApartmentId || !company) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('user_apartments')
        .insert({
          user_id: currentUser.user_id,
          apartment_id: selectedApartmentId,
          company_id: company.id
        });

      if (error) throw error;

      // Update the user details in the background
      await Promise.all([
        fetchUserDetails(currentUser.user_id).then(updatedUser => {
          if (updatedUser) {
            setCurrentUser(updatedUser);
          }
        }),
        fetchUsers(true)
      ]);

      // Reset selection
      setSelectedObjectId('');
      setSelectedApartmentId('');
      setObjectSearchTerm('');
      setApartmentSearchTerm('');
    } catch (error: any) {
      console.error('Error adding apartment:', error);
      setError('Fehler beim Hinzufügen der Wohnung');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveApartment = async (apartmentId: string) => {
    if (!company) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('user_apartments')
        .delete()
        .eq('user_id', currentUser.user_id)
        .eq('apartment_id', apartmentId);

      if (error) throw error;

      // Update the user details in the background
      await Promise.all([
        fetchUserDetails(currentUser.user_id).then(updatedUser => {
          if (updatedUser) {
            setCurrentUser(updatedUser);
          }
        }),
        fetchUsers(true)
      ]);
    } catch (error: any) {
      console.error('Error removing apartment:', error);
      setError('Fehler beim Entfernen der Wohnung');
    } finally {
      setLoading(false);
    }
  };

  const handleObjectSelect = (objectId: string) => {
    setSelectedObjectId(objectId);
    setObjectSearchTerm('');
    setFilteredObjects([]);
  };

  const handleApartmentSelect = (apartmentId: string) => {
    setSelectedApartmentId(apartmentId);
    setApartmentSearchTerm('');
    setFilteredApartments([]);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatPhoneNumber = (phone: string) => {
    return phone.replace(/\s+/g, '');
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl m-4 md:my-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <X size={24} />
        </button>

        <div className="p-6">
          <div className="mb-6 pt-4">
            <h2 className="text-2xl font-bold text-gray-900">Benutzerdetails</h2>
          </div>

          <div className="space-y-6">
            {/* User Profile Header */}
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-semibold text-emerald-600">
                  {currentUser.first_name[0]}{currentUser.last_name[0]}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {currentUser.first_name} {currentUser.last_name}
                </h3>
                <p className="text-gray-500 flex items-center gap-2 mt-1">
                  <Calendar size={16} />
                  Mitglied seit {new Date(currentUser.created_at).toLocaleDateString('de-DE')}
                </p>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <h4 className="font-medium text-gray-900">Kontaktinformationen</h4>
              {currentUser.email && (
                <a 
                  href={`mailto:${currentUser.email}`}
                  className="flex items-center gap-3 text-gray-600 hover:text-emerald-600 transition-colors group"
                >
                  <Mail className="h-5 w-5 group-hover:text-emerald-600" />
                  <span className="underline underline-offset-2">{currentUser.email}</span>
                </a>
              )}
              {currentUser.phone_number && (
                <a 
                  href={`tel:${formatPhoneNumber(currentUser.phone_number)}`}
                  className="flex items-center gap-3 text-gray-600 hover:text-emerald-600 transition-colors group"
                >
                  <Phone className="h-5 w-5 group-hover:text-emerald-600" />
                  <span className="underline underline-offset-2">{currentUser.phone_number}</span>
                </a>
              )}
            </div>

            {/* Add Apartment Section */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Wohnung hinzufügen</h4>
              </div>

              {/* Object Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  1. Objekt auswählen
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Objekt suchen (mind. 2 Buchstaben)"
                    value={objectSearchTerm}
                    onChange={(e) => setObjectSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {objectSearchTerm.length >= 2 && filteredObjects.length > 0 && (
                  <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden">
                    {filteredObjects.map((object) => (
                      <button
                        key={object.id}
                        onClick={() => handleObjectSelect(object.id)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Building2 className="h-4 w-4 text-gray-500" />
                        <span>{object.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedObjectId && objects.find(o => o.id === selectedObjectId) && (
                  <div className="mt-2 p-2 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>{objects.find(o => o.id === selectedObjectId)?.name}</span>
                  </div>
                )}
              </div>

              {/* Apartment Selection */}
              {selectedObjectId && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    2. Wohnung auswählen
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      placeholder="Wohnung suchen (mind. 2 Buchstaben)"
                      value={apartmentSearchTerm}
                      onChange={(e) => setApartmentSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  {apartmentSearchTerm.length >= 2 && filteredApartments.length > 0 && (
                    <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden">
                      {filteredApartments.map((apartment) => (
                        <button
                          key={apartment.id}
                          onClick={() => handleApartmentSelect(apartment.id)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Home className="h-4 w-4 text-gray-500" />
                          <span>{apartment.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedApartmentId && availableApartments.find(a => a.id === selectedApartmentId) && (
                    <div className="mt-2 p-2 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      <span>{availableApartments.find(a => a.id === selectedApartmentId)?.name}</span>
                    </div>
                  )}
                </div>
              )}

              {selectedObjectId && selectedApartmentId && (
                <button
                  onClick={handleAddApartment}
                  disabled={loading}
                  className="w-full mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Plus className="h-5 w-5" />
                  )}
                  <span>Wohnung hinzufügen</span>
                </button>
              )}

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </div>

            {/* Apartments Information */}
            {currentUser.apartments && currentUser.apartments.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h4 className="font-medium text-gray-900">Zugewiesene Wohnungen</h4>
                <div className="space-y-4">
                  {currentUser.apartments.map((apartment) => (
                    <div key={apartment.id} className="border-l-4 border-emerald-500 pl-4 relative group">
                      <button
                        onClick={() => handleRemoveApartment(apartment.id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={loading}
                      >
                        <Trash2 size={18} />
                      </button>
                      <div className="flex items-center gap-2">
                        <Home className="h-5 w-5 text-emerald-600" />
                        <span className="font-medium text-gray-900">{apartment.name}</span>
                      </div>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>{apartment.object.name}</span>
                        </div>
                        <div className="pl-6">
                          <p>{apartment.object.street}</p>
                          {apartment.object.zip_code && (
                            <p>{apartment.object.zip_code}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserModal;