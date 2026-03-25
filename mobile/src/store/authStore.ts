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
  termsAccepted: boolean;
  setAuth: (
    token: string,
    userId: string,
    tipo: UserTipo,
    isNewUser: boolean,
  ) => void;
  setTipo: (tipo: UserTipo) => void;
  setAgentId: (agentId: string) => void;
  acceptTerms: () => void;
  /** Limpia el estado local. Para cerrar sesión completo usa logout(). */
  clearAuth: () => void;
  /** Cierra sesión: limpia token del SecureStore y resetea el store. */
  logout: () => void;
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
      termsAccepted: false,

      setAuth: (token, userId, tipo, isNewUser) =>
        set({ token, userId, tipo, isNewUser }),

      setTipo: (tipo) => set({ tipo }),

      setAgentId: (agentId) => set({ agentId }),

      acceptTerms: () => set({ termsAccepted: true }),

      clearAuth: () =>
        set({
          token: null,
          userId: null,
          tipo: null,
          isNewUser: false,
          agentId: null,
          termsAccepted: false,
        }),

      logout: () => {
        // Resetear el store en memoria — Zustand persist borrará SecureStore automáticamente.
        // RootNavigator reacciona al token: null y muestra AuthStack.
        set({
          token: null,
          userId: null,
          tipo: null,
          isNewUser: false,
          agentId: null,
          termsAccepted: false,
        });
      },
    }),
    {
      name: 'secureguard-auth',
      storage: secureStorage,
    },
  ),
);
