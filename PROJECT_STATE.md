# Spotriq Project State

**Current implementation release:** v0.30.0  
**Implementation status:** Operator Supply Lifecycle + Workspace implemented; v0.29 externally accepted; dependency-aware local validation and external v0.30 acceptance pending.  
**Last state update:** 2026-09-01  
**Repository role:** concise present-state map; current repository remains implementation truth.

## Product position

Spotriq is a **BSC financial-agent marketplace**. It helps a wallet understand financial needs, discover/evaluate specialist AgentServices, hire/activate them, review scoped authority, observe execution/runtime state, measure only defensible outcomes, and decide whether to continue, switch, revoke or compose independent specialists into a reviewable plan.

Lifecycle:

`Understand → Discover → Match → Evaluate → Hire / Activate → Permission Checkout → PermissionGrant where eligible → Guarded Execution where eligible → Activity → Outcome → Continue / Switch / Revoke / Plan`

Locked separation:

`Payment ≠ Permission ≠ Activation ≠ Execution ≠ Outcome`

`Plan ≠ Super-agent`

AI explains. Deterministic systems decide.

## Externally accepted baseline

- **v0.22 ✅** Four public reference runtimes + Test Lab + canonical BSC Testnet ERC-8004 reconciliation.
- **v0.23 ✅** FREE Offer → Quote → Hire → NOT_REQUIRED payment → ACTIVE read-only Activation for all four.
- **v0.24 ✅** Four-category Activation-bound runtime/control/revocation parity.
- **v0.25 ✅** Four-category Permission Checkout; immutable blocked requests for current read-only services; no fake PermissionGrant.
- **v0.26 ✅** Four-category execution-adapter/argument-guard acceptance without unauthorized dispatch.
- **v0.27 ✅** Four-category Activation Activity + Outcome parity; missing transaction/performance evidence remains `Could Not Assess`.
- **v0.28 ✅** Live buyer My Agents portfolio + persisted switching/revocation + live profile/compare/Test Lab UX.
- **v0.29 ✅** Smart Money Plans + deterministic compatibility/conflict handling; no shared signer, PermissionGrant, Activation or execution session.

## Current architecture

- `apps/web` — React/Vite marketplace UX.
- `apps/api` — Fastify API.
- `apps/worker` — worker seam.
- shared `@spotriq/domain` and `@spotriq/api-contracts`.
- PostgreSQL migrations `0001`–`0023`.
- deterministic BSC, PancakeSwap, Venus, market-context and Smart Money packages.
- ERC-8004 discovery, marketplace supply/readiness/Test Lab, and four first-party reference runtimes.
- `@spotriq/commercial` — Offer/Quote/Hire/Payment/Activation/control/revocation.
- `@spotriq/service-tasks` — attributed read-only category runtimes.
- `@spotriq/permission-checkout` — reviewed authority + immutable ScopedPermissionRequest.
- `@spotriq/financial-execution-adapters` — category preflight/exact argument guards.
- `@spotriq/activity-outcomes` — controlled Rebalancing outcomes + Activation-scoped four-category outcome truth.
- `@spotriq/my-agents` — buyer portfolio aggregation, fail-closed relationship ending and persisted service switching.
- `@spotriq/smart-money-plans` — finding/service composition + deterministic capital/authority/protocol/readiness/network conflict assessment.
- **`@spotriq/operator-workspace` — signed operator authentication, canonical owner claims, provider lifecycle/declarations and Operator Supplied evidence.**

## v0.29 — Smart Money Plans + Compatibility/Conflict Handling

A live Smart Money Check can now create a persisted buyer-scoped plan from its actual findings. Each finding is deterministically matched to a specialist AgentService; an already-active compatible service is reused preferentially rather than duplicating the relationship.

A plan member retains:

`Finding → FindingServiceMatch → AgentService → readiness → existing Activation/authority state`

Plans explicitly assess:

- missing compatible service;
- service readiness;
- BSC network mismatch;
- overlapping assets/capital;
- overlapping protocol scope;
- independently reconciled financial-authority overlap;
- one service being assigned multiple specialist roles;
- already-active relationships;
- stale finding context.

Conflict severity is deterministic:

- **BLOCK** — genuine contradiction such as no compatible service, wrong network, unavailable service or overlapping independently active financial authority;
- **WARN** — review-required conditions such as shared capital/assets, TESTNET_ONLY readiness or stale findings;
- **INFO** — non-blocking facts such as shared protocol scope or reuse of an existing relationship.

A plan always declares:

`activationMode = INDEPENDENT_PER_SERVICE`

`authorityMode = INDEPENDENT_PER_SERVICE`

`executionMode = NO_SHARED_EXECUTION`

There is no live “Activate Plan” shortcut. Member hiring, Permission Checkout and execution remain independent service-specific journeys.

## Persistence

Latest migration:

`0022_smart_money_plans.sql`

Plan idempotency is buyer-scoped. Changed finding composition cannot reuse an existing plan idempotency key.

## API

- `POST /v1/checks/:checkSessionId/plans`
- `GET  /v1/plans/:planId`
- `GET  /v1/accounts/:address/plans`

## Safety / network truth

- Discovery may use BSC Mainnet `56`.
- Reference identity/authority/execution acceptance remains BSC Testnet `97`.
- Mainnet financial execution remains prohibited until explicitly approved.
- A Smart Money Plan never creates a shared signer, PermissionGrant, Activation, transaction or financial outcome.

## Verification

Authoritative local gate:

`pnpm --filter @spotriq/api build → pnpm check`

Accepted production regression verifiers remain:

- `pnpm verify:reference-acceptance`
- `pnpm verify:commercial-acceptance`
- `pnpm verify:activation-parity`
- `pnpm verify:permission-checkout`
- `pnpm verify:execution-adapter-parity`
- `pnpm verify:activity-outcome-parity`
- `pnpm verify:my-agents`

New v0.29 gate:

`pnpm verify:smart-money-plans`

Do not call v0.29 externally accepted until local validation, migration `0022`, Railway deployment and the verifier chain pass.

## Next roadmap milestone after acceptance

**v0.30 — Operator Supply Lifecycle + Workspace.**

## v0.30 — Operator Supply Lifecycle + Workspace

Operator writes now require a one-time EIP-191 wallet challenge, an expiring server session and canonical ERC-8004 ownership matching the authenticated wallet. A public address is not authentication.

Operators can claim identities they canonically own, persist DRAFT/SUBMITTED/ACTIVE/PAUSED/SUSPENDED/RETIRED service declarations, declare HTTPS runtime endpoints, commercial terms and permission requirements, submit Operator Supplied evidence, and trigger the bounded Marketplace Test Lab for services they own.

Operator declarations remain distinct from Marketplace Observed evidence and canonical chain evidence. Operators cannot force readiness to `READY`, fabricate payment/PermissionGrant/execution/outcome evidence, or use lifecycle state as financial authority.

Latest migration: `0023_operator_supply_lifecycle.sql`.

New acceptance: `pnpm verify:operator-workspace`.
