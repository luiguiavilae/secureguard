-- ============================================================
-- SecureGuard — Migración 000
-- DROP completo + recreación con nombres en inglés
--
-- INSTRUCCIONES:
--   Ejecutar en Supabase SQL Editor en una sola pasada.
--   Este script reemplaza las 3 migraciones anteriores.
--   Después de ejecutarlo NO es necesario correr 001, 002 ni 003.
-- ============================================================


-- ── PASO 1: DROP de tablas en español (nombres posibles) ─────
-- Usamos IF EXISTS + CASCADE para no fallar si no existen.

DROP TABLE IF EXISTS usuarios                   CASCADE;
DROP TABLE IF EXISTS perfiles_de_agente         CASCADE;
DROP TABLE IF EXISTS perfiles_agente            CASCADE;
DROP TABLE IF EXISTS cola_verificacion          CASCADE;
DROP TABLE IF EXISTS documentos_agente          CASCADE;
DROP TABLE IF EXISTS insignias_agente           CASCADE;
DROP TABLE IF EXISTS solicitudes_de_servicio    CASCADE;
DROP TABLE IF EXISTS solicitudes_servicio       CASCADE;
DROP TABLE IF EXISTS agentes_servicio           CASCADE;
DROP TABLE IF EXISTS eventos_servicio           CASCADE;
DROP TABLE IF EXISTS incidentes_servicio        CASCADE;
DROP TABLE IF EXISTS pagos                      CASCADE;
DROP TABLE IF EXISTS codigos_otp                CASCADE;
DROP TABLE IF EXISTS intentos_otp               CASCADE;
DROP TABLE IF EXISTS perfiles_cliente           CASCADE;
DROP TABLE IF EXISTS puntuaciones_usuario       CASCADE;
DROP TABLE IF EXISTS mensajes                   CASCADE;
DROP TABLE IF EXISTS resenas                    CASCADE;
DROP TABLE IF EXISTS disputas                   CASCADE;
DROP TABLE IF EXISTS penalizaciones             CASCADE;


-- ── PASO 2: DROP de tablas en inglés (si quedaron de intentos previos) ──

DROP TABLE IF EXISTS admin_audit_log            CASCADE;
DROP TABLE IF EXISTS agent_badges               CASCADE;
DROP TABLE IF EXISTS agent_documents            CASCADE;
DROP TABLE IF EXISTS agent_verification_queue   CASCADE;
DROP TABLE IF EXISTS service_incidents          CASCADE;
DROP TABLE IF EXISTS service_agents             CASCADE;
DROP TABLE IF EXISTS service_events             CASCADE;
DROP TABLE IF EXISTS user_scores                CASCADE;
DROP TABLE IF EXISTS payments                   CASCADE;
DROP TABLE IF EXISTS service_requests           CASCADE;
DROP TABLE IF EXISTS service_offers             CASCADE;
DROP TABLE IF EXISTS penalties                  CASCADE;
DROP TABLE IF EXISTS reviews                    CASCADE;
DROP TABLE IF EXISTS messages                   CASCADE;
DROP TABLE IF EXISTS disputes                   CASCADE;
DROP TABLE IF EXISTS agent_profiles             CASCADE;
DROP TABLE IF EXISTS otp_attempts               CASCADE;
DROP TABLE IF EXISTS otp_codes                  CASCADE;
DROP TABLE IF EXISTS client_profiles            CASCADE;
DROP TABLE IF EXISTS users                      CASCADE;
DROP TABLE IF EXISTS profiles                   CASCADE;

-- DROP de views si existen
DROP VIEW IF EXISTS services CASCADE;


-- ── PASO 3: DROP de tipos ENUM (recrear limpios) ─────────────

