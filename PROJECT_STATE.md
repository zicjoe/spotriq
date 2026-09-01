# Spotriq Project State

**Current implementation release:** v0.25.0  
**Implementation status:** Permission Checkout + Scoped Financial Authority Parity implemented; dependency-aware local validation and external v0.25 acceptance pending.  
**Last state update:** 2026-09-01  
**Repository role:** Concise present-state map. Current repository remains implementation truth.

## 1. Product position

Spotriq is a **BSC financial-agent marketplace** for understanding a wallet need, discovering specialist financial AgentServices, evaluating evidence, hiring/activating a service relationship, reviewing exactly what financial authority would be required, observing activity and measuring outcomes when evidence exists.

Core lifecycle:

`Understand → Discover → Match → Evaluate → Compare → Try → Hire / Activate → Permission Checkout where needed → Authorize → Execute where independently eligible → Monitor → Measure → Reassess`

Locked separation:

`AgentIdentity ≠ AgentListing ≠ AgentService ≠ Offer`

`Offer ≠ Quote ≠ Hire ≠ Payment ≠ Activation`

`PermissionProfile ≠ PermissionCheckout ≠ ScopedPermissionRequest ≠ PermissionGrant`

`Payment ≠ Permission ≠ Activation ≠ Execution ≠ Outcome`

AI may explain; deterministic systems decide identity, compatibility, readiness, commercial state, authority eligibility, payment reconciliation, runtime attribution and financial truth.

## 2. Current applications/packages

- `apps/web` — React/Vite marketplace UX.
- `apps/api` — Fastify API.
- `apps/worker` — worker seam.
- `@spotriq/domain` / `@spotriq/api-contracts` — canonical domain + REST contracts.
- `@spotriq/db` — PostgreSQL and immutable migrations.
- chain/evidence/PancakeSwap/Venus/Grid/Smart Money packages — deterministic financial-data spine.
- `@spotriq/agent-registry`, `@spotriq/marketplace-supply`, `@spotriq/reference-agents` — ERC-8004 discovery/verification, Test Lab/readiness and four real reference runtimes.
- `@spotriq/commercial` — Offer/Quote/Hire/Payment/Activation + Activation controls/revocation.
- `@spotriq/service-tasks` — Rebalancing JobIntent origin proof plus four-category Activation-bound read-only runtime tasks.
- `@spotriq/permission-checkout` — category-specific Permission Checkout, immutable ScopedPermissionRequest, buyer permission state and exact Rebalancing grant-reconciliation bridge.
- Existing Rebalancing financial stack remains intact: `job-intents`, `authority`, `execution-guard`, `execution-plans`, `execution-boundary`, `controlled-execution`, `activity-outcomes`.

## 3. Externally accepted baseline

### v0.22 — COMPLETE

All four reference services passed public runtime/A2A Agent Card, Marketplace Test Lab, BSC Testnet ERC-8004 registration/canonical verification and service↔identity reconciliation. Financial readiness remains `TESTNET_ONLY`.

### v0.23 — COMPLETE

Production acceptance passed all four through:

`FREE Offer → immutable Quote → idempotent Hire → Payment NOT_REQUIRED → ACTIVE read-only MarketplaceActivation`

No signing or financial execution authority is implied.

### v0.24 — COMPLETE

On 2026-09-01 the deployed production API passed:

- `pnpm verify:reference-acceptance` — all four PASS;
- `pnpm verify:commercial-acceptance` — all four PASS;
- `pnpm verify:activation-parity` — all four PASS.

Accepted read-only runtime path:

`Activation → control profile → category ServiceTask → real reference runtime → observed runtime/monitoring state → truthful outcome classification → marketplace relationship revocation`

for RangeKeeper, GridPilot, YieldPilot and VenusGuard.

## 4. v0.25 implementation

v0.25 adds a separate deterministic **Permission Checkout** layer. It does not silently upgrade a read-only Activation and it does not manufacture a PermissionGrant.

### Category scope contracts

