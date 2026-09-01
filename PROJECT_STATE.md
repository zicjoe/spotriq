# Spotriq Project State

**Current implementation release:** v0.26.0  
**Implementation status:** Four-Category Financial Execution Adapter Parity implemented; dependency-aware local validation and external v0.26 acceptance pending.  
**Last state update:** 2026-09-01  
**Repository role:** Concise present-state map. Current repository remains implementation truth.

## 1. Product position

Spotriq is a **BSC financial-agent marketplace** for understanding what a wallet needs, discovering specialist financial AgentServices, evaluating evidence, hiring/activating services, reviewing scoped financial authority, executing only through independently satisfied deterministic gates, monitoring activity and measuring outcomes when defensible evidence exists.

Core lifecycle:

`Understand → Discover → Match → Evaluate → Compare → Hire / Activate → Permission Checkout → PermissionGrant where eligible → Guarded Execution where eligible → Monitor → Measure → Reassess`

Locked separation:

`AgentIdentity ≠ AgentListing ≠ AgentService ≠ Offer`

`Offer ≠ Quote ≠ Hire ≠ Payment ≠ Activation`

`PermissionProfile ≠ PermissionCheckout ≠ ScopedPermissionRequest ≠ PermissionGrant`

`Payment ≠ Permission ≠ Activation ≠ Execution ≠ Outcome`

AI may explain. Deterministic systems decide identity, evidence, compatibility, readiness, commercial state, authority eligibility, protocol targets, execution arguments, payment reconciliation and financial truth.

## 2. Current architecture

- `apps/web` — React/Vite marketplace UX.
- `apps/api` — Fastify API.
- `apps/worker` — worker seam.
- `@spotriq/domain`, `@spotriq/api-contracts` — canonical domain and REST contracts.
- `@spotriq/db` — PostgreSQL and immutable migrations.
- chain/evidence/PancakeSwap/Venus/market-context/Smart Money packages — deterministic BSC financial-data spine.
- `@spotriq/agent-registry`, `@spotriq/marketplace-supply`, `@spotriq/reference-agents` — ERC-8004 discovery/verification, Test Lab/readiness and four real first-party runtimes.
- `@spotriq/commercial` — Offer/Quote/Hire/Payment/Activation + Activation controls/revocation.
- `@spotriq/service-tasks` — Rebalancing JobIntent origin proof plus four-category Activation-bound read-only runtime tasks.
- `@spotriq/permission-checkout` — four-category reviewed authority scopes, immutable ScopedPermissionRequest and PermissionGrant reconciliation boundary.
- `@spotriq/financial-execution-adapters` — v0.26 category execution adapter catalog, deterministic preflight, exact-target/argument guards and persisted assessment state.
- Existing deep Rebalancing financial stack remains intact: `job-intents`, `authority`, `execution-guard`, `execution-plans`, `execution-boundary`, `controlled-execution`, `activity-outcomes`.

## 3. Externally accepted baseline

### v0.22 — external reference-agent acceptance ✅

All four reference services passed public runtime/A2A Agent Card, Marketplace Test Lab, BSC Testnet ERC-8004 registration/canonical verification and service↔identity reconciliation. Financial readiness remains distinct from identity/readiness evidence.

### v0.23 — commercial hiring/activation ✅

Production accepted all four through:

`FREE Offer → immutable Quote → idempotent Hire → Payment NOT_REQUIRED → ACTIVE read-only MarketplaceActivation`

No signing or financial authority is implied.

### v0.24 — four-category read-only runtime parity ✅

Production accepted:

`Activation → control profile → category ServiceTask → real runtime → observed runtime/monitoring state → truthful outcome classification → relationship revocation`

for RangeKeeper, GridPilot, YieldPilot and VenusGuard.

### v0.25 — Permission Checkout + scoped authority parity ✅

On 2026-09-01 production `pnpm verify:permission-checkout` passed all four reference services. Each real read-only Activation produced a category-specific immutable `BLOCKED` ScopedPermissionRequest with **no fabricated PermissionGrant**.

Accepted current truth:

`ACTIVE read-only Activation → reviewed authority scope → BLOCKED ScopedPermissionRequest → no PermissionGrant → no financial execution`

## 4. v0.26 implementation

v0.26 adds category-specific **financial execution adapters and guards** without granting current reference services authority and without submitting transactions.

### Rebalancing

Uses the existing sealed Rebalancing spine rather than duplicating it:

`JobIntent → bounded PermissionGrant → ExecutionPlan → FinancialExecutionBoundary → controlled execution`

