import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { useCompany } from './companyStore';

interface DamageType {
  id: number;
  name: string;
  redirect_to: string;
}

interface TicketImage {
  id: number;
  file_url: string;
}

export interface Object {
  id: string;
  name: string;
  street: string;
  zip_code: number | null;
}

export interface Ticket {
  id: string;
  damage_type: number;
  subject: string;
  message: string;
  is_open: boolean;
  apartment_id: string | null;
  created_at: string;
  images?: TicketImage[];
  apartment?: {
    name: string;
    object: Object;
  };
  damage_type_info?: DamageType;
}

interface TicketState {
  tickets: Ticket[];
  damageTypes: DamageType[];
  objects: Object[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  statusFilter: 'all' | 'open' | 'closed';
  selectedTicket: Ticket | null;
  selectedObjectId: string | null;
  openTicketsCount: number;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  lastFetched: number | null;
  setSearchTerm: (term: string) => void;
  setStatusFilter: (status: 'all' | 'open' | 'closed') => void;
  setSelectedTicket: (ticket: Ticket | null) => void;
  setSelectedObjectId: (objectId: string | null) => void;
  setCurrentPage: (page: number) => void;
  fetchTickets: (forceRefresh?: boolean) => Promise<void>;
  fetchDamageTypes: () => Promise<void>;
  fetchObjects: () => Promise<void>;
  fetchOpenTicketsCount: () => Promise<void>;
  toggleTicketStatus: (ticketId: string) => Promise<void>;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export const useTickets = create<TicketState>()(
  persist(
    (set, get) => ({
      tickets: [],
      damageTypes: [],
      objects: [],
      loading: false,
      error: null,
      searchTerm: '',
      statusFilter: 'all',
      selectedTicket: null,
      selectedObjectId: null,
      openTicketsCount: 0,
      currentPage: 1,
      totalPages: 1,
      itemsPerPage: 10,
      totalItems: 0,
      lastFetched: null,
      setSearchTerm: (term) => {
        set({ searchTerm: term, currentPage: 1 });
        get().fetchTickets(true);
      },
      setStatusFilter: (status) => {
        set({ statusFilter: status, currentPage: 1 });
        get().fetchTickets(true);
      },
      setSelectedObjectId: (objectId) => {
        set({ selectedObjectId: objectId, currentPage: 1 });
        get().fetchTickets(true);
      },
      setSelectedTicket: (ticket) => set({ selectedTicket: ticket }),
      setCurrentPage: (page) => {
        set({ currentPage: page });
        get().fetchTickets(true);
      },
      toggleTicketStatus: async (ticketId) => {
        try {
          const ticket = get().tickets.find(t => t.id === ticketId);
          if (!ticket) throw new Error('Ticket not found');

          const { error } = await supabase
            .from('company_damage_reports')
            .update({ is_open: !ticket.is_open })
            .eq('id', ticketId);

          if (error) throw error;

          // Update local state
          const updatedTickets = get().tickets.map(t => 
            t.id === ticketId ? { ...t, is_open: !t.is_open } : t
          );

          set({ 
            tickets: updatedTickets,
            selectedTicket: ticket.id === get().selectedTicket?.id 
              ? { ...get().selectedTicket, is_open: !ticket.is_open }
              : get().selectedTicket,
            lastFetched: null // Force refresh on next fetch
          });

          // Update open tickets count
          get().fetchOpenTicketsCount();
        } catch (error: any) {
          console.error('Error toggling ticket status:', error);
          set({ error: error.message });
        }
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
      fetchOpenTicketsCount: async () => {
        try {
          const company = useCompany.getState().company;
          
          if (!company) {
            set({ openTicketsCount: 0 });
            return;
          }

          const { count, error } = await supabase
            .from('company_damage_reports')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id)
            .eq('is_open', true);

          if (error) throw error;

          set({ openTicketsCount: count || 0 });
        } catch (error: any) {
          console.error('Error fetching open tickets count:', error);
          set({ openTicketsCount: 0 });
        }
      },
      fetchTickets: async (forceRefresh = false) => {
        const now = Date.now();
        const lastFetched = get().lastFetched;
        const company = useCompany.getState().company;

        // Use cached data if available and not forcing refresh
        if (!forceRefresh && lastFetched && (now - lastFetched < CACHE_DURATION)) {
          return;
        }

        try {
          set({ loading: true, error: null });
          
          if (!company) {
            set({ tickets: [], loading: false });
            return;
          }

          const { currentPage, itemsPerPage, statusFilter, searchTerm, selectedObjectId } = get();

          // Build the base query
          let query = supabase
            .from('company_damage_reports')
            .select(`
              *,
              apartment:apartments!inner (
                name,
                object:objects!inner (
                  id,
                  name,
                  street,
                  zip_code
                )
              ),
              damage_type_info:company_damage_types (
                id,
                name,
                redirect_to
              ),
              images:company_damage_report_images (
                id,
                file_url
              )
            `, { count: 'exact' })
            .eq('company_id', company.id);

          // Apply filters
          if (statusFilter === 'open') {
            query = query.eq('is_open', true);
          } else if (statusFilter === 'closed') {
            query = query.eq('is_open', false);
          }

          if (searchTerm) {
            query = query.or(`subject.ilike.%${searchTerm}%,message.ilike.%${searchTerm}%`);
          }

          if (selectedObjectId) {
            query = query.eq('apartment.object.id', selectedObjectId);
          }

          // Get total count first
          const { count } = await query;
          const totalCount = count || 0;

          // Calculate pagination values
          const from = (currentPage - 1) * itemsPerPage;
          const to = from + itemsPerPage - 1;

          // Then get paginated data
          const { data: tickets, error: ticketsError } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

          if (ticketsError) throw ticketsError;

          // Calculate total pages
          const totalPages = Math.ceil(totalCount / itemsPerPage);

          set({ 
            tickets: tickets || [], 
            error: null,
            totalPages,
            totalItems: totalCount,
            lastFetched: now
          });
          
          get().fetchOpenTicketsCount();
        } catch (error: any) {
          console.error('Error fetching tickets:', error);
          set({ error: error.message, tickets: [] });
        } finally {
          set({ loading: false });
        }
      },
      fetchDamageTypes: async () => {
        try {
          const company = useCompany.getState().company;
          
          if (!company) {
            set({ damageTypes: [] });
            return;
          }

          const { data: types, error: typesError } = await supabase
            .from('company_damage_types')
            .select('*')
            .eq('company_id', company.id);

          if (typesError) throw typesError;

          set({ damageTypes: types || [] });
        } catch (error: any) {
          console.error('Error fetching damage types:', error);
          set({ error: error.message, damageTypes: [] });
        }
      },
    }),
    {
      name: 'tickets-storage',
      partialize: (state) => ({
        tickets: state.tickets,
        totalItems: state.totalItems,
        lastFetched: state.lastFetched,
        openTicketsCount: state.openTicketsCount
      }),
    }
  )
);