// TODO: Página lista de disputas — filtrar por estado, asignar a admin, ver timeline
import React from 'react';
import { DisputeList } from '@/components/disputas/DisputeList';

export const metadata = { title: 'Disputas — SecureGuard Admin' };

export default function DisputasPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Disputas</h1>
      <DisputeList />
    </div>
  );
}
