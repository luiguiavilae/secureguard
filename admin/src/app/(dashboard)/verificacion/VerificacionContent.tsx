'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  type MockAgente,
  type VerificacionEstado,
  type VerificacionStats,
} from '@/lib/mock-data';
import { AgentCard } from '@/components/verificacion/AgentCard';
import { AgentVerificationPanel } from '@/components/verificacion/AgentVerificationPanel';
import { approveAgent, rejectAgent, markAgentSuspicious } from '@/lib/actions/verification';
import { supabaseBrowser } from '@/lib/supabase';

type FilterType = 'todos' | 'incompletos' | 'overdue';

interface Props {
  initialAgentes: MockAgente[];
  initialStats: VerificacionStats;
}

export default function VerificacionContent({ initialAgentes, initialStats }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedId = searchParams.get('agente');

  const [agentes, setAgentes] = useState<MockAgente[]>(initialAgentes);
  const [stats, setStats] = useState(initialStats);
  const [filter, setFilter] = useState<FilterType>('todos');

  // Sincronizar cuando el Server Component refetchea (ej: tras router.refresh())
  useEffect(() => {
    setAgentes(initialAgentes);
    setStats(initialStats);
  }, [initialAgentes, initialStats]);

  // Realtime: suscribirse a cambios en la cola para refrescar datos del servidor
  useEffect(() => {
    const channel = supabaseBrowser
      .channel('admin-verification-queue')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agent_verification_queue' },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [router]);

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

  const handleQuickApprove = async (id: string) => {
    // Optimistic update
    setAgentes((prev) =>
      prev.map((a) => (a.id === id ? { ...a, estado: 'APROBADO' as VerificacionEstado } : a)),
    );
    if (selectedId === id) router.push('/verificacion');
    await approveAgent(id);
  };

  const handleAction = async (id: string, action: VerificacionEstado) => {
    // Optimistic update
    setAgentes((prev) =>
      prev.map((a) => (a.id === id ? { ...a, estado: action } : a)),
    );
    router.push('/verificacion');

    if (action === 'APROBADO') await approveAgent(id);
    else if (action === 'RECHAZADO') await rejectAgent(id, '');
    else if (action === 'SOSPECHOSO') await markAgentSuspicious(id);
  };

  return (
    <div className="flex h-full gap-0 -m-6 overflow-hidden">
      {/* Panel izquierdo 35% */}
      <div className="flex w-[35%] min-w-[280px] flex-col border-r border-gray-200 bg-white">
        {/* Stats header */}
        <div className="border-b border-gray-100 p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-bold text-gray-900">{stats.pendientes}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Pendientes</p>
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-600">{stats.aprobados_hoy}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Aprobados hoy</p>
            </div>
            <div>
              <p className="text-xl font-bold text-red-600">{stats.rechazados_hoy}</p>
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
          <AgentVerificationPanel agente={selectedAgent} onAction={handleAction} />
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
