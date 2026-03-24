import { Suspense } from 'react';
import { getVerificationQueue } from '@/lib/queries/verificacion';
import VerificacionContent from './VerificacionContent';

export const dynamic = 'force-dynamic';

export default async function VerificacionPage() {
  const { agentes, stats } = await getVerificationQueue();

  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-gray-400">Cargando cola de verificación…</p>
        </div>
      }
    >
      <VerificacionContent initialAgentes={agentes} initialStats={stats} />
    </Suspense>
  );
}
