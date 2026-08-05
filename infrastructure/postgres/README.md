# PostgreSQL

No custom config here for the MVP — `docker-compose.yml` runs the stock
`postgres:16-alpine` image and mounts
[`packages/database/migrations`](../../packages/database/migrations) into
`/docker-entrypoint-initdb.d`, so the schema is created automatically the
first time the `postgres` container's volume is initialized.

To re-run migrations against an already-running instance (e.g. after adding
a new migration file), use the runner in `@brainstack/database` instead:

```bash
pnpm --filter @brainstack/database migrate
```
