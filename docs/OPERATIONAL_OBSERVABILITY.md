# Spotriq Operational Observability

Spotriq v0.35 adds deterministic operational visibility without turning infrastructure health into financial or marketplace authority.

## Locked boundary

`Operational health ≠ marketplace readiness ≠ trust ≠ payment ≠ PermissionGrant ≠ execution eligibility ≠ financial outcome`

A healthy API, RPC, runtime, payment adapter or Agent Studio integration says only that the observed operational component is functioning within its stated checks. It does not make an AgentService ready, trusted, paid, authorized, safe, profitable or financially successful.

Every `OperationalHealthSnapshot` therefore carries explicit non-authority flags for marketplace readiness, financial readiness, trust, payment, permission, execution and outcomes.

## Public health surface

`GET /v1/system/health`

The public response is intentionally redacted. It exposes:

- overall platform state;
- overall marketplace-operational state;
- component state for API, database, BSC RPC, Marketplace Test Lab, agent runtime posture, payment rails, Agent Studio and worker/jobs;
- freshness/limitations where useful;
- process-local request metrics that are safe to publish.

It does not expose endpoint URLs, credentials, database connection information, bearer tokens or admin diagnostic strings. Public snapshots are briefly cached so a health page cannot amplify RPC/provider traffic.

The legacy Railway `GET /health` endpoint remains the lightweight deployment/liveness contract. The richer v0.35 endpoint is additive rather than a replacement for the existing Railway health gate.

## Admin diagnostics

Authenticated diagnostics are separate from the public surface:

- `GET /v1/admin/observability`
- `POST /v1/admin/observability/snapshots`
- `GET /v1/admin/observability/snapshots?limit=20`

Set server-side:

`SPOTRIQ_ADMIN_DIAGNOSTICS_TOKEN`

Clients authenticate with `Authorization: Bearer <token>`. If the variable is not configured, admin diagnostics fail closed with `503 ADMIN_DIAGNOSTICS_NOT_CONFIGURED`. If configured but the bearer token is missing/incorrect, they fail closed with `401 ADMIN_DIAGNOSTICS_AUTH_REQUIRED`.

The token is never returned through capabilities or public health responses.

## Component semantics

### API

Uses process-local request counters and bounded latency samples. Elevated server-error rates can degrade operational platform health. This is not a financial-risk score.

### Database

Uses the existing database health probe. PostgreSQL health influences platform availability only.

### BSC RPC

Uses the existing BSC chain reader and exposes provider/chain degradation without leaking configured RPC query strings or secrets. Failover or chain mismatch can be visible diagnostically while remaining separate from AgentService readiness.

### Marketplace Test Lab

Observability reads persisted Marketplace Test Lab coverage and timestamps. Freshness defaults are:

- target age: 21,600 seconds (6 hours);
- stale after: 86,400 seconds (24 hours).

These can be tuned with:

- `SPOTRIQ_OBSERVABILITY_TESTLAB_TARGET_AGE_SECONDS`
- `SPOTRIQ_OBSERVABILITY_TESTLAB_STALE_AFTER_SECONDS`

A stale test observation degrades operational visibility; it does not directly rewrite canonical marketplace-readiness records.

### Agent runtimes

Health is derived from bounded persisted Test Lab observations for known/local AgentServices. The health request does **not** probe arbitrary operator-supplied runtime URLs. This avoids creating a parallel SSRF/probing surface merely to render a status page.

### Payment rails

The component reports configured adapter/reconciliation posture. It never marks an individual Hire paid and cannot replace canonical settlement reconciliation.

### Agent Studio

The component reports normalized integration posture. It cannot upgrade Studio declarations into canonical identity or marketplace readiness.

### Worker/jobs

The worker emits a best-effort persisted heartbeat. Default freshness thresholds are:

- stale after 90 seconds;
- unavailable after 300 seconds.

They can be changed with:

- `SPOTRIQ_OBSERVABILITY_WORKER_STALE_AFTER_SECONDS`
- `SPOTRIQ_OBSERVABILITY_WORKER_UNAVAILABLE_AFTER_SECONDS`

Current Smart Money work remains `API_INLINE`. Therefore absence of a dedicated queue-worker heartbeat is not treated as proof that an inline job failed, and a fresh heartbeat never proves an individual financial job succeeded.

## Persistence

Migration:

`0028_operational_observability.sql`

It adds:

- `operational_health_snapshots` for explicit admin-triggered persisted health history;
- `operational_worker_heartbeats` for latest worker operational posture.

Public reads do not create database history merely because somebody refreshed a page. Snapshot persistence is an explicit admin operation.

## Acceptance

Core production acceptance does not require a secret merely to prove the architecture. The verifier confirms that unauthenticated admin diagnostics fail closed.

```powershell
pnpm verify:observability
```

To additionally exercise authenticated snapshot/history persistence, configure a strong secret in Railway as `SPOTRIQ_ADMIN_DIAGNOSTICS_TOKEN`, then set the same value locally for the verifier:

```powershell
$env:SPOTRIQ_ACCEPTANCE_ADMIN_DIAGNOSTICS_TOKEN="<same secret configured in Railway>"
pnpm verify:observability
```

Do not commit the secret.
