// Mock data realista para Lima, Perú — SecureGuard Admin Panel

export type VerificacionEstado = 'EN_REVISION' | 'APROBADO' | 'RECHAZADO' | 'SOSPECHOSO';
export type ServiceStatus = 'PENDIENTE' | 'ACEPTADO' | 'EN_CURSO' | 'COMPLETADO' | 'CANCELADO' | 'DISPUTADO';
export type DisputaEstado = 'ABIERTA' | 'EN_REVISION' | 'RESUELTA' | 'CERRADA';

export interface MockAgente {
  id: string;
  nombre: string;
  dni: string;
  phone: string;
  email: string;
  distrito: string;
  created_at: string; // tiempo en cola desde esta fecha
  docs_subidos: number; // 0–3
  foto_url: string | null;
  estado: VerificacionEstado;
  sucamec_numero: string;
  fecha_nacimiento: string;
  aprobados_hoy?: boolean;
}

export interface MockServicio {
  id: string;
  tipo: string;
  estado: ServiceStatus;
  distrito: string;
  agente_nombre: string | null;
  cliente_nombre: string;
  hora_inicio: string;
  duracion_horas: number;
  monto: number;
}

export interface MockDisputa {
  id: string;
  servicio_id: string;
  reportante: string;
  reportado: string;
  motivo: string;
  estado: DisputaEstado;
  monto_en_disputa: number;
  created_at: string;
  descripcion: string;
}

export interface MockMetricas {
  servicios_activos: number;
  gmv_hoy: number;
  agentes_disponibles: number;
  solicitudes_abiertas: number;
  disputas_abiertas: number;
  tiempo_promedio_verificacion: number;
}

export interface HourlyData {
  hora: string;
  servicios: number;
}

export interface FeedEvent {
  id: string;
  tipo: 'servicio_creado' | 'agente_aprobado' | 'pago_liberado' | 'disputa_abierta' | 'servicio_completado' | 'agente_rechazado';
  descripcion: string;
  tiempo: string;
}

// ─── Agentes en cola de verificación ─────────────────────────────────────────

const now = new Date('2026-03-14T08:00:00.000Z');
const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();

export const mockAgentesVerificacion: MockAgente[] = [
  {
    id: 'agente-001',
    nombre: 'Carlos Mendoza Quispe',
    dni: '47392018',
    phone: '+51 987 654 321',
    email: 'carlos.mendoza@gmail.com',
    distrito: 'Miraflores',
    created_at: hoursAgo(2),
    docs_subidos: 2,
    foto_url: null,
    estado: 'EN_REVISION',
    sucamec_numero: 'LIC-2024-04821',
    fecha_nacimiento: '15/03/1990',
  },
  {
    id: 'agente-002',
    nombre: 'Jorge Huamán Flores',
    dni: '42891034',
    phone: '+51 976 543 210',
    email: 'jorge.huaman@hotmail.com',
    distrito: 'San Isidro',
    created_at: hoursAgo(27),
    docs_subidos: 3,
    foto_url: null,
    estado: 'EN_REVISION',
    sucamec_numero: 'LIC-2023-08312',
    fecha_nacimiento: '22/07/1985',
  },
  {
    id: 'agente-003',
    nombre: 'Luis Paredes Vega',
    dni: '48201345',
    phone: '+51 945 678 901',
    email: 'luis.paredes@gmail.com',
    distrito: 'Santiago de Surco',
    created_at: hoursAgo(1),
    docs_subidos: 1,
    foto_url: null,
    estado: 'EN_REVISION',
    sucamec_numero: 'LIC-2024-06109',
    fecha_nacimiento: '08/11/1993',
  },
  {
    id: 'agente-004',
    nombre: 'Miguel Torres Cruz',
    dni: '45678901',
    phone: '+51 963 210 987',
    email: 'm.torres.cruz@yahoo.com',
    distrito: 'Jesús María',
    created_at: hoursAgo(31),
    docs_subidos: 0,
    foto_url: null,
    estado: 'EN_REVISION',
    sucamec_numero: '',
    fecha_nacimiento: '30/01/1988',
  },
  {
    id: 'agente-005',
    nombre: 'Roberto Mamani Coila',
    dni: '43210987',
    phone: '+51 921 345 678',
    email: 'roberto.mamani@gmail.com',
    distrito: 'La Molina',
    created_at: hoursAgo(5),
    docs_subidos: 2,
    foto_url: null,
    estado: 'EN_REVISION',
    sucamec_numero: 'LIC-2024-03740',
    fecha_nacimiento: '14/06/1991',
  },
];

// ─── Servicios mock ───────────────────────────────────────────────────────────

