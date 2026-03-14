'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, AlertTriangle, Ban, CheckCircle, Sliders,
  MessageSquare, Star, TrendingUp, TrendingDown, Award,
} from 'lucide-react';
import {
  mockAgentesExtendidos, mockAgentesVerificados,
  BADGE_INFO,
  type NivelScore, type AgenteExtendido,
} from '@/lib/mock-data';

const NIVEL_COLOR: Record<NivelScore, string> = {
  CONFIABLE:   'bg-emerald-100 text-emerald-700',
  REGULAR:     'bg-yellow-100 text-yellow-700',
  OBSERVADO:   'bg-orange-100 text-orange-700',
  RESTRINGIDO: 'bg-red-100 text-red-600',
  BLOQUEADO:   'bg-gray-200 text-gray-500',
};
const NIVEL_BAR: Record<NivelScore, string> = {
  CONFIABLE: 'bg-emerald-500', REGULAR: 'bg-yellow-400',
  OBSERVADO: 'bg-orange-400', RESTRINGIDO: 'bg-red-500', BLOQUEADO: 'bg-gray-400',
};
const NIVEL_ICON: Record<NivelScore, string> = {
  CONFIABLE: '🟢', REGULAR: '🟡', OBSERVADO: '🟠', RESTRINGIDO: '🔴', BLOQUEADO: '⛔',
};
const ESTADO_COLOR: Record<string, string> = {
  ACTIVO:     'bg-emerald-50 text-emerald-700 border border-emerald-200',
  SUSPENDIDO: 'bg-orange-50 text-orange-700 border border-orange-200',
  BLOQUEADO:  'bg-red-50 text-red-700 border border-red-200',
  INACTIVO:   'bg-gray-100 text-gray-500',
};
const SERVICIO_ESTADO_COLOR: Record<string, string> = {
  COMPLETADO: 'bg-emerald-50 text-emerald-700',
  CANCELADO:  'bg-red-50 text-red-600',
  EN_CURSO:   'bg-blue-50 text-blue-700',
  DISPUTADO:  'bg-orange-50 text-orange-700',
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

interface ModalProps {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  children: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}

function ConfirmModal({ title, onConfirm, onCancel, children, confirmLabel = 'Confirmar', danger = false }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="mb-3 text-base font-semibold text-gray-900">{title}</h3>
        <div className="mb-5 text-sm text-gray-600">{children}</div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel}
            className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-600 hover:bg-brand-700'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900">
      {icon} {label}
    </button>
  );
}

interface Props { params: { id: string } }
type ModalType = 'suspender' | 'bloquear' | 'reactivar' | 'ajustar_score' | 'nota' | null;

interface AuditAction {
  fecha: string;
  accion: string;
  detalle: string;
}

