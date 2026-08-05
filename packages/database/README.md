# @brainstack/database

Source of truth for the PostgreSQL schema — plain SQL migrations plus a small
runner script (no ORM). `apps/api` also defines TypeORM entities that mirror
this schema for day-to-day querying (`synchronize: true` in development), but
this package is what should run against staging/production.

## Usage

```bash
# from repo root, with POSTGRES_* env vars set (see ../../.env.example)
pnpm --filter @brainstack/database migrate
```

See [`docs/data-query.md`](../../docs/data-query.md) for a full walkthrough
(Bangla) of how these tables are structured and how to query them.
