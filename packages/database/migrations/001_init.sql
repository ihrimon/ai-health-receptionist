-- 001_init.sql
-- Phase 1: initial schema for bookings, conversations, call_sessions

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- provides gen_random_uuid()

CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
CREATE TYPE call_status AS ENUM ('ringing', 'in-progress', 'completed', 'failed');

-- ── bookings ──────────────────────────────────────────────────────────
CREATE TABLE bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  phone           VARCHAR(32)  NOT NULL,
  email           VARCHAR(255) NOT NULL,
  company         VARCHAR(255),
  service         VARCHAR(255) NOT NULL,
  budget          VARCHAR(100),
  preferred_date  DATE NOT NULL,
  preferred_time  TIME NOT NULL,
  notes           TEXT,
  status          booking_status NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_status ON bookings (status);
CREATE INDEX idx_bookings_phone ON bookings (phone);
CREATE INDEX idx_bookings_email ON bookings (email);

-- keep updated_at current on every UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ── call_sessions ─────────────────────────────────────────────────────
CREATE TABLE call_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_sid    VARCHAR(64) NOT NULL UNIQUE,
  status      call_status NOT NULL DEFAULT 'ringing',
  started_at  TIMESTAMPTZ,
  ended_at    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_call_sessions_call_sid ON call_sessions (call_sid);

-- ── conversations ─────────────────────────────────────────────────────
CREATE TABLE conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID REFERENCES bookings (id) ON DELETE SET NULL,
  call_sid    VARCHAR(64) NOT NULL,
  transcript  JSONB,
  summary     TEXT,
  duration    INTEGER, -- seconds
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_booking_id ON conversations (booking_id);
CREATE INDEX idx_conversations_call_sid ON conversations (call_sid);
