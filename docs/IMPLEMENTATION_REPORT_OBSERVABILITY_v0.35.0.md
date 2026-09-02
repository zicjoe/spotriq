# Spotriq v0.35.0 — Observability + Marketplace/System Health

**Implementation status:** complete acceptance candidate. v0.34 is externally accepted; dependency-aware local/Railway/live v0.35 acceptance remains required.

## Goal

Add production-facing operational visibility for the Spotriq platform and marketplace integration surface without allowing infrastructure health to become marketplace trust, financial readiness, payment, authority, execution or outcome truth.

## Implementation

### New package

`@spotriq/observability`

It provides:

- deterministic `OperationalHealthSnapshot` construction;
- process-local API request/error/latency measurement;
- BSC RPC/provider operational checks through the existing chain boundary;
- database health projection;
- persisted Marketplace Test Lab/runtime freshness projection;
- payment-rail and Agent Studio integration posture;
- worker heartbeat freshness;
- redacted public projection;
- PostgreSQL and memory stores;
- explicit persisted snapshot history.

### Domain truth

The following remain distinct:

`operational health ≠ marketplace readiness ≠ trust ≠ payment ≠ permission ≠ execution ≠ outcome`

Every health snapshot declares `operationalOnly = true` and all decision-authority flags are `false`.

### Public API

`GET /v1/system/health`

Returns a redacted public operational snapshot. The existing lightweight `/health` deployment contract remains in place and now reports release `0.35.0`.

### Admin API

Bearer-protected, fail-closed routes:

- `GET /v1/admin/observability`
- `POST /v1/admin/observability/snapshots`
- `GET /v1/admin/observability/snapshots`

Admin access requires `SPOTRIQ_ADMIN_DIAGNOSTICS_TOKEN`. No configured token means the admin surface is disabled rather than anonymously exposed.

### Persistence

Migration `0028_operational_observability.sql` adds:

- `operational_health_snapshots`;
- `operational_worker_heartbeats`.

### Worker

`apps/worker` now emits a best-effort operational heartbeat every 30 seconds. Current job execution mode remains `API_INLINE`; heartbeat freshness is not a job-success or financial-execution assertion.

### Web

The web shell now includes a compact public system-health indicator showing platform and marketplace-operational state with explicit copy:

`Operational only — not an agent trust/readiness score.`

### Security posture

- Public diagnostics are redacted.
- Admin token comparison uses SHA-256 digests plus timing-safe comparison.
- No admin secret is returned through public capabilities.
- Runtime observability uses persisted Test Lab evidence rather than probing arbitrary operator URLs on health requests.
- Public snapshots are briefly cached to reduce health-endpoint amplification of upstream providers.
- Diagnostic text and endpoint references are sanitized before exposure.

## Tests

Focused `@spotriq/observability` tests cover:

1. healthy operational state cannot become readiness/payment/permission authority;
2. missing platform dependency configuration degrades aggregate platform health rather than reporting fully operational;
3. public projection redacts endpoint diagnostics and credentials;
4. elevated API 5xx rate degrades platform health without changing marketplace truth;
5. stale Test Lab evidence degrades runtime/marketplace observability without inventing a readiness transition;
6. worker heartbeat freshness remains separate from individual job success;
7. explicit snapshots persist and can be read as history.

API tests also cover public redaction, admin-disabled fail-closed behavior, invalid bearer rejection and authenticated snapshot/history persistence.

## Acceptance gate

`pnpm verify:observability`

The verifier confirms:

- compatible v0.35 `/health` deployment state;
- all required public operational components;
- redaction/non-authority invariants;
- v0.35 capability flags;
- fail-closed admin access;
- optional authenticated persisted snapshot/history round-trip when an acceptance token is supplied.

## Validation status in packaging environment

Completed:

- focused observability TypeScript semantic check with workspace links;
- focused observability test suite;
- architecture/foundation regression guard;
- repository `.mjs` syntax checks;
- changed TypeScript/TSX syntax transpilation;
- archive structure/version/migration consistency checks.

Not authoritative in the packaging sandbox:

- full dependency-aware `pnpm check`, because repository dependencies cannot be fetched there.

The user's Windows environment remains the authoritative dependency-aware acceptance gate.

## Next milestone after acceptance

**v0.36 — Security + Failure Injection Hardening.**

Focus on upstream outages, RPC divergence, stale/corrupt provider data, malicious operator metadata, payment adversarial/replay cases, DB/idempotency races, malformed Agent Cards, SSRF boundaries and partial-provider failure behavior.
