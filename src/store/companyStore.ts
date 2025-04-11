import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuth } from './authStore';
import { useStripe } from './stripeStore';

interface Company {
  id: string;
  name: string;
  address: string;
  land: string;
  street: string;
  zip_code: number;
  city: string;
  logo_url: string | null;
}

interface CompanyState {
  company: Company | null;
  loading: boolean;
  error: string | null;
  fetchCompany: () => Promise<void>;
}

export const useCompany = create<CompanyState>((set) => ({
  company: null,
  loading: false,
  error: null,
  fetchCompany: async () => {
    try {
      set({ loading: true, error: null });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user found');

      // First, get the company_id from company_admins
      const { data: companyAdminData, error: companyAdminError } = await supabase
        .from('company_admins')
        .select('company_id')
        .eq('user_id', user.id);

      if (companyAdminError) throw companyAdminError;
      if (!companyAdminData || companyAdminData.length === 0) {
        // User is not an admin, log them out
        await useAuth.getState().signOut();
        throw new Error('User is not an admin of any company');
      }

      // Then, get the company details using the company_id
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, name, address, city, zip_code, land, street, logo_url')
        .eq('id', companyAdminData[0].company_id);

      if (companyError) throw companyError;
      if (!companyData || companyData.length === 0) {
        // Company not found, log them out
        await useAuth.getState().signOut();
        throw new Error('Company not found');
      }

      const company = {
        id: companyData[0].id,
        name: companyData[0].name,
        address: companyData[0].address,
        city: companyData[0].city,
        zip_code: companyData[0].zip_code,
        land: companyData[0].land,
        street: companyData[0].street,
        logo_url: companyData[0].logo_url,
      };

      // Also fetch subscription data
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('company_subscriptions')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      if (subscriptionError) {
        console.error('Error fetching subscription:', subscriptionError);
      } else if (subscriptionData) {
        // Update subscription state in stripe store
        useStripe.getState().setSubscription(subscriptionData);
      }

      set({ company, error: null });
    } catch (error: any) {
      console.error('Error fetching company:', error);
      set({ company: null, error: error.message });
    } finally {
      set({ loading: false });
    }
  },
}));