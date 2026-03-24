import { createAdminClient } from '@/lib/supabase';
import { mockClientes, type MockCliente, type ClienteNivel, type ClienteEstado } from '@/lib/mock-data';

function nivelByScore(score: number): ClienteNivel {
  if (score >= 90) return 'PREMIUM';
  if (score >= 70) return 'REGULAR';
  if (score >= 50) return 'OBSERVADO';
  if (score < 20) return 'BLOQUEADO';
  return 'NUEVO';
}

export async function getClientes(): Promise<MockCliente[]> {
  try {
    const db = createAdminClient();

    const { data: profilesData, error } = await db
      .from('client_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !profilesData) throw error ?? new Error('No data');

    const userIds = [...new Set(profilesData.map((p: any) => p.user_id).filter(Boolean))];

    const usersMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: usersData } = await db.from('users').select('*').in('id', userIds);
      (usersData ?? []).forEach((u) => usersMap.set(u.id, u));
    }

    return profilesData.map((p: any) => {
      const user = usersMap.get(p.user_id) ?? {};
      const score = parseFloat(p.score) ?? 50;

      return {
        id: p.id,
        nombre: user.full_name ?? user.phone ?? 'Sin nombre',
        dni: user.dni ?? '',
        telefono: user.phone ?? '',
        email: user.email ?? '',
        score,
        nivel: (p.nivel as ClienteNivel) ?? nivelByScore(score),
        estado: (p.estado as ClienteEstado) ?? 'ACTIVO',
        servicios_solicitados: p.servicios_solicitados ?? p.total_services ?? 0,
        cancelaciones_mes: p.cancelaciones_mes ?? 0,
        created_at: p.created_at,
        distrito: user.distrito ?? p.distrito ?? '',
        score_history: [],
        cancelaciones: [],
        servicios: [],
        irregularidades: [],
      };
    });
  } catch (e) {
    console.error('[getClientes]', e);
    return mockClientes;
  }
}
