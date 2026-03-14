'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import {
  mockAgentesVerificados,
  type MockAgenteVerificado,
  type NivelScore,
} from '@/lib/mock-data';

const NIVEL_COLOR: Record<NivelScore, string> = {
  CONFIABLE:   'bg-emerald-100 text-emerald-700',
  REGULAR:     'bg-yellow-100 text-yellow-700',
  OBSERVADO:   'bg-orange-100 text-orange-700',
  RESTRINGIDO: 'bg-red-100 text-red-600',
  BLOQUEADO:   'bg-gray-100 text-gray-500 line-through',
};
const NIVEL_EMOJI: Record<NivelScore, string> = {
  CONFIABLE: '🟢', REGULAR: '🟡', OBSERVADO: '🟠', RESTRINGIDO: '🔴', BLOQUEADO: '⛔',
};
const ESTADO_COLOR: Record<string, string> = {
  ACTIVO:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
  SUSPENDIDO:'bg-orange-50 text-orange-700 border border-orange-200',
  BLOQUEADO: 'bg-red-50 text-red-700 border border-red-200',
  INACTIVO:  'bg-gray-100 text-gray-500',
};
const EMOJI_MAP: Record<string, string> = {
  despegue:'🚀', activo:'💪', veterano:'🔟', centurion:'🏆', leyenda:'👑',
  puntual:'⏰', siempre_a_tiempo:'⏰⏰', reloj_suizo:'⌚',
  bien_valorado:'👍', excelencia:'🌟', diamante:'💎',
  cero_cancelaciones:'🎯', confiable:'🛡️',
  residencial:'🏠', eventos:'🎪', comercial:'🏢', escolta:'🕴️', custodia:'🔒',
};

function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const color = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-yellow-400' : score >= 20 ? 'bg-orange-400' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-gray-200">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums">{score}</span>
    </div>
  );
}

type SortKey = 'nombre' | 'score' | 'rating_avg' | 'servicios_completados';

function Th({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <th onClick={onClick} className="cursor-pointer select-none px-4 py-3 text-left hover:text-gray-700">
      <span className="inline-flex items-center gap-1">{children}</span>
    </th>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-500">{label}:</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-brand-400">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export default function AgentesPage() {
  const [search, setSearch] = useState('');
  const [filterNivel, setFilterNivel] = useState<string>('TODOS');
  const [filterEstado, setFilterEstado] = useState<string>('TODOS');
  const [filterDistrito, setFilterDistrito] = useState<string>('TODOS');
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const distritos = useMemo(
    () => ['TODOS', ...Array.from(new Set(mockAgentesVerificados.map((a) => a.distrito))).sort()],
    [],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockAgentesVerificados
      .filter((a) => {
        if (filterNivel !== 'TODOS' && a.nivel !== filterNivel) return false;
        if (filterEstado !== 'TODOS' && a.estado !== filterEstado) return false;
        if (filterDistrito !== 'TODOS' && a.distrito !== filterDistrito) return false;
        if (q && !a.nombre.toLowerCase().includes(q) && !a.dni.includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        const va = a[sortKey] as number | string;
        const vb = b[sortKey] as number | string;
        const cmp = typeof va === 'number' ? (va as number) - (vb as number) : String(va).localeCompare(String(vb));
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [search, filterNivel, filterEstado, filterDistrito, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronsUpDown className="h-3 w-3 text-gray-400" />;
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 text-brand-600" /> : <ChevronDown className="h-3 w-3 text-brand-600" />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Agentes Verificados</h1>
          <p className="text-sm text-gray-500">{filtered.length} agente{filtered.length !== 1 ? 's' : ''} encontrados</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Buscar por nombre o DNI…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100" />
        </div>
        <FilterSelect label="Nivel" value={filterNivel} onChange={setFilterNivel}
          options={['TODOS','CONFIABLE','REGULAR','OBSERVADO','RESTRINGIDO','BLOQUEADO']} />
        <FilterSelect label="Estado" value={filterEstado} onChange={setFilterEstado}
          options={['TODOS','ACTIVO','SUSPENDIDO','BLOQUEADO','INACTIVO']} />
        <FilterSelect label="Distrito" value={filterDistrito} onChange={setFilterDistrito} options={distritos} />
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <Th onClick={() => toggleSort('nombre')}>Nombre <SortIcon k="nombre" /></Th>
              <th className="px-4 py-3 text-left">DNI</th>
              <th className="px-4 py-3 text-left">Distrito</th>
              <Th onClick={() => toggleSort('score')}>Score <SortIcon k="score" /></Th>
              <th className="px-4 py-3 text-left">Nivel</th>
              <Th onClick={() => toggleSort('servicios_completados')}>Servicios <SortIcon k="servicios_completados" /></Th>
              <Th onClick={() => toggleSort('rating_avg')}>Rating <SortIcon k="rating_avg" /></Th>
              <th className="px-4 py-3 text-left">Badges</th>
              <th className="px-4 py-3 text-left">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="py-12 text-center text-sm text-gray-400">No hay agentes con estos filtros</td></tr>
            ) : filtered.map((a) => (
              <tr key={a.id} className="cursor-pointer transition-colors hover:bg-brand-50/40"
                onClick={() => { window.location.href = `/agentes/${a.id}`; }}>
                <td className="px-4 py-3">
                  <Link href={`/agentes/${a.id}`} onClick={(e) => e.stopPropagation()}
                    className="font-medium text-gray-900 hover:text-brand-600 hover:underline">
                    {a.nombre}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.dni}</td>
                <td className="px-4 py-3 text-gray-600">{a.distrito}</td>
                <td className="px-4 py-3"><ScoreBar score={a.score} /></td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${NIVEL_COLOR[a.nivel]}`}>
                    {NIVEL_EMOJI[a.nivel]} {a.nivel}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums text-gray-700">{a.servicios_completados}</td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${a.rating_avg >= 4.5 ? 'text-emerald-600' : a.rating_avg >= 4.0 ? 'text-yellow-600' : 'text-red-500'}`}>
                    ★ {a.rating_avg.toFixed(1)}
                  </span>
                  <span className="ml-1 text-xs text-gray-400">({a.rating_count})</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-0.5">
                    {a.badges.slice(0, 4).map((b) => (
                      <span key={b} title={b} className="text-base leading-none">{EMOJI_MAP[b] ?? '🏅'}</span>
                    ))}
                    {a.badges.length > 4 && (
                      <span className="text-xs text-gray-400">+{a.badges.length - 4}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_COLOR[a.estado] ?? 'bg-gray-100 text-gray-500'}`}>
                    {a.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
