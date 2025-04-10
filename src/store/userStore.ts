import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { useCompany } from './companyStore';

interface Apartment {
  id: string;
  name: string;
  object: {
    id: string;
    name: string;
    street: string;
    zip_code: number | null;
  };
}

interface User {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  created_at: string;
  apartments?: Apartment[];
}

interface UserState {
  users: User[];
  selectedUser: User | null;
  loading: boolean;
  error: string | null;
  searchTerm: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  lastFetched: number | null;
  initialized: boolean;
  setSearchTerm: (term: string) => void;
  setCurrentPage: (page: number) => void;
  fetchUsers: (forceRefresh?: boolean) => Promise<void>;
  setSelectedUser: (user: User | null) => void;
  fetchUserDetails: (userId: string) => Promise<User | null>;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export const useUsers = create<UserState>()(
  persist(
    (set, get) => ({
      users: [],
      selectedUser: null,
      loading: false,
      error: null,
      searchTerm: '',
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 10,
      lastFetched: null,
      initialized: false,
      setSearchTerm: (term) => {
        set({ searchTerm: term, currentPage: 1 });
        get().fetchUsers(true);
      },
      setCurrentPage: (page) => {
        set({ currentPage: page });
        get().fetchUsers(true);
      },
      setSelectedUser: async (user) => {
        if (user) {
          const updatedUser = await get().fetchUserDetails(user.user_id);
          set({ selectedUser: updatedUser });
        } else {
          set({ selectedUser: null });
        }
      },
      fetchUserDetails: async (userId) => {
        try {
          // First get the basic user info
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('user_id, first_name, last_name, email, phone_number, created_at')
            .eq('user_id', userId)
            .single();

          if (userError) throw userError;
          if (!userData) throw new Error('User not found');

          // Then get the user's apartments
          const { data: userApartments, error: apartmentsError } = await supabase
            .from('user_apartments')
            .select(`
              apartment_id,
              apartments (
                id,
                name,
                object: objects (
                  id,
                  name,
                  street,
                  zip_code
                )
              )
            `)
            .eq('user_id', userId);

          if (apartmentsError) throw apartmentsError;

          const apartments = userApartments
            .map(ua => ua.apartments)
            .filter((apartment): apartment is Apartment => apartment !== null)
            .sort((a, b) => a.name.localeCompare(b.name));

          const updatedUser = {
            ...userData,
            apartments
          };

          // Update the user in the users list as well
          const updatedUsers = get().users.map(u => 
            u.user_id === userId ? { ...u, apartments } : u
          );
          set({ users: updatedUsers });

          return updatedUser;
        } catch (error: any) {
          console.error('Error fetching user details:', error);
          set({ error: error.message });
          return null;
        }
      },
      fetchUsers: async (forceRefresh = false) => {
        const now = Date.now();
        const lastFetched = get().lastFetched;
        const company = useCompany.getState().company;
        const initialized = get().initialized;
        const users = get().users;

        if (!forceRefresh && lastFetched && initialized && 
            (now - lastFetched < CACHE_DURATION) && users.length > 0) {
          return;
        }

        try {
          set({ loading: true, error: null });
          
          if (!company) {
            throw new Error('Kein Unternehmen gefunden');
          }

          const { currentPage, itemsPerPage, searchTerm } = get();
          const from = (currentPage - 1) * itemsPerPage;
          const to = from + itemsPerPage - 1;

          const { data: companyUsers, error: companyUsersError } = await supabase
            .from('company_users')
            .select('user_id')
            .eq('company_id', company.id);
            
          if (companyUsersError) throw companyUsersError;
          
          const userIds = companyUsers.map(user => user.user_id);
          
          let query = supabase
            .from('users')
            .select('user_id, first_name, last_name, email, phone_number, created_at', { count: 'exact' })
            .in('user_id', userIds);

          if (searchTerm && searchTerm.trim() !== '') {
            try {
              const pattern = `%${searchTerm}%`;
              const searchFields = ['first_name', 'last_name', 'email', 'phone_number'];
              
              const fieldQueries = searchFields.map(field => {
                return supabase
                  .from('users')
                  .select('user_id, first_name, last_name, email, phone_number, created_at', { count: 'exact' })
                  .in('user_id', userIds)
                  .ilike(field, pattern);
              });
              
              const results = await Promise.all(fieldQueries);
              
              for (const result of results) {
                if (result.error) throw result.error;
              }
              
              const allUsers = results.flatMap(result => result.data || []);
              
              const uniqueIds = new Set();
              const uniqueUsers = allUsers.filter(user => {
                if (uniqueIds.has(user.user_id)) {
                  return false;
                }
                uniqueIds.add(user.user_id);
                return true;
              });
              
              uniqueUsers.sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
              
              const total = uniqueUsers.length;
              const paginatedUsers = uniqueUsers.slice(from, to + 1);
              
              set({
                users: paginatedUsers,
                error: null,
                totalPages: Math.ceil(total / itemsPerPage),
                totalItems: total,
                currentPage: Math.min(currentPage, Math.ceil(total / itemsPerPage) || 1),
                lastFetched: now,
                initialized: true
              });
              
              set({ loading: false });
              return;
            } catch (searchError: any) {
              console.error('Search error:', searchError);
              set({ searchTerm: '' });
            }
          }
          
          const { data, count, error: usersError } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

          if (usersError) throw usersError;

          const totalPages = Math.ceil((count || 0) / itemsPerPage);
          const users = data && Array.isArray(data) ? data : [];

          // If we have a selected user, update their details too
          const selectedUser = get().selectedUser;
          if (selectedUser) {
            const updatedUser = await get().fetchUserDetails(selectedUser.user_id);
            set({ selectedUser: updatedUser });
          }

          set({ 
            users, 
            error: null,
            totalPages,
            totalItems: count || 0,
            currentPage: Math.min(currentPage, totalPages || 1),
            lastFetched: now,
            initialized: true
          });
        } catch (error: any) {
          console.error('Error fetching users:', error);
          set({ 
            error: error.message,
            users: [],
            totalPages: 1,
            totalItems: 0,
            currentPage: 1
          });
        } finally {
          set({ loading: false });
        }
      },
    }),
    {
      name: 'users-storage',
      partialize: (state) => ({
        totalItems: state.totalItems,
        lastFetched: state.lastFetched,
        initialized: state.initialized
      }),
    }
  )
);