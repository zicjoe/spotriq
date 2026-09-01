# Permission Checkout + Scoped Financial Authority

Spotriq v0.25 introduces a deterministic review layer between a commercial service relationship and any future financial permission.

## Boundary

`MarketplaceActivation → PermissionCheckout → ScopedPermissionRequest → PermissionGrant → Execution`

Every arrow is a separate gate. A resource on the left never proves the resource on the right exists.

## Why this exists

A user must be able to answer, before any financial authority is possible:

- what service/job is this for?
- which position, pool, asset or market can be touched?
- which actions are allowed?
- which actions are explicitly denied?
- what capital/action/intervention limits apply?
- how long can the authority live?
- is execution automatic within bounds or confirmation-gated?
- what costs are known vs `Could Not Assess`?
- what readiness/provider blockers still prevent a grant?

## Current reference-agent behavior

RangeKeeper, GridPilot, YieldPilot and VenusGuard are still read-only financial services. Their v0.25 checkout is useful because it records a truthful proposed authority contract and its blockers; it must **not** upgrade their service declaration or create a grant.

Expected current state:

`BLOCKED PermissionCheckout → BLOCKED ScopedPermissionRequest → no PermissionGrant`

## Category semantics

### Rebalancing

Exact LP position + bounded token0/token1 spend + action count + expiry. Only this category currently has an existing provider/guard/execution spine, via the prior JobIntent/Altana architecture.

### Grid

Exact V3 pool + capital asset + total/per-action/action-count bounds. No write authority until a bounded Grid execution adapter and argument guard exist.

### Yield

Exact asset + optional allowed Venus markets + allocation/action bounds. No borrowing and no unrelated protocol authority.

### Health

Protective-write authority only: repay and/or add collateral, bounded by asset/markets, health trigger, intervention cap and intervention frequency. Borrowing and collateral withdrawal are explicitly denied.

## Grant reconciliation

A browser cannot tell Spotriq that a grant exists. Rebalancing grant linkage requires independent provider/onchain reconciliation to the exact existing bounded permission request. Grant reconciliation still does not execute a transaction.