export default function AgenteDetailPage({ params }: Props) {
  const base = mockAgentesExtendidos[params.id] ?? mockAgentesVerificados.find(a => a.id === params.id);
  const [agente, setAgente] = useState<AgenteExtendido | typeof base>(base);
  const [modal, setModal] = useState<ModalType>(null);
  const [suspDias, setSuspDias] = useState<number>(7);
  const [suspMotivo, setSuspMotivo] = useState('');
  const [bloquearMotivo, setBloquearMotivo] = useState('');
  const [scoreDelta, setScoreDelta] = useState<number>(0);
  const [scoreMotivo, setScoreMotivo] = useState('');
  const [notaTexto, setNotaTexto] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [auditActions, setAuditActions] = useState<AuditAction[]>([]);
  const [notas, setNotas] = useState<string[]>([]);

  if (!agente) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-lg font-medium">Agente no encontrado</p>
        <Link href="/agentes" className="mt-3 text-sm text-brand-600 hover:underline">← Volver</Link>
      </div>
    );
  }

  const ext = agente as AgenteExtendido;
  const scorePct = Math.max(0, Math.min(100, agente.score));
  const puntualidadPct = agente.servicios_completados > 0
    ? ((agente.servicios_sin_retraso / agente.servicios_completados) * 100).toFixed(0)
    : '0';

  const initials = agente.nombre.split(' ').slice(0, 2).map(w => w[0]).join('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function addAudit(accion: string, detalle: string) {
    setAuditActions(prev => [{ fecha: new Date().toISOString(), accion, detalle }, ...prev]);
  }

  function handleSuspender() {
    setAgente(prev => prev ? { ...prev, estado: 'SUSPENDIDO' } : prev);
    addAudit('SUSPENDER_USUARIO', `Suspendido ${suspDias} días. ${suspMotivo ? `Motivo: ${suspMotivo}` : ''}`);
    setModal(null);
    showToast(`Agente suspendido por ${suspDias} días.`);
  }

  function handleBloquear() {
    setAgente(prev => prev ? { ...prev, estado: 'BLOQUEADO' } : prev);
    addAudit('BLOQUEAR_USUARIO', `Bloqueo permanente. ${bloquearMotivo ? `Motivo: ${bloquearMotivo}` : ''}`);
    setModal(null);
    showToast('Agente bloqueado permanentemente.');
  }

  function handleReactivar() {
    setAgente(prev => prev ? { ...prev, estado: 'ACTIVO', suspension_hasta: null } : prev);
    addAudit('REACTIVAR_USUARIO', 'Cuenta reactivada manualmente por administrador.');
    setModal(null);
    showToast('Agente reactivado correctamente.');
  }

  function handleAjustarScore() {
    setAgente(prev => {
      if (!prev) return prev;
      const nuevoScore = Math.max(0, Math.min(100, prev.score + scoreDelta));
      const nuevoNivel: NivelScore =
        nuevoScore >= 80 ? 'CONFIABLE' : nuevoScore >= 50 ? 'REGULAR' :
        nuevoScore >= 20 ? 'OBSERVADO' : nuevoScore >= 0 ? 'RESTRINGIDO' : 'BLOQUEADO';
      const nuevoHistory = [
        { fecha: new Date().toISOString(), delta: scoreDelta, score_resultante: nuevoScore, motivo: scoreMotivo || 'AJUSTE_MANUAL_ADMIN' },
        ...prev.score_history,
      ];
      return { ...prev, score: nuevoScore, nivel: nuevoNivel, score_history: nuevoHistory };
    });
    addAudit('AJUSTAR_SCORE', `Delta ${scoreDelta > 0 ? '+' : ''}${scoreDelta}. Motivo: ${scoreMotivo || 'AJUSTE_MANUAL_ADMIN'}`);
    setModal(null);
    showToast(`Score ajustado ${scoreDelta > 0 ? '+' : ''}${scoreDelta} pts.`);
  }

  function handleAgregarNota() {
    if (!notaTexto.trim()) return;
    setNotas(prev => [notaTexto.trim(), ...prev]);
    addAudit('AGREGAR_NOTA', `"${notaTexto.trim()}"`);
    setNotaTexto('');
    setModal(null);
    showToast('Nota interna guardada.');
  }

  const sortedBadges = agente.badges
    .filter(b => BADGE_INFO[b])
    .sort((a, b) => {
      const da = ext.badge_dates?.[a] ? new Date(ext.badge_dates[a]).getTime() : 0;
      const db2 = ext.badge_dates?.[b] ? new Date(ext.badge_dates[b]).getTime() : 0;
      return db2 - da;
    });

  const ratingDims = ext.rating_dimensions;
  const dimensions: Array<{ label: string; key: keyof typeof ratingDims }> = [
    { label: 'General', key: 'general' },
    { label: 'Puntualidad', key: 'puntualidad' },
    { label: 'Trato al cliente', key: 'trato' },
    { label: 'Seguridad', key: 'seguridad' },
    { label: 'Presentación', key: 'presentacion' },
  ];

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link href="/agentes" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="h-4 w-4" /> Agentes
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-800">{agente.nombre}</span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

        {/* Columna izquierda */}
        <div className="space-y-5">

          {/* Section 1 — Header card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col items-start gap-3">
              {/* Avatar */}
              <div className="flex items-center gap-3 w-full">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-bold text-gray-900 leading-tight">{agente.nombre}</h2>
                  <p className="text-xs text-gray-400">DNI: {agente.dni}</p>
                  <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_COLOR[agente.estado] ?? 'bg-gray-100 text-gray-500'}`}>
                    {agente.estado}
                  </span>
                </div>
              </div>

              {/* Nivel row */}
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <span>{NIVEL_ICON[agente.nivel]}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${NIVEL_COLOR[agente.nivel]}`}>{agente.nivel}</span>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-500">Miembro hace {daysSince(agente.created_at)} días</span>
              </div>
            </div>

            {/* Score bar */}
            <div className="mb-3">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-gray-500">Score de confianza</span>
                <span className="font-bold text-gray-800">{agente.score}/100</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-gray-100">
                <div className={`h-full rounded-full transition-all ${NIVEL_BAR[agente.nivel]}`}
                  style={{ width: `${scorePct}%` }} />
              </div>
            </div>

            <dl className="space-y-1.5 text-xs">
              {([
                ['Teléfono', agente.phone],
                ['Email', agente.email],
                ['Distrito', agente.distrito],
                ['SUCAMEC', agente.sucamec_numero],
                ['Registrado', fmtDate(agente.created_at)],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <dt className="text-gray-400">{k}</dt>
                  <dd className="text-right font-medium text-gray-700">{v}</dd>
                </div>
              ))}
              {agente.suspension_hasta && (
                <div className="flex justify-between gap-2">
                  <dt className="text-orange-500">Suspendido hasta</dt>
                  <dd className="text-right font-medium text-orange-600">{fmt(agente.suspension_hasta)}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Section 8 — Actions panel */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Acciones administrativas</h3>
            <div className="space-y-2">
              {(agente.estado === 'SUSPENDIDO' || agente.estado === 'BLOQUEADO') && (
                <ActionBtn icon={<CheckCircle className="h-4 w-4 text-emerald-500" />}
                  label="Reactivar cuenta" onClick={() => setModal('reactivar')} />
              )}
              {agente.estado === 'ACTIVO' && (
                <ActionBtn icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}
                  label="Suspender temporalmente" onClick={() => setModal('suspender')} />
              )}
              {agente.estado !== 'BLOQUEADO' && (
                <ActionBtn icon={<Ban className="h-4 w-4 text-red-500" />}
                  label="Bloquear permanente" onClick={() => setModal('bloquear')} />
              )}
              <ActionBtn icon={<Sliders className="h-4 w-4 text-brand-500" />}
                label="Ajustar score manualmente" onClick={() => setModal('ajustar_score')} />
              <ActionBtn icon={<MessageSquare className="h-4 w-4 text-gray-500" />}
                label="Agregar nota interna" onClick={() => setModal('nota')} />
            </div>
          </div>

          {/* Notes card */}
          {notas.length > 0 && (
            <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-4 shadow-sm">
              <h3 className="mb-2 text-xs font-semibold text-yellow-800">Notas internas ({notas.length})</h3>
              <ul className="space-y-1.5">
                {notas.map((n, i) => (
                  <li key={i} className="rounded-md bg-white px-3 py-2 text-xs text-gray-700 border border-yellow-100">
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Local audit log */}
          {auditActions.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-xs font-semibold text-gray-600">Acciones registradas (sesión)</h3>
              <ul className="space-y-1.5">
                {auditActions.map((a, i) => (
                  <li key={i} className="rounded-md bg-gray-50 px-3 py-2 text-xs">
                    <span className="font-medium text-gray-700">{a.accion}</span>
                    <p className="text-gray-500 mt-0.5">{a.detalle}</p>
                    <p className="text-gray-400 mt-0.5">{fmt(a.fecha)}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Columna derecha 2-col span */}
        <div className="space-y-5 lg:col-span-2">

          {/* Section 2 — Stats grid 2x3 */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: 'Servicios completados', value: agente.servicios_completados },
              { label: 'Puntualidad', value: `${puntualidadPct}%` },
              { label: 'Rating promedio', value: `★ ${agente.rating_avg.toFixed(1)}` },
              { label: 'Comisión actual', value: `${agente.comision_pct}%` },
              { label: 'Cancelaciones', value: ext.cancelaciones_total ?? '-' },
              { label: 'Ingresos estimados', value: `S/ ${(ext.ingresos_totales ?? 0).toLocaleString()}` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
                <p className="text-lg font-bold text-gray-900">{value}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
              </div>
            ))}
          </div>

          {/* Section 3 — Badges */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Award className="h-4 w-4 text-brand-500" />
              Badges obtenidos
              <span className="text-xs font-normal text-gray-400">({sortedBadges.length})</span>
            </h3>
            {sortedBadges.length === 0 ? (
              <p className="text-sm text-gray-400">Sin badges todavía.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {sortedBadges.map((b) => {
                  const info = BADGE_INFO[b];
                  if (!info) return null;
                  const badgeDate = ext.badge_dates?.[b];
                  return (
                    <div key={b} className="flex flex-col items-center rounded-lg border border-gray-100 bg-gray-50 px-2 py-2.5 text-center">
                      <span className="text-2xl">{info.emoji}</span>
                      <p className="mt-1 text-[11px] font-semibold text-gray-800 leading-tight">{info.nombre}</p>
                      <p className="text-[9px] text-gray-400 mt-0.5">{badgeDate ? fmtDate(badgeDate) : '—'}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 4 — Rating por dimensión */}
          {ratingDims && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Star className="h-4 w-4 text-yellow-400" />
                Rating por dimensión
              </h3>
              <div className="space-y-3">
                {dimensions.map(({ label, key }) => {
                  const val = ratingDims[key];
                  const barColor = val >= 4.5 ? 'bg-emerald-400' : val >= 3.5 ? 'bg-yellow-400' : 'bg-red-400';
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="w-32 text-xs text-gray-600 shrink-0">{label}</span>
                      <div className="flex-1 h-2 rounded-full bg-gray-100">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${(val / 5) * 100}%` }} />
                      </div>
                      <span className="w-8 text-right text-xs font-semibold text-gray-700">{val.toFixed(1)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 5 — Historial de score */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
              {agente.score >= 50 ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
              Historial de score
              <span className="text-xs font-normal text-gray-400">(últimos {agente.score_history.slice(0, 20).length})</span>
            </h3>
            {agente.score_history.length === 0 ? (
              <p className="text-sm text-gray-400">Sin movimientos.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 text-left">
                    <th className="pb-2">Fecha</th>
                    <th className="pb-2 text-right">Delta</th>
                    <th className="pb-2 text-right">Score</th>
                    <th className="pb-2 pl-3">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {agente.score_history.slice(0, 20).map((h, i) => (
                    <tr key={i}>
                      <td className="py-2 text-gray-500">{fmt(h.fecha)}</td>
                      <td className={`py-2 text-right font-semibold tabular-nums ${h.delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {h.delta > 0 ? '+' : ''}{h.delta}
                      </td>
                      <td className="py-2 text-right tabular-nums font-semibold text-gray-700">{h.score_resultante}</td>
                      <td className="py-2 pl-3 font-mono text-gray-500">{h.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Section 6 — Ultimos servicios */}
          {ext.servicios_history && ext.servicios_history.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">
                Últimos servicios
                <span className="ml-1 text-xs font-normal text-gray-400">({ext.servicios_history.slice(0, 20).length})</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 text-left">
                      <th className="pb-2">Fecha</th>
                      <th className="pb-2">Tipo</th>
                      <th className="pb-2">Distrito</th>
                      <th className="pb-2 text-right">Horas</th>
                      <th className="pb-2 text-right">Monto S/</th>
                      <th className="pb-2">Estado</th>
                      <th className="pb-2 text-right">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {ext.servicios_history.slice(0, 20).map((s) => {
                      const row = (
                        <tr key={s.id} className={s.disputa_id ? 'cursor-pointer hover:bg-orange-50' : 'hover:bg-gray-50'}>
                          <td className="py-2 text-gray-500">{fmtDate(s.fecha)}</td>
                          <td className="py-2 text-gray-700">{s.tipo}</td>
                          <td className="py-2 text-gray-500">{s.distrito}</td>
                          <td className="py-2 text-right tabular-nums text-gray-700">{s.duracion_horas}h</td>
                          <td className="py-2 text-right tabular-nums font-medium text-gray-800">{s.monto}</td>
                          <td className="py-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${SERVICIO_ESTADO_COLOR[s.estado] ?? 'bg-gray-100 text-gray-500'}`}>
                              {s.estado}
                            </span>
                          </td>
                          <td className="py-2 text-right text-gray-500">
                            {s.rating !== null ? `★ ${s.rating}` : '—'}
                          </td>
                        </tr>
                      );
                      return s.disputa_id ? (
                        <Link key={s.id} href={`/disputas/${s.disputa_id}`} legacyBehavior>
                          {row}
                        </Link>
                      ) : row;
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 7 — Penalizaciones */}
          {agente.penalizaciones.length > 0 && (
            <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-red-600">Historial de penalizaciones</h3>
              <div className="space-y-2">
                {agente.penalizaciones.map((p, i) => (
                  <div key={i} className="flex items-start justify-between rounded-lg bg-red-50 px-3 py-2 text-xs">
                    <div>
                      <span className="font-semibold text-red-700">{p.tipo}</span>
                      <p className="text-gray-600">{p.descripcion}</p>
                      <p className="text-gray-400">{fmt(p.fecha)}</p>
                    </div>
                    {p.monto > 0 && <span className="font-bold text-red-600 ml-3">S/ {p.monto.toFixed(2)}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal === 'suspender' && (
        <ConfirmModal title="Suspender agente" confirmLabel="Suspender" danger
          onConfirm={handleSuspender} onCancel={() => setModal(null)}>
          <div className="space-y-3">
            <p>Selecciona la duración:</p>
            <div className="flex gap-2 flex-wrap">
              {[7, 15, 30, 60].map((d) => (
                <button key={d} onClick={() => setSuspDias(d)}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${suspDias === d ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {d} días
                </button>
              ))}
            </div>
            <input type="text" placeholder="Motivo (opcional)" value={suspMotivo}
              onChange={(e) => setSuspMotivo(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400" />
          </div>
        </ConfirmModal>
      )}
      {modal === 'bloquear' && (
        <ConfirmModal title="Bloquear permanentemente" confirmLabel="Bloquear" danger
          onConfirm={handleBloquear} onCancel={() => setModal(null)}>
          <div className="space-y-3">
            <p>Esta acción bloqueará la cuenta de <strong>{agente.nombre}</strong> indefinidamente.</p>
            <input type="text" placeholder="Motivo obligatorio" value={bloquearMotivo}
              onChange={(e) => setBloquearMotivo(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400" />
          </div>
        </ConfirmModal>
      )}
      {modal === 'reactivar' && (
        <ConfirmModal title="Reactivar cuenta" confirmLabel="Reactivar"
          onConfirm={handleReactivar} onCancel={() => setModal(null)}>
          <p>Se levantará la suspensión de <strong>{agente.nombre}</strong> y podrá prestar servicios.</p>
        </ConfirmModal>
      )}
      {modal === 'ajustar_score' && (
        <ConfirmModal title="Ajuste manual de score" confirmLabel="Aplicar"
          onConfirm={handleAjustarScore} onCancel={() => setModal(null)}>
          <div className="space-y-3">
            <p>Score actual: <strong>{agente.score}</strong></p>
            <div className="flex items-center gap-2">
              <label className="whitespace-nowrap text-sm text-gray-600">Delta (±):</label>
              <input type="number" value={scoreDelta} onChange={(e) => setScoreDelta(Number(e.target.value))}
                className="w-28 rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400" />
              <span className="text-sm text-gray-500">
                → <strong className={scoreDelta >= 0 ? 'text-emerald-600' : 'text-red-500'}>{agente.score + scoreDelta}</strong>
              </span>
            </div>
            <input type="text" placeholder="Motivo" value={scoreMotivo}
              onChange={(e) => setScoreMotivo(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400" />
          </div>
        </ConfirmModal>
      )}
      {modal === 'nota' && (
        <ConfirmModal title="Agregar nota interna" confirmLabel="Guardar"
          onConfirm={handleAgregarNota} onCancel={() => setModal(null)}>
          <div className="space-y-2">
            <p>La nota quedará registrada en el audit log de esta sesión.</p>
            <textarea rows={4} placeholder="Escribe la nota interna..." value={notaTexto}
              onChange={(e) => setNotaTexto(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 resize-none" />
          </div>
        </ConfirmModal>
      )}
    </div>
  );
}
