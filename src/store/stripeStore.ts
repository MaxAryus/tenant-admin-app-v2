import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { useCompany } from './companyStore';
import { STRIPE_PRODUCTS } from '../stripe-config';

interface CompanySubscription {
  company_id: string;
  company_name: string;
  subscription_id: string | null;
  subscription_status: string;
  price_id: string | null;
  current_period_start: number | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
  max_objects: number;
}

interface StripeState {
  subscription: CompanySubscription | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  fetchSubscription: () => Promise<void>;
  setSubscription: (subscription: CompanySubscription) => void;
  createCheckoutSession: (priceId: string, mode: 'subscription' | 'payment') => Promise<string>;
  createCustomerPortalSession: () => Promise<string>;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export const useStripe = create<StripeState>()(
  persist(
    (set, get) => ({
      subscription: null,
      loading: false,
      error: null,
      lastFetched: null,
      setSubscription: (subscription) => set({ subscription }),
      fetchSubscription: async () => {
        const now = Date.now();
        const lastFetched = get().lastFetched;
        const company = useCompany.getState().company;

        if (!company) {
          set({ subscription: null, error: 'No company selected' });
          return;
        }

        if (lastFetched && (now - lastFetched < CACHE_DURATION)) {
          return;
        }

        try {
          set({ loading: true, error: null });

          const { data: subscription, error } = await supabase
            .from('company_subscriptions')
            .select('*')
            .eq('company_id', company.id)
            .maybeSingle();

          if (error) throw error;

          set({ 
            subscription, 
            error: null,
            lastFetched: now
          });
        } catch (error: any) {
          console.error('Error fetching subscription:', error);
          set({ error: error.message });
        } finally {
          set({ loading: false });
        }
      },
      createCheckoutSession: async (priceId: string, mode: 'subscription' | 'payment') => {
        try {
          // Get the current session
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            throw new Error('No active session found');
          }

          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                price_id: priceId,
                mode,
                success_url: `${window.location.origin}/success`,
                cancel_url: `${window.location.origin}/cancel`,
              }),
            }
          );

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create checkout session');
          }

          const { url } = await response.json();
          return url;
        } catch (error: any) {
          console.error('Error creating checkout session:', error);
          throw error;
        }
      },
      createCustomerPortalSession: async () => {
        try {
          // Get the current session
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            throw new Error('No active session found');
          }

          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-portal`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                return_url: `${window.location.origin}/settings`,
              }),
            }
          );

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create portal session');
          }

          const { url } = await response.json();
          return url;
        } catch (error: any) {
          console.error('Error creating portal session:', error);
          throw error;
        }
      },
    }),
    {
      name: 'stripe-storage',
      partialize: (state) => ({
        lastFetched: state.lastFetched,
      }),
    }
  )
);