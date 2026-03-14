'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { mockAgentesVerificados, mockClientes, mockServicios } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const PAGE_TITLES: Record<string, string> = {
  '/verificacion': 'Verificación de Agentes',
  '/metricas': 'Métricas',
  '/disputas': 'Disputas',
  '/finanzas': 'Finanzas',
  '/agentes': 'Agentes',
  '/clientes': 'Clientes',
  '/configuracion': 'Configuración',
};

function getPageTitle(pathname: string): string {
  const base = '/' + pathname.split('/')[1];
  return PAGE_TITLES[base] ?? 'Dashboard';
}

interface SearchResult {
  id: string;
  label: string;
  sublabel: string;
  group: 'agentes' | 'clientes' | 'servicios';
  href: string;
}

const GROUP_LABELS: Record<SearchResult['group'], string> = {
  agentes: '👤 Agentes',
  clientes: '👥 Clientes',
  servicios: '📋 Servicios',
};

function runSearch(query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const results: SearchResult[] = [];

  mockAgentesVerificados
    .filter((a) => a.nombre.toLowerCase().includes(q) || a.dni.includes(q))
    .slice(0, 3)
    .forEach((a) =>
      results.push({ id: a.id, label: a.nombre, sublabel: `DNI ${a.dni} · ${a.distrito}`, group: 'agentes', href: `/agentes/${a.id}` }),
    );

  mockClientes
    .filter((c) => c.nombre.toLowerCase().includes(q) || c.dni.includes(q))
    .slice(0, 3)
    .forEach((c) =>
      results.push({ id: c.id, label: c.nombre, sublabel: `DNI ${c.dni} · ${c.distrito}`, group: 'clientes', href: `/clientes/${c.id}` }),
    );

  mockServicios
    .filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        s.cliente_nombre.toLowerCase().includes(q) ||
        (s.agente_nombre ?? '').toLowerCase().includes(q),
    )
    .slice(0, 3)
    .forEach((s) =>
      results.push({ id: s.id, label: s.id, sublabel: `${s.tipo} · ${s.cliente_nombre}`, group: 'servicios', href: `/metricas` }),
    );

  return results;
}

function groupResults(results: SearchResult[]): [SearchResult['group'], SearchResult[]][] {
  const groups: Partial<Record<SearchResult['group'], SearchResult[]>> = {};
  for (const r of results) {
    if (!groups[r.group]) groups[r.group] = [];
    groups[r.group]!.push(r);
  }
  return Object.entries(groups) as [SearchResult['group'], SearchResult[]][];
}

function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = query.length >= 3 ? runSearch(query) : [];
  const grouped = groupResults(results);

  const handleSelect = useCallback(
    (href: string) => {
      setQuery('');
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
      inputRef.current?.blur();
      return;
    }
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[activeIdx]) handleSelect(results[activeIdx].href);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setActiveIdx(0); }, [results.length]);

  let globalCounter = 0;

  return (
    <div ref={containerRef} className="relative w-64">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Buscar agente, cliente, servicio…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-8 py-1.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-colors"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && query.length >= 3 && (
        <div className="absolute top-full mt-1 w-80 rounded-xl border border-gray-200 bg-white shadow-lg z-50 overflow-hidden">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">Sin resultados para "{query}"</p>
          ) : (
            <div className="py-1">
              {grouped.map(([group, items]) => (
                <div key={group}>
                  <p className="px-3 pt-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {GROUP_LABELS[group]}
                  </p>
                  {items.map((r) => {
                    const idx = globalCounter++;
                    const isActive = idx === activeIdx;
                    return (
                      <button
                        key={r.id}
                        onMouseEnter={() => setActiveIdx(idx)}
                        onClick={() => handleSelect(r.href)}
                        className={cn(
                          'flex w-full flex-col px-3 py-2 text-left transition-colors',
                          isActive ? 'bg-brand-50' : 'hover:bg-gray-50',
                        )}
                      >
                        <span className="text-sm font-medium text-gray-900">{r.label}</span>
                        <span className="text-xs text-gray-500">{r.sublabel}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Topbar() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-base font-semibold text-gray-900">{title}</h1>

      <div className="flex items-center gap-4">
        <GlobalSearch />

        <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-medium text-emerald-700">En vivo</span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
            AP
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900">Admin Principal</p>
            <p className="text-xs text-gray-400">Operador</p>
          </div>
        </div>
      </div>
    </header>
  );
}
