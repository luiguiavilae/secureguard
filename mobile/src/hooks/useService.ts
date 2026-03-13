import { useState } from 'react';
import { createService, getMyActiveServices } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export function useService() {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchMyActiveServices() {
    if (!token) return null;
    setLoading(true);
    const result = await getMyActiveServices(token);
    setLoading(false);
    if (result.error) setError(result.error);
    return result.data;
  }

  return { loading, error, fetchMyActiveServices };
}
