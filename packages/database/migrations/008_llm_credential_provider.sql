-- 008_llm_credential_provider.sql
-- Multi-provider LLM support: each credential now names which provider its
-- apiKey/model belong to, so Settings can hold a mix of Groq, OpenAI,
-- Anthropic, and Gemini keys (not just Groq). Existing rows default to
-- 'groq' since that's all this table held before.

CREATE TYPE llm_provider AS ENUM ('groq', 'openai', 'anthropic', 'gemini');

ALTER TABLE llm_credentials
  ADD COLUMN provider llm_provider NOT NULL DEFAULT 'groq';
