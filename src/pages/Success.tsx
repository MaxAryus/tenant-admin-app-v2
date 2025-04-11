import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useStripe } from '../store/stripeStore';

const Success = () => {
  const { fetchSubscription } = useStripe();

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        <div className="mb-6">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Zahlung erfolgreich!
        </h1>
        <p className="text-gray-600 mb-8">
          Vielen Dank für Ihren Einkauf. Ihre Zahlung wurde erfolgreich verarbeitet.
        </p>
        <Link
          to="/dashboard"
          className="block w-full bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all"
        >
          Zum Dashboard
        </Link>
      </div>
    </div>
  );
};

export default Success;