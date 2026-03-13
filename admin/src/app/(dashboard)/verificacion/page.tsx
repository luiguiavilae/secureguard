// TODO: Página de verificación de agentes — cola de pendientes, revisar documentos, aprobar/rechazar
import React from 'react';
import { AgentQueue } from '@/components/verificacion/AgentQueue';

export const metadata = { title: 'Verificación de Agentes — SecureGuard Admin' };

export default function VerificacionPage() {
  // TODO: Implementar página de verificación
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Verificación de Agentes</h1>
      <AgentQueue />
    </div>
  );
}
