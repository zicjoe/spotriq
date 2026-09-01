# Spotriq Engineering Status

**Release candidate:** v0.26.0  
**Date:** 2026-09-01  
**State:** Four-Category Financial Execution Adapter Parity implemented; local dependency-aware validation and external acceptance pending.

## Accepted baseline

Production acceptance is complete through v0.25:

- v0.22 — four reference runtimes/Test Lab/ERC-8004 reconciliation;
- v0.23 — FREE Offer → Quote → Hire → NOT_REQUIRED payment → read-only Activation;
- v0.24 — four-category Activation-bound runtime/control/revocation parity;
- v0.25 — four-category Permission Checkout; all current reference services persist immutable BLOCKED ScopedPermissionRequests and no fake PermissionGrant.

## v0.26 architecture

New package: `@spotriq/financial-execution-adapters`.

It owns:

- four-category adapter catalog;
- deterministic execution preflight;
- exact target/argument guard preparation;
- memory/PostgreSQL assessment persistence;
- no transaction dispatch.

The category adapter layer intentionally exposes `executionEligible: false`; it proves preparedness/guard state, not signing or execution.

### Rebalancing

`LEGACY_REBALANCING_BOUNDARY`. Existing v0.16–v0.20 deep execution architecture remains authoritative. No duplicate execution stack was introduced.

### Grid

PancakeSwap V3 `exactInputSingle` only. Guard checks reviewed pool/token membership, canonical router, buyer recipient, reviewed amount caps, non-zero min output, deadline/expiry and fresh chain/pool state. Multi-hop/multicall/Permit2/unlimited approval are out of scope.

### Yield

Venus ERC-20 vToken `mint` / `redeemUnderlying` only. Guard checks exact allowlisted vToken, exact underlying asset, reviewed amount/allocation limits and fresh reads. Borrow/native-asset supply are excluded.

### Health

Protective `repayBorrow` / add-collateral `mint` only. Guard checks exact market/underlying, explicit reviewed protective action, intervention cap, fresh health trigger and existing collateral-enabled state for add-collateral. Borrow/collateral-withdraw are absent.

## Current authority truth

A category adapter never creates a PermissionGrant.

Grid/Yield/Health Permission Checkout no longer reports “adapter missing”; it now reports the remaining **authority-provider bridge** requirement. Current first-party services also remain `READ_ONLY` / not financially READY, so preflight fails closed before calldata preparation.

Future category dispatch requires a separately implemented non-bypassable signer/boundary that consumes an exact independently reconciled grant. Capability `categoryExecutionDispatchEnabled` remains `false`.

## Persistence

Migration `0019_four_category_financial_execution_adapters.sql` adds `financial_execution_adapter_assessments` with `PREFLIGHT` / `GUARD` payloads tied by FK to `scoped_permission_requests`.

Assessment evidence is not PermissionGrant/transaction/receipt/outcome evidence.

## API

- `GET /v1/execution-adapters`
- `GET /v1/execution-adapters/:category`
- `POST /v1/scoped-permission-requests/:permissionRequestId/execution-preflight`
- `POST /v1/scoped-permission-requests/:permissionRequestId/execution-guard`
- `GET /v1/scoped-permission-requests/:permissionRequestId/execution-state`

Fastify error handling preserves explicit client/protocol error semantics rather than flattening everything to 500.

## Web

Permission Checkout now loads v0.26 preflight after the reviewed ScopedPermissionRequest exists. It displays adapter state/mode and deterministic blockers, plus **Execution dispatch: DISABLED**. There is no client-side financial execution shortcut.

## Verification

Static repository guard: `pnpm verify`.

Accepted regression verifiers:

- `pnpm verify:reference-acceptance`
- `pnpm verify:commercial-acceptance`
- `pnpm verify:activation-parity`
- `pnpm verify:permission-checkout`

New v0.26 acceptance contract:

- `pnpm verify:execution-adapter-parity`

It must prove all four adapters are implemented/testnet-only, exact target scope passes, current services remain blocked at real readiness/grant gates, blocked services receive no prepared financial call, Rebalancing delegates to the existing boundary and assessments persist.

## Release gate

`pnpm --filter @spotriq/api build → pnpm check → commit/push → Railway migration 0019 → deployment → four prior acceptance regressions → verify:execution-adapter-parity`

Do not call v0.26 externally accepted before this sequence passes.

## Next milestone after acceptance

**v0.27 — Four-Category Activity + Outcome Parity.**
