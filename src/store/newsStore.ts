import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { useCompany } from './companyStore';

export interface NewsItem {
  id: number;
  title: string;
  message: string;
  image_url: string | null;
  company_id: string;
  created_at: string;
}

interface CreateNewsData {
  title: string;
  message: string;
  image_url: string | null;
  objectApartments: {
    objectId: string;
    apartmentIds: string[] | null; // null means all apartments of the object
  }[];
}

interface NewsState {
  news: NewsItem[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  lastFetched: number | null;
  setSearchTerm: (term: string) => void;
  setCurrentPage: (page: number) => void;
  fetchNews: (forceRefresh?: boolean) => Promise<void>;
  createNews: (newsData: CreateNewsData) => Promise<void>;
  deleteNews: (id: number) => Promise<void>;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export const useNews = create<NewsState>()(
  persist(
    (set, get) => ({
      news: [],
      loading: false,
      error: null,
      searchTerm: '',
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 10,
      lastFetched: null,
      setSearchTerm: (term) => {
        set({ searchTerm: term, currentPage: 1 });
        get().fetchNews(true);
      },
      setCurrentPage: (page) => {
        set({ currentPage: page });
        get().fetchNews(true);
      },
      fetchNews: async (forceRefresh = false) => {
        const now = Date.now();
        const lastFetched = get().lastFetched;
        const company = useCompany.getState().company;

        if (!forceRefresh && lastFetched && (now - lastFetched < CACHE_DURATION)) {
          return;
        }

        try {
          set({ loading: true, error: null });
          
          if (!company) {
            throw new Error('No company found');
          }

          const { currentPage, itemsPerPage, searchTerm } = get();
          const from = (currentPage - 1) * itemsPerPage;
          const to = from + itemsPerPage - 1;

          let query = supabase
            .from('news')
            .select('*', { count: 'exact' })
            .eq('company_id', company.id);

          if (searchTerm) {
            query = query.or(`title.ilike.%${searchTerm}%,message.ilike.%${searchTerm}%`);
          }

          const { data, count, error } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

          if (error) throw error;

          const totalPages = Math.ceil((count || 0) / itemsPerPage);

          set({ 
            news: data || [], 
            error: null,
            totalPages,
            totalItems: count || 0,
            lastFetched: now
          });
        } catch (error: any) {
          console.error('Error fetching news:', error);
          set({ error: error.message });
        } finally {
          set({ loading: false });
        }
      },
      createNews: async (newsData) => {
        try {
          const company = useCompany.getState().company;
          if (!company) throw new Error('No company found');

          // First, create the news entry
          const { data: newsEntry, error: newsError } = await supabase
            .from('news')
            .insert({
              title: newsData.title,
              message: newsData.message,
              image_url: newsData.image_url,
              company_id: company.id
            })
            .select()
            .single();

          if (newsError) throw newsError;

          // Then, create apartment associations
          const apartmentAssociations = [];

          for (const objectApartment of newsData.objectApartments) {
            if (objectApartment.apartmentIds === null) {
              // Get all apartments for this object
              const { data: apartments, error: apartmentsError } = await supabase
                .from('apartments')
                .select('id')
                .eq('object_id', objectApartment.objectId);

              if (apartmentsError) throw apartmentsError;

              apartmentAssociations.push(
                ...apartments.map(apartment => ({
                  news_id: newsEntry.id,
                  apartment_id: apartment.id
                }))
              );
            } else {
              // Use the selected apartments
              apartmentAssociations.push(
                ...objectApartment.apartmentIds.map(apartmentId => ({
                  news_id: newsEntry.id,
                  apartment_id: apartmentId
                }))
              );
            }
          }

          // Insert all apartment associations
          if (apartmentAssociations.length > 0) {
            const { error: associationsError } = await supabase
              .from('apartment_news')
              .insert(apartmentAssociations);

            if (associationsError) throw associationsError;
          }

          // Refresh the news list
          await get().fetchNews(true);
        } catch (error: any) {
          console.error('Error creating news:', error);
          throw error;
        }
      },
      deleteNews: async (id) => {
        try {
          // First delete all apartment associations
          const { error: associationsError } = await supabase
            .from('apartment_news')
            .delete()
            .eq('news_id', id);

          if (associationsError) throw associationsError;

          // Then delete the news entry
          const { error: newsError } = await supabase
            .from('news')
            .delete()
            .eq('id', id);

          if (newsError) throw newsError;

          // Refresh the news list
          await get().fetchNews(true);
        } catch (error: any) {
          console.error('Error deleting news:', error);
          throw error;
        }
      },
    }),
    {
      name: 'news-storage',
      partialize: (state) => ({
        totalItems: state.totalItems,
        lastFetched: state.lastFetched
      }),
    }
  )
);