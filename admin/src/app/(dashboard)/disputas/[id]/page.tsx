import React from 'react';
import { DisputeTimeline } from '@/components/disputas/DisputeTimeline';

interface Props {
  params: { id: string };
}

export function generateMetadata({ params }: Props) {
  return { title: `Disputa ${params.id} — SecureGuard Admin` };
}

export default function DisputaDetailPage({ params }: Props) {
  return <DisputeTimeline disputeId={params.id} />;
}