- **Rebalancing** — exact PancakeSwap position, token0/token1 spend caps, action-count/expiry/approval mode; can bridge to the existing Rebalancing JobIntent + Altana bounded permission spine only when all prerequisites are satisfied.
- **Grid** — exact PancakeSwap pool, capital asset, capital/per-action/action-count bounds; current GridPilot remains blocked until a genuine category execution adapter + argument guard exist.
- **Yield** — exact asset, optional allowed Venus markets, capital/per-action/action-count bounds; current YieldPilot remains blocked until bounded supply/withdraw/reallocation execution exists.
- **Health** — protective-write tier only, reviewed asset/markets, `REPAY` and/or `ADD_COLLATERAL`, health trigger/intervention/action-count bounds; current VenusGuard remains blocked until a genuine protective-write adapter exists.

Every scope explicitly states allowed and denied actions, validity, approval mode, cost separation, risk/failure behavior and deterministic blockers.

### Current reference-service truth

The four reference services still declare `READ_ONLY` and are financially `TESTNET_ONLY`. Therefore current Permission Checkout intentionally produces:

`BLOCKED PermissionCheckout → immutable BLOCKED ScopedPermissionRequest → no PermissionGrant`

with blockers such as `SERVICE_READ_ONLY`, `SERVICE_NOT_FINANCIALLY_READY` and the category-specific execution prerequisite. Reviewing a scope records user intent; it does not make the service financially executable.

### Grant reconciliation bridge

Only the existing deep Rebalancing path can currently become provider-ready, and only when the exact buyer/service/position JobIntent is `AWAITING_AUTHORITY`, the service is financially ready, and the reviewed scope has no blockers. A later Altana grant must independently reconcile as ACTIVE/onchain-valid/`EXACT_MATCH` with the exact bounded request and spend caps before Spotriq links it. Even then, `PermissionGrant ≠ Execution`.

## 5. Persistence

- No `DATABASE_URL` → memory fallback where supported.
- `DATABASE_URL` → PostgreSQL.
- Migrations `0001` through `0018` are present.
- Latest migration: `0018_permission_checkout_scoped_authority.sql`.

It adds durable `permission_checkout_sessions` and `scoped_permission_requests` without mutating previous migrations.

## 6. v0.25 API / UX

New resources:

- `POST /v1/activations/:activationId/permission-checkouts`
- `GET /v1/activations/:activationId/permission-checkout`
- `GET /v1/permission-checkouts/:checkoutId`
- `POST /v1/permission-checkouts/:checkoutId/confirm`
- `POST /v1/permission-checkouts/:checkoutId/cancel`
- `GET /v1/scoped-permission-requests/:permissionRequestId`
- `POST /v1/scoped-permission-requests/:permissionRequestId/reconcile`
- `GET /v1/accounts/:address/permission-state`

The old mock checkout has been replaced by an API-backed Permission Checkout page. It starts from a real ACTIVE marketplace relationship and clearly states when the result is only a reviewed scope with authority blocked.

## 7. Network/deployment policy

- Marketplace discovery may use BSC Mainnet (`56`).
- Reference identity, authority and transactional development remain BSC Testnet (`97`).
- v0.25 rejects mainnet financial-authority acceptance; mainnet transactional authority remains out of scope until explicitly approved.
- Railway hosts API/PostgreSQL; Railway pre-deploy remains `pnpm db:migrate`; Vercel remains frontend direction.

## 8. Verification / release state

Repository commands:

- `pnpm --filter @spotriq/api build`
- `pnpm check`
- `pnpm verify:reference-acceptance`
- `pnpm verify:commercial-acceptance`
- `pnpm verify:activation-parity`
- `pnpm verify:permission-checkout`

The packaging environment can run architecture/static/syntax checks but not the user's full dependency-aware workspace gate. Do **not** call v0.25 externally accepted until:

`local API build → pnpm check → commit/push → Railway migration 0018/deploy → v0.22 regression → v0.23 regression → v0.24 regression → v0.25 Permission Checkout acceptance → record acceptance`

## 9. Roadmap position

**Current:** v0.25.0 implementation candidate — Permission Checkout + Scoped Financial Authority Parity.

**Next after acceptance:** v0.26 — Four-Category Financial Execution Adapter Parity, bringing Grid/Yield/Health toward Rebalancing's guarded execution depth without copying incompatible semantics.
