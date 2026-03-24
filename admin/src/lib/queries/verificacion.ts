import { createAdminClient } from '@/lib/supabase';
import {
  mockAgentesVerificacion,
  mockVerificacionStats,
  type MockAgente,
  type VerificacionEstado,
  type VerificacionStats,
} from '@/lib/mock-data';

export async function getVerificationQueue(): Promise<{
  agentes: MockAgente[];
  stats: VerificacionStats;
}> {
  try {
    const db = createAdminClient();

    const { data: queueData, error: queueError } = await db
      .from('agent_verification_queue')
      .select('*')
      .order('created_at', { ascending: true });

    if (queueError || !queueData) throw queueError ?? new Error('No queue data');

    const agentIds = queueData.map((q) => q.agent_id).filter(Boolean);
    if (agentIds.length === 0) {
      return { agentes: [], stats: { pendientes: 0, aprobados_hoy: 0, rechazados_hoy: 0 } };
    }

    const [profilesRes, docsRes] = await Promise.all([
      db.from('agent_profiles').select('*').in('id', agentIds),
      db.from('agent_documents').select('agent_id, tipo, estado').in('agent_id', agentIds),
    ]);

    const profilesMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
    const docsCountMap = new Map<string, number>();
    (docsRes.data ?? []).forEach((d) => {
      docsCountMap.set(d.agent_id, (docsCountMap.get(d.agent_id) ?? 0) + 1);
    });

    const userIds = [...new Set((profilesRes.data ?? []).map((p) => p.user_id).filter(Boolean))];
    const usersMap = new Map<string, Record<string, unknown>>();
    if (userIds.length > 0) {
      const { data: usersData } = await db.from('users').select('*').in('id', userIds);
      (usersData ?? []).forEach((u) => usersMap.set(u.id, u));
    }

    const agentes: MockAgente[] = queueData.map((q) => {
      const profile = profilesMap.get(q.agent_id);
      const user = profile ? usersMap.get(profile.user_id) : null;
      const docsCount = docsCountMap.get(q.agent_id) ?? 0;

      return {
        id: q.agent_id, // usar agent_profile_id como id para facilitar acciones
        nombre: (user as any)?.full_name ?? (user as any)?.phone ?? 'Sin nombre',
        dni: (user as any)?.dni ?? '',
        phone: (user as any)?.phone ?? '',
        email: (user as any)?.email ?? '',
        distrito: (profile as any)?.districts?.[0] ?? '',
        created_at: q.created_at,
        docs_subidos: docsCount,
        foto_url: (user as any)?.foto_url ?? null,
        estado: q.estado as VerificacionEstado,
        sucamec_numero: (profile as any)?.sucamec_numero ?? '',
        fecha_nacimiento: (user as any)?.fecha_nacimiento ?? '',
      };
    });

    // Calcular stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pendientes = agentes.filter((a) => a.estado === 'EN_REVISION').length;
    const aprobados_hoy = queueData.filter(
      (q) => q.estado === 'APROBADO' && new Date(q.updated_at ?? q.created_at) >= today,
    ).length;
    const rechazados_hoy = queueData.filter(
      (q) => q.estado === 'RECHAZADO' && new Date(q.updated_at ?? q.created_at) >= today,
    ).length;

    return { agentes, stats: { pendientes, aprobados_hoy, rechazados_hoy } };
  } catch (e) {
    console.error('[getVerificationQueue]', e);
    return { agentes: mockAgentesVerificacion, stats: mockVerificacionStats };
  }
}
