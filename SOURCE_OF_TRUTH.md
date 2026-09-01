# Spotriq Source of Truth

**Current repository release:** **v0.27.0**  
**Release status:** Four-Category Activity + Outcome Parity implementation candidate; v0.26 externally accepted; local dependency-aware validation and external v0.27 acceptance pending.  
**State date:** 2026-09-01

## Authority hierarchy

1. Current repository / latest replacement ZIP — implementation truth.
2. `PROJECT_STATE.md` — concise current product/engineering state.
3. `SPOTRIQ_FOUNDATION.md` — locked product doctrine.
4. `PROJECT_OPERATING_RULES.md` — engineering workflow.
5. `CORRECTED_ROADMAP.md` — active milestone sequence.
6. `SPOTRIQ_DRIFT_AUDIT.md` — foundation/alignment history.
7. `docs/` — subsystem/release detail.
8. Old conversations — historical reasoning only.

Do not override implemented code with stale conversation assumptions. Do not discard roadmap obligations merely because they are not implemented yet.

## Product truth

Spotriq is a **BSC financial-agent marketplace**, not a generic agent marketplace or super-agent.

Primary lifecycle:

`wallet need → deterministic finding → real AgentService → evidence/readiness → recommendation → Offer → Quote → Hire → payment where required → MarketplaceActivation → Permission Checkout where required → independently reconciled PermissionGrant → guarded execution where eligible → activity → outcome`

Locked invariants:

`AgentIdentity ≠ AgentListing ≠ AgentService ≠ Offer`

`Offer ≠ Quote ≠ Hire ≠ Payment ≠ Activation`

`PermissionProfile ≠ PermissionCheckout ≠ ScopedPermissionRequest ≠ PermissionGrant`

`Payment ≠ Permission ≠ Activation ≠ Execution ≠ Outcome`

`AgentAction ≠ Blockchain Transaction`

`Transaction ≠ Outcome`

`Evidence ≠ AI explanation`

AI explains. Deterministic systems decide.

## Required financial categories

All remain first-class:

1. Rebalancing — RangeKeeper.
2. Grid Trading — GridPilot.
3. Yield Optimisation — YieldPilot.
4. Health Factor Monitoring — VenusGuard.

The project must not regress to Rebalancing-only product depth.

## Network truth

- Discovery may use BSC Mainnet (`chainId 56`).
- Reference identity/authority/execution acceptance uses BSC Testnet (`chainId 97`).
- `AGENT_DISCOVERY_CHAIN_ID` and reference execution/registry chain are separate concepts.
- Mainnet financial execution is prohibited until explicitly approved.

## Accepted release truth

### v0.22 ✅

Four public first-party reference runtimes + A2A Agent Cards + Test Lab + BSC Testnet ERC-8004 canonical registration/reconciliation accepted.

### v0.23 ✅

Four-category FREE commercial lifecycle accepted:

`Offer → Quote → Hire → Payment NOT_REQUIRED → ACTIVE read-only MarketplaceActivation`

### v0.24 ✅

Four-category read-only activation/runtime parity accepted:

`Activation → control → category ServiceTask → runtime observation → truthful monitoring/outcome state → relationship revocation`

### v0.25 ✅

On 2026-09-01 `verify:permission-checkout` passed all four production reference services. Category-specific reviewed scopes persisted as immutable `BLOCKED` ScopedPermissionRequests with **no PermissionGrant fabricated**.

Current reference services therefore remain commercial/read-only relationships, not financial delegates.

## v0.26 implementation truth

New package: `@spotriq/financial-execution-adapters`.

Purpose: make the protocol/action/argument layer explicit for all four categories while continuing to fail closed until independent authority and financial readiness are real.

### Adapter catalog

- **Rebalancing:** `LEGACY_REBALANCING_BOUNDARY`; delegates to the existing deep Rebalancing JobIntent/Altana/ExecutionPlan/FinancialExecutionBoundary/controlled-execution stack.
- **Grid:** PancakeSwap V3 `exactInputSingle` only, exact reviewed pool/token pair, canonical router, buyer recipient, bounded amount/deadline/min-output.
- **Yield:** Venus ERC-20 vToken `mint(uint256)` / `redeemUnderlying(uint256)` only, exact reviewed market/underlying and amount limits.
- **Health:** Venus protective `repayBorrow(uint256)` / add-collateral `mint(uint256)` only, exact reviewed market/underlying/action/intervention cap plus fresh health-trigger state.

