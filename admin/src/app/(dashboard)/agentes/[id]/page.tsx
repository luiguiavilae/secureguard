// TODO: Página detalle de agente — perfil completo, documentos, historial, suspender/activar
import React from 'react';

interface Props {
  params: { id: string };
}

export default function AgenteDetailPage({ params }: Props) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Agente #{params.id}</h1>
      {/* TODO: Implementar detalle de agente */}
    </div>
  );
}
