# Spotriq Engineering Status

**Release candidate:** v0.25.0  
**Date:** 2026-09-01  
**State:** Permission Checkout + Scoped Financial Authority Parity implemented; dependency-aware local validation and external v0.25 acceptance pending.

## Accepted production baseline

v0.22 external reference acceptance, v0.23 commercial hiring acceptance and v0.24 four-category read-only Activation/runtime parity are externally accepted. On 2026-09-01 all three live verifiers passed for RangeKeeper, GridPilot, YieldPilot and VenusGuard.

The governing boundary remains:

`PermissionProfile ≠ PermissionCheckout ≠ ScopedPermissionRequest ≠ PermissionGrant ≠ Execution`

and:

`Payment ≠ Permission ≠ Activation ≠ Execution ≠ Outcome`

## v0.25 architecture

### `@spotriq/permission-checkout`

New domain package with memory/PostgreSQL stores and deterministic methods to:

- create idempotent buyer/Activation-bound Permission Checkouts;
- freeze category-specific reviewed scope behind `scopeHash`;
- derive immutable commercial-cost context, risk/failure context and blockers;
- create immutable `ScopedPermissionRequest` resources;
- expose buyer permission state;
- cancel unreconciled checkout/request state;
- reconcile a real provider PermissionGrant only through the existing bounded Rebalancing authority path when every exact-match prerequisite passes.

No client `paid`, `verified`, `activationEligible` or `permissionGranted` flag can satisfy these server-side gates.

### Four category contracts

Rebalancing, Grid, Yield and Health each receive explicit targets/actions/denials/limits rather than a generic opaque permission blob. Current reference services remain READ_ONLY/TESTNET_ONLY and therefore blocked from write authority. Grid/Yield/Health additionally require category-specific guarded execution adapters before provider submission can become possible.

### Rebalancing bridge

v0.25 does not replace `@spotriq/authority`. If a future/eligible Rebalancing service has a matching JobIntent in `AWAITING_AUTHORITY`, the checkout can prepare the existing `BoundedPermissionRequest`. A provider grant must later be ACTIVE, onchain-valid, `EXACT_MATCH`, belong to the same buyer/service/JobIntent and match the reviewed token caps before reconciliation.

### Persistence

Migration `0018_permission_checkout_scoped_authority.sql` adds:

- `permission_checkout_sessions`;
- `scoped_permission_requests`;
- buyer/idempotency, Activation, service and grant-link constraints/indexes.

No historical migration is changed.

## API surface

- `POST /v1/activations/:activationId/permission-checkouts`
- `GET /v1/activations/:activationId/permission-checkout`
- `GET /v1/permission-checkouts/:checkoutId`
- `POST /v1/permission-checkouts/:checkoutId/confirm`
- `POST /v1/permission-checkouts/:checkoutId/cancel`
- `GET /v1/scoped-permission-requests/:permissionRequestId`
- `POST /v1/scoped-permission-requests/:permissionRequestId/reconcile`
- `GET /v1/accounts/:address/permission-state`

Framework/client errors retain their real 4xx/5xx classes; `PermissionCheckoutError` has explicit mapping.

## UX

The old mock Reference Checkout is replaced by `PermissionCheckoutPage`, backed by real marketplace/commercial/permission APIs. It requires a real ACTIVE service relationship, shows category-specific allowed/denied authority, limits, validity and approval mode, then server-derived cost/risk/blocker review. Current reference services end truthfully at **Scope reviewed — authority not granted**.

## Verification

Local release gate:

```powershell
pnpm install
pnpm --filter @spotriq/api build
pnpm check
```

Production regression/acceptance after Railway migration `0018`:

```powershell
pnpm verify:reference-acceptance
pnpm verify:commercial-acceptance
pnpm verify:activation-parity
pnpm verify:permission-checkout
```

The v0.25 verifier creates fresh FREE read-only relationships, records category-specific reviewed scopes for all four reference services and proves each remains blocked with no fabricated PermissionGrant.

## Next milestone after acceptance

**v0.26 — Four-Category Financial Execution Adapter Parity.**
