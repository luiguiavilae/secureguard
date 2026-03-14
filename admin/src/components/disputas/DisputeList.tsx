'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { mockDisputas, mockDisputasDetalle, type MockDisputa, type DisputaEstado } from '@/lib/mock-data';
import { formatDateTime, formatSoles, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ChevronRight } from 'lucide-react';

const SLA_HORAS = 72;

function getSlaRestante(createdAt: string, slaHoras: number): { texto: string; critico: boolean } {
  const deadline = new Date(createdAt).getTime() + slaHoras * 60 * 60 * 1000;
  const restanteMs = deadline - Date.now();
  if (restanteMs <= 0) return { texto: 'Vencido', critico: true };
  const horas = Math.floor(restanteMs / (1000 * 60 * 60));
  const mins = Math.floor((restanteMs % (1000 * 60 * 60)) / (1000 * 60));
  return { texto: `${horas}h ${mins}m`, critico: horas < 12 };
}

const estadoBadge: Record<DisputaEstado, { label: string; variant: 'destructive' | 'warning' | 'success' | 'secondary' }> = {
  ABIERTA:     { label: 'Abierta',      variant: 'destructive' },
  EN_REVISION: { label: 'En revisión',  variant: 'warning' },
  RESUELTA:    { label: 'Resuelta',     variant: 'success' },
  CERRADA:     { label: 'Cerrada',      variant: 'secondary' },
};

const columnHelper = createColumnHelper<MockDisputa>();

export function DisputeList() {
  const router = useRouter();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [filterEstado, setFilterEstado] = useState<string>('todos');

  const filtered = filterEstado === 'todos'
    ? mockDisputas
    : mockDisputas.filter((d) => d.estado === filterEstado);

  const columns = [
    columnHelper.accessor('id', {
      header: 'ID',
      cell: (info) => (
        <span className="font-mono text-xs font-semibold text-brand-700">{info.getValue()}</span>
      ),
    }),
    columnHelper.display({
      id: 'tipo',
      header: 'Tipo',
      cell: ({ row }) => {
        const detalle = mockDisputasDetalle[row.original.id];
        return <span className="text-sm text-gray-700">{detalle?.tipo ?? '—'}</span>;
      },
    }),
    columnHelper.accessor('servicio_id', {
      header: 'Servicio',
      cell: (info) => (
        <span className="font-mono text-xs text-gray-500">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('reportante', {
      header: 'Reportado por',
      cell: (info) => (
        <div>
          <p className="text-sm font-medium text-gray-900 truncate max-w-[160px]">{info.getValue()}</p>
          <p className="text-xs text-gray-400 truncate max-w-[160px]">vs. {info.row.original.reportado}</p>
        </div>
      ),
    }),
    columnHelper.accessor('monto_en_disputa', {
      header: 'Monto',
      cell: (info) => (
        <span className="text-sm font-semibold text-gray-900">{formatSoles(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('created_at', {
      header: 'Fecha',
      cell: (info) => (
        <span className="text-xs text-gray-500" suppressHydrationWarning>{formatDateTime(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('estado', {
      header: 'Estado',
      cell: (info) => {
        const cfg = estadoBadge[info.getValue()];
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    }),
    columnHelper.display({
      id: 'sla',
      header: 'SLA restante',
      cell: ({ row }) => {
        const detalle = mockDisputasDetalle[row.original.id];
        const slaH = detalle?.sla_horas ?? SLA_HORAS;
        const { texto, critico } = getSlaRestante(row.original.created_at, slaH);
        return (
          <span className={cn('text-xs font-semibold', critico ? 'text-red-600' : 'text-gray-600')} suppressHydrationWarning>
            {critico && '⚠️ '}{texto}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: 'accion',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/disputas/${row.original.id}`); }}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 transition-colors"
        >
          Ver <ChevronRight className="h-3.5 w-3.5" />
        </button>
      ),
    }),
  ];

  const table = useReactTable({
    data: filtered,
    columns,
    state: { columnFilters },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const totalAbiertas = mockDisputas.filter((d) => d.estado === 'ABIERTA').length;
  const totalEnRevision = mockDisputas.filter((d) => d.estado === 'EN_REVISION').length;

  const FILTROS: { valor: string; label: string }[] = [
    { valor: 'todos', label: 'Todas' },
    { valor: 'ABIERTA', label: 'Abiertas' },
    { valor: 'EN_REVISION', label: 'En revisión' },
    { valor: 'RESUELTA', label: 'Resueltas' },
    { valor: 'CERRADA', label: 'Cerradas' },
  ];

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <span className="text-sm font-semibold text-red-700">{totalAbiertas} abiertas</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
          <span className="text-sm font-semibold text-amber-700">{totalEnRevision} en revisión</span>
        </div>
        <div className="text-sm text-gray-400">{mockDisputas.length} disputas en total</div>
      </div>

      {/* Filtros de estado */}
      <div className="flex flex-wrap gap-1.5">
        {FILTROS.map(({ valor, label }) => (
          <button
            key={valor}
            onClick={() => setFilterEstado(valor)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              filterEstado === valor
                ? 'bg-brand-600 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-50">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-sm text-gray-400">
                    No hay disputas con este filtro
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => router.push(`/disputas/${row.original.id}`)}
                    className="cursor-pointer hover:bg-gray-50/80 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
          <p className="text-xs text-gray-500">
            {filtered.length} registros · Página {table.getState().pagination.pageIndex + 1} de{' '}
            {Math.max(table.getPageCount(), 1)}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Siguiente
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
