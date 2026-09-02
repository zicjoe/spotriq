# Spotriq Project State

**Current implementation release:** v0.37.0  
**Implementation status:** Production Hardening + Scale Readiness implemented as an acceptance candidate; v0.36 is externally accepted; dependency-aware local/Railway/live v0.37 acceptance pending.  
**Last state update:** 2026-09-02  
**Repository role:** concise present-state map; current repository remains implementation truth.

## Product position

Spotriq is a **BSC financial-agent marketplace**. It helps a wallet understand financial needs, discover and evaluate specialist AgentServices, hire/activate them, review scoped authority, observe runtime/execution state, measure only defensible outcomes, understand those outcomes, and decide whether to continue, switch, revoke or compose independent specialists into a reviewable plan.

Locked separations remain:

`Payment ≠ Permission ≠ Activation ≠ Execution ≠ Outcome`

`Service contribution ≠ Transaction ≠ Financial outcome ≠ Agent Advantage`

`Operational health ≠ marketplace readiness ≠ trust ≠ payment ≠ permission ≠ execution ≠ outcome`

`Production scalability ≠ financial authority ≠ mainnet execution approval`

`Plan ≠ Super-agent`

**AI explains. Deterministic systems decide.**

## Externally accepted baseline

- **v0.22 ✅** Four reference runtimes + Test Lab + canonical BSC Testnet ERC-8004 acceptance.
- **v0.23 ✅** Commercial FREE Offer → Quote → Hire → Activation.
- **v0.24 ✅** Four-category runtime/control parity.
- **v0.25 ✅** Permission Checkout parity.
- **v0.26 ✅** Four-category execution-adapter parity.
- **v0.27 ✅** Activity + Outcome parity.
- **v0.28 ✅** My Agents + switching/revocation + marketplace UX.
- **v0.29 ✅** Smart Money Plans + deterministic conflict handling.
- **v0.30 ✅** Operator Workspace + canonical owner gating.
- **v0.31 ✅** ERC-8183/x402/B402 paid reconciliation.
- **v0.32 ✅** BNB Agent Studio normalized integration.
- **v0.33 ✅** Grounded AI Explanation Layer.
- **v0.34 ✅** Agent Advantage Measurement + Report.
- **v0.35 ✅** Observability + Marketplace/System Health.
- **v0.36 ✅** Security + Failure Injection Hardening.

## Current architecture

- `apps/web` — React/Vite marketplace UX.
- `apps/api` — Fastify API.
- `apps/worker` — operational worker/maintenance queue consumer with graceful lease/drain behavior.
- PostgreSQL migrations `0001`–`0030`.
- Existing deterministic BSC/DeFi/marketplace/commercial/permission/execution/outcome/operator/AI/observability/security packages remain intact.
- `@spotriq/production-hardening` — distributed rate-limit buckets, durable lease/retry/dead-letter queue primitives, conservative cache policy and production retry helpers.

## Current v0.37 implementation truth

v0.37 hardens the production control plane without changing financial decision truth:

- bounded Fastify request body, request timeout and connection timeout;
- trusted-proxy hop configuration rather than unrestricted forwarded-IP trust;
- distributed PostgreSQL read/write rate-limit buckets in production;
- process-local emergency limiter when the distributed bucket store degrades;
- conservative response caching/security headers with commercial/permission/buyer/write state kept private/no-store;
- configurable PostgreSQL pool, connection, idle and statement timeouts;
- serialized migration execution with a PostgreSQL advisory lock;
- SHA-256 historical migration checksum tracking/drift rejection;
- targeted indexes for common buyer/history paths;
- durable maintenance work queue with idempotent enqueue, `SKIP LOCKED` leases, bounded retries, lease recovery and dead-letter state;
- worker maintenance processing and graceful in-flight drain;
- backup/restore/deploy/rollback operations runbook.

Migration:

`0030_production_hardening_scale_readiness.sql`

New acceptance gate:

`pnpm verify:production-hardening`

Financial Smart Money work remains:

`API_INLINE`

and:

`workerFinancialJobDispatchEnabled = false`

No BSC Mainnet financial execution has been approved.

## Current validation state

Authoritative local gate:

`pnpm --filter @spotriq/api build → pnpm check`

Externally accepted regression verifier chain through v0.36 remains required before the v0.37 gate.

v0.37 must not be recorded externally accepted until local checks, migration/deployment, prior regressions and `pnpm verify:production-hardening` pass against the deployed API.

## Next milestone after v0.37 acceptance

**v0.38 — Ecosystem Adoption + Judge/Public Launch Readiness.** Prepare polished public documentation, architecture/adoption evidence, demo playbook, production screenshots/evidence and BNB ecosystem adoption materials without silently enabling BSC Mainnet financial execution.