The v0.26 adapter reports `LEGACY_REBALANCING_BOUNDARY` and delegates actual calldata guarding/dispatch to that already hardened path.

### Grid Trading

Adapter: PancakeSwap V3 exact-input-single only.

Guards include:

- exact reviewed V3 pool;
- reviewed capital asset must be one pool token;
- other pool token becomes token-out;
- canonical V3 router only;
- buyer recipient only;
- reviewed per-action/capital limits;
- non-zero minimum output;
- short-lived deadline no later than authority expiry;
- fresh pool/BSC state.

Multi-hop, multicall, Permit2, arbitrary routers and unlimited approvals are excluded.

### Yield Optimisation

Adapter: Venus ERC-20 vToken supply/withdraw only.

Guards include:

- exact allowlisted vToken;
- vToken underlying must equal the reviewed asset;
- reviewed per-action and allocation limits;
- `mint(uint256)` for supply;
- `redeemUnderlying(uint256)` for withdraw;
- fresh chain/market reads.

Borrowing, arbitrary transfers and native-asset Venus supply are not enabled by this adapter.

### Health Factor Monitoring / protective write

Adapter: narrowly scoped Venus protective writes.

Allowed modeled actions only:

- `repayBorrow(uint256)`;
- `mint(uint256)` as add-collateral.

Guards require exact reviewed market/underlying, explicit action allowlist, intervention cap, current health at/below reviewed trigger, and existing collateral-enabled state for add-collateral. Borrowing and collateral withdrawal are absent.

## 5. Fail-closed authority/execution truth

An execution adapter **does not create a PermissionGrant**.

Current first-party services remain `READ_ONLY` / financially `TESTNET_ONLY`, so v0.26 preflight intentionally returns blockers including:

- service financial readiness not satisfied;
- no independently reconciled PermissionGrant;
- any missing exact target/fresh-state prerequisite.

Even a future `READY_FOR_GUARD` result has `executionEligible = false` in the category adapter layer. v0.26 can prepare/validate exact calldata only after all prior gates pass; category signer provisioning and transaction dispatch remain a separate non-bypassable boundary. `categoryExecutionDispatchEnabled = false`.

## 6. Persistence

- No `DATABASE_URL` → memory fallback where supported.
- `DATABASE_URL` → PostgreSQL.
- Migrations `0001` through `0019` are present.
- Latest migration: `0019_four_category_financial_execution_adapters.sql`.

It persists deterministic `PREFLIGHT` / `GUARD` assessment artifacts keyed to `scoped_permission_requests`. These rows are not grants, transactions, receipts or outcomes.

## 7. v0.26 API / UX

New resources:

- `GET /v1/execution-adapters`
- `GET /v1/execution-adapters/:category`
- `POST /v1/scoped-permission-requests/:permissionRequestId/execution-preflight`
- `POST /v1/scoped-permission-requests/:permissionRequestId/execution-guard`
- `GET /v1/scoped-permission-requests/:permissionRequestId/execution-state`

Permission Checkout now shows the actual server-derived execution-adapter preflight after a reviewed scope is recorded. Current reference services show their implemented adapter plus exact blockers and **Execution dispatch: DISABLED**. There is no browser-only execution shortcut.

## 8. Network/deployment policy

- Marketplace discovery may use BSC Mainnet (`56`).
- Reference identity, authority and transaction development remain BSC Testnet (`97`).
- v0.26 execution-adapter acceptance is Testnet-only.
- Mainnet financial execution remains prohibited until explicitly approved.
- Railway hosts API/PostgreSQL; pre-deploy remains `pnpm db:migrate`; Vercel remains frontend direction.

## 9. Verification / release state

Repository gates:

- `pnpm --filter @spotriq/api build`
- `pnpm check`
- `pnpm verify:reference-acceptance`
- `pnpm verify:commercial-acceptance`
- `pnpm verify:activation-parity`
- `pnpm verify:permission-checkout`
- `pnpm verify:execution-adapter-parity`

Do **not** call v0.26 externally accepted until:

`local API build → pnpm check → commit/push → Railway migration 0019/deploy → v0.22 regression → v0.23 regression → v0.24 regression → v0.25 regression → v0.26 execution-adapter acceptance → record acceptance`

## 10. Roadmap position

**Current:** v0.26.0 implementation candidate — Four-Category Financial Execution Adapter Parity.

**Next after acceptance:** v0.27 — Four-Category Activity + Outcome Parity.
