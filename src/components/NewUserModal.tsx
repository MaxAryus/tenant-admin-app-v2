import React, { useState, useEffect } from 'react';
import { X, Loader2, Mail, Phone, User, FileDown, Building2, Home, Search } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import { supabase } from '../lib/supabase';
import { useCompany } from '../store/companyStore';

interface NewUserModalProps {
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
    street: string;
    zip_code: number | null;
  };
}

type InvitationType = 'email' | 'pdf' | null;

const NewUserModal: React.FC<NewUserModalProps> = ({ onClose }) => {
  const { company } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitationType, setInvitationType] = useState<InvitationType>(null);
  const [objects, setObjects] = useState<Object[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string>('');
  const [selectedApartmentId, setSelectedApartmentId] = useState<string>('');
  const [objectSearchTerm, setObjectSearchTerm] = useState('');
  const [apartmentSearchTerm, setApartmentSearchTerm] = useState('');
  const [filteredObjects, setFilteredObjects] = useState<Object[]>([]);
  const [filteredApartments, setFilteredApartments] = useState<Apartment[]>([]);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
  });

  useEffect(() => {
    fetchObjects();
  }, []);

  useEffect(() => {
    if (selectedObjectId) {
      fetchApartments(selectedObjectId);
    } else {
      setApartments([]);
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
      const filtered = apartments.filter(apt =>
        apt.name.toLowerCase().includes(apartmentSearchTerm.toLowerCase())
      );
      setFilteredApartments(filtered);
    } else {
      setFilteredApartments([]);
    }
  }, [apartmentSearchTerm, apartments]);

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

      setApartments(apartments || []);
      setFilteredApartments([]);
      setApartmentSearchTerm('');
    } catch (error: any) {
      console.error('Error fetching apartments:', error);
      setError('Fehler beim Laden der Wohnungen');
    }
  };

  const generateInviteLink = async () => {
    if (!company || !selectedApartmentId) return null;
    
    try {
      const { data: invitation, error: inviteError } = await supabase
        .from('invitation_tokens')
        .insert({
          apartment_id: selectedApartmentId,
          company_id: company.id
        })
        .select('token')
        .single();

      if (inviteError) throw inviteError;
      if (!invitation) throw new Error('Failed to create invitation');

      const baseUrl = window.location.origin;
      return `${baseUrl}/invite/${invitation.token}`;
    } catch (error: any) {
      console.error('Error generating invite:', error);
      throw new Error('Fehler beim Erstellen der Einladung');
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const generatePDF = async () => {
    if (!selectedApartmentId || !selectedObjectId) {
      setError('Bitte wählen Sie ein Objekt und eine Wohnung aus');
      return;
    }

    try {
      setLoading(true);
      const link = await generateInviteLink();
      if (!link) throw new Error('Fehler beim Erstellen des Einladungslinks');
      setInviteLink(link);

      const selectedApartment = apartments.find(a => a.id === selectedApartmentId);
      if (!selectedApartment) throw new Error('Wohnung nicht gefunden');

      const pdf = new jsPDF();
      
      pdf.setFontSize(16);
      pdf.text('Einladung zur Bewohner-App', 20, 20);
      
      pdf.setFontSize(12);
      pdf.text([
        'Sehr geehrte/r ' + formData.firstName + ' ' + formData.lastName + ',',
        '',
        'Wir freuen uns, Sie in unserer Bewohner-App begrüßen zu dürfen!',
        '',
        `Objekt: ${selectedApartment.object.name}`,
        `Wohnung: ${selectedApartment.name}`,
        '',
        'Anleitung zur Registrierung:',
        '',
        '1. Scannen Sie den QR-Code oder nutzen Sie den Einladungslink',
        '2. Laden Sie die App aus dem Store herunter',
        '3. Registrieren Sie sich mit Ihren Daten',
        '',
        'Einladungslink:',
        link
      ], 20, 40);

      // Create QR code
      const root = document.createElement('div');
      root.style.position = 'absolute';
      root.style.left = '-9999px';
      document.body.appendChild(root);
      
      await new Promise<void>(async (resolve) => {
        const cleanup = () => {
          document.body.removeChild(root);
          resolve();
        };
        
        try {
          const { default: ReactDOM } = await import('react-dom');
          ReactDOM.render(
            <QRCodeCanvas
              value={link}
              size={1000}
              level="H"
              includeMargin={true}
            />,
            root,
            () => {
              const canvas = root.querySelector('canvas');
              if (canvas) {
                const imgData = canvas.toDataURL('image/png');
                pdf.addImage(imgData, 'PNG', 70, 160, 70, 70);
              }
              cleanup();
            }
          );
        } catch (err) {
          console.error('Error loading ReactDOM:', err);
          cleanup();
          throw new Error('Failed to load ReactDOM');
        }
      });

      pdf.save(`Einladung_${selectedApartment.object.name}_${selectedApartment.name}.pdf`);
      onClose();
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      setError(error.message || 'Fehler beim Erstellen des PDFs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitationType) return;

    if (invitationType === 'pdf') {
      await generatePDF();
    }
  };

  if (!invitationType) {
    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={handleBackdropClick}
      >
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md m-4">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>

          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <User className="h-6 w-6 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                Wie möchten Sie den Benutzer einladen?
              </h2>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setInvitationType('email')}
                disabled
                className="w-full flex items-center gap-3 p-4 rounded-lg border border-gray-200 opacity-50 cursor-not-allowed"
              >
                <Mail className="h-6 w-6 text-gray-600" />
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">Per E-Mail einladen</h3>
                  <p className="text-sm text-gray-500">Einladung per E-Mail versenden</p>
                </div>
              </button>

              <button
                onClick={() => setInvitationType('pdf')}
                className="w-full flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
              >
                <FileDown className="h-6 w-6 text-emerald-600" />
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">PDF herunterladen</h3>
                  <p className="text-sm text-gray-500">Einladung als PDF speichern</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md m-4">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <User className="h-6 w-6 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              PDF Einladung erstellen
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  Vorname
                </label>
                <input
                  type="text"
                  id="firstName"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Nachname
                </label>
                <input
                  type="text"
                  id="lastName"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
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
                      type="button"
                      onClick={() => {
                        setSelectedObjectId(object.id);
                        setObjectSearchTerm('');
                      }}
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
                        type="button"
                        onClick={() => {
                          setSelectedApartmentId(apartment.id);
                          setApartmentSearchTerm('');
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Home className="h-4 w-4 text-gray-500" />
                        <span>{apartment.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedApartmentId && apartments.find(a => a.id === selectedApartmentId) && (
                  <div className="mt-2 p-2 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    <span>{apartments.find(a => a.id === selectedApartmentId)?.name}</span>
                  </div>
                )}
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setInvitationType(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Zurück
              </button>
              <button
                type="submit"
                disabled={loading || !selectedObjectId || !selectedApartmentId}
                className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Wird erstellt...</span>
                  </>
                ) : (
                  <span>PDF erstellen</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewUserModal;