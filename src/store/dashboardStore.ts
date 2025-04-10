import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useCompany } from './companyStore';

interface DashboardStats {
  totalUsers: number;
  totalObjects: number;
  totalApartments: number;
  recentUsers: Array<{
    user_id: string;
    first_name: string;
    last_name: string;
    created_at: string;
    email: string | null;
    phone_number: string | null;
  }>;
}

interface DashboardState {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  fetchStats: () => Promise<void>;
}

export const useDashboard = create<DashboardState>((set) => ({
  stats: null,
  loading: false,
  error: null,
  fetchStats: async () => {
    try {
      set({ loading: true, error: null });
      const company = useCompany.getState().company;
      
      if (!company) {
        throw new Error('No company found');
      }

      // Get company users with their user details in a single query
      const { data: companyUsersWithDetails, error: usersError } = await supabase
        .from('company_users')
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

      if (usersError) throw usersError;

      // Get total objects count
      const { count: objectsCount, error: objectsError } = await supabase
        .from('objects')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id);

      if (objectsError) throw objectsError;

      // Get objects for apartments count
      const { data: objects, error: objectsListError } = await supabase
        .from('objects')
        .select('id')
        .eq('company_id', company.id);

      if (objectsListError) throw objectsListError;

      // Get apartments count
      const objectIds = objects?.map(obj => obj.id) || [];
      const { count: apartmentsCount, error: apartmentsError } = await supabase
        .from('apartments')
        .select('*', { count: 'exact', head: true })
        .in('object_id', objectIds);

      if (apartmentsError) throw apartmentsError;

      // Process user data
      const users = companyUsersWithDetails
        ?.map(cu => cu.users)
        .filter(user => user !== null)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      set({
        stats: {
          totalUsers: companyUsersWithDetails?.length || 0,
          totalObjects: objectsCount || 0,
          totalApartments: apartmentsCount || 0,
          recentUsers: users || [],
        },
        error: null,
      });
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },
}));