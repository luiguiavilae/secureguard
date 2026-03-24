import { getTransacciones, getPayoutsPendientes } from '@/lib/queries/finanzas';
import FinanzasClient from './FinanzasClient';

export const dynamic = 'force-dynamic';

export default async function FinanzasPage() {
  const [transacciones, payouts] = await Promise.all([
    getTransacciones(),
    getPayoutsPendientes(),
  ]);
  return <FinanzasClient transacciones={transacciones} payouts={payouts} />;
}
