-- 004_google_calendar_sync.sql
-- Phase C of multi-provider scheduling: per-provider Google Calendar
-- OAuth connection (for reading busy time + writing confirmed-booking
-- events) and the link from a booking back to the calendar event it
-- created. MVP: refresh_token stored in plaintext, matches this
-- project's documented Phase-7-deferred "encryption at rest" posture
-- (see docs/implementation.md).

-- ── provider_google_accounts ─────────────────────────────────────────
-- One connected Google account per provider. Reconnecting (re-consent)
-- upserts this row rather than inserting a duplicate — enforced by the
-- UNIQUE constraint on provider_id.
CREATE TABLE provider_google_accounts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id    UUID NOT NULL UNIQUE REFERENCES providers (id) ON DELETE CASCADE,
  google_email   VARCHAR(255) NOT NULL,
  refresh_token  TEXT NOT NULL,
  calendar_id    VARCHAR(255) NOT NULL DEFAULT 'primary',
  connected_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_provider_google_accounts_updated_at
  BEFORE UPDATE ON provider_google_accounts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ── bookings: which calendar event a confirmed booking created ──────────
ALTER TABLE bookings
  ADD COLUMN google_event_id VARCHAR(255);
