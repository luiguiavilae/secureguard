'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { mockAgentesVerificacion, mockVerificacionStats, type MockAgente, type VerificacionEstado } from '@/lib/mock-data';
import { AgentCard } from '@/components/verificacion/AgentCard';
import { AgentVerificationPanel } from '@/components/verificacion/AgentVerificationPanel';

type FilterType = 'todos' | 'incompletos' | 'overdue';

function VerificacionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedId = searchParams.get('agente');

  const [agentes, setAgentes] = useState<MockAgente[]>(mockAgentesVerificacion);
  const [filter, setFilter] = useState<FilterType>('todos');

  const selectedAgent = agentes.find((a) => a.id === selectedId) ?? null;

  const filteredAgentes = useMemo(() => {
    const now = new Date();
    return agentes
      .filter((a) => a.estado === 'EN_REVISION')
      .filter((a) => {
        if (filter === 'incompletos') return a.docs_subidos < 3;
        if (filter === 'overdue') {
          const diffHours = (now.getTime() - new Date(a.created_at).getTime()) / (1000 * 60 * 60);
          return diffHours > 24;
        }
        return true;
      })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [agentes, filter]);

  const handleSelect = (id: string) => {
    router.push(`/verificacion?agente=${id}`);
  };

  const handleQuickApprove = (id: string) => {
    setAgentes((prev) =>
      prev.map((a) => (a.id === id ? { ...a, estado: 'APROBADO' as VerificacionEstado } : a)),
    );
    if (selectedId === id) router.push('/verificacion');
  };

  const handleAction = (id: string, action: VerificacionEstado) => {
    setAgentes((prev) =>
      prev.map((a) => (a.id === id ? { ...a, estado: action } : a)),
    );
    router.push('/verificacion');
  };

  return (
    <div className="flex h-full gap-0 -m-6 overflow-hidden">
      {/* Panel izquierdo 35% */}
      <div className="flex w-[35%] min-w-[280px] flex-col border-r border-gray-200 bg-white">
        {/* Stats header */}
        <div className="border-b border-gray-100 p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-bold text-gray-900">{mockVerificacionStats.pendientes}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Pendientes</p>
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-600">{mockVerificacionStats.aprobados_hoy}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Aprobados hoy</p>
            </div>
            <div>
              <p className="text-xl font-bold text-red-600">{mockVerificacionStats.rechazados_hoy}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Rechazados hoy</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-1 border-b border-gray-100 p-3">
          {([
            ['todos', 'Todos'],
            ['incompletos', 'Incompletos'],
            ['overdue', '>24h'],
          ] as [FilterType, string][]).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === value
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Lista scrolleable */}
        <div className="flex-1 overflow-y-auto">
          {filteredAgentes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <p className="text-sm text-gray-500">No hay agentes con este filtro</p>
            </div>
          ) : (
            filteredAgentes.map((agente) => (
              <AgentCard
                key={agente.id}
                agente={agente}
                isSelected={agente.id === selectedId}
                onSelect={handleSelect}
                onQuickApprove={handleQuickApprove}
              />
            ))
          )}
        </div>
      </div>

      {/* Panel derecho 65% */}
      <div className="flex flex-1 flex-col overflow-hidden bg-[#f8fafc]">
        {selectedAgent ? (
          <AgentVerificationPanel
            agente={selectedAgent}
            onAction={handleAction}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <span className="text-3xl">🔍</span>
            </div>
            <p className="text-base font-medium text-gray-700">Selecciona un agente</p>
            <p className="text-sm text-gray-400">
              Elige un agente de la lista para revisar sus documentos
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerificacionPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-gray-400">Cargando...</p>
      </div>
    }>
      <VerificacionContent />
    </Suspense>
  );
}
