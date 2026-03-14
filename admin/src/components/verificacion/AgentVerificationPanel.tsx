'use client';

import React, { useState } from 'react';
import { type MockAgente, type VerificacionEstado } from '@/lib/mock-data';
import { getTimeInQueue, formatDate } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  XCircle,
  ClipboardList,
  Flag,
  FileText,
  User,
  Phone,
  MapPin,
  Clock,
} from 'lucide-react';

interface AgentVerificationPanelProps {
  agente: MockAgente;
  onAction: (id: string, action: VerificacionEstado) => void;
}

type ModalType = 'aprobar' | 'rechazar' | 'solicitar' | 'sospechoso' | null;

const MOTIVOS_RECHAZO = [
  'Documento ilegible',
  'Documento vencido',
  'Selfie no coincide con DNI',
  'Licencia SUCAMEC inválida',
  'Otro',
];

function DocCard({ label, index }: { label: string; index: number }) {
  const uploaded = index <= 1; // mock: primeros 2 subidos
  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="flex h-32 items-center justify-center bg-gray-50">
        {uploaded ? (
          <div className="flex flex-col items-center gap-2 text-gray-300">
            <FileText className="h-10 w-10" />
            <span className="text-xs">Imagen de documento</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-200">
            <FileText className="h-10 w-10" />
            <span className="text-xs text-gray-400">No subido</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-medium text-gray-700">{label}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            uploaded
              ? 'bg-amber-100 text-amber-700'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {uploaded ? 'PENDIENTE' : 'FALTANTE'}
        </span>
      </div>
    </div>
  );
}

export function AgentVerificationPanel({ agente, onAction }: AgentVerificationPanelProps) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [nota, setNota] = useState('');

  const { text: tiempoTexto, isOverdue } = getTimeInQueue(agente.created_at);

  const closeModal = () => {
    setActiveModal(null);
    setMotivoRechazo('');
    setMensaje('');
    setNota('');
  };

  const handleConfirmAprobar = () => {
    onAction(agente.id, 'APROBADO');
    closeModal();
  };

  const handleConfirmRechazar = () => {
    if (!motivoRechazo) return;
    onAction(agente.id, 'RECHAZADO');
    closeModal();
  };

  const handleConfirmSolicitar = () => {
    // En producción: enviaría notificación al agente
    alert(`Mensaje enviado: ${mensaje}`);
    closeModal();
  };

  const handleConfirmSospechoso = () => {
    onAction(agente.id, 'SOSPECHOSO');
    closeModal();
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header del agente */}
      <div className="border-b border-gray-200 bg-white p-6">
        <div className="flex items-start gap-4">
          <Avatar src={agente.foto_url} name={agente.nombre} size="xl" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{agente.nombre}</h2>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                DNI: {agente.dni}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                {agente.phone}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {agente.distrito}
              </span>
              <span
                className={`flex items-center gap-1.5 font-medium ${
                  isOverdue ? 'text-red-600' : 'text-gray-500'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                En cola: {tiempoTexto}
                {isOverdue && ' ⚠️'}
              </span>
            </div>
          </div>
          <Badge variant="warning">EN REVISIÓN</Badge>
        </div>

        {/* Botones de acción */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="success" size="sm" onClick={() => setActiveModal('aprobar')}>
            <CheckCircle2 className="h-4 w-4" />
            Aprobar
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setActiveModal('rechazar')}>
            <XCircle className="h-4 w-4" />
            Rechazar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setActiveModal('solicitar')}>
            <ClipboardList className="h-4 w-4" />
            Solicitar info
          </Button>
          <Button variant="warning" size="sm" onClick={() => setActiveModal('sospechoso')}>
            <Flag className="h-4 w-4" />
            Marcar sospechoso
          </Button>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 p-6 space-y-6">
        {/* Documentos */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Documentos ({agente.docs_subidos}/3)
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <DocCard label="DNI Frontal" index={0} />
            <DocCard label="DNI Posterior" index={1} />
            <DocCard label="Selfie con DNI" index={2} />
          </div>
        </section>

        {/* Verificación RENIEC */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Verificación RENIEC
          </h3>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Resultado de consulta</span>
              <Badge variant="success">Vigente</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400">Nombre completo</p>
                <p className="font-medium text-gray-900">{agente.nombre.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">DNI</p>
                <p className="font-medium text-gray-900">{agente.dni}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Fecha de nacimiento</p>
                <p className="font-medium text-gray-900">{agente.fecha_nacimiento}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Estado</p>
                <p className="font-medium text-emerald-700">VIGENTE</p>
              </div>
            </div>
          </div>
        </section>

        {/* SUCAMEC */}
        {agente.sucamec_numero && (
          <section>
            <h3 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Licencia SUCAMEC
            </h3>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Número de licencia</p>
                  <p className="font-medium text-gray-900">{agente.sucamec_numero}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Estado</p>
                  <Badge variant="success">Válida</Badge>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* ── Modales ── */}

      {/* Aprobar */}
      <Dialog open={activeModal === 'aprobar'} onOpenChange={(o) => !o && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar agente</DialogTitle>
            <DialogDescription>
              Confirmas que los documentos de <strong>{agente.nombre}</strong> son válidos y el
              agente cumple los requisitos para prestar servicios en SecureGuard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button variant="success" onClick={handleConfirmAprobar}>
              <CheckCircle2 className="h-4 w-4" />
              Confirmar aprobación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rechazar */}
      <Dialog open={activeModal === 'rechazar'} onOpenChange={(o) => !o && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar solicitud</DialogTitle>
            <DialogDescription>
              Selecciona el motivo del rechazo. El agente será notificado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={motivoRechazo} onValueChange={setMotivoRechazo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un motivo" />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS_RECHAZO.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <textarea
              placeholder="Detalle adicional (opcional)"
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRechazar}
              disabled={!motivoRechazo}
            >
              <XCircle className="h-4 w-4" />
              Confirmar rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Solicitar info */}
      <Dialog open={activeModal === 'solicitar'} onOpenChange={(o) => !o && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar información adicional</DialogTitle>
            <DialogDescription>
              Envía un mensaje al agente <strong>{agente.nombre}</strong> solicitando más
              información o documentos.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Ej: Por favor sube una foto más clara del DNI frontal..."
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button
              variant="default"
              onClick={handleConfirmSolicitar}
              disabled={!mensaje.trim()}
            >
              <ClipboardList className="h-4 w-4" />
              Enviar mensaje
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Marcar sospechoso */}
      <Dialog open={activeModal === 'sospechoso'} onOpenChange={(o) => !o && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como sospechoso</DialogTitle>
            <DialogDescription>
              Añade una nota interna sobre las irregularidades detectadas. Solo los
              administradores podrán ver esta nota.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Describe la irregularidad detectada..."
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button
              variant="warning"
              onClick={handleConfirmSospechoso}
              disabled={!nota.trim()}
            >
              <Flag className="h-4 w-4" />
              Marcar sospechoso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
