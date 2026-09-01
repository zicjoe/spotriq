# Spotriq Project State

**Current implementation release:** v0.27.0  
**Implementation status:** Four-Category Activity + Outcome Parity implemented; dependency-aware local validation and external v0.27 acceptance pending.  
**Last state update:** 2026-09-01  
**Repository role:** Concise present-state map. Current repository remains implementation truth.

## 1. Product position

Spotriq is a **BSC financial-agent marketplace** that helps a wallet understand financial needs, discover/evaluate specialist AgentServices, hire/activate them, review scoped authority, pass deterministic execution gates, observe activity and measure outcomes only when defensible evidence exists.

Lifecycle:

`Understand → Discover → Match → Evaluate → Hire / Activate → Permission Checkout → PermissionGrant where eligible → Guarded Execution where eligible → Activity → Outcome → Reassess`

Locked separation:

`Payment ≠ Permission ≠ Activation ≠ Execution ≠ Outcome`

`Technical observation ≠ financial outcome`

`Guarded calldata ≠ transaction`

`Transaction success ≠ strategy success`

AI may explain. Deterministic systems decide identity, evidence, readiness, authority, protocol targets, execution safety and financial truth.

## 2. Externally accepted baseline

- **v0.22 ✅** Four public reference agents: runtime/Test Lab/ERC-8004 canonical acceptance.
- **v0.23 ✅** `FREE Offer → Quote → Hire → NOT_REQUIRED payment → ACTIVE read-only Activation` for all four.
- **v0.24 ✅** Activation-bound category runtime parity and marketplace relationship revocation for all four.
- **v0.25 ✅** Four category Permission Checkout scopes persist as immutable BLOCKED ScopedPermissionRequests for current read-only services; no fake PermissionGrant.
- **v0.26 ✅** Four category financial execution-adapter acceptance passed. Exact target/argument adapters exist, but current reference services remain blocked at real readiness/PermissionGrant gates and no unauthorized transaction is dispatched.

## 3. Current architecture

- `apps/web` — React/Vite marketplace UX.
- `apps/api` — Fastify API.
- `apps/worker` — worker seam.
- `@spotriq/domain`, `@spotriq/api-contracts` — shared domain/REST truth.
- `@spotriq/db` — PostgreSQL migrations `0001`–`0020`.
- deterministic BSC/PancakeSwap/Venus/market-context/Smart Money packages.
- ERC-8004 registry, marketplace supply/Test Lab and four first-party reference runtimes.
- `@spotriq/commercial` — Offer/Quote/Hire/Payment/Activation/control/revocation.
- `@spotriq/service-tasks` — attributed A2A runtime tasks across all four categories.
- `@spotriq/permission-checkout` — reviewed category authority + immutable ScopedPermissionRequest.
- `@spotriq/financial-execution-adapters` — category preflight and exact call guards.
- `@spotriq/activity-outcomes` — legacy controlled Rebalancing execution outcomes **plus v0.27 Activation-scoped four-category Activity & Outcomes reconciliation**.

## 4. v0.27 — Four-Category Activity + Outcome Parity

v0.27 extends outcome truth beyond the older controlled-Rebalancing-only view.

For any category Activation Spotriq can reconcile:

`MarketplaceActivation`
`→ ServiceTask/runtime observation`
`→ Permission Checkout / ScopedPermissionRequest`
`→ execution preflight / guard assessment`
`→ relationship revocation`
`→ persisted Activation activity timeline`
`→ Activation outcome snapshot`

New outcome truth includes:

- `transactionObserved = false` unless a future independently reconciled transaction is actually linked;
- technical observation state is separate from financial outcome state;
- absent transaction/performance evidence is explicitly `COULD_NOT_ASSESS / Could Not Assess`;
- category metrics are observational only:
  - Rebalancing — range/current-tick state;
  - Grid — regime/confidence/TWAP dispersion where available;
  - Yield — opportunity count/current base APY observations;
  - Health — Venus pool/risk monitoring observations.

Spotriq does **not** infer:

- Grid fills, PnL or drawdown from market context;
- realised yield from current APY;
- Health protective effect or avoided liquidation from a monitoring snapshot;
- Rebalancing success from read-only position analysis.

The older v0.20 controlled Rebalancing transaction outcome path remains intact for actual independently reconciled Rebalancing execution evidence.

## 5. Persistence

Latest migration:

`0020_four_category_activity_outcomes.sql`

It extends the existing `activity_events`, `outcome_windows` and `outcome_metrics` foundation for Activation-scoped category evidence while keeping controlled-execution records separate.

No `DATABASE_URL` → memory fallback where supported.  
`DATABASE_URL` → PostgreSQL.

## 6. v0.27 API / UX

New Activation resources:

- `POST /v1/activations/:activationId/activity-outcomes/sync`
- `GET  /v1/activations/:activationId/activity-outcomes`
- `GET  /v1/activations/:activationId/activity`
- `GET  /v1/activations/:activationId/outcome`

Explore surfaces the reconciled event count, technical observation state and truthful financial-outcome status after an activation-bound runtime task exists.

Capabilities expose:

- `fourCategoryActivityOutcomeParityEnabled = true`
- `activationOutcomeCouldNotAssessEnabled = true`

## 7. Network / safety policy

- Marketplace discovery may use BSC Mainnet `56`.
- Reference identity, authority and financial development remain BSC Testnet `97`.
- Category execution dispatch remains disabled for the current read-only reference services.
- Mainnet financial execution remains prohibited until explicitly approved.

## 8. Verification / release state

Local gates:

- `pnpm --filter @spotriq/api build`
- `pnpm check`

Regression/live gates:

- `pnpm verify:reference-acceptance`
- `pnpm verify:commercial-acceptance`
- `pnpm verify:activation-parity`
- `pnpm verify:permission-checkout`
- `pnpm verify:execution-adapter-parity`
- `pnpm verify:activity-outcome-parity`

Do **not** call v0.27 externally accepted until local checks, Railway migration `0020`, deployment and all six live acceptance gates pass.

## 9. Roadmap position

**Current:** v0.27.0 implementation candidate — Four-Category Activity + Outcome Parity.

**Next after acceptance:** v0.28 — My Agents + Switching/Revocation + Marketplace UX Completion.
