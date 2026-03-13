// TODO: Hook para operaciones de servicio — crear, aceptar, completar, cancelar
import { useState } from 'react';
import { api } from '@/lib/api';

export function useService(serviceId?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: Implementar operaciones de servicio
  return { loading, error };
}
