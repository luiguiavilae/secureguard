'use client';

import React, { useState } from 'react';
import {
  Activity,
  DollarSign,
  Shield,
  Clock,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { KPICard } from '@/components/metricas/KPICard';
import { ServiceChart } from '@/components/metricas/ServiceChart';
import { LiveFeed } from '@/components/metricas/LiveFeed';
import { mockMetricas, mockServicios, type MockServicio } from '@/lib/mock-data';
import { formatSoles, formatTime, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const columnHelper = createColumnHelper<MockServicio>();

const statusStyles: Record<string, string> = {
  EN_CURSO: 'bg-emerald-100 text-emerald-700',
  PENDIENTE: 'bg-amber-100 text-amber-700',
  COMPLETADO: 'bg-gray-100 text-gray-600',
  CANCELADO: 'bg-red-100 text-red-600',
  DISPUTADO: 'bg-orange-100 text-orange-700',
  ACEPTADO: 'bg-blue-100 text-blue-700',
};

const columns = [
  columnHelper.accessor('id', {
    header: 'ID',
    cell: (info) => (
      <span className="font-mono text-xs font-medium text-gray-600">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('tipo', {
    header: 'Tipo',
    cell: (info) => <span className="text-sm text-gray-900">{info.getValue()}</span>,
  }),
  columnHelper.accessor('distrito', {
    header: 'Distrito',
    cell: (info) => <span className="text-sm text-gray-600">{info.getValue()}</span>,
  }),
  columnHelper.accessor('agente_nombre', {
    header: 'Agente',
    cell: (info) => (
      <span className="text-sm text-gray-600">{info.getValue() ?? '—'}</span>
    ),
  }),
  columnHelper.accessor('cliente_nombre', {
    header: 'Cliente',
    cell: (info) => <span className="text-sm text-gray-900">{info.getValue()}</span>,
  }),
  columnHelper.accessor('hora_inicio', {
    header: 'Inicio',
    cell: (info) => <span className="text-sm text-gray-600" suppressHydrationWarning>{formatTime(info.getValue())}</span>,
  }),
  columnHelper.accessor('monto', {
    header: 'Monto',
    cell: (info) => (
      <span className="text-sm font-medium text-gray-900">{formatSoles(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor('estado', {
    header: 'Estado',
    cell: (info) => {
      const estado = info.getValue();
      return (
        <span
          className={cn(
            'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
            statusStyles[estado] ?? 'bg-gray-100 text-gray-600',
          )}
        >
          {estado.replace('_', ' ')}
        </span>
      );
    },
  }),
];

function ServicesTable() {
  const table = useReactTable({
    data: mockServicios,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 5 } },
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 px-5 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Servicios del día</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-50">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
        <p className="text-xs text-gray-500">
          Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()} ·{' '}
          {mockServicios.length} registros
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MetricasPage() {
  return (
    <div className="space-y-6">
      {/* KPI Grid 3x2 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KPICard
          title="Servicios activos"
          value={String(mockMetricas.servicios_activos)}
          subtitle="En este momento"
          icon={Activity}
          color="success"
          trend={{ value: '+2 desde ayer', positive: true }}
        />
        <KPICard
          title="GMV hoy"
          value={formatSoles(mockMetricas.gmv_hoy)}
          subtitle="Ingresos brutos del día"
          icon={DollarSign}
          color="info"
          trend={{ value: '+S/ 320 vs ayer', positive: true }}
        />
        <KPICard
          title="Agentes disponibles"
          value={String(mockMetricas.agentes_disponibles)}
          subtitle="Listos para aceptar"
          icon={Shield}
          color="default"
        />
        <KPICard
          title="Solicitudes abiertas"
          value={String(mockMetricas.solicitudes_abiertas)}
          subtitle="Sin agente asignado"
          icon={FileText}
          color="warning"
        />
        <KPICard
          title="Disputas abiertas"
          value={String(mockMetricas.disputas_abiertas)}
          subtitle="Requieren atención"
          icon={AlertTriangle}
          color="danger"
        />
        <KPICard
          title="T. promedio verificación"
          value={`${mockMetricas.tiempo_promedio_verificacion} min`}
          subtitle="Últimas 24 horas"
          icon={Clock}
          color="default"
        />
      </div>

      {/* Chart + Feed */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ServiceChart />
        </div>
        <div>
          <LiveFeed />
        </div>
      </div>

      {/* Tabla de servicios */}
      <ServicesTable />
    </div>
  );
}
