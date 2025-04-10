import React, { useState, useEffect } from 'react';
import { X, Loader2, Mail, Phone, User, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../store/companyStore';

interface InviteAdminModalProps {
  onClose: () => void;
}

const InviteAdminModal: React.FC<InviteAdminModalProps> = ({ onClose }) => {
  const { company } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
  });
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Get the access token on component mount
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        setAccessToken(data.session.access_token);
      }
    };
    
    getSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!company) throw new Error('No company selected');

      // First check if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('user_id')
        .eq('email', formData.email)
        .maybeSingle();

      if (existingUser) {
        // If user exists, check if they're already an admin
        const { data: existingAdmin } = await supabase
          .from('company_admins')
          .select('user_id')
          .eq('company_id', company.id)
          .eq('user_id', existingUser.user_id)
          .maybeSingle();

        if (existingAdmin) {
          throw new Error('User is already an admin of this company');
        }
      }

      // Create minimal user metadata
      const userMetadata = {
        email: formData.email,
        last_name: formData.lastName,
        company_id: company.id,
        first_name: formData.firstName,
        phone_number: formData.phoneNumber,
        is_user: false
      };

      // Try direct fetch approach instead of using the supabase.functions API
      const functionUrl = `${supabase.supabaseUrl}/functions/v1/invite-admin`;
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Add Authorization header if we have an access token
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      console.log('Sending request to:', functionUrl);
      console.log('With headers:', headers);
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: formData.email,
          metadata: userMetadata,
          companyId: company.id
        })
      });

      // Check if the request was successful
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error: ${response.status} ${response.statusText}`);
      }

      // Parse the response
      const data = await response.json();
      console.log('Invite successful:', data);

      // Close the modal on success
      onClose();
    } catch (error: any) {
      console.error('Error inviting admin:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

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
              Administrator einladen
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
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
                  required
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
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  className="block w-full pl-10 rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
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
                    <span>Wird eingeladen...</span>
                  </>
                ) : (
                  <span>Einladen</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InviteAdminModal;