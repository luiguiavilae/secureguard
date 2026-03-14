'use client';

import React, { useState, useMemo } from 'react';
import { ClipboardList } from 'lucide-react';
import { mockAuditLog, type AuditAccion } from '@/lib/mock-data';

const ACCION_COLOR: Record<AuditAccion, string> = {
  VERIFICAR_AGENTE:  'bg-emerald-50 text-emerald-700',
  RECHAZAR_AGENTE:   'bg-red-50 text-red-600',
  SUSPENDER_USUARIO: 'bg-red-50 text-red-600',
  BLOQUEAR_USUARIO:  'bg-red-100 text-red-800',
  REACTIVAR_USUARIO: 'bg-emerald-50 text-emerald-700',
  AJUSTAR_SCORE:     'bg-blue-50 text-blue-700',
  RESOLVER_DISPUTA:  'bg-blue-50 text-blue-700',
  CONFIRMAR_PAGO:    'bg-purple-50 text-purple-700',
  EMITIR_REEMBOLSO:  'bg-orange-50 text-orange-700',
  AGREGAR_NOTA:      'bg-gray-100 text-gray-600',
};

const ACCION_LABELS: Array<{ value: '' | AuditAccion; label: string }> = [
  { value: '', label: 'Todas las acciones' },
  { value: 'VERIFICAR_AGENTE', label: 'Verificar agente' },
  { value: 'RECHAZAR_AGENTE', label: 'Rechazar agente' },
  { value: 'SUSPENDER_USUARIO', label: 'Suspender usuario' },
  { value: 'BLOQUEAR_USUARIO', label: 'Bloquear usuario' },
  { value: 'REACTIVAR_USUARIO', label: 'Reactivar usuario' },
  { value: 'AJUSTAR_SCORE', label: 'Ajustar score' },
  { value: 'RESOLVER_DISPUTA', label: 'Resolver disputa' },
  { value: 'CONFIRMAR_PAGO', label: 'Confirmar pago' },
  { value: 'EMITIR_REEMBOLSO', label: 'Emitir reembolso' },
  { value: 'AGREGAR_NOTA', label: 'Agregar nota' },
];

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AuditPage() {
  const [operadorFilter, setOperadorFilter] = useState('');
  const [accionFilter, setAccionFilter] = useState<'' | AuditAccion>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const operadores = useMemo(() => {
    const set = new Set(mockAuditLog.map(e => e.operador));
    return ['', ...Array.from(set)];
  }, []);

  const filtered = useMemo(() => {
    return mockAuditLog.filter(entry => {
      if (operadorFilter && entry.operador !== operadorFilter) return false;
      if (accionFilter && entry.accion !== accionFilter) return false;
      if (fromDate) {
        const from = new Date(fromDate + 'T00:00:00');
        if (new Date(entry.fecha) < from) return false;
      }
      if (toDate) {
        const to = new Date(toDate + 'T23:59:59');
        if (new Date(entry.fecha) > to) return false;
      }
      return true;
    });
  }, [operadorFilter, accionFilter, fromDate, toDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-brand-600" />
            <h1 className="text-xl font-bold text-gray-900">Audit Log</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Registro de todas las acciones administrativas. Solo lectura.
          </p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
          {filtered.length} registros
        </span>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Operador */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Operador</label>
            <select
              value={operadorFilter}
              onChange={(e) => setOperadorFilter(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-brand-400"
            >
              <option value="">Todos los operadores</option>
              {operadores.filter(Boolean).map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </div>

          {/* Accion */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Acción</label>
            <select
              value={accionFilter}
              onChange={(e) => setAccionFilter(e.target.value as '' | AuditAccion)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-brand-400"
            >
              {ACCION_LABELS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Desde */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Desde</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-brand-400"
            />
          </div>

          {/* Hasta */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Hasta</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-brand-400"
            />
          </div>
        </div>

        {(operadorFilter || accionFilter || fromDate || toDate) && (
          <button
            onClick={() => { setOperadorFilter(''); setAccionFilter(''); setFromDate(''); setToDate(''); }}
            className="mt-3 text-xs text-brand-600 hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Operador</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Acción</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Entidad</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                    No hay registros con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500 tabular-nums">
                      {fmtDateTime(entry.fecha)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">{entry.operador}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${ACCION_COLOR[entry.accion] ?? 'bg-gray-100 text-gray-600'}`}>
                        {entry.accion.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">{entry.entidad}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">{entry.detalle}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
