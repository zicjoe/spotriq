# Spotriq v0.37 Production Hardening + Scale Readiness

v0.37 hardens the production control plane without changing financial truth or enabling BSC Mainnet financial execution.

## Boundaries

- Operational scalability does not create marketplace readiness, trust, payment, permission, execution or outcome authority.
- `workerFinancialJobDispatchEnabled = false`: Smart Money/financial jobs remain `API_INLINE` until an explicit later cutover is accepted.
- The durable worker queue is used for safe maintenance work and proves lease/retry/dead-letter semantics without silently moving financial execution.
- Rate limiting is distributed through PostgreSQL in production, with a process-local emergency limiter if the shared bucket store is temporarily unavailable.
- Public/cacheable metadata may use short cache headers. Commercial, permission, My Agents and write responses remain `no-store`/private.

## Persistence

Migration `0030_production_hardening_scale_readiness.sql` adds distributed rate-limit buckets, durable work queue state and targeted indexes. Queue claims use `FOR UPDATE SKIP LOCKED` semantics through one atomic CTE/update statement.

Migration runner hardening adds an advisory lock and SHA-256 checksum tracking. Existing historical migrations with no checksum are backfilled once; after that, repository drift fails closed.

## Production configuration

Optional tuning variables are documented in `.env.example`. Defaults are bounded and production-safe. `SPOTRIQ_RATE_LIMIT_ENABLED` defaults to true in production. `SPOTRIQ_TRUST_PROXY_HOPS` defaults to one production proxy hop.

## Recovery

See `docs/runbooks/PRODUCTION_OPERATIONS.md`. Restore drills must be performed against a non-production database before relying on a backup procedure.
