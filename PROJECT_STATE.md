# Spotriq Project State

**Current implementation release:** v0.36.0  
**Implementation status:** Security + Failure Injection Hardening implemented as an acceptance candidate; v0.35 is externally accepted; dependency-aware local/Railway/live v0.36 acceptance pending.  
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
- **v0.35 ✅** Observability + Marketplace/System Health with redacted public health, fail-closed admin diagnostics and non-authoritative operational state.

## Current architecture

- `apps/web` — React/Vite marketplace UX.
- `apps/api` — Fastify API.
- `apps/worker` — worker seam plus best-effort operational heartbeat.
- `@spotriq/domain` + `@spotriq/api-contracts` — shared domain/API contracts.
- PostgreSQL migrations `0001`–`0029`.
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
- `@spotriq/security-hardening` — shared hostile-input/SSRF/provider-response hardening used by Test Lab, BSC provider, commercial, Operator Workspace and Agent Studio boundaries.

## Current v0.36 implementation truth

Spotriq now has explicit hostile-input and failure-boundary hardening while keeping failure injection itself out of the production control plane.

The v0.36 defenses include:

- shared external-URL/public-network policy for runtime/payment/operator metadata;
- DNS resolution validation + pinned Test Lab transport and redirect revalidation;
- bounded Agent Card/MCP/provider JSON structures and response bytes;
- untrusted operator/Agent Studio text normalization and bidi/control-character rejection;
- bounded/validated JSON-RPC envelopes, IDs and method-specific evidence;
- secondary RPC failover after corrupt provider responses;
- BSC provider block-divergence detection surfaced as operational degradation only;
- stronger x402/B402 transaction/receipt/log/timestamp coherence;
- database-enforced concurrent payment replay handling mapped to domain errors;
- durable Activation idempotency claims across concurrent requests;
- explicit absence of a production failure-injection endpoint.

Migration:

`0029_security_failure_injection_hardening.sql`

New live acceptance gate:

`pnpm verify:security-hardening`

Security hardening does not create marketplace readiness, trust, payment, PermissionGrant, execution or outcome authority.

## Network truth

- Marketplace discovery may use BSC Mainnet `56`.
- Reference identity/authority/execution acceptance remains BSC Testnet `97`.
- Mainnet financial execution remains prohibited until explicitly approved.

## Current validation state

Authoritative local gate:

`pnpm --filter @spotriq/api build → pnpm check`

Externally accepted regression verifier chain through v0.35:

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
- `pnpm verify:observability`

v0.36 must not be recorded externally accepted until dependency-aware local checks, migration/deployment and `pnpm verify:security-hardening` pass against the deployed API.

## Next milestone after v0.36 acceptance

**v0.37 — Production Hardening + Scale Readiness.** Mature queue/worker operation, caching/indexes, rate limiting/API abuse protection, operational runbooks, migration resilience, backup/recovery and deployment hardening without approving BSC Mainnet financial execution.
