// ── Auth ──────────────────────────────────────────────────────
export type UserTipo = 'CLIENTE' | 'AGENTE';

export interface SendOtpResponse {
  message: string;
  expires_in: number;
}

export interface VerifyOtpResponse {
  access_token: string;
  user_id: string;
  tipo: UserTipo;
  is_new_user: boolean;
}

// ── Agente ────────────────────────────────────────────────────
export type TipoServicio =
  | 'acompañamiento'
  | 'eventos'
  | 'residencial'
  | 'escolta'
  | 'custodia'
  | 'trayecto';

export type Presentacion = 'uniforme' | 'formal' | 'casual';

export type Genero = 'M' | 'F';

export interface AgentProfile {
  distritos: string[];
  tipos_servicio: TipoServicio[];
  horario_inicio: string; // HH:MM
  horario_fin: string; // HH:MM
  presentaciones: Presentacion[];
  genero: Genero;
}

export interface AgentRegisterResponse {
  agent_id: string;
  estado: string;
}

export type DocTipo = 'DNI_FRENTE' | 'DNI_REVERSO' | 'SELFIE';

export interface DocumentUploadResponse {
  document_id: string;
  url: string;
  tipo: string;
  estado: string;
}

export type EstadoVerificacion =
  | 'EN_REVISION'
  | 'ACTIVO'
  | 'RECHAZADO'
  | 'PENDIENTE_INFO'
  | 'SIN_REGISTRO';

export interface AgentProfileResponse {
  agent_id: string;
  user_id: string;
  estado_verificacion: EstadoVerificacion;
  distritos: string[];
  tipos_servicio: string[];
  horario_inicio: string | null;
  horario_fin: string | null;
  presentaciones: string[];
  genero: string | null;
  en_servicio: boolean;
  score: number;
  nivel: number;
  rating_avg: number;
  rating_count: number;
  completed_services: number;
  documentos: AgentDocument[];
  badges: string[];
  motivo?: string;
  mensaje?: string;
}

export interface AgentDocument {
  tipo: string;
  url: string;
  estado: string;
  created_at: string;
}

// ── Servicios ─────────────────────────────────────────────────
export interface ServiceRequest {
  descripcion: string;
  distrito: string;
  tipo_servicio: string;
  agentes_requeridos: number;
  duracion_horas: number;
  fecha_inicio_solicitada: string; // ISO datetime
}

export interface ServiceResponse {
  id: string;
  estado: string;
  descripcion: string;
  distrito: string;
  tipo_servicio: string;
  duracion_horas: number;
  fecha_inicio_solicitada: string;
  precio_total: number;
  created_at: string;
}

// ── API helpers ───────────────────────────────────────────────
export interface ApiResult<T> {
  data: T | null;
  error: string | null;
}

// ── Navigation param lists ────────────────────────────────────
export type AuthStackParamList = {
  Splash: undefined;
  PhoneInput: undefined;
  OTP: { phone: string };
  RoleSelect: undefined;
};

export type OnboardingStackParamList = {
  ProfileSetup: undefined;
  DocumentUpload: { agentId: string };
  PendingApproval: { agentId: string };
};

export type ClientStackParamList = {
  Home: undefined;
  CreateService: undefined;
  AgentList: { serviceId: string };
  AgentProfile: { agentId: string };
  ActiveService: { serviceId: string };
  Review: { serviceId: string };
};

export type AgentStackParamList = {
  AgentHome: undefined;
  OpenRequests: undefined;
  ActiveService: { serviceId: string };
  Reviews: undefined;
};
