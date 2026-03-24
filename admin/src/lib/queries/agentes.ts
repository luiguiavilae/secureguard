import { createAdminClient } from '@/lib/supabase';
import {
  mockAgentesVerificados,
  type MockAgenteVerificado,
  type NivelScore,
} from '@/lib/mock-data';

function nivelByScore(score: number): NivelScore {
  if (score >= 80) return 'CONFIABLE';
  if (score >= 60) return 'REGULAR';
  if (score >= 40) return 'OBSERVADO';
  if (score >= 20) return 'RESTRINGIDO';
  return 'BLOQUEADO';
}

const STATUS_MAP: Record<string, MockAgenteVerificado['estado']> = {
  verified: 'ACTIVO',
  suspended: 'SUSPENDIDO',
  rejected: 'BLOQUEADO',
  pending: 'INACTIVO',
};

export async function getAgentesVerificados(): Promise<MockAgenteVerificado[]> {
  try {
    const db = createAdminClient();

    const { data: profilesData, error } = await db
      .from('agent_profiles')
      .select('*')
      .order('score', { ascending: false });

    if (error || !profilesData) throw error ?? new Error('No data');

    const agentIds = profilesData.map((p) => p.id);
    const userIds = [...new Set(profilesData.map((p) => p.user_id).filter(Boolean))];

    const [usersRes, badgesRes] = await Promise.all([
      userIds.length > 0
        ? db.from('users').select('*').in('id', userIds)
        : Promise.resolve({ data: [] }),
      agentIds.length > 0
        ? db.from('agent_badges').select('agent_id, badge').in('agent_id', agentIds)
        : Promise.resolve({ data: [] }),
    ]);

    const usersMap = new Map((usersRes.data ?? []).map((u: any) => [u.id, u]));
    const badgesMap = new Map<string, string[]>();
    (badgesRes.data ?? []).forEach((b: any) => {
      badgesMap.set(b.agent_id, [...(badgesMap.get(b.agent_id) ?? []), b.badge]);
    });

    return profilesData.map((p) => {
      const user: any = usersMap.get(p.user_id) ?? {};
      const score = parseFloat(p.score) || 0;

      return {
        id: p.id,
        nombre: user.full_name ?? user.phone ?? 'Sin nombre',
        dni: user.dni ?? '',
        phone: user.phone ?? '',
        email: user.email ?? '',
        distrito: p.districts?.[0] ?? '',
        created_at: p.created_at,
        foto_url: user.foto_url ?? null,
        estado: STATUS_MAP[p.status] ?? 'INACTIVO',
        sucamec_numero: p.sucamec_numero ?? '',
        score,
        nivel: nivelByScore(score),
        servicios_completados: p.completed_services ?? p.servicios_completados ?? 0,
        rating_avg: parseFloat(p.rating_avg) || 0,
        rating_count: p.rating_count ?? 0,
        comision_pct: 20,
        servicios_sin_retraso: 0,
        servicios_sin_cancelacion: 0,
        suspension_hasta: null,
        badges: badgesMap.get(p.id) ?? [],
        tipos_servicio: {},
        score_history: [],
        penalizaciones: [],
      };
    });
  } catch (e) {
    console.error('[getAgentesVerificados]', e);
    return mockAgentesVerificados;
  }
}
