'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle, CheckCircle, Ban, UserX, UserCheck, TrendingUp, TrendingDown } from 'lucide-react';
import { mockClientes, type ClienteEstado } from '@/lib/mock-data';
import { formatSoles, formatDate, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const estadoStyles: Record<ClienteEstado, string> = {
  ACTIVO: 'bg-emerald-100 text-emerald-700',
  SUSPENDIDO: 'bg-amber-100 text-amber-700',
  BLOQUEADO: 'bg-red-100 text-red-600',
};

const servicioEstadoStyles: Record<string, string> = {
  EN_CURSO: 'bg-emerald-100 text-emerald-700',
  COMPLETADO: 'bg-gray-100 text-gray-600',
  CANCELADO: 'bg-red-100 text-red-600',
  PENDIENTE: 'bg-amber-100 text-amber-700',
  DISPUTADO: 'bg-orange-100 text-orange-700',
};

interface Props {
  params: { id: string };
}

export default function ClienteDetailPage({ params }: Props) {
  const router = useRouter();
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'warning' } | null>(null);

  const cliente = mockClientes.find((c) => c.id === params.id);

  if (!cliente) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-semibold text-gray-700">Cliente no encontrado</p>
        <p className="mt-1 text-sm text-gray-400">El ID {params.id} no existe en el sistema</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/clientes')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a clientes
        </Button>
      </div>
    );
  }

  const showToast = (msg: string, type: 'success' | 'warning' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleAccion = (accion: 'suspender' | 'bloquear' | 'reactivar') => {
    const msgs: Record<string, string> = {
      suspender: `Cliente ${cliente.nombre} suspendido temporalmente.`,
      bloquear: `Cliente ${cliente.nombre} bloqueado de la plataforma.`,
      reactivar: `Cliente ${cliente.nombre} reactivado correctamente.`,
    };
    showToast(msgs[accion], accion === 'bloquear' ? 'warning' : 'success');
  };

  const scoreColor = cliente.score >= 80 ? 'text-emerald-700' : cliente.score >= 60 ? 'text-amber-700' : 'text-red-600';

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={cn(
          'flex items-center gap-2 rounded-lg border px-4 py-3 text-sm',
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800',
        )}>
          {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Cabecera */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/clientes')} className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-4 w-4 text-gray-500" />
          </button>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-base font-bold text-brand-700">
            {cliente.nombre.split(' ').slice(0, 2).map((n) => n[0]).join('')}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">{cliente.nombre}</h2>
              <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold', estadoStyles[cliente.estado])}>
                {cliente.estado}
              </span>
            </div>
            <p className="text-sm text-gray-500">{cliente.email} · {cliente.telefono}</p>
          </div>
        </div>
        {/* Acciones */}
        <div className="flex gap-2">
          {cliente.estado !== 'SUSPENDIDO' && cliente.estado !== 'BLOQUEADO' && (
            <Button size="sm" variant="outline" className="gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50" onClick={() => handleAccion('suspender')}>
              <UserX className="h-3.5 w-3.5" />
              Suspender
            </Button>
          )}
          {cliente.estado !== 'BLOQUEADO' && (
            <Button size="sm" variant="outline" className="gap-1.5 text-red-700 border-red-300 hover:bg-red-50" onClick={() => handleAccion('bloquear')}>
              <Ban className="h-3.5 w-3.5" />
              Bloquear
            </Button>
          )}
          {(cliente.estado === 'SUSPENDIDO' || cliente.estado === 'BLOQUEADO') && (
            <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleAccion('reactivar')}>
              <UserCheck className="h-3.5 w-3.5" />
              Reactivar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Columna izquierda */}
        <div className="space-y-5 lg:col-span-1">
          {/* Datos personales */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Datos personales</h3>
            <dl className="space-y-2.5">
              {[
                ['DNI', cliente.dni],
                ['Teléfono', cliente.telefono],
                ['Distrito', cliente.distrito],
                ['Miembro desde', formatDate(cliente.created_at)],
                ['Servicios solicitados', String(cliente.servicios_solicitados)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-xs text-gray-500">{label}</dt>
                  <dd className="text-xs font-medium text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Score */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Score de reputación</h3>
            <div className="mb-4 flex items-end gap-2">
              <span className={cn('text-4xl font-bold tabular-nums', scoreColor)}>{cliente.score}</span>
              <span className="mb-1 text-xs font-semibold text-gray-500">{cliente.nivel}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={cn('h-full rounded-full transition-all', cliente.score >= 80 ? 'bg-emerald-500' : cliente.score >= 60 ? 'bg-amber-400' : 'bg-red-500')}
                style={{ width: `${cliente.score}%` }}
              />
            </div>
            <h4 className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Historial</h4>
            <div className="space-y-2">
              {cliente.score_history.map((m, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {m.delta > 0 ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> : <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                    <span className="text-gray-600 max-w-[140px] truncate" title={m.motivo}>{m.motivo.replace(/_/g, ' ')}</span>
                  </div>
                  <span className={cn('font-semibold', m.delta > 0 ? 'text-emerald-700' : 'text-red-600')}>
                    {m.delta > 0 ? '+' : ''}{m.delta}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Columna derecha */}
        <div className="space-y-5 lg:col-span-2">
          {/* Irregularidades */}
          {cliente.irregularidades.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-amber-800">Irregularidades</h3>
              </div>
              <ul className="space-y-1">
                {cliente.irregularidades.map((irr, i) => (
                  <li key={i} className="text-xs text-amber-700">• {irr}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Historial de servicios */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 px-5 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Historial de servicios</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50">
                  <tr>
                    {['ID', 'Tipo', 'Agente', 'Monto', 'Estado'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cliente.servicios.slice(0, 10).map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3"><span className="font-mono text-xs text-gray-600">{s.id}</span></td>
                      <td className="px-4 py-3"><span className="text-sm text-gray-900">{s.tipo}</span></td>
                      <td className="px-4 py-3"><span className="text-sm text-gray-600">{s.agente_nombre ?? '—'}</span></td>
                      <td className="px-4 py-3"><span className="text-sm font-medium">{formatSoles(s.monto)}</span></td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold', servicioEstadoStyles[s.estado] ?? 'bg-gray-100 text-gray-600')}>
                          {s.estado.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {cliente.servicios.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-400">Sin servicios registrados</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cancelaciones */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 px-5 py-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Cancelaciones</h3>
              {cliente.cancelaciones_mes > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                  {cliente.cancelaciones_mes} este mes
                </span>
              )}
            </div>
            {cliente.cancelaciones.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400">Sin cancelaciones registradas</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {cliente.cancelaciones.map((c, i) => (
                  <div key={i} className="flex items-start justify-between px-5 py-3">
                    <div>
                      <p className="text-sm text-gray-900">{c.motivo}</p>
                      <p className="text-xs text-gray-400">{c.servicio_id} · {formatDate(c.fecha)}</p>
                    </div>
                    {c.penalizacion > 0 && (
                      <span className="text-xs font-semibold text-red-600">-{formatSoles(c.penalizacion)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
