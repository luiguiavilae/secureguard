'use client';

import React from 'react';
import { mockFeedEvents, type FeedEvent } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  PlusCircle,
  XCircle,
  Clock,
} from 'lucide-react';

const iconMap = {
  servicio_creado: { icon: PlusCircle, color: 'text-blue-500', bg: 'bg-blue-50' },
  agente_aprobado: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  pago_liberado: { icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  disputa_abierta: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50' },
  servicio_completado: { icon: CheckCircle2, color: 'text-gray-500', bg: 'bg-gray-50' },
  agente_rechazado: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
};

function getRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `hace ${hrs}h`;
}

function FeedItem({ event }: { event: FeedEvent }) {
  const { icon: Icon, color, bg } = iconMap[event.tipo];
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', bg)}>
        <Icon className={cn('h-3.5 w-3.5', color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 leading-snug">{event.descripcion}</p>
        <p className="mt-0.5 text-xs text-gray-400 flex items-center gap-1" suppressHydrationWarning>
          <Clock className="h-3 w-3" />
          {getRelativeTime(event.tiempo)}
        </p>
      </div>
    </div>
  );
}

export function LiveFeed() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Actividad reciente</h3>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs text-gray-400">En vivo</span>
        </div>
      </div>
      <div className="divide-y divide-gray-50 px-5">
        {mockFeedEvents.map((event) => (
          <FeedItem key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
