'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  mockDisputas,
  mockDisputasDetalle,
  type MockDisputaDetalle,
  type MockTimelineEvento,
  type MockChatMensaje,
  type MockParticipanteDisputa,
  type DisputaEstado,
} from '@/lib/mock-data';
import { formatSoles, formatDateTime, cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Star,
  Clock,
  Shield,
  User,
  Phone,
  MapPin,
  AlertTriangle,
  RefreshCw,
  TrendingDown,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Briefcase,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const estadoBadge: Record<DisputaEstado, { label: string; variant: 'destructive' | 'warning' | 'success' | 'secondary' }> = {
  ABIERTA:     { label: 'Abierta',      variant: 'destructive' },
  EN_REVISION: { label: 'En revisión',  variant: 'warning' },
  RESUELTA:    { label: 'Resuelta',     variant: 'success' },
  CERRADA:     { label: 'Cerrada',      variant: 'secondary' },
};

function getSlaRestante(createdAt: string, slaHoras: number) {
  const deadline = new Date(createdAt).getTime() + slaHoras * 60 * 60 * 1000;
  const restanteMs = deadline - Date.now();
  if (restanteMs <= 0) return { texto: 'SLA vencido', pct: 0, critico: true };
  const horas = Math.floor(restanteMs / (1000 * 60 * 60));
  const mins = Math.floor((restanteMs % (1000 * 60 * 60)) / (1000 * 60));
  const pct = Math.min(100, (restanteMs / (slaHoras * 60 * 60 * 1000)) * 100);
  return { texto: `${horas}h ${mins}m restantes`, pct, critico: horas < 12 };
}

function getRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

const timelineIconConfig: Record<MockTimelineEvento['tipo'], { bg: string; text: string; symbol: string }> = {
  servicio:   { bg: 'bg-blue-100',    text: 'text-blue-600',   symbol: '🛡️' },
  disputa:    { bg: 'bg-red-100',     text: 'text-red-600',    symbol: '⚠️' },
  admin:      { bg: 'bg-brand-100',   text: 'text-brand-700',  symbol: '👤' },
  pago:       { bg: 'bg-emerald-100', text: 'text-emerald-700',symbol: '💰' },
  evidencia:  { bg: 'bg-amber-100',   text: 'text-amber-700',  symbol: '📎' },
  sistema:    { bg: 'bg-gray-100',    text: 'text-gray-500',   symbol: '⚙️' },
};

// ─── Subcomponentes ────────────────────────────────────────────────────────────

function StarRating({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5">
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      <span className="text-sm font-semibold text-gray-800">{value.toFixed(1)}</span>
    </span>
  );
}

function ParticipantCard({ p, label }: { p: MockParticipanteDisputa; label: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <div className="flex items-start gap-3">
        <Avatar name={p.nombre} size="md" />
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{p.nombre}</p>
          <p className="text-xs text-gray-400 capitalize">{p.rol}</p>
        </div>
        <StarRating value={p.rating} />
      </div>
      <div className="mt-3 space-y-1.5 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <Briefcase className="h-3.5 w-3.5 text-gray-400" />
          <span>{p.total_servicios} servicios completados</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertTriangle className={cn('h-3.5 w-3.5', p.disputas_previas > 2 ? 'text-red-400' : 'text-gray-400')} />
          <span className={p.disputas_previas > 2 ? 'text-red-600 font-medium' : ''}>
            {p.disputas_previas} disputa{p.disputas_previas !== 1 ? 's' : ''} previa{p.disputas_previas !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5 text-gray-400" />
          <span>{p.telefono}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-gray-400" />
          <span>{p.distrito}</span>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ evento, isLast }: { evento: MockTimelineEvento; isLast: boolean }) {
  const cfg = timelineIconConfig[evento.tipo];
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm', cfg.bg)}>
          {cfg.symbol}
        </div>
        {!isLast && <div className="mt-1 w-px flex-1 bg-gray-200" />}
      </div>
      <div className={cn('pb-5 min-w-0', isLast && 'pb-0')}>
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-semibold text-gray-900">{evento.titulo}</p>
          <span className="shrink-0 text-xs text-gray-400" suppressHydrationWarning>{getRelativeTime(evento.tiempo)}</span>
        </div>
        <p className="mt-0.5 text-sm text-gray-600">{evento.descripcion}</p>
        {evento.actor && (
          <p className="mt-0.5 text-xs text-gray-400">por {evento.actor}</p>
        )}
      </div>
    </div>
  );
}

function ChatTranscript({ mensajes }: { mensajes: MockChatMensaje[] }) {
  return (
    <div className="space-y-3">
      {mensajes.map((msg) => {
        const isAgente = msg.rol === 'agente';
        return (
          <div key={msg.id} className={cn('flex gap-2.5', isAgente && 'flex-row-reverse')}>
            <Avatar name={msg.autor} size="sm" />
            <div className={cn('max-w-[75%]', isAgente && 'items-end flex flex-col')}>
              <div
                className={cn(
                  'rounded-2xl px-3.5 py-2.5 text-sm',
                  isAgente
                    ? 'rounded-tr-sm bg-brand-600 text-white'
                    : 'rounded-tl-sm bg-gray-100 text-gray-900',
                )}
              >
                {msg.mensaje}
              </div>
              <p className="mt-1 text-[10px] text-gray-400" suppressHydrationWarning>
                {msg.autor} · {getRelativeTime(msg.tiempo)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Modales de resolución ─────────────────────────────────────────────────────

type AccionType =
  | 'reembolso_total'
  | 'reembolso_parcial'
  | 'favor_agente'
  | 'penalizar_agente'
  | 'penalizar_cliente'
  | 'cerrar'
  | null;

interface ResolutionConfig {
  id: AccionType;
  label: string;
  descripcion: string;
  variant: 'success' | 'destructive' | 'default' | 'warning' | 'outline';
  icon: React.ReactNode;
  confirmLabel: string;
}

const RESOLUCIONES: ResolutionConfig[] = [
  {
    id: 'reembolso_total',
    label: 'Reembolso total',
    descripcion: 'El cliente recibe el 100% del monto. El pago al agente es cancelado.',
    variant: 'success',
    icon: <RefreshCw className="h-4 w-4" />,
    confirmLabel: 'Confirmar reembolso total',
  },
  {
    id: 'reembolso_parcial',
    label: 'Reembolso parcial',
    descripcion: 'Define el porcentaje a reembolsar al cliente.',
    variant: 'warning',
    icon: <TrendingDown className="h-4 w-4" />,
    confirmLabel: 'Confirmar reembolso parcial',
  },
  {
    id: 'favor_agente',
    label: 'Fallo a favor del agente',
    descripcion: 'El agente recibe el pago completo. La disputa se cierra sin reembolso.',
    variant: 'default',
    icon: <CheckCircle2 className="h-4 w-4" />,
    confirmLabel: 'Confirmar fallo a favor del agente',
  },
  {
    id: 'penalizar_agente',
    label: 'Penalizar agente',
    descripcion: 'Se aplica penalización al agente: descuento de S/ 15 y advertencia en su perfil.',
    variant: 'destructive',
    icon: <XCircle className="h-4 w-4" />,
    confirmLabel: 'Confirmar penalización al agente',
  },
  {
    id: 'penalizar_cliente',
    label: 'Penalizar cliente',
    descripcion: 'Se aplica penalización al cliente por disputa infundada o intento de eludir pago.',
    variant: 'warning',
    icon: <AlertTriangle className="h-4 w-4" />,
    confirmLabel: 'Confirmar penalización al cliente',
  },
  {
    id: 'cerrar',
    label: 'Cerrar sin acción',
    descripcion: 'Se cierra la disputa sin tomar medidas. El pago se libera al agente.',
    variant: 'outline',
    icon: <MinusCircle className="h-4 w-4" />,
    confirmLabel: 'Confirmar cierre sin acción',
  },
];

interface ResolverModalProps {
  accion: AccionType;
  disputa: MockDisputaDetalle | null;
  baseDisputa: (typeof mockDisputas)[0] | undefined;
  onClose: () => void;
  onConfirm: (accion: AccionType, pct?: number, nota?: string) => void;
}

function ResolverModal({ accion, disputa, baseDisputa, onClose, onConfirm }: ResolverModalProps) {
  const [pct, setPct] = useState(50);
  const [nota, setNota] = useState('');
  const cfg = RESOLUCIONES.find((r) => r.id === accion);
  if (!cfg || !disputa || !baseDisputa) return null;

  const montoBase = baseDisputa.monto_en_disputa;
  const montoReembolso = accion === 'reembolso_total' ? montoBase : (montoBase * pct) / 100;

  return (
    <Dialog open={!!accion} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {cfg.icon}
            {cfg.label}
          </DialogTitle>
          <DialogDescription>{cfg.descripcion}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info de la disputa */}
          <div className="rounded-lg bg-gray-50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Disputa</span>
              <span className="font-mono font-semibold text-gray-800">{disputa.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Monto en disputa</span>
              <span className="font-semibold text-gray-800">{formatSoles(montoBase)}</span>
            </div>
            {(accion === 'reembolso_total' || accion === 'reembolso_parcial') && (
              <div className="flex justify-between border-t border-gray-200 mt-2 pt-2">
                <span className="text-gray-500">Reembolso al cliente</span>
                <span className="font-bold text-emerald-700">{formatSoles(montoReembolso)}</span>
              </div>
            )}
          </div>

          {/* Slider para reembolso parcial */}
          {accion === 'reembolso_parcial' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Porcentaje a reembolsar: <span className="text-brand-600 font-bold">{pct}%</span>
              </label>
              <input
                type="range"
                min={5}
                max={95}
                step={5}
                value={pct}
                onChange={(e) => setPct(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>5%</span>
                <span className="text-emerald-700 font-semibold">{formatSoles(montoReembolso)} al cliente</span>
                <span>95%</span>
              </div>
            </div>
          )}

          {/* Nota interna */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Nota de resolución <span className="text-gray-400">(obligatoria)</span>
            </label>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Describe el motivo de esta resolución..."
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            variant={cfg.variant}
            onClick={() => onConfirm(accion, pct, nota)}
            disabled={!nota.trim()}
          >
            {cfg.icon}
            {cfg.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface DisputeTimelineProps {
  disputeId: string;
}

export function DisputeTimeline({ disputeId }: DisputeTimelineProps) {
  const router = useRouter();
  const [accionActiva, setAccionActiva] = useState<AccionType>(null);
  const [resuelta, setResuelta] = useState(false);

  const baseDisputa = mockDisputas.find((d) => d.id === disputeId);
  const detalle = mockDisputasDetalle[disputeId] ?? null;

  if (!baseDisputa || !detalle) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-semibold text-gray-700">Disputa no encontrada</p>
        <p className="mt-1 text-sm text-gray-400">El ID {disputeId} no existe en el sistema</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/disputas')}>
          <ArrowLeft className="h-4 w-4" /> Volver a disputas
        </Button>
      </div>
    );
  }

  const sla = getSlaRestante(baseDisputa.created_at, detalle.sla_horas);
  const estadoCfg = estadoBadge[resuelta ? 'RESUELTA' : baseDisputa.estado];

  const handleConfirmar = (accion: AccionType, pct?: number, nota?: string) => {
    // Mock: simplemente marca como resuelta
    setResuelta(true);
    setAccionActiva(null);
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => router.push('/disputas')}
              className="mt-0.5 flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Disputas
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-gray-900">{disputeId}</h2>
                <Badge variant={estadoCfg.variant}>{estadoCfg.label}</Badge>
              </div>
              <p className="mt-0.5 text-sm text-gray-500">{detalle.tipo}</p>
              <p className="mt-0.5 text-xs text-gray-400" suppressHydrationWarning>
                Abierta {getRelativeTime(baseDisputa.created_at)} · {formatSoles(baseDisputa.monto_en_disputa)} en disputa
              </p>
            </div>
          </div>

          {/* SLA */}
          <div className={cn(
            'flex flex-col items-end rounded-lg border px-4 py-2.5',
            sla.critico ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50',
          )}>
            <div className="flex items-center gap-1.5">
              <Clock className={cn('h-4 w-4', sla.critico ? 'text-red-500' : 'text-gray-500')} />
              <span className={cn('text-sm font-bold', sla.critico ? 'text-red-700' : 'text-gray-700')} suppressHydrationWarning>
                {sla.texto}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-40 overflow-hidden rounded-full bg-gray-200">
              <div
                className={cn('h-full rounded-full transition-all', sla.critico ? 'bg-red-500' : 'bg-brand-600')}
                style={{ width: `${sla.pct}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-gray-400">SLA de {detalle.sla_horas}h</p>
          </div>
        </div>

        {/* Nota interna */}
        {detalle.nota_interna && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Nota interna:</span> {detalle.nota_interna}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Columna izquierda: perfiles ── */}
        <div className="space-y-4">
          <ParticipantCard p={detalle.cliente} label="Reportante" />
          <ParticipantCard p={detalle.agente} label="Reportado" />

          {/* Monto en disputa */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Monto en disputa</p>
            <p className="text-2xl font-bold text-gray-900">{formatSoles(baseDisputa.monto_en_disputa)}</p>
            <p className="mt-0.5 text-xs text-gray-400">Servicio: {baseDisputa.servicio_id}</p>
          </div>
        </div>

        {/* ── Columna central: timeline + chat ── */}
        <div className="space-y-4 lg:col-span-2">
          {/* Timeline */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Cronología del caso
            </h3>
            <div>
              {detalle.timeline.map((evento, i) => (
                <TimelineItem
                  key={evento.id}
                  evento={evento}
                  isLast={i === detalle.timeline.length - 1}
                />
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Transcripción del chat
            </h3>
            <ChatTranscript mensajes={detalle.chat} />
          </div>

          {/* ── Acciones de resolución ── */}
          {!resuelta ? (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-1 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Resolución
              </h3>
              <p className="mb-4 text-xs text-gray-400">
                Selecciona la acción a tomar. Todas las acciones requieren nota de resolución.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {RESOLUCIONES.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setAccionActiva(r.id)}
                    className={cn(
                      'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors hover:shadow-sm',
                      r.variant === 'success'     && 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800',
                      r.variant === 'destructive' && 'border-red-200 bg-red-50 hover:bg-red-100 text-red-800',
                      r.variant === 'warning'     && 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800',
                      r.variant === 'default'     && 'border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-800',
                      r.variant === 'outline'     && 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700',
                    )}
                  >
                    <span className="text-lg">{
                      r.id === 'reembolso_total'   ? '💰' :
                      r.id === 'reembolso_parcial' ? '🔢' :
                      r.id === 'favor_agente'      ? '✅' :
                      r.id === 'penalizar_agente'  ? '🚫' :
                      r.id === 'penalizar_cliente' ? '⚠️' :
                      '🔒'
                    }</span>
                    <span className="text-xs font-semibold leading-tight">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center shadow-sm">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-base font-semibold text-emerald-800">Disputa resuelta</p>
              <p className="mt-1 text-sm text-emerald-600">La resolución fue aplicada correctamente en modo mock.</p>
              <Button variant="outline" className="mt-3" size="sm" onClick={() => router.push('/disputas')}>
                <ArrowLeft className="h-4 w-4" /> Volver a la lista
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de resolución */}
      <ResolverModal
        accion={accionActiva}
        disputa={detalle}
        baseDisputa={baseDisputa}
        onClose={() => setAccionActiva(null)}
        onConfirm={handleConfirmar}
      />
    </div>
  );
}
