-- ============================================================
-- SecureGuard — Schema Inicial
-- Migración: 001_initial_schema
-- ============================================================

-- ── Extensiones ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";  -- geolocalización

-- ── Tipos ENUM ───────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('client', 'agent', 'admin');
CREATE TYPE agent_status AS ENUM ('pending', 'verified', 'rejected', 'suspended');
CREATE TYPE service_status AS ENUM (
  'pending', 'accepted', 'active', 'completed', 'cancelled', 'disputed'
);
CREATE TYPE service_type AS ENUM ('personal', 'event', 'property', 'escort');
CREATE TYPE payment_status AS ENUM (
  'pending', 'authorized', 'captured', 'refunded', 'failed'
);
CREATE TYPE dispute_status AS ENUM ('open', 'under_review', 'resolved', 'closed');
CREATE TYPE badge_type AS ENUM (
  'services_100', 'services_500', 'rating_5_stars',
  'punctuality', 'top_district', 'veteran'
);

-- ── Tabla: profiles ──────────────────────────────────────────
-- Extiende auth.users de Supabase con datos de perfil
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          user_role NOT NULL DEFAULT 'client',
  full_name     TEXT,
  phone         TEXT UNIQUE NOT NULL,
  avatar_url    TEXT,
  expo_push_token TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Tabla: agent_profiles ────────────────────────────────────
CREATE TABLE agent_profiles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status            agent_status NOT NULL DEFAULT 'pending',
  bio               TEXT,
  experience_years  SMALLINT DEFAULT 0,
  hourly_rate       NUMERIC(8,2) NOT NULL DEFAULT 70.00,
  districts         TEXT[] NOT NULL DEFAULT '{}',
  specialties       TEXT[] NOT NULL DEFAULT '{}',
  is_available      BOOLEAN NOT NULL DEFAULT false,
  location          GEOGRAPHY(POINT, 4326),  -- última ubicación conocida
  rating_avg        NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  rating_count      INTEGER NOT NULL DEFAULT 0,
  completed_services INTEGER NOT NULL DEFAULT 0,
  -- Documentos SUCAMEC
  sucamec_number    TEXT,
  sucamec_expiry    DATE,
  sucamec_doc_url   TEXT,
  -- Documentos adicionales
  dni_number        TEXT,
  dni_front_url     TEXT,
  dni_back_url      TEXT,
  photo_url         TEXT,
  background_check_url TEXT,
  -- Stripe Connect
  stripe_account_id TEXT,
  -- Motivo de rechazo si aplica
  rejection_reason  TEXT,
  verified_at       TIMESTAMPTZ,
  verified_by       UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Tabla: service_requests ──────────────────────────────────
CREATE TABLE service_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID NOT NULL REFERENCES profiles(id),
  agent_id        UUID REFERENCES agent_profiles(id),
  type            service_type NOT NULL,
  status          service_status NOT NULL DEFAULT 'pending',
  district        TEXT NOT NULL,
  address         TEXT,
  location        GEOGRAPHY(POINT, 4326),
  scheduled_at    TIMESTAMPTZ NOT NULL,
  duration_hours  NUMERIC(4,1) NOT NULL,
  briefing        TEXT NOT NULL,
  special_requirements TEXT,
  total_amount    NUMERIC(10,2) NOT NULL,
  platform_fee    NUMERIC(10,2) NOT NULL,
  agent_payout    NUMERIC(10,2) NOT NULL,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  cancellation_reason TEXT,
  client_reviewed BOOLEAN NOT NULL DEFAULT false,
  agent_reviewed  BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Tabla: service_offers ────────────────────────────────────
-- Agentes que mostraron interés en un servicio
CREATE TABLE service_offers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id      UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  agent_id        UUID NOT NULL REFERENCES agent_profiles(id),
  offered_rate    NUMERIC(8,2),
  message         TEXT,
  accepted        BOOLEAN,
  responded_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(service_id, agent_id)
);

-- ── Tabla: payments ──────────────────────────────────────────
CREATE TABLE payments (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id            UUID NOT NULL REFERENCES service_requests(id),
  client_id             UUID NOT NULL REFERENCES profiles(id),
  agent_id              UUID NOT NULL REFERENCES agent_profiles(id),
  status                payment_status NOT NULL DEFAULT 'pending',
  amount                NUMERIC(10,2) NOT NULL,
  platform_fee          NUMERIC(10,2) NOT NULL,
  agent_payout          NUMERIC(10,2) NOT NULL,
  currency              CHAR(3) NOT NULL DEFAULT 'PEN',
  -- Stripe
  stripe_payment_intent_id  TEXT UNIQUE,
  stripe_charge_id          TEXT,
  stripe_transfer_id        TEXT,
  -- Metadatos
  paid_at               TIMESTAMPTZ,
  payout_released_at    TIMESTAMPTZ,
  refunded_at           TIMESTAMPTZ,
  refund_reason         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Tabla: penalties ─────────────────────────────────────────
CREATE TABLE penalties (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id        UUID NOT NULL REFERENCES agent_profiles(id),
  service_id      UUID NOT NULL REFERENCES service_requests(id),
  amount          NUMERIC(8,2) NOT NULL DEFAULT 15.00,
  reason          TEXT NOT NULL DEFAULT 'late_cancellation',
  deducted        BOOLEAN NOT NULL DEFAULT false,
  deducted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Tabla: reviews ───────────────────────────────────────────
CREATE TABLE reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id      UUID NOT NULL REFERENCES service_requests(id),
  reviewer_id     UUID NOT NULL REFERENCES profiles(id),
  reviewee_id     UUID NOT NULL REFERENCES profiles(id),
  rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(service_id, reviewer_id)
);

-- ── Tabla: messages ──────────────────────────────────────────
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id      UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES profiles(id),
  content         TEXT NOT NULL,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Tabla: agent_badges ──────────────────────────────────────
CREATE TABLE agent_badges (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id        UUID NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  badge           badge_type NOT NULL,
  awarded_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, badge)
);

