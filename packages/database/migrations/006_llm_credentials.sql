-- 006_llm_credentials.sql
-- Admin-managed LLM API key + model pairs (Settings page), replacing the
-- old .env-based GROQ_API_KEY/GROQ_MODEL config. sort_order (ascending)
-- determines rotation order: 0 is the default/primary key LlmKeyManager
-- tries first, falling back to the next one when a key hits its
-- provider's rate limit. Each row has its own model so keys from
-- different providers can be mixed, not just Groq.

CREATE TABLE llm_credentials (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key     TEXT NOT NULL,
  model       VARCHAR(255) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_llm_credentials_sort_order ON llm_credentials (sort_order);

CREATE TRIGGER trg_llm_credentials_updated_at
  BEFORE UPDATE ON llm_credentials
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
