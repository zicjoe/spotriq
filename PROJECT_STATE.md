# Spotriq Project State

**Current implementation release:** v0.35.0  
**Implementation status:** Observability + Marketplace/System Health implemented as an acceptance candidate; v0.34 is externally accepted; dependency-aware local/Railway/live v0.35 acceptance pending.  
**Last state update:** 2026-09-02  
**Repository role:** concise present-state map; current repository remains implementation truth.

## Product position

Spotriq is a **BSC financial-agent marketplace**. It helps a wallet understand financial needs, discover and evaluate specialist AgentServices, hire/activate them, review scoped authority, observe runtime/execution state, measure only defensible outcomes, understand those outcomes, and decide whether to continue, switch, revoke or compose independent specialists into a reviewable plan.

Lifecycle:

`Understand → Discover → Match → Evaluate → Offer → Quote → Hire → Payment where required → Activation → Permission Checkout where required → PermissionGrant where real → Guarded Execution where eligible → Activity → Outcome → Agent Advantage where measurable → Explain → Continue / Switch / Revoke / Plan`

Locked separations:

`Payment ≠ Permission ≠ Activation ≠ Execution ≠ Outcome`

`Service contribution ≠ Transaction ≠ Financial outcome ≠ Agent Advantage`

`Operational health ≠ marketplace readiness ≠ trust ≠ payment ≠ permission ≠ execution ≠ outcome`

`Plan ≠ Super-agent`

`Agent Studio deployment ≠ canonical identity ≠ marketplace readiness ≠ payment ≠ PermissionGrant ≠ execution`

`Evidence ≠ AI explanation`

**AI explains. Deterministic systems decide.**

## Externally accepted baseline

- **v0.22 ✅** Four public reference runtimes + Marketplace Test Lab + canonical BSC Testnet ERC-8004 reconciliation.
- **v0.23 ✅** FREE Offer → Quote → Hire → NOT_REQUIRED payment → ACTIVE read-only Activation for all four categories.
- **v0.24 ✅** Four-category Activation-bound runtime/control/revocation parity.
- **v0.25 ✅** Four-category Permission Checkout; no fabricated PermissionGrant.
- **v0.26 ✅** Four-category execution-adapter/argument-guard acceptance without unauthorized dispatch.
- **v0.27 ✅** Four-category Activation Activity + Outcome parity; missing transaction/performance evidence remains `Could Not Assess`.
- **v0.28 ✅** Live My Agents + safe switching/revocation + live marketplace profile/compare/Test Lab UX.
- **v0.29 ✅** Smart Money Plans + deterministic compatibility/conflict handling; no shared signer, PermissionGrant, Activation or execution session.
- **v0.30 ✅** Signed Operator Workspace + canonical ERC-8004 ownership-gated supply lifecycle.
- **v0.31 ✅** Provider-neutral ERC-8183/x402/B402 paid reconciliation with payment dispatch disabled.
- **v0.32 ✅** BNB Agent Studio normalized integration with canonical-owner reconciliation and no CLI/readiness/payment/execution bypass.
- **v0.33 ✅** Grounded AI Explanation Layer with deterministic grounding packets, citation/decision-grade validation and safe fallback.
- **v0.34 ✅** Agent Advantage Measurement + Report with explicit windows and preserved `Could Not Assess` truth boundaries.

## Current architecture

