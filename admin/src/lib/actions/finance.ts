// TODO: Server Actions para operaciones financieras
// Acciones: releasePayout(agentId), exportRevenueReport(startDate, endDate)
'use server';

export async function releasePayout(agentId: string) {
  // TODO: Implementar liberación de pago al agente vía Stripe Connect
}

export async function exportRevenueReport(startDate: string, endDate: string) {
  // TODO: Generar y devolver reporte CSV de ingresos
}
