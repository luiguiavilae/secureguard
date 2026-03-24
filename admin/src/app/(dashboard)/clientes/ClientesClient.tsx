'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { type MockCliente, type ClienteNivel, type ClienteEstado } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const nivelStyles: Record<ClienteNivel, string> = {
  PREMIUM: 'bg-purple-100 text-purple-700',
  REGULAR: 'bg-blue-100 text-blue-700',
  NUEVO: 'bg-gray-100 text-gray-600',
  OBSERVADO: 'bg-amber-100 text-amber-700',
  BLOQUEADO: 'bg-red-100 text-red-600',
};

const estadoStyles: Record<ClienteEstado, string> = {
  ACTIVO: 'bg-emerald-100 text-emerald-700',
  SUSPENDIDO: 'bg-amber-100 text-amber-700',
  BLOQUEADO: 'bg-red-100 text-red-600',
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'text-emerald-700' : score >= 60 ? 'text-amber-700' : 'text-red-600';
  return <span className={cn('text-sm font-bold tabular-nums', color)}>{score}</span>;
}

interface Props {
  clientes: MockCliente[];
}

export default function ClientesClient({ clientes }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filterNivel, setFilterNivel] = useState<ClienteNivel | ''>('');
  const [filterEstado, setFilterEstado] = useState<ClienteEstado | ''>('');

  const filtered = useMemo(() => {
    let list = clientes;
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((c) => c.nombre.toLowerCase().includes(q) || c.dni.includes(q));
    if (filterNivel) list = list.filter((c) => c.nivel === filterNivel);
    if (filterEstado) list = list.filter((c) => c.estado === filterEstado);
    return list;
  }, [clientes, search, filterNivel, filterEstado]);

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o DNI…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterNivel}
            onChange={(e) => setFilterNivel(e.target.value as ClienteNivel | '')}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
          >
            <option value="">Todos los niveles</option>
            {(['PREMIUM', 'REGULAR', 'NUEVO', 'OBSERVADO', 'BLOQUEADO'] as ClienteNivel[]).map(
              (n) => (
                <option key={n} value={n}>
                  {n.charAt(0) + n.slice(1).toLowerCase()}
                </option>
              ),
            )}
          </select>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value as ClienteEstado | '')}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
          >
            <option value="">Todos los estados</option>
            {(['ACTIVO', 'SUSPENDIDO', 'BLOQUEADO'] as ClienteEstado[]).map((e) => (
              <option key={e} value={e}>
                {e.charAt(0) + e.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3">
          <p className="text-xs text-gray-500">
            {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                {[
                  'Nombre',
                  'DNI',
                  'Teléfono',
                  'Score',
                  'Nivel',
                  'Servicios',
                  'Cancelaciones/mes',
                  'Estado',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/clientes/${c.id}`)}
                  className="cursor-pointer hover:bg-gray-50/70 transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{c.nombre}</p>
                    <p className="text-xs text-gray-400">{c.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-gray-600">{c.dni}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{c.telefono}</span>
                  </td>
                  <td className="px-4 py-3">
                    <ScoreBadge score={c.score} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                        nivelStyles[c.nivel],
                      )}
                    >
                      {c.nivel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{c.servicios_solicitados}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'text-sm font-medium',
                        c.cancelaciones_mes >= 3
                          ? 'text-red-600'
                          : c.cancelaciones_mes >= 1
                            ? 'text-amber-600'
                            : 'text-gray-600',
                      )}
                    >
                      {c.cancelaciones_mes}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                        estadoStyles[c.estado],
                      )}
                    >
                      {c.estado}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                    No se encontraron clientes con ese criterio
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
