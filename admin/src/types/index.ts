// TODO: Tipos TypeScript compartidos para el panel admin

export type UserRole = 'client' | 'agent' | 'admin';

export type AgentStatus = 'pending' | 'verified' | 'rejected' | 'suspended';

export type ServiceStatus =
  | 'pending'
  | 'accepted'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'closed';

export type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'refunded' | 'failed';

export interface Agent {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  status: AgentStatus;
  rating_avg: number;
  rating_count: number;
  sucamec_number: string;
  sucamec_expiry: string;
  districts: string[];
  hourly_rate: number;
  created_at: string;
}

export interface ServiceRequest {
  id: string;
  client_id: string;
  agent_id: string | null;
  type: string;
  status: ServiceStatus;
  district: string;
  scheduled_at: string;
  duration_hours: number;
  total_amount: number;
  platform_fee: number;
  agent_payout: number;
  briefing: string;
  created_at: string;
}

export interface Dispute {
  id: string;
  service_id: string;
  reporter_id: string;
  status: DisputeStatus;
  reason: string;
  resolution: string | null;
  created_at: string;
}
