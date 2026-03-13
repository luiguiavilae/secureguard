// TODO: Página detalle de disputa — timeline, mensajes, resolución, reembolso
import React from 'react';
import { DisputeTimeline } from '@/components/disputas/DisputeTimeline';

interface Props {
  params: { id: string };
}

export default function DisputaDetailPage({ params }: Props) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Disputa #{params.id}</h1>
      <DisputeTimeline disputeId={params.id} />
    </div>
  );
}
