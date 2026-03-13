// TODO: Hook para suscripciones realtime de Supabase — servicios, mensajes, disponibilidad
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useRealtime(table: string, filter: string, onUpdate: (payload: unknown) => void) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // TODO: Implementar suscripción a canal de Supabase Realtime
    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [table, filter]);
}
