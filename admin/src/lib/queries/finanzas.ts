import { createAdminClient } from '@/lib/supabase';
import {
  mockTransacciones,
  mockPayoutsPendientes,
  type MockTransaccion,
  type MockPayoutPendiente,
  type TransaccionMetodo,
  type TransaccionEstado,
} from '@/lib/mock-data';

export async function getTransacciones(): Promise<MockTransaccion[]> {
  try {
    const db = createAdminClient();

    const { data: paymentsData, error } = await db
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !paymentsData) throw error ?? new Error('No data');

    const serviceIds = [...new Set(paymentsData.map((p) => p.service_id).filter(Boolean))];
    const clienteIds = [...new Set(paymentsData.map((p) => p.cliente_id).filter(Boolean))];

    const [servicesRes, clientesRes] = await Promise.all([
      serviceIds.length > 0
        ? db.from('service_requests').select('id, agente_asignado_id').in('id', serviceIds)
        : Promise.resolve({ data: [] }),
      clienteIds.length > 0
        ? db.from('users').select('id, phone, full_name').in('id', clienteIds)
        : Promise.resolve({ data: [] }),
    ]);

    const servicesMap = new Map((servicesRes.data ?? []).map((s: any) => [s.id, s]));
    const clientesMap = new Map((clientesRes.data ?? []).map((u: any) => [u.id, u]));

    const agenteIds = [
      ...new Set(
        (servicesRes.data ?? []).map((s: any) => s.agente_asignado_id).filter(Boolean),
      ),
    ];
    const agentesMap = new Map<string, any>();
    if (agenteIds.length > 0) {
      const { data: agentesData } = await db
        .from('users')
        .select('id, phone, full_name')
        .in('id', agenteIds);
      (agentesData ?? []).forEach((u) => agentesMap.set(u.id, u));
    }

    return paymentsData.map((p) => {
      const service: any = servicesMap.get(p.service_id);
      const cliente: any = clientesMap.get(p.cliente_id) ?? {};
      const agente: any = service?.agente_asignado_id
        ? agentesMap.get(service.agente_asignado_id)
        : null;

      return {
        id: p.id,
        fecha: p.created_at,
        servicio_id: p.service_id ? String(p.service_id).slice(0, 8) : '—',
        cliente_nombre: cliente.full_name ?? cliente.phone ?? 'Cliente',
        agente_nombre: agente ? (agente.full_name ?? agente.phone ?? '—') : '—',
        monto: parseFloat(p.monto) || 0,
        metodo: (p.metodo ?? 'STRIPE_TEST') as TransaccionMetodo,
        estado: (p.estado ?? 'PENDIENTE') as TransaccionEstado,
      };
    });
  } catch (e) {
    console.error('[getTransacciones]', e);
    return mockTransacciones;
  }
}

export async function getPayoutsPendientes(): Promise<MockPayoutPendiente[]> {
  try {
    const db = createAdminClient();

    // Servicios COMPLETADO con agente asignado que aún no tienen payout liberado
    const { data: serviciosData, error } = await db
      .from('service_requests')
      .select('id, agente_asignado_id, precio_total')
      .eq('estado', 'COMPLETADO')
      .not('agente_asignado_id', 'is', null)
      .limit(50);

    if (error || !serviciosData?.length) return mockPayoutsPendientes;

    // Agrupar por agente
    const agentMap = new Map<string, { count: number; total: number }>();
    serviciosData.forEach((s) => {
      const aid = s.agente_asignado_id;
      const prev = agentMap.get(aid) ?? { count: 0, total: 0 };
      agentMap.set(aid, { count: prev.count + 1, total: prev.total + (parseFloat(s.precio_total) || 0) });
    });

    const agentIds = [...agentMap.keys()];
    const { data: usersData } = await db
      .from('users')
      .select('id, phone, full_name')
      .in('id', agentIds);
    const usersMap = new Map((usersData ?? []).map((u) => [u.id, u]));

    return agentIds.map((agentId, idx) => {
      const stats = agentMap.get(agentId)!;
      const user: any = usersMap.get(agentId) ?? {};
      const monto_bruto = stats.total * 0.8;
      const retencion_ir = monto_bruto * 0.08;
      return {
        id: `PAY-${String(idx + 1).padStart(3, '0')}`,
        agente_id: agentId,
        agente_nombre: user.full_name ?? user.phone ?? 'Agente',
        servicios_completados: stats.count,
        monto_bruto,
        retencion_ir,
        monto_neto: monto_bruto - retencion_ir,
        pagado: false,
      };
    });
  } catch (e) {
    console.error('[getPayoutsPendientes]', e);
    return mockPayoutsPendientes;
  }
}
