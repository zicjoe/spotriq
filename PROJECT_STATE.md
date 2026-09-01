# Spotriq Project State

**Current implementation release:** v0.28.0  
**Implementation status:** My Agents + Switching/Revocation + Marketplace UX Completion implemented; dependency-aware local validation and external v0.28 acceptance pending.  
**Last state update:** 2026-09-01  
**Repository role:** concise present-state map; current repository remains implementation truth.

## Product position

Spotriq is a **BSC financial-agent marketplace**. It helps a wallet understand financial needs, discover/evaluate specialist AgentServices, hire/activate them, review scoped authority, observe runtime/execution state, measure only defensible outcomes, and decide whether to continue, switch or end a relationship.

Lifecycle:

`Understand → Discover → Match → Evaluate → Hire / Activate → Permission Checkout → PermissionGrant where eligible → Guarded Execution where eligible → Activity → Outcome → Continue / Switch / Revoke`

Locked separation:

`Payment ≠ Permission ≠ Activation ≠ Execution ≠ Outcome`

`Technical observation ≠ financial outcome`

AI explains. Deterministic systems decide.

## Externally accepted baseline

- **v0.22 ✅** Four public reference runtimes + Test Lab + canonical BSC Testnet ERC-8004 reconciliation.
- **v0.23 ✅** FREE Offer → Quote → Hire → NOT_REQUIRED payment → ACTIVE read-only Activation for all four.
- **v0.24 ✅** Four-category Activation-bound runtime/control/revocation parity.
- **v0.25 ✅** Four-category Permission Checkout; immutable blocked requests for current read-only services; no fake PermissionGrant.
- **v0.26 ✅** Four-category execution-adapter/argument-guard acceptance without unauthorized dispatch.
- **v0.27 ✅** Four-category Activation Activity + Outcome parity; missing transaction/performance evidence remains `Could Not Assess`.

## Current architecture

- `apps/web` — React/Vite marketplace UX.
- `apps/api` — Fastify API.
- `apps/worker` — worker seam.
- shared `@spotriq/domain` and `@spotriq/api-contracts`.
- PostgreSQL migrations `0001`–`0021`.
- deterministic BSC, PancakeSwap, Venus, market-context and Smart Money packages.
- ERC-8004 discovery, marketplace supply/readiness/Test Lab, and four first-party reference runtimes.
- `@spotriq/commercial` — Offer/Quote/Hire/Payment/Activation/control/revocation.
- `@spotriq/service-tasks` — attributed read-only category runtimes.
- `@spotriq/permission-checkout` — reviewed authority + immutable ScopedPermissionRequest.
- `@spotriq/financial-execution-adapters` — category preflight/exact argument guards.
- `@spotriq/activity-outcomes` — controlled Rebalancing execution outcomes + Activation-scoped four-category outcome truth.
- **`@spotriq/my-agents` — buyer portfolio aggregation, fail-closed relationship ending and persisted service switching.**

## v0.28 — My Agents + Switching/Revocation + Marketplace UX Completion

My Agents is now a real buyer-scoped resource rather than sample portfolio data.

It aggregates, without merging their meanings:

`MarketplaceActivation`
`+ PermissionCheckout / ScopedPermissionRequest / PermissionGrant link`
`+ Activation control`
`+ runtime Activity + Outcome`
`+ same-category replacement candidates`

New behavior:

- active and historical relationships are returned for one buyer wallet;
- exact authority state is visible independently from commercial state;
- financial outcome remains `Could Not Assess` unless prior outcome evidence supports more;
- relationship ending is blocked when an independently reconciled PermissionGrant would be stranded;
- switching is idempotent and persisted;
- a replacement service must be same-category, same-network and truthfully FREE/read-only in the current live switch path;
- replacement Activation is established before the source marketplace relationship is revoked;
- changed-input reuse of a switch idempotency key returns conflict rather than overwriting immutable switch intent.

Marketplace UX completion:

- Agent Profile reads live `MarketplaceServiceRecord` and Test Lab evidence;
- Compare reads live marketplace/readiness/commercial facts and does not invent a winner;
- Try runs the bounded Marketplace Test Lab rather than scripted portfolio returns;
- My Agents no longer presents sample costs, returns, fills, reviews or fabricated performance as buyer state.

## Persistence

Latest migration:

`0021_my_agents_switching.sql`

It persists switch attempts/history separately from Activations and PermissionGrants.

## API

- `GET  /v1/accounts/:address/my-agents`
- `GET  /v1/accounts/:address/my-agents/switches`
- `POST /v1/accounts/:address/my-agents/:activationId/switch`
- `POST /v1/accounts/:address/my-agents/:activationId/revoke`

Existing low-level Activation revocation also checks for a reconciled PermissionGrant when the Permission Checkout engine is available.

## Safety / network truth

- Discovery may use BSC Mainnet `56`.
- Reference identity/authority/execution acceptance remains BSC Testnet `97`.
- Mainnet financial execution remains prohibited until explicitly approved.
- My Agents switching does not revoke or manufacture an independent PermissionGrant.

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

New v0.28 gate:

`pnpm verify:my-agents`

Do not call v0.28 externally accepted until local validation, migration `0021`, Railway deployment and the full verifier chain pass.

## Next roadmap milestone after acceptance

**v0.29 — Smart Money Plans + Compatibility/Conflict Handling.**

`Plan ≠ Super-agent`; plan composition must preserve service, capital, authority, protocol and evidence boundaries.
