// TODO: Store Zustand para estado de autenticación global
import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  role: 'client' | 'agent' | null;
  setUser: (user: User | null) => void;
  setRole: (role: 'client' | 'agent') => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  clearUser: () => set({ user: null, role: null }),
}));
