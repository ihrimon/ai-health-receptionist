-- 003_providers.sql
-- Multi-provider scheduling: providers, their recurring weekly
-- availability, and the link from bookings to a specific provider + real
-- slot boundaries. Google Calendar sync (provider_google_accounts,
-- bookings.google_event_id) is a separate later migration — this one only
-- covers what's needed for provider CRUD + slot generation.

-- ── providers ─────────────────────────────────────────────────────────
CREATE TABLE providers (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   VARCHAR(255) NOT NULL,
  email                  VARCHAR(255) NOT NULL,
  phone                  VARCHAR(32),
  service                VARCHAR(255) NOT NULL,
  slot_duration_minutes  SMALLINT NOT NULL DEFAULT 30,
  timezone               VARCHAR(64) NOT NULL DEFAULT 'Asia/Dhaka',
  is_active              BOOLEAN NOT NULL DEFAULT true,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_providers_service ON providers (service);

CREATE TRIGGER trg_providers_updated_at
  BEFORE UPDATE ON providers
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ── provider_availability ────────────────────────────────────────────
-- One row per recurring weekly time block. day_of_week matches JS
-- Date#getDay() (0 = Sunday ... 6 = Saturday). Deliberately NOT unique on
-- (provider_id, day_of_week) — a provider can have multiple blocks on the
-- same day (e.g. a morning block and an evening block).
CREATE TABLE provider_availability (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers (id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX idx_provider_availability_provider_day
  ON provider_availability (provider_id, day_of_week);

CREATE TRIGGER trg_provider_availability_updated_at
  BEFORE UPDATE ON provider_availability
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ── bookings: link to a provider + real slot boundaries ─────────────────
-- preferred_date/preferred_time stay as-is for backward compatibility
-- (any booking not going through the new provider/slot flow, e.g. the
-- in-progress voice channel, keeps working unchanged). starts_at/ends_at
-- are the authoritative slot boundaries once a provider is assigned.
ALTER TABLE bookings
  ADD COLUMN provider_id UUID REFERENCES providers (id) ON DELETE SET NULL,
  ADD COLUMN starts_at TIMESTAMPTZ,
  ADD COLUMN ends_at TIMESTAMPTZ;

CREATE INDEX idx_bookings_provider_id ON bookings (provider_id);

-- The actual concurrency guard against double-booking the same
-- provider+slot (app-level re-validation is best-effort UX on top of
-- this — this index is what's atomic).
CREATE UNIQUE INDEX idx_bookings_provider_slot
  ON bookings (provider_id, starts_at)
  WHERE status <> 'cancelled' AND provider_id IS NOT NULL;