export const mockServicios: MockServicio[] = [
  {
    id: 'SRV-001',
    tipo: 'Seguridad residencial',
    estado: 'EN_CURSO',
    distrito: 'Miraflores',
    agente_nombre: 'Pedro Sánchez López',
    cliente_nombre: 'Ana García Torres',
    hora_inicio: hoursAgo(2),
    duracion_horas: 8,
    monto: 480.0,
  },
  {
    id: 'SRV-002',
    tipo: 'Evento privado',
    estado: 'EN_CURSO',
    distrito: 'San Isidro',
    agente_nombre: 'José Quispe Mamani',
    cliente_nombre: 'Banco Continental SAC',
    hora_inicio: hoursAgo(1),
    duracion_horas: 12,
    monto: 840.0,
  },
  {
    id: 'SRV-003',
    tipo: 'Protección personal',
    estado: 'EN_CURSO',
    distrito: 'Barranco',
    agente_nombre: 'Antonio Flores Ríos',
    cliente_nombre: 'Ricardo Vega Palomino',
    hora_inicio: hoursAgo(3),
    duracion_horas: 6,
    monto: 390.0,
  },
  {
    id: 'SRV-004',
    tipo: 'Seguridad corporativa',
    estado: 'PENDIENTE',
    distrito: 'La Molina',
    agente_nombre: null,
    cliente_nombre: 'Tech Solutions Perú',
    hora_inicio: hoursAgo(-2),
    duracion_horas: 10,
    monto: 700.0,
  },
  {
    id: 'SRV-005',
    tipo: 'Seguridad residencial',
    estado: 'COMPLETADO',
    distrito: 'Surco',
    agente_nombre: 'Marco Lazo Herrera',
    cliente_nombre: 'Patricia Quispe López',
    hora_inicio: hoursAgo(10),
    duracion_horas: 8,
    monto: 480.0,
  },
  {
    id: 'SRV-006',
    tipo: 'Evento privado',
    estado: 'COMPLETADO',
    distrito: 'Miraflores',
    agente_nombre: 'Raúl Condori Puma',
    cliente_nombre: 'Consultora Andina SAC',
    hora_inicio: hoursAgo(8),
    duracion_horas: 6,
    monto: 390.0,
  },
  {
    id: 'SRV-007',
    tipo: 'Protección personal',
    estado: 'EN_CURSO',
    distrito: 'San Borja',
    agente_nombre: 'Luis Ccama Huanca',
    cliente_nombre: 'Fernando Díaz Roca',
    hora_inicio: hoursAgo(1),
    duracion_horas: 4,
    monto: 260.0,
  },
  {
    id: 'SRV-008',
    tipo: 'Seguridad residencial',
    estado: 'CANCELADO',
    distrito: 'Jesús María',
    agente_nombre: null,
    cliente_nombre: 'Mónica Lara Espinoza',
    hora_inicio: hoursAgo(5),
    duracion_horas: 8,
    monto: 480.0,
  },
  {
    id: 'SRV-009',
    tipo: 'Seguridad corporativa',
    estado: 'EN_CURSO',
    distrito: 'San Isidro',
    agente_nombre: 'Hugo Benites Tapia',
    cliente_nombre: 'Grupo Romero SA',
    hora_inicio: hoursAgo(4),
    duracion_horas: 12,
    monto: 960.0,
  },
  {
    id: 'SRV-010',
    tipo: 'Evento privado',
    estado: 'DISPUTADO',
    distrito: 'Chorrillos',
    agente_nombre: 'Ernesto Vidal Cruz',
    cliente_nombre: 'Municipalidad de Chorrillos',
    hora_inicio: hoursAgo(24),
    duracion_horas: 8,
    monto: 520.0,
  },
];

// ─── Disputas mock ────────────────────────────────────────────────────────────

export const mockDisputas: MockDisputa[] = [
  {
    id: 'DIS-001',
    servicio_id: 'SRV-010',
    reportante: 'Municipalidad de Chorrillos',
    reportado: 'Ernesto Vidal Cruz',
    motivo: 'Agente llegó 2 horas tarde y abandonó el puesto antes de terminar',
    estado: 'ABIERTA',
    monto_en_disputa: 520.0,
    created_at: hoursAgo(3),
    descripcion: 'El cliente reporta que el agente llegó con 2 horas de retraso y se retiró antes del horario pactado.',
  },
  {
    id: 'DIS-002',
    servicio_id: 'SRV-005',
    reportante: 'Patricia Quispe López',
    reportado: 'Marco Lazo Herrera',
    motivo: 'Comportamiento inapropiado con personal del hogar',
    estado: 'EN_REVISION',
    monto_en_disputa: 480.0,
    created_at: hoursAgo(6),
    descripcion: 'La clienta reporta conducta inapropiada y falta de respeto hacia el personal doméstico.',
  },
  {
    id: 'DIS-003',
    servicio_id: 'SRV-006',
    reportante: 'Consultora Andina SAC',
    reportado: 'Raúl Condori Puma',
    motivo: 'Servicio incompleto — agente durmió durante guardia nocturna',
    estado: 'ABIERTA',
    monto_en_disputa: 195.0,
    created_at: hoursAgo(12),
    descripcion: 'Cámaras de seguridad del cliente evidencian al agente dormido durante 3 horas consecutivas.',
  },
  {
    id: 'DIS-004',
    servicio_id: 'SRV-003',
    reportante: 'Antonio Flores Ríos',
    reportado: 'Ricardo Vega Palomino',
    motivo: 'Cliente no realizó el pago acordado fuera de plataforma',
    estado: 'ABIERTA',
    monto_en_disputa: 390.0,
    created_at: hoursAgo(1),
    descripcion: 'El agente reporta que el cliente le solicitó servicio adicional con promesa de pago externo que no se realizó.',
  },
  {
    id: 'DIS-005',
    servicio_id: 'SRV-002',
    reportante: 'Banco Continental SAC',
    reportado: 'José Quispe Mamani',
    motivo: 'Agente no tenía los documentos de identificación requeridos',
    estado: 'EN_REVISION',
    monto_en_disputa: 420.0,
    created_at: hoursAgo(9),
    descripcion: 'El cliente (banco) indica que el agente no portaba documentos de identificación exigidos por sus protocolos internos.',
  },
];

// ─── Métricas del día ─────────────────────────────────────────────────────────

export const mockMetricas: MockMetricas = {
  servicios_activos: 8,
  gmv_hoy: 4250.0,
  agentes_disponibles: 23,
  solicitudes_abiertas: 12,
  disputas_abiertas: 5,
  tiempo_promedio_verificacion: 47,
};

