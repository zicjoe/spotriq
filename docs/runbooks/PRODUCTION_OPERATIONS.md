# Spotriq Production Operations Runbook

## Deploy

1. Run `pnpm --filter @spotriq/api build` and `pnpm check` locally.
2. Commit and push.
3. Railway pre-deploy runs `pnpm db:migrate`. The migration runner serializes concurrent deploys with a PostgreSQL advisory lock and rejects checksum drift.
4. Confirm `/health` reports the expected release, then run the accepted verifier chain and `pnpm verify:production-hardening`.

## Database backup and restore drill

Use Railway/PostgreSQL provider backups where available. For an independent logical backup, use `pg_dump` from a trusted environment with the production connection string supplied only at runtime, never committed:

`pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL" --file spotriq-backup.dump`

Verify restore on a disposable non-production database:

`pg_restore --clean --if-exists --no-owner --no-acl --dbname "$RESTORE_DATABASE_URL" spotriq-backup.dump`

Then run `pnpm db:health`, smoke-test `/health`, and inspect row counts for core marketplace/commercial/permission/activity tables. Never test destructive restore against production.

## Queue recovery

Leases expire automatically. A crashed worker leaves work `LEASED` only until `leased_until`; another worker may reclaim it. Failed work retries with bounded exponential delay and enters `DEAD_LETTER` after `max_attempts`. Do not manually mark a financial action completed based on queue state; queue state is operational only.

## Rate-limit degradation

If PostgreSQL-backed rate-limit buckets are temporarily unavailable, the API logs the degradation and falls back to a process-local limiter. This preserves bounded abuse protection but loses cross-replica coordination until PostgreSQL recovers.

## Rollback

Application rollback must not mutate or delete historical migration files. Roll back application code to a version compatible with the already-applied schema. If a forward schema correction is needed, add a new migration.

## Mainnet policy

BSC Mainnet may be used for discovery. Financial execution remains BSC Testnet-only until explicit approval; production hardening does not alter that policy.
