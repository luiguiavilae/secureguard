'use client';

import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { DollarSign, TrendingUp, Users, RotateCcw, Shield, AlertTriangle, CheckCircle, Download } from 'lucide-react';
import { KPICard } from '@/components/metricas/KPICard';
import {
  mockTransacciones,
  mockPayoutsPendientes,
  mockFondoMovimientos,
  FONDO_SEGURO_BALANCE,
  FONDO_SEGURO_ALERTA_MIN,
  type MockTransaccion,
  type MockPayoutPendiente,
} from '@/lib/mock-data';
import { formatSoles, formatDateTime, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ── Helpers ────────────────────────────────────────────────────────────────────

type Periodo = 'hoy' | 'semana' | 'mes';

const COMISION_APP = 0.15;
const AGENTE_PCT = 0.80;

function filterByPeriodo(items: MockTransaccion[], periodo: Periodo): MockTransaccion[] {
  const now = new Date();
  const cutoff = new Date(now);
  if (periodo === 'hoy') cutoff.setHours(0, 0, 0, 0);
  else if (periodo === 'semana') cutoff.setDate(now.getDate() - 7);
  else cutoff.setDate(now.getDate() - 30);
  return items.filter((t) => new Date(t.fecha) >= cutoff);
}

function exportCSV(payouts: MockPayoutPendiente[]) {
  const headers = ['ID', 'Agente', 'Servicios', 'Monto Bruto', 'Retención 8% IR', 'Monto Neto'];
  const rows = payouts.map((p) => [
    p.id,
    p.agente_nombre,
    p.servicios_completados,
    p.monto_bruto.toFixed(2),
    p.retencion_ir.toFixed(2),
    p.monto_neto.toFixed(2),
  ]);
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payouts_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Column helpers ─────────────────────────────────────────────────────────────

const txnHelper = createColumnHelper<MockTransaccion>();
const payoutHelper = createColumnHelper<MockPayoutPendiente>();

const estadoStyles: Record<string, string> = {
  PAGADO: 'bg-emerald-100 text-emerald-700',
  PENDIENTE: 'bg-amber-100 text-amber-700',
  REEMBOLSADO: 'bg-blue-100 text-blue-700',
  FALLIDO: 'bg-red-100 text-red-600',
};

const metodoLabels: Record<string, string> = {
  STRIPE_TEST: 'Stripe (test)',
  STRIPE_LIVE: 'Stripe',
  YAPE_MANUAL: 'Yape/Plin',
};

// ── PayoutsTable ──────────────────────────────────────────────────────────────

function PayoutsTable() {
  const [payouts, setPayouts] = useState(mockPayoutsPendientes);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const confirmPago = (id: string) => {
    setPayouts((prev) => prev.filter((p) => p.id !== id));
    setConfirming(null);
    showToast('Pago marcado como realizado correctamente.');
  };

  const columns = [
    payoutHelper.accessor('agente_nombre', {
      header: 'Agente',
      cell: (info) => <span className="text-sm font-medium text-gray-900">{info.getValue()}</span>,
    }),
    payoutHelper.accessor('servicios_completados', {
      header: 'Servicios',
      cell: (info) => <span className="text-sm text-gray-600">{info.getValue()}</span>,
    }),
    payoutHelper.accessor('monto_bruto', {
      header: 'Monto bruto',
      cell: (info) => <span className="text-sm font-medium text-gray-900">{formatSoles(info.getValue())}</span>,
    }),
    payoutHelper.accessor('retencion_ir', {
      header: 'Retención 8% IR',
      cell: (info) => <span className="text-sm text-red-600">-{formatSoles(info.getValue())}</span>,
    }),
    payoutHelper.accessor('monto_neto', {
      header: 'Monto neto',
      cell: (info) => <span className="text-sm font-semibold text-emerald-700">{formatSoles(info.getValue())}</span>,
    }),
    payoutHelper.display({
      id: 'acciones',
      header: 'Acciones',
      cell: ({ row }) => {
        const p = row.original;
        if (confirming === p.id) {
          return (
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700 text-xs" onClick={() => confirmPago(p.id)}>
                Confirmar
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setConfirming(null)}>
                Cancelar
              </Button>
            </div>
          );
        }
        return (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setConfirming(p.id)}>
            <CheckCircle className="mr-1 h-3.5 w-3.5" />
            Marcar pagado
          </Button>
        );
      },
    }),
  ];

  const table = useReactTable({ data: payouts, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      {toast && (
        <div className="mx-4 mt-4 flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">
          <CheckCircle className="h-4 w-4" />
          {toast}
        </div>
      )}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Pagos pendientes a agentes</h3>
          <p className="text-xs text-gray-500 mt-0.5">{payouts.length} agentes con saldo pendiente</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => exportCSV(payouts)}>
          <Download className="h-3.5 w-3.5" />
          Exportar CSV
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {flexRender(h.column.columnDef.header, h.getContext())}
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
            {payouts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                  No hay pagos pendientes
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── TransaccionesTable ────────────────────────────────────────────────────────

function TransaccionesTable({ txns }: { txns: MockTransaccion[] }) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const columns = [
    txnHelper.accessor('fecha', {
      header: 'Fecha',
      cell: (info) => <span className="text-xs text-gray-500 tabular-nums" suppressHydrationWarning>{formatDateTime(info.getValue())}</span>,
    }),
    txnHelper.accessor('servicio_id', {
      header: 'Servicio',
      cell: (info) => <span className="font-mono text-xs font-medium text-gray-600">{info.getValue()}</span>,
    }),
    txnHelper.accessor('cliente_nombre', {
      header: 'Cliente',
      cell: (info) => <span className="text-sm text-gray-900">{info.getValue()}</span>,
    }),
    txnHelper.accessor('agente_nombre', {
      header: 'Agente',
      cell: (info) => <span className="text-sm text-gray-600">{info.getValue()}</span>,
    }),
    txnHelper.accessor('monto', {
      header: 'Monto',
      cell: (info) => <span className="text-sm font-medium text-gray-900">{formatSoles(info.getValue())}</span>,
    }),
    txnHelper.accessor('metodo', {
      header: 'Método',
      filterFn: 'equals',
      cell: (info) => <span className="text-xs text-gray-500">{metodoLabels[info.getValue()] ?? info.getValue()}</span>,
    }),
    txnHelper.accessor('estado', {
      header: 'Estado',
      filterFn: 'equals',
      cell: (info) => {
        const e = info.getValue();
        return (
          <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold', estadoStyles[e] ?? 'bg-gray-100 text-gray-600')}>
            {e}
          </span>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: txns,
    columns,
    state: { columnFilters },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Todas las transacciones</h3>
        <div className="flex gap-2">
          <select
            className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
            value={(table.getColumn('metodo')?.getFilterValue() as string) ?? ''}
            onChange={(e) => table.getColumn('metodo')?.setFilterValue(e.target.value || undefined)}
          >
            <option value="">Todos los métodos</option>
            <option value="STRIPE_TEST">Stripe (test)</option>
            <option value="YAPE_MANUAL">Yape/Plin</option>
          </select>
          <select
            className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
            value={(table.getColumn('estado')?.getFilterValue() as string) ?? ''}
            onChange={(e) => table.getColumn('estado')?.setFilterValue(e.target.value || undefined)}
          >
            <option value="">Todos los estados</option>
            <option value="PAGADO">Pagado</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="REEMBOLSADO">Reembolsado</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {flexRender(h.column.columnDef.header, h.getContext())}
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
          Página {table.getState().pagination.pageIndex + 1} de {Math.max(table.getPageCount(), 1)} ·{' '}
          {table.getFilteredRowModel().rows.length} registros
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
  );
}

// ── FondoSeguroPanel ──────────────────────────────────────────────────────────

function FondoSeguroPanel() {
  const balance = FONDO_SEGURO_BALANCE;
  const isAlerta = balance < FONDO_SEGURO_ALERTA_MIN;

  return (
    <div className={cn('rounded-lg border bg-white shadow-sm overflow-hidden', isAlerta ? 'border-red-300' : 'border-gray-200')}>
      <div className={cn('flex items-center justify-between px-5 py-3 border-b', isAlerta ? 'border-red-200 bg-red-50' : 'border-gray-100')}>
        <div className="flex items-center gap-2">
          <Shield className={cn('h-4 w-4', isAlerta ? 'text-red-500' : 'text-emerald-600')} />
          <h3 className="text-sm font-semibold text-gray-900">Fondo de seguro</h3>
        </div>
        {isAlerta && (
          <div className="flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            Balance crítico
          </div>
        )}
      </div>
      <div className="px-5 py-4">
        <div className="mb-4 flex items-end gap-2">
          <span className={cn('text-3xl font-bold tabular-nums', isAlerta ? 'text-red-600' : 'text-gray-900')}>
            {formatSoles(balance)}
          </span>
          <span className="mb-1 text-xs text-gray-400">Balance actual</span>
        </div>
        {isAlerta && (
          <p className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
            El balance está por debajo del mínimo recomendado de {formatSoles(FONDO_SEGURO_ALERTA_MIN)}. Considera añadir fondos.
          </p>
        )}
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Últimos movimientos</h4>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {mockFondoMovimientos.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-gray-50">
              <div className="flex items-center gap-2.5">
                <span className={cn('flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold', m.tipo === 'ACUMULACION' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600')}>
                  {m.tipo === 'ACUMULACION' ? '+' : '−'}
                </span>
                <span className="text-xs text-gray-700">{m.descripcion}</span>
              </div>
              <span className={cn('text-xs font-semibold', m.monto > 0 ? 'text-emerald-700' : 'text-red-600')}>
                {m.monto > 0 ? '+' : ''}{formatSoles(Math.abs(m.monto))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function FinanzasPage() {
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const txnsFiltradas = useMemo(() => filterByPeriodo(mockTransacciones, periodo), [periodo]);
  const gmv = useMemo(() => txnsFiltradas.filter((t) => t.estado === 'PAGADO').reduce((s, t) => s + t.monto, 0), [txnsFiltradas]);
  const reembolsos = useMemo(() => txnsFiltradas.filter((t) => t.estado === 'REEMBOLSADO').reduce((s, t) => s + t.monto, 0), [txnsFiltradas]);
  const revenue = gmv * COMISION_APP;
  const totalAgentes = gmv * AGENTE_PCT;
  const periodLabels: Record<Periodo, string> = { hoy: 'Hoy', semana: 'Esta semana', mes: 'Este mes' };

  return (
    <div className="space-y-6">
      {/* Selector de período */}
      <div className="flex justify-end">
        <div className="flex rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          {(['hoy', 'semana', 'mes'] as Periodo[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                periodo === p ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KPICard title="GMV total" value={formatSoles(gmv)} subtitle={periodLabels[periodo]} icon={DollarSign} color="info" />
        <KPICard title="Revenue app 15%" value={formatSoles(revenue)} subtitle="Comisión plataforma" icon={TrendingUp} color="success" />
        <KPICard title="Pagado a agentes" value={formatSoles(totalAgentes)} subtitle="80% del GMV" icon={Users} color="default" />
        <KPICard title="Reembolsos" value={formatSoles(reembolsos)} subtitle="Total del período" icon={RotateCcw} color="warning" />
        <KPICard title="Fondo seguro" value={formatSoles(FONDO_SEGURO_BALANCE)} subtitle="Balance actual" icon={Shield} color={FONDO_SEGURO_BALANCE < FONDO_SEGURO_ALERTA_MIN ? 'danger' : 'default'} />
      </div>

      {/* Pagos pendientes */}
      <PayoutsTable />

      {/* Transacciones */}
      <TransaccionesTable txns={txnsFiltradas} />

      {/* Fondo de seguro */}
      <FondoSeguroPanel />
    </div>
  );
}
