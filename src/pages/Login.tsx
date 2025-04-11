import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, Mail, Lock } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [token, setToken] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    // Check for pre-filled email from registration
    const state = location.state as { email?: string; message?: string };
    if (state?.email) {
      setEmail(state.email);
    }
    if (state?.message) {
      setMessage(state.message);
    }
    // Clear the state after using it
    navigate(location.pathname, { replace: true });
  }, [location, navigate]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        if (error.status === 429) {
          setCountdown(15); // Set 15 seconds cooldown
          throw new Error('Bitte warten Sie einen Moment, bevor Sie einen neuen Code anfordern.');
        }
        throw error;
      }
      
      setShowTokenInput(true);
      setMessage('Bitte überprüfen Sie Ihre E-Mail auf den Bestätigungscode!');
      setCountdown(15); // Set cooldown after successful request
    } catch (error: any) {
      setMessage(error.message || 'Fehler beim Senden des Bestätigungscodes. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) throw error;

      navigate('/dashboard');
    } catch (error) {
      setMessage('Ungültiger Bestätigungscode. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col items-center justify-center mb-8">
            <img 
              src="https://kpxqamkmpoxsfinqowwz.supabase.co/storage/v1/object/public/company_images//Logo-Mieter-App.png" 
              alt="Mieter-App" 
              className="w-16 h-16 mb-4 rounded-2xl object-contain"
            />
            <h1 className="text-2xl font-bold text-gray-900">Mieter-App</h1>
            <p className="mt-2 text-sm text-gray-600">Verwaltungsbereich</p>
          </div>
          
          {!showTokenInput ? (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  E-Mail Adresse
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                    placeholder="name@firma.de"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || countdown > 0}
                className="w-full bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span>Wird gesendet...</span>
                  </>
                ) : countdown > 0 ? (
                  `Bitte warten (${countdown}s)`
                ) : (
                  'Anmelden'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyToken} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="token" className="block text-sm font-medium text-gray-700">
                  Bestätigungscode
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    id="token"
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    required
                    className="pl-10 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                    placeholder="Geben Sie den Code aus Ihrer E-Mail ein"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <span>Wird verifiziert...</span>
                    </>
                  ) : (
                    'Code bestätigen'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowTokenInput(false);
                    setToken('');
                    setMessage('');
                  }}
                  className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={countdown > 0}
                >
                  {countdown > 0 ? (
                    `Neue E-Mail in ${countdown}s`
                  ) : (
                    'Andere E-Mail-Adresse verwenden'
                  )}
                </button>
              </div>
            </form>
          )}

          {message && (
            <div className={`mt-4 p-4 rounded-lg text-sm ${
              message.includes('Fehler') || message.includes('warten')
                ? 'bg-red-50 text-red-800' 
                : 'bg-emerald-50 text-emerald-800'
            }`}>
              {message}
            </div>
          )}
        </div>

        <div className="px-8 py-4 bg-gray-50 flex items-center justify-end">
          <Link 
            to="/register" 
            className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Registrieren
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;