// ─── Servicios por hora (últimas 24h) ─────────────────────────────────────────

export const mockHourlyData: HourlyData[] = [
  { hora: '00:00', servicios: 2 },
  { hora: '01:00', servicios: 1 },
  { hora: '02:00', servicios: 1 },
  { hora: '03:00', servicios: 0 },
  { hora: '04:00', servicios: 0 },
  { hora: '05:00', servicios: 1 },
  { hora: '06:00', servicios: 2 },
  { hora: '07:00', servicios: 4 },
  { hora: '08:00', servicios: 7 },
  { hora: '09:00', servicios: 9 },
  { hora: '10:00', servicios: 8 },
  { hora: '11:00', servicios: 11 },
  { hora: '12:00', servicios: 6 },
  { hora: '13:00', servicios: 5 },
  { hora: '14:00', servicios: 8 },
  { hora: '15:00', servicios: 10 },
  { hora: '16:00', servicios: 12 },
  { hora: '17:00', servicios: 9 },
  { hora: '18:00', servicios: 7 },
  { hora: '19:00', servicios: 5 },
  { hora: '20:00', servicios: 4 },
  { hora: '21:00', servicios: 3 },
  { hora: '22:00', servicios: 3 },
  { hora: '23:00', servicios: 2 },
];

// ─── Feed de actividad reciente ───────────────────────────────────────────────

export const mockFeedEvents: FeedEvent[] = [
  {
    id: 'evt-001',
    tipo: 'servicio_creado',
    descripcion: 'Tech Solutions Perú creó solicitud de seguridad corporativa en La Molina',
    tiempo: hoursAgo(0.1),
  },
  {
    id: 'evt-002',
    tipo: 'pago_liberado',
    descripcion: 'Pago de S/ 384.00 liberado a Marco Lazo Herrera por SRV-005',
    tiempo: hoursAgo(0.3),
  },
  {
    id: 'evt-003',
    tipo: 'servicio_completado',
    descripcion: 'Servicio SRV-006 completado — Consultora Andina SAC · Miraflores',
    tiempo: hoursAgo(0.5),
  },
  {
    id: 'evt-004',
    tipo: 'disputa_abierta',
    descripcion: 'Nueva disputa DIS-004 abierta por agente Antonio Flores Ríos',
    tiempo: hoursAgo(1),
  },
  {
    id: 'evt-005',
    tipo: 'agente_aprobado',
    descripcion: 'Agente Raúl Condori Puma verificado y habilitado en plataforma',
    tiempo: hoursAgo(1.5),
  },
  {
    id: 'evt-006',
    tipo: 'servicio_creado',
    descripcion: 'Fernando Díaz Roca solicitó protección personal en San Borja',
    tiempo: hoursAgo(2),
  },
  {
    id: 'evt-007',
    tipo: 'pago_liberado',
    descripcion: 'Pago de S/ 768.00 liberado a Pedro Sánchez López por SRV-001',
    tiempo: hoursAgo(2.5),
  },
  {
    id: 'evt-008',
    tipo: 'agente_rechazado',
    descripcion: 'Solicitud de verificación rechazada — Documento vencido (agente anónimo)',
    tiempo: hoursAgo(3),
  },
  {
    id: 'evt-009',
    tipo: 'disputa_abierta',
    descripcion: 'Nueva disputa DIS-003 abierta — Consultora Andina SAC reporta a Raúl Condori',
    tiempo: hoursAgo(3.5),
  },
  {
    id: 'evt-010',
    tipo: 'servicio_creado',
    descripcion: 'Grupo Romero SA solicitó seguridad corporativa en San Isidro',
    tiempo: hoursAgo(4),
  },
];

// ─── Estadísticas de verificación del día ─────────────────────────────────────

export interface VerificacionStats {
  pendientes: number;
  aprobados_hoy: number;
  rechazados_hoy: number;
}

export const mockVerificacionStats: VerificacionStats = {
  pendientes: 5,
  aprobados_hoy: 3,
  rechazados_hoy: 1,
};

// ─── Disputas — datos enriquecidos para vista de detalle ─────────────────────

export type DisputaTipo =
  | 'Incumplimiento de servicio'
  | 'Conducta inapropiada'
  | 'Servicio incompleto'
  | 'Pago no realizado'
  | 'Incumplimiento de requisitos';

export interface MockTimelineEvento {
  id: string;
  tipo: 'servicio' | 'disputa' | 'admin' | 'pago' | 'evidencia' | 'sistema';
  titulo: string;
  descripcion: string;
  tiempo: string;
  actor?: string;
}

export interface MockChatMensaje {
  id: string;
  autor: string;
  rol: 'cliente' | 'agente';
  mensaje: string;
  tiempo: string;
}

export interface MockParticipanteDisputa {
  nombre: string;
  rol: 'cliente' | 'agente';
  rating: number;
  total_servicios: number;
  disputas_previas: number;
  telefono: string;
  distrito: string;
}

export interface MockDisputaDetalle {
  id: string;
  tipo: DisputaTipo;
  sla_horas: number;
  timeline: MockTimelineEvento[];
  chat: MockChatMensaje[];
  cliente: MockParticipanteDisputa;
  agente: MockParticipanteDisputa;
  nota_interna: string;
}

