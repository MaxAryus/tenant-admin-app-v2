import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, Phone, MapPin, Loader2, ArrowLeft } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    zipCode: '',
    city: '',
    land: 'Deutschland',
    firstName: '',
    lastName: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-company`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            company: {
              name: formData.name,
              street: formData.street,
              zipCode: parseInt(formData.zipCode),
              city: formData.city,
              land: formData.land,
            },
            admin: {
              firstName: formData.firstName,
              lastName: formData.lastName,
              email: formData.email,
              phoneNumber: formData.phone || undefined,
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Redirect to login with email pre-filled
      navigate('/login', { 
        state: { 
          email: formData.email,
          message: 'Registrierung erfolgreich! Bitte melden Sie sich an.'
        }
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => navigate('/login')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Unternehmen registrieren</h1>
              <p className="mt-1 text-sm text-gray-600">
                Erstellen Sie ein neues Unternehmen im Verwaltungsbereich
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Company Information */}
              <div className="space-y-4">
                <h2 className="font-medium text-gray-900 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-emerald-600" />
                  Unternehmensdaten
                </h2>
                
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Firmenname
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

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
                      required
                      className="block w-full pl-10 rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="block w-full pl-10 rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                      Vorname
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      required
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                      Nachname
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      required
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h2 className="font-medium text-gray-900 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-emerald-600" />
                  Adresse
                </h2>

                <div>
                  <label htmlFor="street" className="block text-sm font-medium text-gray-700">
                    Straße und Hausnummer
                  </label>
                  <input
                    type="text"
                    id="street"
                    value={formData.street}
                    onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
                    required
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
                      PLZ
                    </label>
                    <input
                      type="text"
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                      required
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                      Stadt
                    </label>
                    <input
                      type="text"
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      required
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="land" className="block text-sm font-medium text-gray-700">
                    Land
                  </label>
                  <select
                    id="land"
                    value={formData.land}
                    onChange={(e) => setFormData(prev => ({ ...prev, land: e.target.value }))}
                    required
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="Deutschland">Deutschland</option>
                    <option value="Österreich">Österreich</option>
                    <option value="Schweiz">Schweiz</option>
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-lg bg-red-50 text-red-800 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Wird registriert...</span>
                  </>
                ) : (
                  'Registrieren'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;