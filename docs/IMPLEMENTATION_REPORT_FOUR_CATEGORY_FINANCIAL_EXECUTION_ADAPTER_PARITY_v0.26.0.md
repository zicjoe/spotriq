# Spotriq v0.26.0 Implementation Report

## Four-Category Financial Execution Adapter Parity

**Implementation date:** 2026-09-01  
**Release state:** implementation candidate; local dependency-aware validation and production acceptance pending.

## Baseline

v0.25 is externally accepted. Production verified all four current reference services through read-only Activation → category Permission Checkout → immutable BLOCKED ScopedPermissionRequest with no fabricated PermissionGrant.

## Objective

Bring protocol/action/argument execution depth across Rebalancing, Grid, Yield and Health without equating an implemented adapter with authority, signer access, transaction submission or financial outcome.

## Architecture delivered

New package: `@spotriq/financial-execution-adapters`.

It provides:

- adapter catalog for all four categories;
- deterministic preflight tied to `ScopedPermissionRequest` + `MarketplaceActivation` + current service readiness;
- exact target/argument guard preparation;
- persisted memory/PostgreSQL preflight and guard assessments;
- no category transaction dispatch.

### Rebalancing

Delegates to the existing sealed JobIntent/Altana/ExecutionPlan/FinancialExecutionBoundary/controlled-execution architecture. No duplicate execution path or signer was created.

### Grid

Models only PancakeSwap V3 `exactInputSingle`. Guarding binds the reviewed pool to the canonical PancakeSwap V3 factory, verifies token membership/capital asset, uses the canonical router, fixes recipient to the buyer, applies reviewed amount limits, requires a non-zero minimum output and constrains deadline to a short-lived interval no later than permission expiry.

### Yield

Models only ERC-20 Venus vToken `mint(uint256)` and `redeemUnderlying(uint256)`. The reviewed vToken/underlying pair must be independently rediscoverable through Spotriq's Venus adapter and match the immutable scope. Amounts are bounded by reviewed per-action/allocation limits.

### Health

Models only protective Venus `repayBorrow(uint256)` and add-collateral `mint(uint256)`. The selected vToken/underlying/action must be reviewed; amount must fit the intervention cap; current Venus wallet state must put health at/below the reviewed trigger; add-collateral additionally requires the selected market already to be observed collateral-enabled.

## Fail-closed boundary

A v0.26 adapter does not create or infer a PermissionGrant. Preflight separately requires:

- adapter implemented;
- BSC Testnet;
- ACTIVE matching buyer/service Activation;
- unexpired ScopedPermissionRequest;
- service financial readiness;
- independently reconciled PermissionGrant;
- exact target scope;
- fresh BSC state.

Current first-party services remain read-only/financially non-ready and have no financial PermissionGrant, so they remain `BLOCKED`. For a blocked current service, the guard returns no prepared calldata.

Even future passing category guards remain `PASS_BUT_EXECUTION_BLOCKED` until a distinct non-bypassable signer/boundary consumes the exact reconciled grant. API capability `categoryExecutionDispatchEnabled` remains `false`.

## Persistence

Migration `0019_four_category_financial_execution_adapters.sql` adds `financial_execution_adapter_assessments` linked by foreign key to `scoped_permission_requests`. Records are typed `PREFLIGHT` or `GUARD` and are not transaction/outcome evidence.

## API

Added:

- `GET /v1/execution-adapters`
- `GET /v1/execution-adapters/:category`
- `POST /v1/scoped-permission-requests/:permissionRequestId/execution-preflight`
- `POST /v1/scoped-permission-requests/:permissionRequestId/execution-guard`
- `GET /v1/scoped-permission-requests/:permissionRequestId/execution-state`

## UX

Permission Checkout loads the real execution preflight after the reviewed request is persisted. It shows adapter implementation/mode, exact blocking checks and `Execution dispatch: DISABLED`. There is no fake client-only Execute transition.

## Acceptance contract

New verifier: `pnpm verify:execution-adapter-parity`.

It must prove on deployed BSC Testnet-backed production:

- all four adapters are implemented and Testnet-only;
- exact category targets can be scoped;
- adapter check passes;
- current service financial readiness / PermissionGrant gates fail truthfully;
- current preflight is BLOCKED and `executionEligible=false`;
- blocked Grid/Yield/Health receive no prepared call;
- Rebalancing delegates to the legacy sealed boundary;
- preflight/guard assessments persist;
- no unauthorized transaction is claimed or submitted.

## Required release gate

`pnpm --filter @spotriq/api build → pnpm check → commit/push → Railway migration 0019 → production health → v0.22/v0.23/v0.24/v0.25 regressions → pnpm verify:execution-adapter-parity`
