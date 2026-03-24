import { getMetricas } from '@/lib/queries/metricas';
import MetricasClient from './MetricasClient';

export const dynamic = 'force-dynamic';

export default async function MetricasPage() {
  const { metricas, servicios } = await getMetricas();
  return <MetricasClient metricas={metricas} servicios={servicios} />;
}
