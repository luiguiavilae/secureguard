// TODO: Página de métricas — KPIs en tiempo real, servicios activos, ingresos, mapa de calor
import React from 'react';
import { KPICard } from '@/components/metricas/KPICard';
import { ServiceChart } from '@/components/metricas/ServiceChart';
import { LiveFeed } from '@/components/metricas/LiveFeed';

export const metadata = { title: 'Métricas — SecureGuard Admin' };

export default function MetricasPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Métricas</h1>
      {/* TODO: Implementar layout de KPIs y gráficas */}
    </div>
  );
}