export const mockDisputasDetalle: Record<string, MockDisputaDetalle> = {
  'DIS-001': {
    id: 'DIS-001',
    tipo: 'Incumplimiento de servicio',
    sla_horas: 72,
    cliente: { nombre: 'Municipalidad de Chorrillos', rol: 'cliente', rating: 4.2, total_servicios: 18, disputas_previas: 1, telefono: '+51 01 251-8800', distrito: 'Chorrillos' },
    agente: { nombre: 'Ernesto Vidal Cruz', rol: 'agente', rating: 3.8, total_servicios: 42, disputas_previas: 3, telefono: '+51 998 112 233', distrito: 'Chorrillos' },
    nota_interna: 'Agente con historial de 3 disputas previas. Revisar si corresponde suspensión preventiva tras resolución.',
    timeline: [
      { id: 't1', tipo: 'servicio', titulo: 'Servicio creado', descripcion: 'Municipalidad contrató guardia para evento público', tiempo: hoursAgo(28), actor: 'Sistema' },
      { id: 't2', tipo: 'servicio', titulo: 'Agente asignado', descripcion: 'Ernesto Vidal Cruz aceptó el servicio', tiempo: hoursAgo(26), actor: 'Ernesto Vidal Cruz' },
      { id: 't3', tipo: 'servicio', titulo: 'Check-in con retraso', descripcion: 'Llegada registrada 2h 15min tarde (previsto 08:00, real 10:15)', tiempo: hoursAgo(24), actor: 'Sistema GPS' },
      { id: 't4', tipo: 'servicio', titulo: 'Abandono anticipado', descripcion: 'Check-out 1h 30min antes de la hora pactada de finalización', tiempo: hoursAgo(18), actor: 'Sistema GPS' },
      { id: 't5', tipo: 'disputa', titulo: 'Disputa abierta', descripcion: 'Cliente abrió disputa por llegada tardía y abandono del puesto', tiempo: hoursAgo(3), actor: 'Municipalidad de Chorrillos' },
      { id: 't6', tipo: 'sistema', titulo: 'Pago retenido', descripcion: 'S/ 520.00 retenido hasta resolución de disputa', tiempo: hoursAgo(3), actor: 'Sistema' },
      { id: 't7', tipo: 'admin', titulo: 'Caso asignado', descripcion: 'Asignado a equipo de soporte para revisión', tiempo: hoursAgo(2.5), actor: 'Admin Principal' },
    ],
    chat: [
      { id: 'c1', autor: 'Municipalidad de Chorrillos', rol: 'cliente', mensaje: 'El agente llegó más de 2 horas tarde al evento. El servicio era de 08:00 a 16:00 y llegó a las 10:15.', tiempo: hoursAgo(3) },
      { id: 'c2', autor: 'Ernesto Vidal Cruz', rol: 'agente', mensaje: 'Tuve un problema de transporte, el accidente en la Panamericana Sur generó tráfico por más de 2 horas.', tiempo: hoursAgo(2.8) },
      { id: 'c3', autor: 'Municipalidad de Chorrillos', rol: 'cliente', mensaje: 'Además se fue a las 14:30, una hora y media antes de terminar. No nos avisó ni dejó reemplazo.', tiempo: hoursAgo(2.5) },
      { id: 'c4', autor: 'Ernesto Vidal Cruz', rol: 'agente', mensaje: 'Tenía otra responsabilidad urgente. Asumí que el evento ya estaba por terminar.', tiempo: hoursAgo(2.2) },
      { id: 'c5', autor: 'Municipalidad de Chorrillos', rol: 'cliente', mensaje: 'El contrato estipula 08:00–16:00. Exigimos reembolso del 60% por las horas no cubiertas.', tiempo: hoursAgo(2) },
    ],
  },
  'DIS-002': {
    id: 'DIS-002',
    tipo: 'Conducta inapropiada',
    sla_horas: 48,
    cliente: { nombre: 'Patricia Quispe López', rol: 'cliente', rating: 4.7, total_servicios: 7, disputas_previas: 0, telefono: '+51 987 345 678', distrito: 'Surco' },
    agente: { nombre: 'Marco Lazo Herrera', rol: 'agente', rating: 4.1, total_servicios: 89, disputas_previas: 1, telefono: '+51 944 221 998', distrito: 'Surco' },
    nota_interna: 'Primera denuncia de conducta inapropiada para este agente. Solicitar declaración del personal del hogar como testigo.',
    timeline: [
      { id: 't1', tipo: 'servicio', titulo: 'Servicio completado', descripcion: 'Guardia residencial en Surco — 8 horas completadas', tiempo: hoursAgo(12), actor: 'Sistema' },
      { id: 't2', tipo: 'pago', titulo: 'Pago en escrow', descripcion: 'S/ 480.00 retenido pendiente de calificación', tiempo: hoursAgo(12), actor: 'Sistema' },
      { id: 't3', tipo: 'disputa', titulo: 'Disputa abierta', descripcion: 'Patricia Quispe reportó comportamiento inapropiado durante el servicio', tiempo: hoursAgo(6), actor: 'Patricia Quispe López' },
      { id: 't4', tipo: 'evidencia', titulo: 'Evidencia adjuntada', descripcion: 'Cliente subió 2 capturas de chat con comentarios ofensivos del agente', tiempo: hoursAgo(5.5), actor: 'Patricia Quispe López' },
      { id: 't5', tipo: 'sistema', titulo: 'Liberación suspendida', descripcion: 'Pago congelado hasta resolución de disputa', tiempo: hoursAgo(5.5), actor: 'Sistema' },
      { id: 't6', tipo: 'admin', titulo: 'Caso en revisión', descripcion: 'Admin solicitó descargos al agente con plazo de 24 horas', tiempo: hoursAgo(4), actor: 'Admin Principal' },
    ],
    chat: [
      { id: 'c1', autor: 'Patricia Quispe López', rol: 'cliente', mensaje: 'El agente hizo comentarios muy inapropiados hacia mi empleada del hogar durante la guardia.', tiempo: hoursAgo(6) },
      { id: 'c2', autor: 'Marco Lazo Herrera', rol: 'agente', mensaje: 'No entiendo a qué se refiere. Fui completamente profesional durante todo el servicio.', tiempo: hoursAgo(5.7) },
      { id: 'c3', autor: 'Patricia Quispe López', rol: 'cliente', mensaje: 'Tengo mensajes de texto que me envió mi empleada en tiempo real durante el servicio. Los adjunté como evidencia.', tiempo: hoursAgo(5.5) },
      { id: 'c4', autor: 'Marco Lazo Herrera', rol: 'agente', mensaje: 'Esos mensajes pueden estar fuera de contexto. Solo intenté hacer conversación de manera amigable.', tiempo: hoursAgo(5) },
      { id: 'c5', autor: 'Patricia Quispe López', rol: 'cliente', mensaje: 'No contratamos el servicio para que el agente hostigue a nuestra empleada. Pedimos reembolso total.', tiempo: hoursAgo(4.5) },
    ],
  },
  'DIS-003': {
    id: 'DIS-003',
    tipo: 'Servicio incompleto',
    sla_horas: 72,
    cliente: { nombre: 'Consultora Andina SAC', rol: 'cliente', rating: 4.5, total_servicios: 34, disputas_previas: 2, telefono: '+51 01 445-2211', distrito: 'Miraflores' },
    agente: { nombre: 'Raúl Condori Puma', rol: 'agente', rating: 3.5, total_servicios: 56, disputas_previas: 4, telefono: '+51 965 778 341', distrito: 'Miraflores' },
    nota_interna: 'Evidencia en video sólida. Agente con 4 disputas previas — evaluar suspensión definitiva tras resolución.',
    timeline: [
      { id: 't1', tipo: 'servicio', titulo: 'Servicio iniciado', descripcion: 'Guardia nocturna en Consultora Andina SAC — 6 horas', tiempo: hoursAgo(20), actor: 'Sistema' },
      { id: 't2', tipo: 'evidencia', titulo: 'Grabado por CCTV', descripcion: 'Cámaras registraron al agente durmiendo 3h consecutivas (23:00–02:00)', tiempo: hoursAgo(18), actor: 'CCTV Consultora Andina' },
      { id: 't3', tipo: 'servicio', titulo: 'Servicio marcado como completado', descripcion: 'Agente realizó check-out y marcó el servicio como terminado', tiempo: hoursAgo(14), actor: 'Sistema' },
      { id: 't4', tipo: 'disputa', titulo: 'Disputa abierta con evidencia', descripcion: 'Consultora adjuntó fragmento de video de 45 minutos y abrió disputa', tiempo: hoursAgo(12), actor: 'Consultora Andina SAC' },
      { id: 't5', tipo: 'sistema', titulo: 'Pago retenido', descripcion: 'S/ 390.00 retenido hasta resolución', tiempo: hoursAgo(12), actor: 'Sistema' },
    ],
    chat: [
      { id: 'c1', autor: 'Consultora Andina SAC', rol: 'cliente', mensaje: 'Nuestras cámaras captaron al agente durmiendo de 23:00 a 02:00. Tenemos el video completo (45 min).', tiempo: hoursAgo(12) },
      { id: 'c2', autor: 'Raúl Condori Puma', rol: 'agente', mensaje: 'Eso no es posible. Estuve activo toda la noche realizando rondas cada hora.', tiempo: hoursAgo(11.5) },
      { id: 'c3', autor: 'Consultora Andina SAC', rol: 'cliente', mensaje: 'El video es irrefutable. Muestra claramente al agente en una silla con los ojos cerrados durante más de 3 horas.', tiempo: hoursAgo(11) },
      { id: 'c4', autor: 'Raúl Condori Puma', rol: 'agente', mensaje: 'Quizás me senté a descansar unos minutos pero no dormí. El ángulo de la cámara puede ser engañoso.', tiempo: hoursAgo(10.5) },
      { id: 'c5', autor: 'Consultora Andina SAC', rol: 'cliente', mensaje: 'Exigimos reembolso del 50% mínimo. El servicio contratado fue guardia activa, no descanso nocturno.', tiempo: hoursAgo(10) },
    ],
  },
  'DIS-004': {
    id: 'DIS-004',
    tipo: 'Pago no realizado',
    sla_horas: 72,
    cliente: { nombre: 'Ricardo Vega Palomino', rol: 'cliente', rating: 3.9, total_servicios: 4, disputas_previas: 1, telefono: '+51 956 334 112', distrito: 'Barranco' },
    agente: { nombre: 'Antonio Flores Ríos', rol: 'agente', rating: 4.6, total_servicios: 103, disputas_previas: 0, telefono: '+51 971 882 556', distrito: 'Barranco' },
    nota_interna: 'Agente sin historial de disputas — alta credibilidad. Posible intento del cliente de eludir plataforma. Evaluar penalización.',
    timeline: [
      { id: 't1', tipo: 'servicio', titulo: 'Servicio iniciado', descripcion: 'Protección personal para evento privado en Barranco', tiempo: hoursAgo(5), actor: 'Sistema' },
      { id: 't2', tipo: 'servicio', titulo: 'Solicitud de horas extra', descripcion: 'Cliente solicitó 3 horas adicionales directamente al agente', tiempo: hoursAgo(4.5), actor: 'Ricardo Vega Palomino' },
      { id: 't3', tipo: 'servicio', titulo: 'Extensión acordada', descripcion: 'Agente aceptó extensión con promesa de S/ 180 en efectivo', tiempo: hoursAgo(4), actor: 'Antonio Flores Ríos' },
      { id: 't4', tipo: 'servicio', titulo: 'Servicio completado', descripcion: 'Servicio original + 3 horas extra completados', tiempo: hoursAgo(3.5), actor: 'Sistema' },
      { id: 't5', tipo: 'disputa', titulo: 'Disputa abierta por agente', descripcion: 'Antonio Flores reportó incumplimiento de pago de las horas extra', tiempo: hoursAgo(1), actor: 'Antonio Flores Ríos' },
    ],
    chat: [
      { id: 'c1', autor: 'Antonio Flores Ríos', rol: 'agente', mensaje: 'El cliente me pidió quedarme 3 horas más y prometió S/ 180 en efectivo. Al terminar se negó a pagar.', tiempo: hoursAgo(1) },
      { id: 'c2', autor: 'Ricardo Vega Palomino', rol: 'cliente', mensaje: 'Nunca prometí pago alguno. El agente interpretó mal una consulta informal.', tiempo: hoursAgo(0.8) },
      { id: 'c3', autor: 'Antonio Flores Ríos', rol: 'agente', mensaje: 'Tengo el chat de WhatsApp donde confirmas las horas adicionales y el monto acordado.', tiempo: hoursAgo(0.6) },
      { id: 'c4', autor: 'Ricardo Vega Palomino', rol: 'cliente', mensaje: 'Ese mensaje fue solo una consulta de precio, nunca una confirmación formal.', tiempo: hoursAgo(0.4) },
    ],
  },
  'DIS-005': {
    id: 'DIS-005',
    tipo: 'Incumplimiento de requisitos',
    sla_horas: 48,
    cliente: { nombre: 'Banco Continental SAC', rol: 'cliente', rating: 5.0, total_servicios: 87, disputas_previas: 3, telefono: '+51 01 211-9999', distrito: 'San Isidro' },
    agente: { nombre: 'José Quispe Mamani', rol: 'agente', rating: 4.3, total_servicios: 67, disputas_previas: 1, telefono: '+51 932 441 876', distrito: 'San Isidro' },
    nota_interna: 'Verificar si la plataforma notificó al agente sobre los requisitos especiales del banco antes de aceptar el servicio.',
    timeline: [
      { id: 't1', tipo: 'servicio', titulo: 'Servicio creado', descripcion: 'Banco Continental requirió credencial SUCAMEC vigente como requisito', tiempo: hoursAgo(11), actor: 'Sistema' },
      { id: 't2', tipo: 'servicio', titulo: 'Agente asignado', descripcion: 'José Quispe Mamani aceptó el servicio con requisitos especiales', tiempo: hoursAgo(10.5), actor: 'José Quispe Mamani' },
      { id: 't3', tipo: 'servicio', titulo: 'Acceso denegado', descripcion: 'Seguridad del banco rechazó ingreso: credencial SUCAMEC vencida hace 2 meses', tiempo: hoursAgo(10), actor: 'Seguridad Banco Continental' },
      { id: 't4', tipo: 'disputa', titulo: 'Disputa abierta', descripcion: 'Banco reportó incumplimiento de requisitos de acceso', tiempo: hoursAgo(9), actor: 'Banco Continental SAC' },
      { id: 't5', tipo: 'sistema', titulo: 'Pago retenido', descripcion: 'S/ 420.00 retenido. Banco contrató agencia externa de emergencia.', tiempo: hoursAgo(9), actor: 'Sistema' },
      { id: 't6', tipo: 'admin', titulo: 'Credenciales verificadas', descripcion: 'Admin confirmó: licencia SUCAMEC del agente venció el 15/01/2026', tiempo: hoursAgo(8), actor: 'Admin Principal' },
    ],
    chat: [
      { id: 'c1', autor: 'Banco Continental SAC', rol: 'cliente', mensaje: 'El agente se presentó con credencial SUCAMEC vencida. Nuestro protocolo no permite el ingreso.', tiempo: hoursAgo(9) },
      { id: 'c2', autor: 'José Quispe Mamani', rol: 'agente', mensaje: 'No sabía que mi credencial había vencido. La plataforma debería notificar cuando esto ocurre.', tiempo: hoursAgo(8.5) },
      { id: 'c3', autor: 'Banco Continental SAC', rol: 'cliente', mensaje: 'Debimos contratar una agencia externa al doble del costo. Exigimos reembolso total más compensación.', tiempo: hoursAgo(8) },
      { id: 'c4', autor: 'José Quispe Mamani', rol: 'agente', mensaje: 'El error fue de la plataforma al no alertarme. No actué de mala fe.', tiempo: hoursAgo(7.5) },
      { id: 'c5', autor: 'Banco Continental SAC', rol: 'cliente', mensaje: 'Independientemente de quién falló internamente, el servicio no fue prestado. El reembolso debe ser total.', tiempo: hoursAgo(7) },
    ],
  },
};

