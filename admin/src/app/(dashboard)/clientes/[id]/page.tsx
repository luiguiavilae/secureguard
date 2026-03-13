// TODO: Página detalle de cliente — perfil, historial de servicios, bloquear/desbloquear
import React from 'react';

interface Props {
  params: { id: string };
}

export default function ClienteDetailPage({ params }: Props) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Cliente #{params.id}</h1>
      {/* TODO: Implementar detalle de cliente */}
    </div>
  );
}
