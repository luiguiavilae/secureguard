// TODO: Página finanzas — ingresos, payouts pendientes, comisiones, exportar reportes
import React from 'react';
import { PayoutTable } from '@/components/finanzas/PayoutTable';
import { RevenueChart } from '@/components/finanzas/RevenueChart';

export const metadata = { title: 'Finanzas — SecureGuard Admin' };

export default function FinanzasPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Finanzas</h1>
      {/* TODO: Implementar layout de finanzas */}
    </div>
  );
}