-- ── Tabla: disputes ──────────────────────────────────────────
CREATE TABLE disputes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id      UUID NOT NULL REFERENCES service_requests(id),
  reporter_id     UUID NOT NULL REFERENCES profiles(id),
  status          dispute_status NOT NULL DEFAULT 'open',
  reason          TEXT NOT NULL,
  evidence_urls   TEXT[] DEFAULT '{}',
  resolution      TEXT,
  resolved_by     UUID REFERENCES profiles(id),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Tabla: admin_audit_log ───────────────────────────────────
CREATE TABLE admin_audit_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id        UUID NOT NULL REFERENCES profiles(id),
  action          TEXT NOT NULL,
  target_type     TEXT NOT NULL,  -- 'agent', 'service', 'dispute', etc.
  target_id       UUID NOT NULL,
  details         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Índices ──────────────────────────────────────────────────
CREATE INDEX idx_agent_profiles_status ON agent_profiles(status);
CREATE INDEX idx_agent_profiles_available ON agent_profiles(is_available) WHERE is_available = true;
CREATE INDEX idx_agent_profiles_location ON agent_profiles USING GIST(location);
CREATE INDEX idx_service_requests_status ON service_requests(status);
CREATE INDEX idx_service_requests_client ON service_requests(client_id);
CREATE INDEX idx_service_requests_agent ON service_requests(agent_id);
CREATE INDEX idx_service_requests_scheduled ON service_requests(scheduled_at);
CREATE INDEX idx_service_requests_district ON service_requests(district);
CREATE INDEX idx_service_offers_service ON service_offers(service_id);
CREATE INDEX idx_payments_service ON payments(service_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_messages_service ON messages(service_id);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX idx_disputes_status ON disputes(status);

-- ── Función: actualizar rating de agente ─────────────────────
CREATE OR REPLACE FUNCTION update_agent_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE agent_profiles
  SET
    rating_avg = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM reviews r
      JOIN profiles p ON p.id = r.reviewee_id
      JOIN agent_profiles ap ON ap.user_id = p.id
      WHERE ap.id = (
        SELECT ap2.id FROM agent_profiles ap2
        JOIN profiles p2 ON p2.id = ap2.user_id
        WHERE p2.id = NEW.reviewee_id
      )
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM reviews r
      JOIN profiles p ON p.id = r.reviewee_id
      WHERE p.id = NEW.reviewee_id
    ),
    updated_at = now()
  WHERE user_id = NEW.reviewee_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_agent_rating
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_rating();

-- ── Función: actualizar timestamps ───────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_agent_profiles_updated_at
  BEFORE UPDATE ON agent_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_service_requests_updated_at
  BEFORE UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_disputes_updated_at
  BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Row Level Security (RLS) ─────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- Profiles: cada usuario lee y edita su propio perfil
CREATE POLICY "users_own_profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Agent profiles: cualquier usuario autenticado puede leer perfiles verificados
CREATE POLICY "verified_agents_public" ON agent_profiles
  FOR SELECT USING (status = 'verified');

CREATE POLICY "agents_own_profile" ON agent_profiles
  FOR ALL USING (auth.uid() = user_id);

-- Service requests: cliente ve sus propios servicios, agente ve servicios asignados
CREATE POLICY "client_own_services" ON service_requests
  FOR ALL USING (auth.uid() = client_id);

CREATE POLICY "agent_assigned_services" ON service_requests
  FOR SELECT USING (
    agent_id IN (
      SELECT id FROM agent_profiles WHERE user_id = auth.uid()
    )
  );

-- Messages: solo participantes del servicio
CREATE POLICY "service_participants_messages" ON messages
  FOR ALL USING (
    service_id IN (
      SELECT id FROM service_requests
      WHERE client_id = auth.uid()
         OR agent_id IN (SELECT id FROM agent_profiles WHERE user_id = auth.uid())
    )
  );

-- Reviews: cualquiera puede ver reviews de agentes verificados
CREATE POLICY "reviews_public_read" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "reviews_own_write" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
