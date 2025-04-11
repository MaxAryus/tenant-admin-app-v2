import React from 'react';
import { STRIPE_PRODUCTS } from '../stripe-config';
import { useStripe } from '../store/stripeStore';
import { Loader2, Check, AlertTriangle, ChevronRight, Package, X } from 'lucide-react';

interface PricingPlansProps {
  currentPlan?: string | null;
  className?: string;
  onClose?: () => void;
  isModal?: boolean;
}

const PricingPlans: React.FC<PricingPlansProps> = ({ currentPlan, className, onClose, isModal = false }) => {
  const { createCheckoutSession, subscription } = useStripe();
  const [loading, setLoading] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handlePlanChange = async (priceId: string, mode: 'subscription' | 'payment') => {
    try {
      setError(null);
      setLoading(priceId);

      const url = await createCheckoutSession(priceId, mode);
      if (!url) {
        throw new Error('Fehler beim Erstellen der Checkout-Session');
      }

      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setError(error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setLoading(null);
    }
  };

  const getPlanComparison = (productPriceId: string) => {
    if (!subscription || !currentPlan) return null;

    const currentProduct = Object.values(STRIPE_PRODUCTS).find(p => p.priceId === currentPlan);
    const newProduct = Object.values(STRIPE_PRODUCTS).find(p => p.priceId === productPriceId);

    if (!currentProduct || !newProduct) return null;

    const currentMaxObjects = currentProduct.maxObjects || 2;
    const newMaxObjects = newProduct.maxObjects || 2;

    if (newMaxObjects > currentMaxObjects) {
      return 'upgrade';
    } else if (newMaxObjects < currentMaxObjects) {
      return 'downgrade';
    }
    return null;
  };

  // Sort products by maxObjects to ensure smallest plan is on the left
  const sortedProducts = Object.values(STRIPE_PRODUCTS).sort((a, b) => a.maxObjects - b.maxObjects);

  const content = (
    <div className={`space-y-6 ${className}`}>
      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-800 p-4 rounded-lg">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sortedProducts.map((product) => {
          const isCurrentPlan = currentPlan === product.priceId;
          const planComparison = getPlanComparison(product.priceId);
          
          return (
            <div
              key={product.id}
              className={`relative rounded-2xl ${
                isCurrentPlan 
                  ? 'border-2 border-emerald-500 bg-white shadow-xl' 
                  : 'border border-gray-200 bg-white shadow-md hover:shadow-lg'
              } transition-all duration-200`}
            >
              {isCurrentPlan && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Aktueller Plan
                </div>
              )}

              <div className="p-6">
                {/* Plan Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Package className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {product.description}
                    </p>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-baseline text-gray-900 mb-6">
                  <span className="text-3xl font-bold tracking-tight">
                    {product.price}
                  </span>
                  <span className="text-lg text-gray-500 font-medium ml-2">
                    /Monat
                  </span>
                </div>

                {/* Features */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Check className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-gray-700">Bis zu {product.maxObjects} Objekte</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Check className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-gray-700">Unbegrenzte Benutzer</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Check className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-gray-700">Unbegrenzte Schadensmeldungen</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Check className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-gray-700">Unbegrenzte Kontakte</span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handlePlanChange(product.priceId, product.mode)}
                  disabled={loading !== null || isCurrentPlan}
                  className={`w-full rounded-lg px-6 py-3 text-base font-medium ${
                    isCurrentPlan
                      ? 'bg-emerald-100 text-emerald-700 cursor-default'
                      : loading === product.priceId
                      ? 'bg-gray-100 text-gray-500 cursor-wait'
                      : planComparison === 'upgrade'
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : planComparison === 'downgrade'
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  } focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors`}
                >
                  {loading === product.priceId ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Wird verarbeitet...</span>
                    </>
                  ) : isCurrentPlan ? (
                    <>
                      <Check className="h-5 w-5" />
                      <span>Aktueller Plan</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {planComparison === 'upgrade'
                          ? 'Upgraden'
                          : planComparison === 'downgrade'
                          ? 'Downgraden'
                          : 'Auswählen'}
                      </span>
                      <ChevronRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl my-8 p-6 relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Verfügbare Pläne</h2>
          {content}
        </div>
      </div>
    );
  }

  return content;
};

export default PricingPlans;