DROP TYPE IF EXISTS user_role               CASCADE;
DROP TYPE IF EXISTS agent_status            CASCADE;
DROP TYPE IF EXISTS service_status          CASCADE;
DROP TYPE IF EXISTS service_type            CASCADE;
DROP TYPE IF EXISTS payment_status          CASCADE;
DROP TYPE IF EXISTS dispute_status          CASCADE;
DROP TYPE IF EXISTS badge_type              CASCADE;
DROP TYPE IF EXISTS verification_estado     CASCADE;
DROP TYPE IF EXISTS document_tipo           CASCADE;
DROP TYPE IF EXISTS document_estado         CASCADE;


-- ── PASO 4: Extensiones ───────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- postgis es opcional; comentar si no está disponible en tu plan:
-- CREATE EXTENSION IF NOT EXISTS "postgis";


-- ── PASO 5: Función helper para updated_at ───────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- TABLAS PRINCIPALES
-- ============================================================


-- ── users ────────────────────────────────────────────────────
-- Identidad principal del sistema (auth OTP propio, sin auth.users)

CREATE TABLE users (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone           text        UNIQUE NOT NULL,
  tipo            text        NOT NULL CHECK (tipo IN ('CLIENTE', 'AGENTE')),
  estado          text        NOT NULL DEFAULT 'ACTIVO'
                              CHECK (estado IN ('ACTIVO', 'SUSPENDIDO', 'INACTIVO', 'BLOQUEADO')),
  nombre          text,
  expo_push_token text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_phone ON users(phone);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── otp_codes ────────────────────────────────────────────────

CREATE TABLE otp_codes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      text        NOT NULL,
  code       text        NOT NULL,
  expires_at timestamptz NOT NULL,
  used       boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_otp_codes_phone ON otp_codes(phone, used, expires_at);


-- ── otp_attempts ─────────────────────────────────────────────

CREATE TABLE otp_attempts (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_otp_attempts_phone ON otp_attempts(phone, created_at);


-- ── agent_profiles ───────────────────────────────────────────

CREATE TABLE agent_profiles (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status               text        NOT NULL DEFAULT 'pending'
                                   CHECK (status IN ('pending', 'verified', 'rejected', 'suspended')),
  bio                  text,
  experience_years     smallint    DEFAULT 0,
  hourly_rate          numeric(8,2) NOT NULL DEFAULT 70.00,
  districts            text[]      NOT NULL DEFAULT '{}',
  specialties          text[]      NOT NULL DEFAULT '{}',
  is_available         boolean     NOT NULL DEFAULT false,
  rating_avg           numeric(3,2) NOT NULL DEFAULT 0.00,
  rating_count         integer     NOT NULL DEFAULT 0,
  completed_services   integer     NOT NULL DEFAULT 0,
  -- Documentos SUCAMEC
  sucamec_number       text,
  sucamec_expiry       date,
  sucamec_doc_url      text,
  -- Documentos identidad
  dni_number           text,
  dni_front_url        text,
  dni_back_url         text,
  photo_url            text,
  background_check_url text,
  -- Stripe Connect
  stripe_account_id    text,
  -- Rechazo
  rejection_reason     text,
  verified_at          timestamptz,
  verified_by          uuid        REFERENCES users(id),
  -- Score y nivel
  score                numeric(5,2) NOT NULL DEFAULT 100.00,
  nivel                text        NOT NULL DEFAULT 'REGULAR'
                                   CHECK (nivel IN ('CONFIABLE','REGULAR','OBSERVADO','RESTRINGIDO','BLOQUEADO')),
  comision_pct         integer     NOT NULL DEFAULT 20,
  -- Disponibilidad
  tipos_servicio       text[]      NOT NULL DEFAULT '{}',
  horario_inicio       time,
  horario_fin          time,
  genero               char(1)     CHECK (genero IN ('M', 'F')),
  en_servicio          boolean     NOT NULL DEFAULT false,
  -- Estadísticas
  servicios_sin_retraso    integer NOT NULL DEFAULT 0,
  servicios_sin_cancelacion integer NOT NULL DEFAULT 0,
  cancelaciones_mes    integer     NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_profiles_user_id  ON agent_profiles(user_id);
CREATE INDEX idx_agent_profiles_status   ON agent_profiles(status);
CREATE INDEX idx_agent_profiles_available ON agent_profiles(is_available) WHERE is_available = true;

CREATE TRIGGER trg_agent_profiles_updated_at
  BEFORE UPDATE ON agent_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── agent_verification_queue ─────────────────────────────────

CREATE TABLE agent_verification_queue (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    uuid        NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  estado      text        NOT NULL DEFAULT 'EN_REVISION'
                          CHECK (estado IN ('EN_REVISION', 'APROBADO', 'RECHAZADO')),
  notas       text,
  reviewed_by uuid        REFERENCES users(id),
  reviewed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_verification_agent_id ON agent_verification_queue(agent_id);
CREATE INDEX idx_agent_verification_estado   ON agent_verification_queue(estado);

CREATE TRIGGER trg_agent_verification_updated_at
  BEFORE UPDATE ON agent_verification_queue
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── agent_documents ──────────────────────────────────────────

CREATE TABLE agent_documents (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   uuid        NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  tipo       text        NOT NULL CHECK (tipo IN ('DNI_FRENTE', 'DNI_REVERSO', 'SUCAMEC', 'SELFIE')),
  url        text        NOT NULL,
  estado     text        NOT NULL DEFAULT 'PENDIENTE'
                         CHECK (estado IN ('PENDIENTE', 'APROBADO', 'RECHAZADO')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id, tipo)
);

CREATE INDEX idx_agent_documents_agent_id ON agent_documents(agent_id);


-- ── agent_badges ─────────────────────────────────────────────

CREATE TABLE agent_badges (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   uuid        NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  badge      text        NOT NULL,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id, badge)
);

CREATE INDEX idx_agent_badges_agent_id ON agent_badges(agent_id);


-- ── client_profiles ──────────────────────────────────────────
-- Score y estadísticas de clientes

CREATE TABLE client_profiles (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score            numeric(5,2) NOT NULL DEFAULT 100.00,
  nivel            text        NOT NULL DEFAULT 'REGULAR',
  cancelaciones_mes integer    NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_profiles_user_id ON client_profiles(user_id);

CREATE TRIGGER trg_client_profiles_updated_at
  BEFORE UPDATE ON client_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── service_requests ─────────────────────────────────────────
-- Tabla central de solicitudes de servicio

CREATE TABLE service_requests (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id               uuid        NOT NULL REFERENCES users(id),
  agente_seleccionado_id   uuid        REFERENCES users(id),
  agente_asignado_id       uuid        REFERENCES users(id),
  estado                   text        NOT NULL DEFAULT 'ABIERTA'
                                       CHECK (estado IN (
                                         'ABIERTA', 'EN_REVISION', 'CONFIRMADO',
                                         'CONFIRMADO_PAGADO', 'EN_CURSO',
                                         'COMPLETADO', 'CANCELADO'
                                       )),
  tipo_servicio            text,
  descripcion              text,
  distrito                 text,
  agentes_requeridos       integer     NOT NULL DEFAULT 1,
  duracion_horas           integer,
  precio_total             numeric(10,2),
  fecha_inicio_solicitada  timestamptz,
  fecha_inicio_real        timestamptz,
  fecha_fin_real           timestamptz,
  cancellation_reason      text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_requests_cliente_id       ON service_requests(cliente_id);
CREATE INDEX idx_service_requests_estado           ON service_requests(estado);
CREATE INDEX idx_service_requests_agente_asignado  ON service_requests(agente_asignado_id);
CREATE INDEX idx_service_requests_fecha            ON service_requests(fecha_inicio_solicitada);

CREATE TRIGGER trg_service_requests_updated_at
  BEFORE UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── services (VIEW) ───────────────────────────────────────────
-- Alias de service_requests — usado por jobs/check_agent_timeout.py
-- y services/penalties.py. Evita errores si el código referencia
-- ambos nombres.

CREATE VIEW services AS SELECT * FROM service_requests;


-- ── service_agents ───────────────────────────────────────────
-- Relación agente ↔ servicio (postulaciones Flujo B y asignaciones)

CREATE TABLE service_agents (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  uuid        NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  agente_id   uuid        NOT NULL REFERENCES users(id),
  estado      text        NOT NULL DEFAULT 'PENDIENTE'
                          CHECK (estado IN ('PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'TIMEOUT')),
  es_lider    boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_id, agente_id)
);

CREATE INDEX idx_service_agents_service_id ON service_agents(service_id);
CREATE INDEX idx_service_agents_agente_id  ON service_agents(agente_id);

CREATE TRIGGER trg_service_agents_updated_at
  BEFORE UPDATE ON service_agents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── service_events ───────────────────────────────────────────
-- Log append-only de transiciones de estado

CREATE TABLE service_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  uuid        NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  tipo        text        NOT NULL,
  actor_id    uuid        REFERENCES users(id),
  datos       jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_events_service_id ON service_events(service_id);
CREATE INDEX idx_service_events_created_at ON service_events(created_at);


-- ── service_incidents ────────────────────────────────────────
-- Incidentes SOS y alertas durante el servicio

CREATE TABLE service_incidents (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id    uuid        NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  tipo          text        NOT NULL DEFAULT 'SOS'
                            CHECK (tipo IN ('SOS', 'ALERTA', 'REPORTE')),
  subtipo       text,
  descripcion   text,
  reportado_por uuid        REFERENCES users(id),
  resuelto      boolean     NOT NULL DEFAULT false,
  resuelto_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_incidents_service_id ON service_incidents(service_id);


-- ── payments ─────────────────────────────────────────────────

CREATE TABLE payments (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id               uuid        NOT NULL REFERENCES service_requests(id),
  cliente_id               uuid        REFERENCES users(id),
  metodo                   text        NOT NULL DEFAULT 'STRIPE_TEST'
                                       CHECK (metodo IN ('STRIPE_TEST', 'YAPE_MANUAL', 'STRIPE_LIVE')),
  monto                    numeric(10,2),
  estado                   text        NOT NULL DEFAULT 'PENDIENTE'
                                       CHECK (estado IN ('PENDIENTE', 'PAGADO', 'REEMBOLSADO', 'FALLIDO')),
  stripe_payment_intent_id text,
  stripe_charge_id         text,
  stripe_transfer_id       text,
  referencia_yape          text,
  paid_at                  timestamptz,
  payout_released_at       timestamptz,
  refunded_at              timestamptz,
  refund_reason            text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_service_id   ON payments(service_id);
CREATE INDEX idx_payments_estado       ON payments(estado);
CREATE INDEX idx_payments_stripe_pi_id ON payments(stripe_payment_intent_id);

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── user_scores ──────────────────────────────────────────────
-- Historial de movimientos de score (clientes y agentes)

CREATE TABLE user_scores (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta            numeric(6,2) NOT NULL,
  score_resultante numeric(6,2) NOT NULL,
  nivel_resultante text,
  motivo           text        NOT NULL,
  service_id       uuid        REFERENCES service_requests(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_scores_user_id ON user_scores(user_id);
CREATE INDEX idx_user_scores_created ON user_scores(created_at);


-- ============================================================
-- ROW LEVEL SECURITY
-- El backend usa service_role key → bypasses RLS automáticamente.
-- Habilitamos RLS para bloquear acceso directo con anon key.
-- ============================================================

ALTER TABLE users                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_attempts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_verification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_badges             ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_agents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_incidents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_scores              ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- VERIFICACIÓN FINAL
-- Ejecuta esta query al final para confirmar que las 14 tablas
-- + 1 view quedaron creadas correctamente:
--
-- SELECT table_name, table_type
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_type, table_name;
-- ============================================================
