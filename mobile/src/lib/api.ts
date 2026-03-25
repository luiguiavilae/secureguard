import { Platform } from 'react-native';
import type {
  AgentDayStats,
  AgentListItem,
  AgentProfile,
  AgentProfileResponse,
  AgentRegisterResponse,
  ApiResult,
  CancelResponse,
  ChatMessage,
  DocumentUploadResponse,
  EarlyCompleteResponse,
  ReviewRequest,
  ReviewResponse,
  SendOtpResponse,
  ServiceRequest,
  ServiceResponse,
  SosResponse,
  UserTipo,
  VerifyOtpResponse,
} from '../types';

function resolveBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }
  if (__DEV__) {
    return Platform.OS === 'android'
      ? 'http://10.0.2.2:8001'
      : 'http://localhost:8001';
  }
  return 'http://localhost:8001';
}

const BASE_URL = resolveBaseUrl();

// ── Core fetch wrapper ─────────────────────────────────────────
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string,
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }

    if (!response.ok) {
      const detail =
        parsed && typeof parsed === 'object' && 'detail' in parsed
          ? String((parsed as { detail: unknown }).detail)
          : `Error ${response.status}`;
      return { data: null, error: detail };
    }

    return { data: parsed as T, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error de red';
    return { data: null, error: message };
  }
}

// ── Multipart fetch (para upload de archivos) ─────────────────
async function apiFetchMultipart<T>(
  endpoint: string,
  formData: FormData,
  token: string,
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // No poner Content-Type: fetch lo pone automáticamente con boundary
      },
      body: formData,
    });

    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }

    if (!response.ok) {
      const detail =
        parsed && typeof parsed === 'object' && 'detail' in parsed
          ? String((parsed as { detail: unknown }).detail)
          : `Error ${response.status}`;
      return { data: null, error: detail };
    }

    return { data: parsed as T, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error de red';
    return { data: null, error: message };
  }
}

// ── Auth ──────────────────────────────────────────────────────
export function sendOtp(phone: string): Promise<ApiResult<SendOtpResponse>> {
  return apiFetch<SendOtpResponse>('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export function verifyOtp(
  phone: string,
  otp: string,
  tipo: UserTipo,
): Promise<ApiResult<VerifyOtpResponse>> {
  return apiFetch<VerifyOtpResponse>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, otp, tipo }),
  });
}

// ── Agentes ───────────────────────────────────────────────────
export function registerAgent(
  data: AgentProfile,
  token: string,
): Promise<ApiResult<AgentRegisterResponse>> {
  return apiFetch<AgentRegisterResponse>(
    '/agents/register',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token,
  );
}

export function uploadDocument(
  agentId: string,
  file: { uri: string; name: string; type: string },
  tipo: string,
  token: string,
): Promise<ApiResult<DocumentUploadResponse>> {
  const formData = new FormData();
  formData.append('tipo', tipo);
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);

  return apiFetchMultipart<DocumentUploadResponse>(
    `/agents/${agentId}/documents`,
    formData,
    token,
  );
}

export function getAgentProfile(
  agentId: string,
  token: string,
): Promise<ApiResult<AgentProfileResponse>> {
  return apiFetch<AgentProfileResponse>(
    `/agents/${agentId}/profile`,
    { method: 'GET' },
    token,
  );
}

export function updateAgentAvailability(
  agentId: string,
  disponible: boolean,
  token: string,
): Promise<ApiResult<{ disponible: boolean }>> {
  return apiFetch<{ disponible: boolean }>(
    `/agents/${agentId}/availability`,
    {
      method: 'PATCH',
      body: JSON.stringify({ disponible }),
    },
    token,
  );
}

export function getAgentDayStats(
  agentId: string,
  token: string,
): Promise<ApiResult<AgentDayStats>> {
  return apiFetch<AgentDayStats>(
    `/agents/${agentId}/stats/day`,
    { method: 'GET' },
    token,
  );
}

// ── Servicios ─────────────────────────────────────────────────
export function createService(
  data: ServiceRequest,
  token: string,
): Promise<ApiResult<ServiceResponse>> {
  return apiFetch<ServiceResponse>(
    '/services/',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token,
  );
}

export function getMyActiveServices(
  token: string,
): Promise<ApiResult<ServiceResponse[]>> {
  return apiFetch<ServiceResponse[]>(
    '/services/my-active',
    { method: 'GET' },
    token,
  );
}

