import { getClientes } from '@/lib/queries/clientes';
import ClientesClient from './ClientesClient';

export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
  const clientes = await getClientes();
  return <ClientesClient clientes={clientes} />;
}
