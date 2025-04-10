import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { persist } from 'zustand/middleware';

interface AuthState {
  session: Session | null;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      signOut: async () => {
        await supabase.auth.signOut();
        set({ session: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ session: state.session }),
    }
  )
);

// Initialize session from supabase
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    useAuth.getState().setSession(session);
  }
});

// Listen for auth changes
supabase.auth.onAuthStateChange((_event, session) => {
  useAuth.getState().setSession(session);
});