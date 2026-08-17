# @brainstack/ai

Placeholder package for LLM prompts and conversation logic (Phase 4
implementation target).

`prompts/booking-conversation.md` is the canonical booking conversation
script — written in Phase 1, and reused as-is (read directly off disk at
runtime, not imported as TypeScript) by the chat implementation in
`apps/api/src/modules/chat`. The actual orchestration code (Groq/Claude
client, tool definitions, chat service) lives in `apps/api` for now, not
here — same reasoning as `@brainstack/workflow` and `@brainstack/voice`:
no `@brainstack/*` workspace package has a proven consumer yet, and
`apps/api`'s `tsc` build isn't set up to safely resolve a symlinked
workspace package's `.ts` source (no configured `rootDir`). Extracting into
this package is worth doing once the conversation engine needs to be
shared between `apps/api` and a future standalone voice worker (Phase 2/3
territory) — at that point, move the client wrapper, tool definitions, and
chat orchestration here.

## Knowledge base (RAG scaffold, added 2026-08-16)

`knowledge/faq.md` is the source doc for the FAQ/policy RAG feature —
currently placeholder content. Edit it with real business info (services,
pricing, hours, cancellation policy, etc.), then run `pnpm --filter api
knowledge:ingest` to (re-)embed it into Postgres. The retrieval/embedding
code itself lives in `apps/api/src/modules/knowledge/` (local embeddings via
`@xenova/transformers`, pgvector similarity search) — same reasoning as
above for why it's not here: no `@brainstack/*` package has a proven
consumer yet.
