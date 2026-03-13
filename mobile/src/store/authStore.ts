import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { UserTipo } from '../types';

interface AuthState {
  token: string | null;
  userId: string | null;
  tipo: UserTipo | null;
  isNewUser: boolean;
  agentId: string | null;
  setAuth: (
    token: string,
    userId: string,
    tipo: UserTipo,
    isNewUser: boolean,
  ) => void;
  setTipo: (tipo: UserTipo) => void;
  setAgentId: (agentId: string) => void;
  clearAuth: () => void;
}

const secureStorage = createJSONStorage(() => ({
  getItem: (name: string): Promise<string | null> =>
    SecureStore.getItemAsync(name),
  setItem: (name: string, value: string): Promise<void> =>
    SecureStore.setItemAsync(name, value),
  removeItem: (name: string): Promise<void> =>
    SecureStore.deleteItemAsync(name),
}));

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      tipo: null,
      isNewUser: false,
      agentId: null,

      setAuth: (token, userId, tipo, isNewUser) =>
        set({ token, userId, tipo, isNewUser }),

      setTipo: (tipo) => set({ tipo }),

      setAgentId: (agentId) => set({ agentId }),

      clearAuth: () =>
        set({
          token: null,
          userId: null,
          tipo: null,
          isNewUser: false,
          agentId: null,
        }),
    }),
    {
      name: 'secureguard-auth',
      storage: secureStorage,
    },
  ),
);
