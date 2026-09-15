-- 007_llm_credential_usage.sql
-- Rate-limit usage snapshot per LLM credential, read from the provider's
-- OpenAI-compatible x-ratelimit-* response headers on the most recent
-- call — surfaced in the admin Settings page so an admin can see how
-- close a key is to its limit without a separate metering integration.
-- Not live/polled; just whatever the provider returned last time the key
-- was actually used.

ALTER TABLE llm_credentials
  ADD COLUMN last_used_at        TIMESTAMPTZ,
  ADD COLUMN rl_limit_requests   INT,
  ADD COLUMN rl_remaining_requests INT,
  ADD COLUMN rl_reset_requests   VARCHAR(50),
  ADD COLUMN rl_limit_tokens     INT,
  ADD COLUMN rl_remaining_tokens INT,
  ADD COLUMN rl_reset_tokens     VARCHAR(50);
