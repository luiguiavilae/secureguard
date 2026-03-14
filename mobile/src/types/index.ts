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
  nombre?: string;
  estado_verificacion: EstadoVerificacion;
  distritos: string[];
  tipos_servicio: string[];
  horario_inicio: string | null;
  horario_fin: string | null;
  presentaciones: string[];
  genero: string | null;
  en_servicio: boolean;
  disponible?: boolean;
  score: number;
  nivel: number;
  rating_avg: number;
  rating_count: number;
  rating_puntualidad?: number;
  rating_trato?: number;
  rating_seguridad?: number;
  rating_presentacion?: number;
  puntualidad_pct?: number;
  completed_services: number;
  documentos: AgentDocument[];
  badges: AgentBadge[];
  motivo?: string;
  mensaje?: string;
}

export interface AgentDocument {
  tipo: string;
  url: string;
  estado: string;
  created_at: string;
}

export interface AgentBadge {
  id: string;
  nombre: string;
  icono: string;
  descripcion?: string;
}

// ── Agente en lista ───────────────────────────────────────────
export interface AgentListItem {
  agent_id: string;
  user_id: string;
  nombre: string;
  score: number;
  nivel: number;
  rating_avg: number;
  rating_count: number;
  tipos_servicio: string[];
  presentaciones: string[];
  badges: AgentBadge[];
  completed_services: number;
  puntualidad_pct: number;
}

// ── Servicios ─────────────────────────────────────────────────
export type EstadoServicio =
  | 'ABIERTO'
  | 'EN_REVISION'
  | 'CONFIRMADO'
  | 'CONFIRMADO_PAGADO'
  | 'EN_CURSO'
  | 'COMPLETADO'
  | 'CANCELADO';

export type Modalidad = 'fijo' | 'trayecto';
export type TipoLugar =
  | 'domicilio'
  | 'bar_restaurante'
  | 'evento_publico'
  | 'espacio_publico'
  | 'otro';
export type NivelRiesgo = 'bajo' | 'medio' | 'alto';
export type Visibilidad = 'visible' | 'discreto';

export interface ServiceRequest {
  descripcion: string;
  distrito: string;
  tipo_servicio: string;
  agentes_requeridos: number;
  duracion_horas: number;
  fecha_inicio_solicitada: string; // ISO datetime
  // Campos extendidos fase 1 parte 4
  para_tercero?: boolean;
  tercero_nombre?: string;
  tercero_dni?: string;
  tercero_genero?: string;
  tercero_relacion?: string;
  modalidad?: Modalidad;
  punto_inicio?: string;
  paradas?: string[];
  punto_fin?: string;
  transporte?: string;
  tipo_lugar?: TipoLugar;
  consumo_alcohol?: boolean;
  nivel_riesgo?: NivelRiesgo;
  condicion_especial?: string;
  presentacion?: Presentacion;
  visibilidad?: Visibilidad;
  instrucciones?: string;
}

export interface ServiceResponse {
  id: string;
  estado: EstadoServicio;
  descripcion: string;
  distrito: string;
  tipo_servicio: string;
  duracion_horas: number;
  fecha_inicio_solicitada: string;
  precio_total: number;
  created_at: string;
  // Campos opcionales enriquecidos
  agente?: AgentListItem;
  modalidad?: Modalidad;
  tipo_lugar?: TipoLugar;
  nivel_riesgo?: NivelRiesgo;
  presentacion?: Presentacion;
  visibilidad?: Visibilidad;
  instrucciones?: string;
  fecha_inicio_real?: string;
}

// ── Chat ──────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  service_id: string;
  sender_id: string;
  sender_tipo: UserTipo;
  texto: string;
  bloqueado: boolean;
  created_at: string;
}

// ── Review ────────────────────────────────────────────────────
export interface ReviewRequest {
  rating_general: number;
  rating_puntualidad: number;
  rating_trato: number;
  rating_seguridad: number;
  rating_presentacion: number;
  comentario?: string;
}

export interface ReviewResponse {
  review_id: string;
  service_id: string;
  estado: string;
}

// ── Stats agente ──────────────────────────────────────────────
export interface AgentDayStats {
  servicios_completados: number;
  ingresos: number;
  solicitudes_abiertas: number;
}

// ── SOS ───────────────────────────────────────────────────────
export interface SosResponse {
  sos_id: string;
  estado: string;
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
  AgentProfile: { agentId: string; serviceId: string };
  ActiveService: { serviceId: string };
  Chat: { serviceId: string; interlocutorNombre: string };
  Review: { serviceId: string; agentNombre: string };
};

export type AgentStackParamList = {
  AgentHome: undefined;
  OpenRequests: undefined;
  ActiveService: { serviceId: string };
  Chat: { serviceId: string; interlocutorNombre: string };
  Reviews: undefined;
};
