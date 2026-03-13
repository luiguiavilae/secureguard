// TODO: Hook para gestión de autenticación — sesión, login, logout
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const { user, setUser, clearUser } = useAuthStore();

  useEffect(() => {
    // TODO: Suscribirse a cambios de sesión de Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return { user };
}
