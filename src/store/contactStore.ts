import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { useCompany } from './companyStore';

export interface Contact {
  id: string;
  name: string;
  description: string | null;
  email: string | null;
  phone_number: string | null;
  company_id: string;
  is_emergency: boolean;
  apartments?: Array<{
    id: string;
    name: string;
    object: {
      id: string;
      name: string;
    };
  }>;
}

interface ContactState {
  contacts: Contact[];
  selectedContact: Contact | null;
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
  setSelectedContact: (contact: Contact | null) => void;
  fetchContacts: (forceRefresh?: boolean) => Promise<void>;
  createContact: (contactData: Partial<Contact> & { apartmentIds?: string[] }) => Promise<void>;
  updateContact: (id: string, contactData: Partial<Contact> & { apartmentIds?: string[] }) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  fetchContactDetails: (id: string) => Promise<Contact | null>;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useContacts = create<ContactState>()(
  persist(
    (set, get) => ({
      contacts: [],
      selectedContact: null,
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
        get().fetchContacts(true);
      },
      setCurrentPage: (page) => {
        set({ currentPage: page });
        get().fetchContacts(true);
      },
      setSelectedContact: async (contact) => {
        if (contact) {
          const updatedContact = await get().fetchContactDetails(contact.id);
          set({ selectedContact: updatedContact });
        } else {
          set({ selectedContact: null });
        }
      },
      fetchContactDetails: async (id) => {
        try {
          const { data: contact, error: contactError } = await supabase
            .from('company_contacts')
            .select(`
              *,
              apartments:apartment_contacts(
                apartment:apartments (
                  id,
                  name,
                  object:objects (
                    id,
                    name
                  )
                )
              )
            `)
            .eq('id', id)
            .single();

          if (contactError) throw contactError;
          if (!contact) throw new Error('Contact not found');

          // Transform the nested apartments data
          const apartments = contact.apartments
            .map(ac => ac.apartment)
            .filter(a => a !== null)
            .sort((a, b) => a.name.localeCompare(b.name));

          const updatedContact = {
            ...contact,
            apartments,
          };

          // Update the contact in the contacts list
          const updatedContacts = get().contacts.map(c =>
            c.id === id ? updatedContact : c
          );
          set({ contacts: updatedContacts });

          return updatedContact;
        } catch (error: any) {
          console.error('Error fetching contact details:', error);
          return null;
        }
      },
      fetchContacts: async (forceRefresh = false) => {
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
            .from('company_contacts')
            .select(`
              *,
              apartments:apartment_contacts(
                apartment:apartments (
                  id,
                  name,
                  object:objects (
                    id,
                    name
                  )
                )
              )
            `, { count: 'exact' })
            .eq('company_id', company.id);

          if (searchTerm) {
            query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%`);
          }

          const { data, count, error } = await query
            .order('name')
            .range(from, to);

          if (error) throw error;

          // Transform the data to include apartments in the expected format
          const transformedData = data?.map(contact => ({
            ...contact,
            apartments: contact.apartments
              .map(ac => ac.apartment)
              .filter(a => a !== null)
              .sort((a, b) => a.name.localeCompare(b.name))
          })) || [];

          const totalPages = Math.ceil((count || 0) / itemsPerPage);

          set({
            contacts: transformedData,
            error: null,
            totalPages,
            totalItems: count || 0,
            lastFetched: now,
          });
        } catch (error: any) {
          console.error('Error fetching contacts:', error);
          set({ error: error.message });
        } finally {
          set({ loading: false });
        }
      },
      createContact: async (contactData) => {
        try {
          const company = useCompany.getState().company;
          if (!company) throw new Error('No company found');

          // First create the contact
          const { data: contact, error: contactError } = await supabase
            .from('company_contacts')
            .insert({
              name: contactData.name,
              description: contactData.description,
              email: contactData.email,
              phone_number: contactData.phone_number,
              is_emergency: contactData.is_emergency,
              company_id: company.id,
            })
            .select()
            .single();

          if (contactError) throw contactError;

          // Then create apartment associations if any
          if (contactData.apartmentIds?.length) {
            const apartmentAssociations = contactData.apartmentIds.map(apartmentId => ({
              contact_id: contact.id,
              apartment_id: apartmentId,
            }));

            const { error: associationsError } = await supabase
              .from('apartment_contacts')
              .insert(apartmentAssociations);

            if (associationsError) throw associationsError;
          }

          // Refresh contacts list
          await get().fetchContacts(true);
        } catch (error: any) {
          console.error('Error creating contact:', error);
          throw new Error(error.message || 'Failed to create contact');
        }
      },
      updateContact: async (id, contactData) => {
        try {
          // Update contact details
          const { error: contactError } = await supabase
            .from('company_contacts')
            .update({
              name: contactData.name,
              description: contactData.description,
              email: contactData.email,
              phone_number: contactData.phone_number,
              is_emergency: contactData.is_emergency,
            })
            .eq('id', id);

          if (contactError) throw contactError;

          // Update apartment associations if provided
          if (contactData.apartmentIds !== undefined) {
            // First delete all existing associations
            const { error: deleteError } = await supabase
              .from('apartment_contacts')
              .delete()
              .eq('contact_id', id);

            if (deleteError) throw deleteError;

            // Then create new associations
            if (contactData.apartmentIds.length > 0) {
              const apartmentAssociations = contactData.apartmentIds.map(apartmentId => ({
                contact_id: id,
                apartment_id: apartmentId,
              }));

              const { error: associationsError } = await supabase
                .from('apartment_contacts')
                .insert(apartmentAssociations);

              if (associationsError) throw associationsError;
            }
          }

          // Refresh contacts list and selected contact
          await Promise.all([
            get().fetchContacts(true),
            get().fetchContactDetails(id).then(contact => {
              if (contact) {
                set({ selectedContact: contact });
              }
            }),
          ]);
        } catch (error: any) {
          console.error('Error updating contact:', error);
          throw new Error(error.message || 'Failed to update contact');
        }
      },
      deleteContact: async (id) => {
        try {
          // First delete all apartment associations
          const { error: associationsError } = await supabase
            .from('apartment_contacts')
            .delete()
            .eq('contact_id', id);

          if (associationsError) throw associationsError;

          // Then delete the contact
          const { error: contactError } = await supabase
            .from('company_contacts')
            .delete()
            .eq('id', id);

          if (contactError) throw contactError;

          // Refresh contacts list
          await get().fetchContacts(true);
          
          // Clear selected contact if it was the deleted one
          if (get().selectedContact?.id === id) {
            set({ selectedContact: null });
          }
        } catch (error: any) {
          console.error('Error deleting contact:', error);
          throw new Error(error.message || 'Failed to delete contact');
        }
      },
    }),
    {
      name: 'contacts-storage',
      partialize: (state) => ({
        totalItems: state.totalItems,
        lastFetched: state.lastFetched,
      }),
    }
  )
);