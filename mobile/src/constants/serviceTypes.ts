// Tipos de servicio de seguridad disponibles en SecureGuard
export const SERVICE_TYPES = [
  {
    id: 'personal',
    label: 'Seguridad Personal',
    description: 'Protección personal para desplazamientos o eventos',
    icon: 'person-outline',
    minHours: 2,
    baseRatePerHour: 80,
  },
  {
    id: 'event',
    label: 'Seguridad para Eventos',
    description: 'Control de acceso y seguridad en eventos privados',
    icon: 'people-outline',
    minHours: 4,
    baseRatePerHour: 70,
  },
  {
    id: 'property',
    label: 'Vigilancia de Propiedad',
    description: 'Vigilancia de inmuebles, locales o almacenes',
    icon: 'home-outline',
    minHours: 8,
    baseRatePerHour: 65,
  },
  {
    id: 'escort',
    label: 'Escolta',
    description: 'Escolta vehicular o a pie para traslado de valores o personas',
    icon: 'car-outline',
    minHours: 2,
    baseRatePerHour: 100,
  },
] as const;

export type ServiceTypeId = typeof SERVICE_TYPES[number]['id'];

export const COMMISSION_RATE = 0.20; // 20% plataforma
export const AGENT_RATE = 0.80;      // 80% agente
export const CANCELLATION_PENALTY = 15; // S/. 15 penalización
