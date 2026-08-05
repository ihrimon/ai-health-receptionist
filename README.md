# BrainStack Booking Agent

AI voice booking agent for BrainStack. See [`implementation.md`](implementation.md)
for the full product/implementation plan, and [`docs/`](docs/) for
developer guides (NestJS architecture, SQL/database queries, and the
Phase 1 progress update — in Bangla).

## Project structure

```
apps/
  api/         NestJS backend
  dashboard/   Next.js admin dashboard
packages/
  shared/      Shared TypeScript types (Booking, Conversation, CallSession)
  database/    SQL migrations + migration runner
  ai/          LLM prompts / conversation script
  voice/       Twilio, Deepgram, ElevenLabs integration (Phase 2–3)
  workflow/    BullMQ job definitions (Phase 5)
infrastructure/
  docker/      Dockerfiles + docker-compose.yml
  postgres/    Postgres notes
  redis/       Redis config
  nginx/       Reverse proxy config (Phase 8)
```

## Getting started (local development)

```bash
# 1. install dependencies
pnpm install

# 2. copy env files
cp .env.example .env
cp apps/dashboard/.env.local.example apps/dashboard/.env.local

# 3. start Postgres + Redis
docker compose -f infrastructure/docker/docker-compose.yml up -d postgres redis

# 4. run api + dashboard in dev mode
pnpm dev
```

- API: http://localhost:3001 (health check at `/health`)
- Dashboard: http://localhost:3000

## Full stack via Docker

```bash
docker compose -f infrastructure/docker/docker-compose.yml up --build
```
