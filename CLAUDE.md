# SecureGuard — Arquitectura y Contexto del Proyecto

SecureGuard es una plataforma on-demand de seguridad privada para Lima, Perú.
Conecta clientes que necesitan agentes de seguridad con agentes verificados y certificados.

## Stack Técnico

- **Backend**: FastAPI (Python 3.11) + Supabase (PostgreSQL)
- **Mobile**: React Native + Expo (TypeScript)
- **Admin**: Next.js 14 App Router (TypeScript + Tailwind)
- **Pagos**: Stripe (tarjeta) + Yape/Plin (PEN)
- **SMS/OTP**: Twilio Verify
- **Realtime**: Supabase Realtime (websockets)
- **Storage**: Supabase Storage (fotos, documentos)
- **Push Notifications**: Expo Push + FCM

## Roles de Usuario

1. **Cliente**: Solicita servicios de seguridad
2. **Agente**: Presta servicios de seguridad (requiere verificación SUCAMEC)
3. **Admin**: Gestiona la plataforma (panel web)

## Flujo Principal

1. Cliente crea solicitud de servicio (briefing, distrito, fecha/hora, duración)
2. Agentes disponibles en el radio reciben notificación
3. Agente acepta → cliente confirma → servicio activo
4. Al finalizar, ambos se califican mutuamente
5. Pago se libera al agente (menos comisión del 20%)

## Estructura de Comisiones

- Plataforma: 20% del servicio
- Agente: 80% del servicio
- Penalización por cancelación tardía: S/. 15

## Variables de Entorno Requeridas

Ver `.env.example` en la raíz del proyecto.
