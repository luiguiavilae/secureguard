-- ============================================================
-- SecureGuard — Migración 002
-- Auth personalizada (phone+OTP), documentos de agentes
-- Depende de: 001_initial_schema.sql
-- ============================================================

-- ── Tabla users (auth custom, independiente de auth.users) ───
-- Usamos esta tabla como identidad principal del sistema
CREATE TABLE users (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone     text        UNIQUE NOT NULL,
  tipo      text        NOT NULL CHECK (tipo IN ('CLIENTE', 'AGENTE')),
  estado    text        NOT NULL DEFAULT 'ACTIVO'
                        CHECK (estado IN ('ACTIVO', 'SUSPENDIDO', 'INACTIVO')),
  nombre    text,
  expo_push_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON users(phone);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Reapuntar FK de agent_profiles a users ───────────────────
-- La migración 001 apunta a profiles (que exige auth.users).
-- Para el flujo OTP propio apuntamos a nuestra tabla users.
ALTER TABLE agent_profiles
  DROP CONSTRAINT agent_profiles_user_id_fkey;

ALTER TABLE agent_profiles
  ADD CONSTRAINT agent_profiles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ── Nuevas columnas en agent_profiles ────────────────────────
ALTER TABLE agent_profiles
  ADD COLUMN IF NOT EXISTS tipos_servicio  text[]        NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS horario_inicio  time,
  ADD COLUMN IF NOT EXISTS horario_fin     time,
  ADD COLUMN IF NOT EXISTS presentaciones  text[]        NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS genero          char(1)       CHECK (genero IN ('M', 'F')),
  ADD COLUMN IF NOT EXISTS en_servicio     boolean       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS score           numeric(5,2)  NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS nivel           integer       NOT NULL DEFAULT 1;

-- ── OTP codes ────────────────────────────────────────────────
CREATE TABLE otp_codes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      text        NOT NULL,
  code       text        NOT NULL,
  expires_at timestamptz NOT NULL,
  used       boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON otp_codes(phone, used, expires_at);

-- ── OTP attempts (rate limiting) ─────────────────────────────
CREATE TABLE otp_attempts (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON otp_attempts(phone, created_at);

-- ── Cola de verificación de agentes ─────────────────────────
CREATE TYPE verification_estado AS ENUM ('EN_REVISION', 'APROBADO', 'RECHAZADO');

CREATE TABLE agent_verification_queue (
  id          uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    uuid                 NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  estado      verification_estado  NOT NULL DEFAULT 'EN_REVISION',
  notas       text,
  reviewed_by uuid                 REFERENCES users(id),
  reviewed_at timestamptz,
  created_at  timestamptz          NOT NULL DEFAULT now(),
  updated_at  timestamptz          NOT NULL DEFAULT now()
);

CREATE INDEX ON agent_verification_queue(agent_id);
CREATE INDEX ON agent_verification_queue(estado);

CREATE TRIGGER trg_agent_verification_queue_updated_at
  BEFORE UPDATE ON agent_verification_queue
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Documentos de agentes ────────────────────────────────────
CREATE TYPE document_tipo   AS ENUM ('DNI_FRENTE', 'DNI_REVERSO', 'SUCAMEC', 'SELFIE');
CREATE TYPE document_estado AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

CREATE TABLE agent_documents (
  id         uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   uuid            NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  tipo       document_tipo   NOT NULL,
  url        text            NOT NULL,
  estado     document_estado NOT NULL DEFAULT 'PENDIENTE',
  created_at timestamptz     NOT NULL DEFAULT now(),
  UNIQUE (agent_id, tipo)
);

CREATE INDEX ON agent_documents(agent_id);

-- ── RLS ─────────────────────────────────────────────────────
-- El backend usa service_role key → bypasses RLS.
-- Habilitamos RLS para que el frontend (anon key) no acceda directamente.
ALTER TABLE users                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_attempts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_verification_queue ENABLE ROW LEVEL SECURITY;
