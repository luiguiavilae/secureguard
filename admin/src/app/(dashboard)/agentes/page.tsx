import { getAgentesVerificados } from '@/lib/queries/agentes';
import AgentesClient from './AgentesClient';

export const dynamic = 'force-dynamic';

export default async function AgentesPage() {
  const agentes = await getAgentesVerificados();
  return <AgentesClient agentes={agentes} />;
}
