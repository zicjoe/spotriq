# Spotriq Project State

**Current implementation release:** v0.34.0  
**Implementation status:** Agent Advantage Measurement + Report implemented; v0.33 externally accepted; dependency-aware local validation and external v0.34 acceptance pending.  
**Last state update:** 2026-09-02  
**Repository role:** concise present-state map; current repository remains implementation truth.

## Product position

Spotriq is a **BSC financial-agent marketplace**. It helps a wallet understand financial needs, discover and evaluate specialist AgentServices, hire/activate them, review scoped authority, observe runtime/execution state, measure only defensible outcomes, and decide whether to continue, switch, revoke or compose independent specialists into a reviewable plan.

Lifecycle:

`Understand → Discover → Match → Evaluate → Offer → Quote → Hire → Payment where required → Activation → Permission Checkout where required → PermissionGrant where real → Guarded Execution where eligible → Activity → Outcome → Explain → Continue / Switch / Revoke / Plan`

Locked separations:

`Payment ≠ Permission ≠ Activation ≠ Execution ≠ Outcome`

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

## Current architecture

- `apps/web` — React/Vite marketplace UX.
- `apps/api` — Fastify API.
- `apps/worker` — worker seam.
- `@spotriq/domain` + `@spotriq/api-contracts` — shared domain/API contracts.
- PostgreSQL migrations `0001`–`0026`.
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
- `@spotriq/grounded-explanations` — deterministic grounding packets + optional structured model explanation + post-generation grounding validation/fallback, with no decision/write authority.

## Current v0.34 implementation truth

Spotriq now produces deterministic, persisted **Agent Advantage Reports** downstream of Activation Activity & Outcomes. The report does not introduce a universal performance score and does not infer benefit from runtime or transaction success.

Each report separates:

- service contribution — whether an accepted Activation-bound structured observation was actually delivered;
- transaction evidence — whether an independently reconciled Activation-attributable transaction exists;
- financial outcome — the existing v0.27 measurement state/value;
- Agent Advantage — a stricter assessment that remains `Could Not Assess` unless a standardized evidence-backed advantage metric exists.

Every report has an explicit window from Activation start to the current deterministic reconciliation, or to relationship revocation for revoked Activations. Unchanged source facts reuse the same source fingerprint/report rather than manufacturing history merely because time passed.

Current FREE read-only reference services can truthfully show `serviceContribution = OBSERVED` while `transactionObserved = false`, `financialOutcome = Could Not Assess`, and `agentAdvantage = Could Not Assess`. That is expected rather than incomplete.

A transaction plus a generally measured financial outcome still does not become Agent Advantage automatically. The v0.34 engine only exposes `agentAdvantage.state = MEASURED` when the upstream outcome explicitly contains a standardized advantage metric with evidence references.

Migration:

`0027_agent_advantage_reports.sql`

New live acceptance gate:

`pnpm verify:agent-advantage`

## Network truth

- Marketplace discovery may use BSC Mainnet `56`.
- Reference identity/authority/execution acceptance remains BSC Testnet `97`.
- Mainnet financial execution remains prohibited until explicitly approved.

## Current validation state

Authoritative local gate:

`pnpm --filter @spotriq/api build → pnpm check`

Externally accepted regression verifier chain through v0.33:

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

v0.34 must not be recorded externally accepted until dependency-aware local checks, migration/deployment and `pnpm verify:agent-advantage` pass against the deployed API.

## Next milestone after v0.34 acceptance

**v0.35 — Observability + Marketplace/System Health.** Add structured runtime/provider/payment/chain/worker health and admin-grade diagnostics without weakening existing domain truth boundaries.
