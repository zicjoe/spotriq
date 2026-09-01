# Spotriq v0.25.0 Implementation Report — Permission Checkout + Scoped Financial Authority Parity

**Implementation date:** 2026-09-01  
**Status:** implementation candidate complete; local dependency-aware validation and production acceptance pending.

## Delivered

- New `@spotriq/permission-checkout` package.
- Category-specific deterministic Permission Checkout scopes for Rebalancing, Grid, Yield and Health.
- Idempotent buyer/Activation-bound checkout creation.
- Immutable scope hashing and commercial-terms snapshot linkage.
- Explicit allowed/denied actions, limits, validity, approval mode, cost separation, risks and blockers.
- Immutable `ScopedPermissionRequest` persistence.
- Buyer permission-state API.
- Exact Rebalancing bridge to the existing JobIntent/Altana bounded authority stack.
- Exact provider-grant reconciliation checks; no client-declared grant state.
- Migration `0018_permission_checkout_scoped_authority.sql`.
- Real API-backed Permission Checkout UI replacing the old mock checkout path.
- API capability flags, tests, architecture guard and `verify:permission-checkout` live acceptance verifier.

## Deliberately not claimed

- Grid financial execution — not implemented.
- Yield financial execution — not implemented.
- VenusGuard protective writes — not implemented.
- Current reference-service PermissionGrants — not created.
- Mainnet financial authority — not approved.
- Financial outcome from reviewing a permission scope — impossible by definition.

## Current reference acceptance expectation

Because all four first-party reference services remain `READ_ONLY` / `TESTNET_ONLY`, v0.25 production acceptance is expected to prove:

`ACTIVE read-only Activation → BLOCKED category PermissionCheckout → immutable BLOCKED ScopedPermissionRequest → no PermissionGrant`

This is a successful safety result, not an incomplete flow.
