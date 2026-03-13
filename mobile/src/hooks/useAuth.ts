import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const { token, userId, tipo, clearAuth } = useAuthStore();
  return { token, userId, tipo, clearAuth };
}
