-- 002_knowledge_base.sql
-- RAG knowledge base for FAQ/policy-grounded chat answers (structure only —
-- see packages/ai/knowledge/faq.md for the placeholder source content).
--
-- Requires the pgvector extension to be present in the Postgres image
-- (infrastructure/docker/docker-compose.yml uses pgvector/pgvector:pg16).
--
-- embedding dimension (384) matches the Xenova/all-MiniLM-L6-v2 model used
-- by apps/api/src/modules/knowledge/embedding.service.ts — if that model
-- ever changes, this column's dimension must change to match.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge_chunks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source      VARCHAR(255) NOT NULL,
  content     TEXT NOT NULL,
  embedding   vector(384) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No vector index for now, deliberately. An `ivfflat` index (lists=100)
-- was tried and tested at FAQ-doc scale (a handful of rows) — it returned
-- ZERO results for every query, confirmed live: same cosine-distance query
-- with `enable_indexscan off` (forcing a sequential scan) found the correct
-- matches. ivfflat is an approximate, cluster-based index; with far more
-- lists than rows, its default probes=1 almost always searches an empty
-- cluster. A plain sequential scan is correct and already fast at this
-- scale. Add a properly-tuned index back once the table grows large enough
-- to need one — rule of thumb: `lists ≈ sqrt(row_count)` for ivfflat, or
-- use `USING hnsw (embedding vector_cosine_ops)` instead, which doesn't
-- need row-count-dependent tuning.
