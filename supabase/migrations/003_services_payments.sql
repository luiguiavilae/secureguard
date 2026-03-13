-- ============================================================
-- SecureGuard — Migración 003
-- Solicitudes de servicio y pagos
-- Depende de: 002_otp_tables.sql
-- ============================================================

-- ── Nuevas columnas en service_requests ──────────────────────
ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS estado                text        NOT NULL DEFAULT 'ABIERTA'
                                                 CHECK (estado IN (
                                                   'ABIERTA', 'EN_REVISION', 'CONFIRMADO',
                                                   'CONFIRMADO_PAGADO', 'EN_CURSO',
                                                   'COMPLETADO', 'CANCELADO'
                                                 )),
  ADD COLUMN IF NOT EXISTS cliente_id            uuid        REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS agente_seleccionado_id uuid       REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS agente_asignado_id    uuid        REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS descripcion           text,
  ADD COLUMN IF NOT EXISTS distrito              text,
  ADD COLUMN IF NOT EXISTS tipo_servicio         text,
  ADD COLUMN IF NOT EXISTS agentes_requeridos    integer     NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS duracion_horas        integer,
  ADD COLUMN IF NOT EXISTS precio_total          numeric(10,2),
  ADD COLUMN IF NOT EXISTS fecha_inicio_solicitada timestamptz,
  ADD COLUMN IF NOT EXISTS fecha_inicio_real     timestamptz,
  ADD COLUMN IF NOT EXISTS fecha_fin_real        timestamptz;

CREATE INDEX IF NOT EXISTS idx_service_requests_cliente_id ON service_requests(cliente_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_estado     ON service_requests(estado);
CREATE INDEX IF NOT EXISTS idx_service_requests_agente_asignado ON service_requests(agente_asignado_id);

-- ── Tabla service_agents (relación agente ↔ servicio) ────────
-- Registra qué agentes están vinculados a cada solicitud
-- (aplicaciones en Flujo B, asignación directa en Flujo A).
CREATE TABLE IF NOT EXISTS service_agents (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  uuid        NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  agente_id   uuid        NOT NULL REFERENCES users(id),
  estado      text        NOT NULL DEFAULT 'PENDIENTE'
                          CHECK (estado IN ('PENDIENTE', 'ACEPTADO', 'RECHAZADO')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_id, agente_id)
);

CREATE INDEX IF NOT EXISTS idx_service_agents_service_id ON service_agents(service_id);
CREATE INDEX IF NOT EXISTS idx_service_agents_agente_id  ON service_agents(agente_id);

-- ── Tabla service_events (log de transiciones) ───────────────
-- Append-only: nunca se actualiza ni elimina un registro.
CREATE TABLE IF NOT EXISTS service_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  uuid        NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  tipo        text        NOT NULL,  -- ej: SERVICIO_CREADO, AGENTE_ACEPTO, etc.
  actor_id    uuid        REFERENCES users(id),
  datos       jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_events_service_id ON service_events(service_id);

-- ── Nuevas columnas en payments ───────────────────────────────
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS cliente_id              uuid        REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS metodo                  text        NOT NULL DEFAULT 'STRIPE_TEST'
                                                   CHECK (metodo IN ('STRIPE_TEST', 'YAPE_MANUAL')),
  ADD COLUMN IF NOT EXISTS monto                   numeric(10,2),
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS referencia_yape         text,
  ADD COLUMN IF NOT EXISTS estado                  text        NOT NULL DEFAULT 'PENDIENTE'
                                                   CHECK (estado IN (
                                                     'PENDIENTE', 'PAGADO', 'REEMBOLSADO', 'FALLIDO'
                                                   ));

CREATE INDEX IF NOT EXISTS idx_payments_service_id       ON payments(service_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_pi_id     ON payments(stripe_payment_intent_id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE service_agents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_events  ENABLE ROW LEVEL SECURITY;
