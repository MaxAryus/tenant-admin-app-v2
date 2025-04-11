import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import { useCompany } from '../store/companyStore';
import { useAdmins } from '../store/adminStore';
import { useStripe } from '../store/stripeStore';
import { 
  LogOut, 
  Building2, 
  Mail, 
  Phone, 
  ExternalLink, 
  LifeBuoy, 
  UserPlus,
  User,
  Calendar,
  Loader2,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Package
} from 'lucide-react';
import InviteAdminModal from '../components/InviteAdminModal';
import PricingPlans from '../components/PricingPlans';
import { STRIPE_PRODUCTS } from '../stripe-config';

const Settings = () => {
  const navigate = useNavigate();
  const { signOut, session } = useAuth();
  const { company } = useCompany();
  const { admins, loading, error, fetchAdmins } = useAdmins();
  const { subscription, loading: subscriptionLoading, error: subscriptionError, fetchSubscription, createCustomerPortalSession } = useStripe();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [managingSubscription, setManagingSubscription] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);

  useEffect(() => {
    if (!session) {
      navigate('/login');
      return;
    }

    if (company) {
      fetchAdmins();
      fetchSubscription();
    }
  }, [company, fetchAdmins, fetchSubscription, session, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleManageSubscription = async () => {
    try {
      setManagingSubscription(true);
      const url = await createCustomerPortalSession();
      window.location.href = url;
    } catch (error) {
      console.error('Error opening customer portal:', error);
    } finally {
      setManagingSubscription(false);
    }
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return null;
    return new Date(timestamp * 1000).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCurrentPlanName = () => {
    if (!subscription?.price_id) return 'Kostenlos';
    
    const plan = Object.values(STRIPE_PRODUCTS).find(p => p.priceId === subscription.price_id);
    return plan ? plan.name : 'Kostenlos';
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

        {/* Subscription Management */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Package className="h-5 w-5 text-emerald-600" />
              </div>
              <h2 className="text-lg font-medium text-gray-900">Abonnement</h2>
            </div>
          </div>

          {subscriptionLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : subscriptionError ? (
            <div className="bg-red-50 text-red-800 p-4 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <p>{subscriptionError}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Current Plan */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Aktueller Plan</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {subscription?.subscription_status === 'active' ? (
                        <>
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                            {getCurrentPlanName()}
                          </span>
                          <span className="mx-2">•</span>
                          {subscription.max_objects} Objekte
                        </>
                      ) : (
                        'Kostenlos'
                      )}
                    </p>
                  </div>
                  {subscription?.subscription_status === 'active' && (
                    <div className="text-sm text-gray-600">
                      Nächste Abrechnung: {formatDate(subscription.current_period_end)}
                    </div>
                  )}
                </div>

                {subscription?.payment_method_brand && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                    <CreditCard className="h-4 w-4" />
                    <span className="capitalize">{subscription.payment_method_brand}</span>
                    <span>•••• {subscription.payment_method_last4}</span>
                  </div>
                )}

                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  {subscription?.subscription_status === 'active' && (
                    <button
                      onClick={handleManageSubscription}
                      disabled={managingSubscription}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {managingSubscription ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Wird geladen...</span>
                        </>
                      ) : (
                        <>
                          <span>Abonnement verwalten</span>
                          <ChevronRight className="h-5 w-5" />
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setShowPlansModal(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <span>Pläne anzeigen</span>
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Admin Management */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">Administratoren</h2>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <UserPlus size={20} />
              <span>Admin einladen</span>
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-800 p-4 rounded-lg">
              {error}
            </div>
          ) : (
            <div className="space-y-4">
              {admins.map((admin) => (
                <div 
                  key={admin.user_id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                >
                  <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-600 font-medium">
                      {admin.first_name[0]}{admin.last_name[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900">
                      {admin.first_name} {admin.last_name}
                    </h3>
                    <div className="mt-1 space-y-1">
                      {admin.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{admin.email}</span>
                        </div>
                      )}
                      {admin.phone_number && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="h-4 w-4" />
                          <span>{admin.phone_number}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(admin.created_at).toLocaleDateString('de-DE')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Support Section */}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <LifeBuoy className="h-5 w-5 text-emerald-600" />
            </div>
            <h2 className="text-lg font-medium text-gray-900">Support</h2>
          </div>
          
          <p className="text-gray-600 mb-4">
            Haben Sie Fragen oder benötigen Sie Unterstützung? Unser Support-Team steht Ihnen gerne zur Verfügung.
          </p>

          <div className="space-y-4">
            <a 
              href="mailto:kontakt@2plus2-kommunikation.de" 
              className="flex items-center gap-3 text-gray-600 hover:text-emerald-600 transition-colors group"
            >
              <Mail className="h-5 w-5 group-hover:text-emerald-600" />
              <span className="underline underline-offset-2">kontakt@2plus2-kommunikation.de</span>
            </a>
            <a 
              href="tel:+4920549367762" 
              className="flex items-center gap-3 text-gray-600 hover:text-emerald-600 transition-colors group"
            >
              <Phone className="h-5 w-5 group-hover:text-emerald-600" />
              <span className="underline underline-offset-2">+49 2054 93677621</span>
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

      {showInviteModal && (
        <InviteAdminModal onClose={() => setShowInviteModal(false)} />
      )}

      {showPlansModal && (
        <PricingPlans
          currentPlan={subscription?.price_id}
          isModal={true}
          onClose={() => setShowPlansModal(false)}
        />
      )}
    </div>
  );
};

export default Settings;