- `apps/web` — React/Vite marketplace UX.
- `apps/api` — Fastify API.
- `apps/worker` — worker seam plus best-effort operational heartbeat.
- `@spotriq/domain` + `@spotriq/api-contracts` — shared domain/API contracts.
- PostgreSQL migrations `0001`–`0028`.
- deterministic BSC, PancakeSwap, Venus, market-context and Smart Money packages.
- ERC-8004 discovery, marketplace supply/readiness/Test Lab, and four first-party reference runtimes.
- `@spotriq/commercial` — Offer/Quote/Hire/Payment/Activation/control/revocation.
- `@spotriq/service-tasks` — attributed read-only category runtimes.
- `@spotriq/permission-checkout` — reviewed authority + immutable ScopedPermissionRequest.
- `@spotriq/financial-execution-adapters` — category preflight/exact argument guards.
- `@spotriq/activity-outcomes` — Activation-scoped four-category activity/outcome truth.
- `@spotriq/my-agents` — buyer portfolio, fail-closed relationship ending and persisted service switching.
- `@spotriq/smart-money-plans` — finding/service composition + deterministic conflict assessment with independent specialist boundaries.
- `@spotriq/operator-workspace` — signed operator authentication, canonical owner claims, supply lifecycle/declarations and Operator Supplied evidence.
- `@spotriq/payment-rails` — provider-neutral ERC-8183/x402/B402 reconciliation.
- `@spotriq/agent-studio` — normalized BNB Agent Studio declarations + canonical/runtime reconciliation without CLI custody.
- `@spotriq/grounded-explanations` — deterministic grounding packets + optional structured model explanation + post-generation validation/fallback, with no decision/write authority.
- `@spotriq/agent-advantage` — explicit-window, source-fingerprint-idempotent Agent Advantage reports without financial benefit inference.
- `@spotriq/observability` — deterministic operational health, redacted public projection, admin diagnostics/history and worker heartbeat persistence with no marketplace/financial decision authority.

## Current v0.35 implementation truth

Spotriq now has a separate **operational observability plane**. It reports infrastructure/integration health without modifying canonical marketplace or financial state.

The v0.35 snapshot covers:

- API request/error/latency posture;
- PostgreSQL health;
- BSC RPC/provider health;
- Marketplace Test Lab freshness;
- AgentService runtime operational posture derived from persisted Test Lab evidence;
- payment-rail adapter posture;
- Agent Studio integration posture;
- worker/job heartbeat posture.

The public endpoint is:

`GET /v1/system/health`

It is redacted, briefly cached, and intentionally distinct from the existing lightweight Railway `/health` deployment probe.

Admin-only diagnostics/history are:

- `GET /v1/admin/observability`
- `POST /v1/admin/observability/snapshots`
- `GET /v1/admin/observability/snapshots`

They fail closed unless `SPOTRIQ_ADMIN_DIAGNOSTICS_TOKEN` is configured and a valid bearer token is supplied.

Runtime health does not probe arbitrary operator URLs during a health request. It uses bounded persisted Marketplace Test Lab evidence, preventing observability from becoming a parallel SSRF/probing system.

Every operational snapshot explicitly declares that it has **no authority** over marketplace readiness, financial readiness, trust, payment, PermissionGrant state, execution eligibility or outcomes.

Migration:

`0028_operational_observability.sql`

New live acceptance gate:

`pnpm verify:observability`

## Network truth

- Marketplace discovery may use BSC Mainnet `56`.
- Reference identity/authority/execution acceptance remains BSC Testnet `97`.
- Mainnet financial execution remains prohibited until explicitly approved.

## Current validation state

Authoritative local gate:

`pnpm --filter @spotriq/api build → pnpm check`

Externally accepted regression verifier chain through v0.34:

- `pnpm verify:reference-acceptance`
- `pnpm verify:commercial-acceptance`
- `pnpm verify:activation-parity`
- `pnpm verify:permission-checkout`
- `pnpm verify:execution-adapter-parity`
- `pnpm verify:activity-outcome-parity`
- `pnpm verify:my-agents`
- `pnpm verify:smart-money-plans`
- `pnpm verify:operator-workspace`
- `pnpm verify:paid-rails`
- `pnpm verify:agent-studio`
- `pnpm verify:grounded-explanations`
- `pnpm verify:agent-advantage`

v0.35 must not be recorded externally accepted until dependency-aware local checks, migration/deployment and `pnpm verify:observability` pass against the deployed API.

## Next milestone after v0.35 acceptance

**v0.36 — Security + Failure Injection Hardening.** Exercise upstream outages, RPC divergence, stale/corrupt provider data, malicious operator metadata, payment replay/adversarial cases, DB/idempotency races, malformed Agent Cards, SSRF boundaries and partial-provider failures while preserving every existing fail-closed truth boundary.
