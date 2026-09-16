-- 009_llm_credential_openrouter_unorouter.sql
-- Add OpenRouter and UnoRouter as selectable LLM providers. Both are
-- OpenAI-API-compatible aggregators offering ":free"-suffixed free-tier
-- models, so they reuse the existing OpenAiCompatibleAdapter (see
-- apps/api/src/modules/chat/providers/provider-registry.ts) with just a
-- different base URL — same pattern Groq/OpenAI already use.

ALTER TYPE llm_provider ADD VALUE IF NOT EXISTS 'openrouter';
ALTER TYPE llm_provider ADD VALUE IF NOT EXISTS 'unorouter';