Excluded by design include arbitrary routers, multicall, Permit2, unlimited approvals, unrelated markets, borrowing for Yield, borrowing/withdrawal for Health, and mainnet execution.

### Preflight truth

A preflight independently checks:

- adapter implementation;
- BSC Testnet policy;
- ACTIVE buyer/service Activation;
- unexpired ScopedPermissionRequest;
- service financial readiness;
- independently reconciled PermissionGrant;
- exact target scope;
- fresh BSC state.

Current four reference services fail service-readiness and PermissionGrant gates. Adapter implementation cannot upgrade them.

### Guard truth

Grid/Yield/Health guard preparation occurs only when deterministic preflight is `READY_FOR_GUARD`. Blocked current services receive **no prepared call**.

Rebalancing returns `LEGACY_BOUNDARY_REQUIRED` because actual calldata safety/dispatch remains in the existing sealed Rebalancing boundary.

Even a future category guard that passes returns `PASS_BUT_EXECUTION_BLOCKED`; v0.26 does not provide a category signer or submit a transaction. Capability truth:

`fourCategoryFinancialExecutionAdapterParityEnabled = true`

`categoryArgumentGuardEnabled = true`

`categoryExecutionDispatchEnabled = false`

## Persistence truth

Migrations are immutable and currently run through:

`0019_four_category_financial_execution_adapters.sql`

v0.26 adds `financial_execution_adapter_assessments` for persisted `PREFLIGHT` and `GUARD` artifacts linked to `scoped_permission_requests`.

These records are assessment evidence only. They are not PermissionGrants, Blockchain Transactions, receipts or Outcomes.

## HTTP truth

Current v0.26 resources include:

- `GET /v1/execution-adapters`
- `GET /v1/execution-adapters/:category`
- `POST /v1/scoped-permission-requests/:permissionRequestId/execution-preflight`
- `POST /v1/scoped-permission-requests/:permissionRequestId/execution-guard`
- `GET /v1/scoped-permission-requests/:permissionRequestId/execution-state`

Existing commercial/Activation/ServiceTask/Permission Checkout APIs remain valid and independent.

## UI truth

The Permission Checkout is API-backed. After a reviewed ScopedPermissionRequest exists, the UI loads the server-side v0.26 execution preflight and shows:

- adapter implementation/mode;
- exact deterministic blockers;
- dispatch disabled status.

It does not expose a fake financial Execute path for current reference services.

## Acceptance commands

Accepted regression contracts:

- `pnpm verify:reference-acceptance`
- `pnpm verify:commercial-acceptance`
- `pnpm verify:activation-parity`
- `pnpm verify:permission-checkout`

Current candidate contract:

- `pnpm verify:execution-adapter-parity`

v0.26 external acceptance requires local API build + `pnpm check`, Railway migration/deploy, all regression verifiers and the v0.26 verifier.

## Roadmap position

- v0.22–v0.25 — **externally accepted**.
- v0.26 — **externally accepted**.
- v0.27 — **implementation candidate:** Four-Category Activity + Outcome Parity.
- v0.28 — My Agents + switching/revocation + marketplace UX completion, next after v0.27 acceptance.
- v0.29 — Smart Money Plans + compatibility/conflict handling.
- Later — paid rails expansion, operator workspace, Agent Studio depth, AI explanation layer, Agent Advantage, observability/security/production hardening and mainnet readiness only after explicit approval.


## v0.27 current implementation truth

- `@spotriq/activity-outcomes` now contains both the legacy controlled-Rebalancing execution outcome engine and a distinct Activation-scoped four-category reconciliation engine.
- Migration `0020_four_category_activity_outcomes.sql` persists Activation activity/outcome links without converting them into transaction records.
- New Activation endpoints expose/sync activity timelines and outcome snapshots.
- `technicalObservation` is independent from `financialOutcome`. When transaction/performance evidence is absent, financial truth is `COULD_NOT_ASSESS / Could Not Assess`.
- Grid context does not become PnL/fills; Yield current APY does not become realised yield; Health monitoring does not become protective effect; read-only Rebalancing analysis does not become an executed rebalance.
- v0.27 is not externally accepted until local checks, Railway migration/deployment and `pnpm verify:activity-outcome-parity` pass together with all prior regression verifiers.
