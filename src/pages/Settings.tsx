import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import { useCompany } from '../store/companyStore';
import { LogOut, Building2, Mail, Phone, ExternalLink } from 'lucide-react';

const Settings = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { company } = useCompany();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Einstellungen</h1>

      <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-200">
        {/* Company Information */}
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Firmeninformationen</h2>
          <div className="flex items-start gap-4">
            {company?.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.name}
                className="h-16 w-16 rounded-lg object-contain bg-gray-100"
              />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-gray-400" />
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{company?.name}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {company?.street}, {company?.zip_code} {company?.city}
              </p>
              <p className="text-sm text-gray-500">{company?.land}</p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Kontaktinformationen</h2>
          <div className="space-y-4">
            <a 
              href="mailto:support@firma.de" 
              className="flex items-center gap-3 text-gray-600 hover:text-emerald-600 transition-colors group"
            >
              <Mail className="h-5 w-5 group-hover:text-emerald-600" />
              <span className="underline underline-offset-2">support@firma.de</span>
            </a>
            <a 
              href="tel:+49123456789" 
              className="flex items-center gap-3 text-gray-600 hover:text-emerald-600 transition-colors group"
            >
              <Phone className="h-5 w-5 group-hover:text-emerald-600" />
              <span className="underline underline-offset-2">+49 (0) 123 456789</span>
            </a>
          </div>
        </div>

        {/* Account Actions */}
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Konto</h2>
          <button
            onClick={handleLogout}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Abmelden</span>
          </button>
        </div>

        {/* Legal Information */}
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Rechtliches</h2>
          <a 
            href="/imprint" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition-colors group"
          >
            <ExternalLink className="h-5 w-5 group-hover:text-emerald-600" />
            <span className="underline underline-offset-2">Impressum</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Settings;