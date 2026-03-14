# SecureGuard — Checklist Beta

## Antes de invitar usuarios

### Backend
- [ ] Supabase proyecto creado y schema migrado
- [ ] Variables de entorno reales en Railway
- [ ] Twilio número peruano activo
- [ ] Stripe en modo test con webhook configurado
- [ ] Tests de integración pasando en CI

### Admin panel
- [ ] Deploy en Vercel conectado al repo
- [ ] Variables de entorno en Vercel
- [ ] Admin user creado en tabla admin_users
- [ ] Cola de verificación probada manualmente

### Mobile
- [ ] EXPO_PUBLIC_API_URL apunta a Railway (no localhost)
- [ ] Expo Go funciona con la URL de producción
- [ ] Flujo completo probado en dispositivo real

## Reclutamiento beta
- [ ] 10 agentes verificados manualmente listos
- [ ] 20 clientes invitados de confianza
- [ ] Grupo WhatsApp de feedback creado
- [ ] Protocolo de soporte definido (quién responde y cuándo)

## Métricas a monitorear semana 1
- [ ] Tasa de completitud onboarding agentes (objetivo >70%)
- [ ] Tiempo promedio para cubrir una solicitud (objetivo <30 min)
- [ ] Tasa de cancelación (alerta si >20%)
- [ ] NPS después del primer servicio (objetivo >40)

## Pagos beta
- [ ] Proceso Yape manual documentado para el equipo
- [ ] Admin sabe cómo confirmar pagos en /finanzas
- [ ] Proceso de reembolso manual documentado
