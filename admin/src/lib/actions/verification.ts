'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase';

export async function approveAgent(agentId: string) {
  const db = createAdminClient();
  const now = new Date().toISOString();

  await db
    .from('agent_verification_queue')
    .update({ estado: 'APROBADO', updated_at: now })
    .eq('agent_id', agentId);

  await db
    .from('agent_profiles')
    .update({ status: 'verified' })
    .eq('id', agentId);

  revalidatePath('/verificacion');
}

export async function rejectAgent(agentId: string, reason: string) {
  const db = createAdminClient();
  const now = new Date().toISOString();

  await db
    .from('agent_verification_queue')
    .update({ estado: 'RECHAZADO', motivo_rechazo: reason, updated_at: now })
    .eq('agent_id', agentId);

  await db
    .from('agent_profiles')
    .update({ status: 'rejected' })
    .eq('id', agentId);

  revalidatePath('/verificacion');
}

export async function markAgentSuspicious(agentId: string) {
  const db = createAdminClient();
  const now = new Date().toISOString();

  await db
    .from('agent_verification_queue')
    .update({ estado: 'SOSPECHOSO', updated_at: now })
    .eq('agent_id', agentId);

  revalidatePath('/verificacion');
}