export function getMyRecentServices(
  token: string,
): Promise<ApiResult<ServiceResponse[]>> {
  return apiFetch<ServiceResponse[]>(
    '/services/my-recent',
    { method: 'GET' },
    token,
  );
}

export function getServiceById(
  serviceId: string,
  token: string,
): Promise<ApiResult<ServiceResponse>> {
  return apiFetch<ServiceResponse>(
    `/services/${serviceId}`,
    { method: 'GET' },
    token,
  );
}

export function getOpenRequests(
  token: string,
): Promise<ApiResult<ServiceResponse[]>> {
  return apiFetch<ServiceResponse[]>(
    '/services/open-requests',
    { method: 'GET' },
    token,
  );
}

// ── Agentes para un servicio ──────────────────────────────────
export function getAgentsForService(
  serviceId: string,
  token: string,
): Promise<ApiResult<AgentListItem[]>> {
  return apiFetch<AgentListItem[]>(
    `/services/${serviceId}/agents`,
    { method: 'GET' },
    token,
  );
}

export function selectAgent(
  serviceId: string,
  agentId: string,
  token: string,
): Promise<ApiResult<ServiceResponse>> {
  return apiFetch<ServiceResponse>(
    `/services/${serviceId}/select-agent`,
    {
      method: 'POST',
      body: JSON.stringify({ agent_id: agentId }),
    },
    token,
  );
}

// ── Respuesta del agente a solicitud ─────────────────────────
export function agentRespond(
  serviceId: string,
  accion: 'ACEPTAR' | 'IGNORAR',
  token: string,
): Promise<ApiResult<ServiceResponse>> {
  return apiFetch<ServiceResponse>(
    `/services/${serviceId}/agent-respond`,
    {
      method: 'POST',
      body: JSON.stringify({ accion }),
    },
    token,
  );
}

// ── Ciclo de vida del servicio ────────────────────────────────
export function startService(
  serviceId: string,
  token: string,
): Promise<ApiResult<ServiceResponse>> {
  return apiFetch<ServiceResponse>(
    `/services/${serviceId}/start`,
    { method: 'POST' },
    token,
  );
}

export function completeService(
  serviceId: string,
  reporte: string,
  token: string,
): Promise<ApiResult<ServiceResponse>> {
  return apiFetch<ServiceResponse>(
    `/services/${serviceId}/complete`,
    {
      method: 'POST',
      body: JSON.stringify({ reporte }),
    },
    token,
  );
}

// ── Cancelación / Finalización anticipada ─────────────────────
export function cancelService(
  serviceId: string,
  motivo: string,
  token: string,
): Promise<ApiResult<CancelResponse>> {
  return apiFetch<CancelResponse>(
    `/services/${serviceId}/cancel`,
    {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    },
    token,
  );
}

export function earlyCompleteService(
  serviceId: string,
  token: string,
): Promise<ApiResult<EarlyCompleteResponse>> {
  return apiFetch<EarlyCompleteResponse>(
    `/services/${serviceId}/early-complete`,
    { method: 'POST' },
    token,
  );
}

// ── SOS ───────────────────────────────────────────────────────
export function sendSos(
  serviceId: string,
  token: string,
): Promise<ApiResult<SosResponse>> {
  return apiFetch<SosResponse>(
    `/services/${serviceId}/sos`,
    { method: 'POST' },
    token,
  );
}

// ── Chat ──────────────────────────────────────────────────────
export function getMessages(
  serviceId: string,
  token: string,
): Promise<ApiResult<ChatMessage[]>> {
  return apiFetch<ChatMessage[]>(
    `/services/${serviceId}/messages`,
    { method: 'GET' },
    token,
  );
}

export function sendMessage(
  serviceId: string,
  texto: string,
  token: string,
): Promise<ApiResult<ChatMessage>> {
  return apiFetch<ChatMessage>(
    `/services/${serviceId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({ texto }),
    },
    token,
  );
}

// ── Reviews ───────────────────────────────────────────────────
export function submitReview(
  serviceId: string,
  data: ReviewRequest,
  token: string,
): Promise<ApiResult<ReviewResponse>> {
  return apiFetch<ReviewResponse>(
    `/services/${serviceId}/review`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token,
  );
}
