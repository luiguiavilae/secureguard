'use client';

import React from 'react';
import { cn, getTimeInQueue } from '@/lib/utils';
import { type MockAgente } from '@/lib/mock-data';
import { Avatar } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { CheckCircle } from 'lucide-react';

interface AgentCardProps {
  agente: MockAgente;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onQuickApprove: (id: string) => void;
}

export function AgentCard({ agente, isSelected, onSelect, onQuickApprove }: AgentCardProps) {
  const { text: tiempoTexto, isOverdue } = getTimeInQueue(agente.created_at);

  const handleApprove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickApprove(agente.id);
  };

  return (
    <div
      onClick={() => onSelect(agente.id)}
      className={cn(
        'flex cursor-pointer flex-col gap-3 border-b border-gray-100 p-4 transition-colors hover:bg-gray-50',
        isSelected && 'bg-brand-50 border-l-2 border-l-brand-600',
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar src={agente.foto_url} name={agente.nombre} size="md" />

        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{agente.nombre}</p>
          <p className="text-xs text-gray-500">DNI: {agente.dni}</p>
          <p className="text-xs text-gray-400">{agente.distrito}</p>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={cn(
              'text-xs font-medium',
              isOverdue ? 'text-red-600' : 'text-gray-500',
            )}
          >
            {isOverdue && '⚠️ '}
            {tiempoTexto}
          </span>
        </div>
      </div>

      {/* Docs progress */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500">
            {agente.docs_subidos}/3 documentos
          </span>
          <span className="text-[11px] text-gray-400">
            {agente.docs_subidos === 3 ? '✓ Completo' : 'Incompleto'}
          </span>
        </div>
        <Progress value={agente.docs_subidos} max={3} />
      </div>

      {/* Quick approve */}
      <button
        onClick={handleApprove}
        className="flex items-center justify-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
      >
        <CheckCircle className="h-3.5 w-3.5" />
        Aprobar rápido
      </button>
    </div>
  );
}