// ─── Agentes verificados con score, badges y nivel ───────────────────────────

export type NivelScore = 'CONFIABLE' | 'REGULAR' | 'OBSERVADO' | 'RESTRINGIDO' | 'BLOQUEADO';

export interface ScoreMovimiento {
  fecha: string;
  delta: number;
  score_resultante: number;
  motivo: string;
}

export interface Penalizacion {
  fecha: string;
  tipo: string;
  monto: number;
  descripcion: string;
}

export interface MockAgenteVerificado {
  id: string;
  nombre: string;
  dni: string;
  phone: string;
  email: string;
  distrito: string;
  created_at: string;
  foto_url: string | null;
  estado: 'ACTIVO' | 'SUSPENDIDO' | 'BLOQUEADO' | 'INACTIVO';
  sucamec_numero: string;
  score: number;
  nivel: NivelScore;
  servicios_completados: number;
  rating_avg: number;
  rating_count: number;
  comision_pct: number;
  servicios_sin_retraso: number;
  servicios_sin_cancelacion: number;
  suspension_hasta: string | null;
  badges: string[];
  tipos_servicio: Record<string, number>;
  score_history: ScoreMovimiento[];
  penalizaciones: Penalizacion[];
}

export const BADGE_INFO: Record<string, { nombre: string; emoji: string; descripcion: string }> = {
  despegue:          { nombre: 'Despegue',               emoji: '🚀',  descripcion: 'Primer servicio completado' },
  activo:            { nombre: 'Activo',                  emoji: '💪',  descripcion: '10 servicios completados' },
  veterano:          { nombre: 'Veterano',                emoji: '🔟',  descripcion: '50 servicios completados' },
  centurion:         { nombre: 'Centurión',               emoji: '🏆',  descripcion: '100 servicios completados (-4% comisión)' },
  leyenda:           { nombre: 'Leyenda',                 emoji: '👑',  descripcion: '500 servicios (comisión fija 8%)' },
  puntual:           { nombre: 'Puntual',                 emoji: '⏰',  descripcion: '5 servicios sin retraso' },
  siempre_a_tiempo:  { nombre: 'Siempre a Tiempo',        emoji: '⏰⏰', descripcion: '20 servicios sin retraso (-2% comisión)' },
  reloj_suizo:       { nombre: 'Reloj Suizo',             emoji: '⌚',  descripcion: '50 servicios sin retraso (-3% comisión)' },
  bien_valorado:     { nombre: 'Bien Valorado',           emoji: '👍',  descripcion: 'Rating ≥4.5 en 10 servicios' },
  excelencia:        { nombre: 'Excelencia',              emoji: '🌟',  descripcion: 'Rating ≥4.8 en 30 servicios' },
  diamante:          { nombre: 'Diamante',                emoji: '💎',  descripcion: 'Rating ≥4.9 en 100 servicios (-5% comisión)' },
  cero_cancelaciones:{ nombre: 'Cero Cancelaciones',      emoji: '🎯',  descripcion: '20 servicios sin cancelar' },
  confiable:         { nombre: 'Confiable',               emoji: '🛡️', descripcion: '50 servicios sin cancelar' },
  residencial:       { nombre: 'Esp. Residencial',        emoji: '🏠',  descripcion: '20 servicios residenciales' },
  eventos:           { nombre: 'Esp. Eventos',            emoji: '🎪',  descripcion: '20 servicios de eventos' },
  comercial:         { nombre: 'Esp. Comercial',          emoji: '🏢',  descripcion: '20 servicios comerciales' },
  escolta:           { nombre: 'Esp. Escolta',            emoji: '🕴️', descripcion: '20 servicios de escolta' },
  custodia:          { nombre: 'Esp. Custodia',           emoji: '🔒',  descripcion: '20 servicios de custodia' },
};

