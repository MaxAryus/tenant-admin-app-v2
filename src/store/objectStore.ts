import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { useCompany } from './companyStore';

interface Object {
  id: string;
  name: string;
  street: string;
  zip_code: number | null;
}

interface Apartment {
  id: string;
  name: string;
  object_id: string;
  object: Object;
}

interface ObjectState {
  objects: Object[];
  apartments: Apartment[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  selectedObjectId: string | null;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  lastFetched: number | null;
  initialized: boolean;
  setSearchTerm: (term: string) => void;
  setSelectedObjectId: (objectId: string | null) => void;
  setCurrentPage: (page: number) => void;
  fetchObjects: () => Promise<void>;
  fetchApartments: (forceRefresh?: boolean) => Promise<void>;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export const useObjects = create<ObjectState>()(
  persist(
    (set, get) => ({
      objects: [],
      apartments: [],
      loading: false,
      error: null,
      searchTerm: '',
      selectedObjectId: null,
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 10,
      lastFetched: null,
      initialized: false,
      setSearchTerm: (term) => {
        set({ searchTerm: term, currentPage: 1 });
        get().fetchApartments(true);
      },
      setSelectedObjectId: (objectId) => {
        set({ selectedObjectId: objectId, currentPage: 1 });
        get().fetchApartments(true);
      },
      setCurrentPage: (page) => {
        set({ currentPage: page });
        get().fetchApartments(true);
      },
      fetchObjects: async () => {
        try {
          const company = useCompany.getState().company;
          
          if (!company) {
            set({ objects: [] });
            return;
          }
          const { data: objects, error } = await supabase
            .from('objects')
            .select('id, name, street, zip_code')
            .eq('company_id', company.id)
            .order('name');
          if (error) throw error;
          set({ objects: objects || [] });
        } catch (error: any) {
          console.error('Error fetching objects:', error);
          set({ error: error.message });
        }
      },
      fetchApartments: async (forceRefresh = false) => {
        const now = Date.now();
        const lastFetched = get().lastFetched;
        const company = useCompany.getState().company;
        const initialized = get().initialized;
        const apartments = get().apartments;
        
        // Modified caching condition: also check if we have data
        if (!forceRefresh && lastFetched && initialized && 
            (now - lastFetched < CACHE_DURATION) && apartments.length > 0) {
          return;
        }
        
        try {
          set({ loading: true, error: null });
          
          if (!company) {
            set({ apartments: [], loading: false });
            return;
          }
          
          const { currentPage, itemsPerPage, searchTerm, selectedObjectId } = get();
          
          // Calculate range for pagination
          const from = (currentPage - 1) * itemsPerPage;
          const to = from + itemsPerPage - 1;
          
          // Build the base query
          let query = supabase
            .from('apartments')
            .select(`
              id,
              name,
              object_id,
              object:objects!inner (
                id,
                name,
                street,
                zip_code,
                company_id
              )
            `, { count: 'exact' })
            .eq('object.company_id', company.id);
          
          // Add filters
          if (selectedObjectId) {
            query = query.eq('object_id', selectedObjectId);
          }
          
          // If searching, perform two separate queries and merge results
          if (searchTerm && searchTerm.trim() !== '') {
            try {
              // Create the search pattern
              const pattern = `%${searchTerm}%`;
              
              // Two separate queries - one for apartment name search
              const apartmentNameQuery = supabase
                .from('apartments')
                .select(`
                  id,
                  name,
                  object_id,
                  object:objects!inner (
                    id,
                    name,
                    street,
                    zip_code,
                    company_id
                  )
                `, { count: 'exact' })
                .eq('object.company_id', company.id)
                .ilike('name', pattern);
                
              if (selectedObjectId) {
                apartmentNameQuery.eq('object_id', selectedObjectId);
              }
              
              // One for object name search
              const objectNameQuery = supabase
                .from('apartments')
                .select(`
                  id,
                  name,
                  object_id,
                  object:objects!inner (
                    id,
                    name,
                    street,
                    zip_code,
                    company_id
                  )
                `, { count: 'exact' })
                .eq('object.company_id', company.id)
                .ilike('object.name', pattern);
                
              if (selectedObjectId) {
                objectNameQuery.eq('object_id', selectedObjectId);
              }
              
              // Execute both queries in parallel
              const [apartmentNameResult, objectNameResult] = await Promise.all([
                apartmentNameQuery,
                objectNameQuery
              ]);
              
              if (apartmentNameResult.error) throw apartmentNameResult.error;
              if (objectNameResult.error) throw objectNameResult.error;
              
              // Merge results, removing duplicates
              const allApartments = [
                ...(apartmentNameResult.data || []),
                ...(objectNameResult.data || [])
              ];
              
              // Remove duplicates by ID
              const uniqueIds = new Set();
              const uniqueApartments = allApartments.filter(apartment => {
                if (uniqueIds.has(apartment.id)) {
                  return false;
                }
                uniqueIds.add(apartment.id);
                return true;
              });
              
              // Sort by name
              uniqueApartments.sort((a, b) => a.name.localeCompare(b.name));
              
              // Calculate pagination
              const total = uniqueApartments.length;
              const paginatedApartments = uniqueApartments.slice(from, to + 1);
              
              // Update state
              set({
                apartments: paginatedApartments,
                error: null,
                totalPages: Math.ceil(total / itemsPerPage),
                totalItems: total,
                lastFetched: now,
                initialized: true
              });
              
              // Exit early as we've handled the search case
              set({ loading: false });
              return;
            } catch (searchError: any) {
              // If the search approach fails, fall back to the regular query without search
              console.error('Search error:', searchError);
              // Clear search term to avoid the issue in future requests
              set({ searchTerm: '' });
            }
          }
          
          // If not searching OR if search failed, execute regular query without search filter
          const { data, count, error } = await query
            .order('name')
            .range(from, to);
          
          if (error) throw error;
          
          // Calculate total pages
          const totalPages = Math.ceil((count || 0) / itemsPerPage);
          
          set({ 
            apartments: data || [], 
            error: null,
            totalPages,
            totalItems: count || 0,
            lastFetched: now,
            initialized: true
          });
        } catch (error: any) {
          console.error('Error fetching apartments:', error);
          set({ error: error.message, apartments: [] });
        } finally {
          set({ loading: false });
        }
      },
    }),
    {
      name: 'objects-storage',
      partialize: (state) => ({
        totalItems: state.totalItems,
        lastFetched: state.lastFetched,
        initialized: state.initialized
      }),
    }
  )
);