import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../store/authStore';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

const VerifyOTP = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const verifyOTP = async () => {
      try {
        const token = searchParams.get('token');
        const type = searchParams.get('type');

        if (!token || !type) {
          throw new Error('Fehlende Token- oder Typ-Parameter');
        }

        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: type as any,
        });

        if (error) throw error;

        setSession(data.session);
        navigate('/dashboard');
      } catch (err: any) {
        console.error('Verification error:', err);
        setError(err.message || 'Token konnte nicht verifiziert werden');
      } finally {
        setVerifying(false);
      }
    };

    verifyOTP();
  }, [searchParams, navigate, setSession]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-emerald-600" />
          <p className="mt-4 text-gray-600">Anmeldung wird verifiziert...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
          <div className="mb-4">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Verifizierung fehlgeschlagen</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all"
          >
            Zurück zur Anmeldung
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        <div className="mb-4">
          <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Erfolgreich verifiziert</h2>
        <p className="text-gray-600">Sie werden weitergeleitet...</p>
      </div>
    </div>
  );
};

export default VerifyOTP;