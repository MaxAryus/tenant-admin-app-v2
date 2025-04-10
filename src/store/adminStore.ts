import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useCompany } from './companyStore';

interface Admin {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  created_at: string;
}

interface AdminState {
  admins: Admin[];
  loading: boolean;
  error: string | null;
  fetchAdmins: () => Promise<void>;
}

export const useAdmins = create<AdminState>((set) => ({
  admins: [],
  loading: false,
  error: null,
  fetchAdmins: async () => {
    try {
      set({ loading: true, error: null });
      const company = useCompany.getState().company;
      
      if (!company) {
        throw new Error('No company found');
      }

      // Get all admin users for the company
      const { data: adminData, error: adminError } = await supabase
        .from('company_admins')
        .select(`
          user_id,
          users (
            user_id,
            first_name,
            last_name,
            email,
            phone_number,
            created_at
          )
        `)
        .eq('company_id', company.id);

      if (adminError) throw adminError;

      // Transform the data to flatten the users object
      const admins = adminData
        .map(admin => ({
          ...admin.users,
        }))
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      set({ admins, error: null });
    } catch (error: any) {
      console.error('Error fetching admins:', error);
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },
}));