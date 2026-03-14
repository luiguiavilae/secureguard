import React from 'react';
import { DisputeList } from '@/components/disputas/DisputeList';

export const metadata = { title: 'Disputas — SecureGuard Admin' };

export default function DisputasPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Disputas</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Gestiona y resuelve disputas entre clientes y agentes
        </p>
      </div>
      <DisputeList />
    </div>
  );
}
