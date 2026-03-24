import { createAdminClient } from '@/lib/supabase';
import { mockMetricas, mockServicios, type MockMetricas, type MockServicio } from '@/lib/mock-data';

export async function getMetricas(): Promise<{
  metricas: MockMetricas;
  servicios: MockServicio[];
}> {
  try {
    const db = createAdminClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const [
      activosRes,
      gmvRes,
      disponiblesRes,
      abiertasRes,
      disputasRes,
      serviciosRes,
    ] = await Promise.all([
      // Servicios activos (CONFIRMADO o EN_CURSO)
      db
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .in('estado', ['CONFIRMADO', 'EN_CURSO']),
      // GMV hoy: pagos PAGADO creados hoy
      db
        .from('payments')
        .select('monto')
        .eq('estado', 'PAGADO')
        .gte('created_at', todayIso),
      // Agentes disponibles: verificados y no en servicio
      db
        .from('agent_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'verified')
        .eq('en_servicio', false),
      // Solicitudes abiertas
      db
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .in('estado', ['ABIERTA', 'PARCIAL']),
      // Disputas abiertas (tabla puede llamarse disputes o disputas)
      db
        .from('disputes')
        .select('*', { count: 'exact', head: true })
        .in('estado', ['ABIERTA', 'EN_REVISION'])
        .throwOnError(),
      // Servicios del día para la tabla
      db
        .from('service_requests')
        .select('*')
        .gte('created_at', todayIso)
        .order('created_at', { ascending: false })
        .limit(20),
    ].map((p) => p.catch(() => ({ data: null, count: 0, error: null }))));

    const gmv_hoy = (gmvRes.data ?? []).reduce(
      (sum: number, p: any) => sum + (parseFloat(p.monto) || 0),
      0,
    );

    // Enriquecer servicios con nombres
    const svcData: any[] = serviciosRes.data ?? [];
    let servicios: MockServicio[] = mockServicios;

    if (svcData.length > 0) {
      const allUserIds = [
        ...new Set([
          ...svcData.map((s) => s.cliente_id),
          ...svcData.map((s) => s.agente_asignado_id),
        ].filter(Boolean)),
      ];

      const usersMap = new Map<string, any>();
      if (allUserIds.length > 0) {
        const { data: usersData } = await db
          .from('users')
          .select('id, phone, full_name')
          .in('id', allUserIds);
        (usersData ?? []).forEach((u) => usersMap.set(u.id, u));
      }

      servicios = svcData.map((s) => {
        const cliente = usersMap.get(s.cliente_id);
        const agente = s.agente_asignado_id ? usersMap.get(s.agente_asignado_id) : null;
        return {
          id: s.id.slice(0, 8),
          tipo: s.tipo_servicio ?? 'Servicio',
          estado: s.estado,
          distrito: s.distrito ?? '',
          agente_nombre: agente ? (agente.full_name ?? agente.phone) : null,
          cliente_nombre: cliente ? (cliente.full_name ?? cliente.phone ?? 'Cliente') : 'Cliente',
          hora_inicio: s.fecha_inicio_solicitada ?? s.created_at,
          duracion_horas: s.duracion_horas ?? 0,
          monto: parseFloat(s.precio_total) || 0,
        };
      });
    }

    return {
      metricas: {
        servicios_activos: activosRes.count ?? 0,
        gmv_hoy,
        agentes_disponibles: disponiblesRes.count ?? 0,
        solicitudes_abiertas: abiertasRes.count ?? 0,
        disputas_abiertas: disputasRes.count ?? 0,
        tiempo_promedio_verificacion: 0,
      },
      servicios,
    };
  } catch (e) {
    console.error('[getMetricas]', e);
    return { metricas: mockMetricas, servicios: mockServicios };
  }
}