export const mockAgentesVerificados: MockAgenteVerificado[] = [
  {
    id: 'av-001', nombre: 'Pedro Sánchez López', dni: '41234567',
    phone: '+51 987 123 456', email: 'pedro.sanchez@gmail.com', distrito: 'Miraflores',
    created_at: hoursAgo(720), foto_url: null, estado: 'ACTIVO', sucamec_numero: 'LIC-2024-01122',
    score: 95, nivel: 'CONFIABLE', servicios_completados: 87, rating_avg: 4.8, rating_count: 87,
    comision_pct: 16, servicios_sin_retraso: 82, servicios_sin_cancelacion: 85, suspension_hasta: null,
    badges: ['despegue','activo','veterano','puntual','siempre_a_tiempo','bien_valorado','excelencia','cero_cancelaciones','residencial','eventos'],
    tipos_servicio: { RESIDENCIAL: 45, EVENTOS: 22, COMERCIAL: 12, ESCOLTA: 5, CUSTODIA: 3 },
    score_history: [
      { fecha: hoursAgo(48), delta: 10, score_resultante: 95, motivo: 'SERVICIO_COMPLETADO_5_ESTRELLAS' },
      { fecha: hoursAgo(120), delta: -5, score_resultante: 85, motivo: 'CANCELACION_CLIENTE_1H_3H' },
      { fecha: hoursAgo(200), delta: 5, score_resultante: 90, motivo: 'SERVICIO_COMPLETADO' },
    ],
    penalizaciones: [{ fecha: hoursAgo(120), tipo: 'CANCELACION_TARDÍA', monto: 15, descripcion: 'Cancelación 2h antes del servicio' }],
  },
  {
    id: 'av-002', nombre: 'Antonio Flores Ríos', dni: '43456789',
    phone: '+51 976 543 210', email: 'antonio.flores@hotmail.com', distrito: 'Barranco',
    created_at: hoursAgo(500), foto_url: null, estado: 'ACTIVO', sucamec_numero: 'LIC-2023-07744',
    score: 72, nivel: 'REGULAR', servicios_completados: 103, rating_avg: 4.6, rating_count: 103,
    comision_pct: 16, servicios_sin_retraso: 91, servicios_sin_cancelacion: 99, suspension_hasta: null,
    badges: ['despegue','activo','veterano','centurion','puntual','bien_valorado','cero_cancelaciones','confiable','escolta','residencial'],
    tipos_servicio: { ESCOLTA: 55, RESIDENCIAL: 20, EVENTOS: 18, COMERCIAL: 7, CUSTODIA: 3 },
    score_history: [
      { fecha: hoursAgo(24), delta: -15, score_resultante: 72, motivo: 'CANCELACION_AGENTE_MAS_2H' },
      { fecha: hoursAgo(96), delta: 5, score_resultante: 87, motivo: 'SERVICIO_COMPLETADO' },
    ],
    penalizaciones: [{ fecha: hoursAgo(24), tipo: 'CANCELACION_AGENTE', monto: 0, descripcion: 'Canceló 3h antes — compensación S/20 al cliente' }],
  },
  {
    id: 'av-003', nombre: 'Marco Lazo Herrera', dni: '45678901',
    phone: '+51 944 221 998', email: 'marco.lazo@gmail.com', distrito: 'Surco',
    created_at: hoursAgo(400), foto_url: null, estado: 'ACTIVO', sucamec_numero: 'LIC-2024-05531',
    score: 58, nivel: 'REGULAR', servicios_completados: 89, rating_avg: 4.1, rating_count: 89,
    comision_pct: 20, servicios_sin_retraso: 60, servicios_sin_cancelacion: 75, suspension_hasta: null,
    badges: ['despegue','activo','veterano','puntual'],
    tipos_servicio: { RESIDENCIAL: 50, COMERCIAL: 25, EVENTOS: 10, ESCOLTA: 4 },
    score_history: [
      { fecha: hoursAgo(6), delta: -10, score_resultante: 58, motivo: 'DISPUTA_RESUELTA_CONTRA_AGENTE' },
      { fecha: hoursAgo(72), delta: 5, score_resultante: 68, motivo: 'SERVICIO_COMPLETADO' },
    ],
    penalizaciones: [{ fecha: hoursAgo(6), tipo: 'DISPUTA', monto: 50, descripcion: 'Disputa DIS-002 — conducta inapropiada' }],
  },
  {
    id: 'av-004', nombre: 'Raúl Condori Puma', dni: '47890123',
    phone: '+51 965 778 341', email: 'raul.condori@gmail.com', distrito: 'Miraflores',
    created_at: hoursAgo(600), foto_url: null, estado: 'SUSPENDIDO', sucamec_numero: 'LIC-2023-03218',
    score: 35, nivel: 'OBSERVADO', servicios_completados: 56, rating_avg: 3.5, rating_count: 56,
    comision_pct: 20, servicios_sin_retraso: 30, servicios_sin_cancelacion: 40, suspension_hasta: hoursAgo(-168),
    badges: ['despegue','activo','veterano'],
    tipos_servicio: { RESIDENCIAL: 20, EVENTOS: 20, COMERCIAL: 10, ESCOLTA: 6 },
    score_history: [
      { fecha: hoursAgo(12), delta: -25, score_resultante: 35, motivo: 'CANCELACION_AGENTE_MENOS_2H' },
      { fecha: hoursAgo(200), delta: -15, score_resultante: 60, motivo: 'CANCELACION_AGENTE_MAS_2H' },
    ],
    penalizaciones: [{ fecha: hoursAgo(12), tipo: 'SUSPENSIÓN', monto: 0, descripcion: 'Suspensión 7 días por cancelación tardía' }],
  },
  {
    id: 'av-005', nombre: 'Hugo Benites Tapia', dni: '46012345',
    phone: '+51 932 441 876', email: 'hugo.benites@yahoo.com', distrito: 'San Isidro',
    created_at: hoursAgo(800), foto_url: null, estado: 'ACTIVO', sucamec_numero: 'LIC-2022-09981',
    score: 88, nivel: 'CONFIABLE', servicios_completados: 210, rating_avg: 4.9, rating_count: 210,
    comision_pct: 11, servicios_sin_retraso: 205, servicios_sin_cancelacion: 200, suspension_hasta: null,
    badges: ['despegue','activo','veterano','centurion','puntual','siempre_a_tiempo','reloj_suizo','bien_valorado','excelencia','diamante','cero_cancelaciones','confiable','residencial','eventos'],
    tipos_servicio: { RESIDENCIAL: 80, EVENTOS: 60, COMERCIAL: 40, ESCOLTA: 20, CUSTODIA: 10 },
    score_history: [{ fecha: hoursAgo(8), delta: 5, score_resultante: 88, motivo: 'SERVICIO_COMPLETADO_5_ESTRELLAS' }],
    penalizaciones: [],
  },
  {
    id: 'av-006', nombre: 'Ernesto Vidal Cruz', dni: '44567890',
    phone: '+51 998 112 233', email: 'ernesto.vidal@gmail.com', distrito: 'Chorrillos',
    created_at: hoursAgo(350), foto_url: null, estado: 'ACTIVO', sucamec_numero: 'LIC-2024-02290',
    score: 15, nivel: 'RESTRINGIDO', servicios_completados: 42, rating_avg: 3.8, rating_count: 42,
    comision_pct: 20, servicios_sin_retraso: 20, servicios_sin_cancelacion: 30, suspension_hasta: null,
    badges: ['despegue','activo','puntual'],
    tipos_servicio: { EVENTOS: 25, RESIDENCIAL: 10, COMERCIAL: 7 },
    score_history: [
      { fecha: hoursAgo(3), delta: -25, score_resultante: 15, motivo: 'DISPUTA_RESUELTA_CONTRA_AGENTE' },
      { fecha: hoursAgo(50), delta: -10, score_resultante: 40, motivo: 'TIMEOUT_AGENTE' },
    ],
    penalizaciones: [
      { fecha: hoursAgo(3), tipo: 'DISPUTA', monto: 260, descripcion: 'Disputa DIS-001 — retraso y abandono' },
      { fecha: hoursAgo(50), tipo: 'NO_PRESENTACIÓN', monto: 0, descripcion: 'No se presentó al servicio' },
    ],
  },
];
