import React, { useState, useEffect } from 'react';
import { 
  X, 
  Loader2, 
  Image as ImageIcon, 
  Search, 
  Building2, 
  Home, 
  Check,
  ChevronRight
} from 'lucide-react';
import { useNews } from '../store/newsStore';
import { supabase } from '../lib/supabase';
import { useCompany } from '../store/companyStore';

interface CreateNewsModalProps {
  onClose: () => void;
}

interface Object {
  id: string;
  name: string;
}

interface Apartment {
  id: string;
  name: string;
  object_id: string;
}

interface ObjectSelection {
  objectId: string;
  apartmentIds: string[] | null; // null means all apartments
}

const CreateNewsModal: React.FC<CreateNewsModalProps> = ({ onClose }) => {
  const { createNews } = useNews();
  const { company } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [objects, setObjects] = useState<Object[]>([]);
  const [apartments, setApartments] = useState<Record<string, Apartment[]>>({});
  const [objectSearchTerm, setObjectSearchTerm] = useState('');
  const [selectedObjects, setSelectedObjects] = useState<ObjectSelection[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    image_url: ''
  });

  useEffect(() => {
    fetchObjects();
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

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

  const fetchApartments = async (objectId: string) => {
    try {
      const { data, error } = await supabase
        .from('apartments')
        .select('id, name, object_id')
        .eq('object_id', objectId)
        .order('name');

      if (error) throw error;
      setApartments(prev => ({
        ...prev,
        [objectId]: data || []
      }));
    } catch (error: any) {
      console.error('Error fetching apartments:', error);
      setError('Fehler beim Laden der Wohnungen');
    }
  };

  const handleObjectSelect = async (objectId: string) => {
    if (!apartments[objectId]) {
      await fetchApartments(objectId);
    }

    setSelectedObjects(prev => {
      const isSelected = prev.some(obj => obj.objectId === objectId);
      if (isSelected) {
        return prev.filter(obj => obj.objectId !== objectId);
      }
      // When selecting a new object, start with no apartments selected
      return [...prev, { objectId, apartmentIds: [] }];
    });
  };

  const handleApartmentSelect = (objectId: string, apartmentId: string) => {
    setSelectedObjects(prev => {
      const objectIndex = prev.findIndex(obj => obj.objectId === objectId);
      if (objectIndex === -1) return prev;

      const updatedObjects = [...prev];
      const currentSelection = updatedObjects[objectIndex];

      if (currentSelection.apartmentIds === null) {
        // If all apartments were selected, switch to selecting only this apartment
        currentSelection.apartmentIds = [apartmentId];
      } else {
        const apartmentIndex = currentSelection.apartmentIds.indexOf(apartmentId);
        if (apartmentIndex === -1) {
          currentSelection.apartmentIds.push(apartmentId);
        } else {
          currentSelection.apartmentIds = currentSelection.apartmentIds.filter(id => id !== apartmentId);
          if (currentSelection.apartmentIds.length === 0) {
            // If no apartments are selected, remove the object
            return prev.filter(obj => obj.objectId !== objectId);
          }
        }
      }

      return updatedObjects;
    });
  };

  const toggleAllApartments = (objectId: string) => {
    setSelectedObjects(prev => {
      const objectIndex = prev.findIndex(obj => obj.objectId === objectId);
      if (objectIndex === -1) return prev;

      const updatedObjects = [...prev];
      const currentSelection = updatedObjects[objectIndex];

      // Toggle between all apartments selected and none selected
      currentSelection.apartmentIds = currentSelection.apartmentIds === null ? [] : null;

      return updatedObjects;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedObjects.length === 0) {
      setError('Bitte wählen Sie mindestens ein Objekt aus');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createNews({
        ...formData,
        image_url: formData.image_url || null,
        objectApartments: selectedObjects
      });
      onClose();
    } catch (error: any) {
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

  const filteredObjects = objectSearchTerm.length >= 2
    ? objects.filter(obj => 
        obj.name.toLowerCase().includes(objectSearchTerm.toLowerCase())
      )
    : objects;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center overflow-y-auto z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl my-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>

        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Neue Nachricht erstellen</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Titel
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                    Nachricht
                  </label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    required
                    rows={4}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor="image_url" className="block text-sm font-medium text-gray-700">
                    Bild URL (optional)
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500">
                      <ImageIcon size={18} />
                    </span>
                    <input
                      type="url"
                      id="image_url"
                      value={formData.image_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                      className="block w-full flex-1 rounded-none rounded-r-md border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Objekte und Wohnungen auswählen
                  </label>
                  <div className="mt-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      placeholder="Objekte suchen..."
                      value={objectSearchTerm}
                      onChange={(e) => setObjectSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
                  {filteredObjects.map((object) => {
                    const isSelected = selectedObjects.some(obj => obj.objectId === object.id);
                    const objectSelection = selectedObjects.find(obj => obj.objectId === object.id);
                    const apartmentList = apartments[object.id] || [];
                    const allApartmentsSelected = objectSelection?.apartmentIds === null;
                    const selectedApartments = objectSelection?.apartmentIds || [];

                    return (
                      <div key={object.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-gray-400" />
                            <span className="font-medium">{object.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <button
                                type="button"
                                onClick={() => toggleAllApartments(object.id)}
                                className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  allApartmentsSelected
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {allApartmentsSelected ? 'Alle ausgewählt' : 'Alle auswählen'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleObjectSelect(object.id)}
                              className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${
                                isSelected
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {isSelected ? (
                                'Ausgewählt'
                              ) : (
                                <>
                                  <span>Auswählen</span>
                                  <ChevronRight size={16} />
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="mt-3 pl-7 grid grid-cols-2 gap-2">
                            {apartmentList.map((apartment) => (
                              <label
                                key={apartment.id}
                                className="flex items-center gap-2 text-sm hover:bg-gray-50 p-2 rounded-lg cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={allApartmentsSelected || selectedApartments.includes(apartment.id)}
                                  onChange={() => handleApartmentSelect(object.id, apartment.id)}
                                  className="rounded text-emerald-600 focus:ring-emerald-500"
                                />
                                <Home className="h-4 w-4 text-gray-400" />
                                <span>{apartment.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {filteredObjects.length === 0 && (
                    <div className="p-4 text-center text-gray-500">
                      Keine Objekte gefunden
                    </div>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                {error}
              </p>
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
                    <span>Wird erstellt...</span>
                  </>
                ) : (
                  <span>Erstellen</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateNewsModal;