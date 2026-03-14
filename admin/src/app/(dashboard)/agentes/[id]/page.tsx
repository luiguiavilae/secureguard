'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Ban, CheckCircle, Sliders } from 'lucide-react';
import { mockAgentesVerificados, BADGE_INFO, type MockAgenteVerificado, type NivelScore } from '@/lib/mock-data';

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
const ESTADO_COLOR: Record<string, string> = {
  ACTIVO:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
  SUSPENDIDO:'bg-orange-50 text-orange-700 border border-orange-200',
  BLOQUEADO: 'bg-red-50 text-red-700 border border-red-200',
  INACTIVO:  'bg-gray-100 text-gray-500',
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
type ModalType = 'suspender' | 'bloquear' | 'reactivar' | 'ajustar_score' | null;

export default function AgenteDetailPage({ params }: Props) {
  const [agente, setAgente] = useState<MockAgenteVerificado | undefined>(
    () => mockAgentesVerificados.find((a) => a.id === params.id)
  );
  const [modal, setModal] = useState<ModalType>(null);
  const [suspDias, setSuspDias] = useState<number>(7);
  const [suspMotivo, setSuspMotivo] = useState('');
  const [scoreDelta, setScoreDelta] = useState<number>(0);
  const [scoreMotivo, setScoreMotivo] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  if (!agente) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-lg font-medium">Agente no encontrado</p>
        <Link href="/agentes" className="mt-3 text-sm text-brand-600 hover:underline">← Volver</Link>
      </div>
    );
  }

  const scorePct = Math.max(0, Math.min(100, agente.score));

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleSuspender() {
    setAgente((prev) => prev ? { ...prev, estado: 'SUSPENDIDO' } : prev);
    setModal(null);
    showToast(`Agente suspendido por ${suspDias} días.`);
  }
  function handleBloquear() {
    setAgente((prev) => prev ? { ...prev, estado: 'BLOQUEADO' } : prev);
    setModal(null);
    showToast('Agente bloqueado permanentemente.');
  }
  function handleReactivar() {
    setAgente((prev) => prev ? { ...prev, estado: 'ACTIVO', suspension_hasta: null } : prev);
    setModal(null);
    showToast('Agente reactivado correctamente.');
  }
  function handleAjustarScore() {
    setAgente((prev) => {
      if (!prev) return prev;
      const nuevoScore = Math.max(-999, prev.score + scoreDelta);
      const nuevoNivel: NivelScore =
        nuevoScore >= 80 ? 'CONFIABLE' : nuevoScore >= 50 ? 'REGULAR' :
        nuevoScore >= 20 ? 'OBSERVADO' : nuevoScore >= 0 ? 'RESTRINGIDO' : 'BLOQUEADO';
      const nuevoHistory = [
        { fecha: new Date().toISOString(), delta: scoreDelta, score_resultante: nuevoScore, motivo: scoreMotivo || 'AJUSTE_MANUAL_ADMIN' },
        ...prev.score_history,
      ];
      return { ...prev, score: nuevoScore, nivel: nuevoNivel, score_history: nuevoHistory };
    });
    setModal(null);
    showToast(`Score ajustado ${scoreDelta > 0 ? '+' : ''}${scoreDelta} pts.`);
  }

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
          {/* Perfil */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">{agente.nombre}</h2>
                <p className="text-xs text-gray-400">DNI: {agente.dni}</p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_COLOR[agente.estado] ?? 'bg-gray-100 text-gray-500'}`}>
                {agente.estado}
              </span>
            </div>
            <dl className="space-y-2 text-sm">
              {([
                ['Teléfono', agente.phone],
                ['Email', agente.email],
                ['Distrito', agente.distrito],
                ['SUCAMEC', agente.sucamec_numero],
                ['Comisión', `${agente.comision_pct}%`],
                ['Miembro desde', fmtDate(agente.created_at)],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <dt className="text-gray-400">{k}</dt>
                  <dd className="text-right font-medium text-gray-800">{v}</dd>
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

          {/* Acciones */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Acciones administrativas</h3>
            <div className="space-y-2">
              {agente.estado !== 'ACTIVO' && (
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
            </div>
          </div>
        </div>

        {/* Columna derecha */}
        <div className="space-y-5 lg:col-span-2">

          {/* Score */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Score de confianza</h3>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${NIVEL_COLOR[agente.nivel]}`}>
                {agente.nivel}
              </span>
            </div>
            <div className="mb-1 flex items-end gap-3">
              <span className="text-4xl font-black text-gray-900">{agente.score}</span>
              <span className="mb-1 text-sm text-gray-400">/ 100</span>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-100">
              <div className={`h-full rounded-full transition-all ${NIVEL_BAR[agente.nivel]}`}
                style={{ width: `${scorePct}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-gray-400">
              <span>BLOQUEADO</span><span>RESTRINGIDO</span><span>OBSERVADO</span><span>REGULAR</span><span>CONFIABLE</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {([
                ['Servicios', agente.servicios_completados],
                ['Sin retraso', `${agente.servicios_sin_retraso}/${agente.servicios_completados}`],
                ['Rating', `★ ${agente.rating_avg.toFixed(1)}`],
              ] as [string, string | number][]).map(([label, val]) => (
                <div key={label} className="rounded-lg bg-gray-50 p-3 text-center">
                  <p className="text-lg font-bold text-gray-900">{val}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Badges */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              Badges obtenidos <span className="text-xs font-normal text-gray-400">({agente.badges.length})</span>
            </h3>
            {agente.badges.length === 0 ? (
              <p className="text-sm text-gray-400">Sin badges todavía.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {agente.badges.map((b) => {
                  const info = BADGE_INFO[b];
                  if (!info) return null;
                  return (
                    <div key={b} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                      <span className="text-xl">{info.emoji}</span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-gray-800">{info.nombre}</p>
                        <p className="truncate text-[10px] text-gray-400">{info.descripcion}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Historial de score */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Historial de score</h3>
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
                  {agente.score_history.map((h, i) => (
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

          {/* Penalizaciones */}
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
            <div className="flex gap-2">
              {[7, 15, 30].map((d) => (
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
          <p>Esta acción bloqueará la cuenta de <strong>{agente.nombre}</strong> indefinidamente.</p>
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
    </div>
  );
}
