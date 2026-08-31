# Spotriq v0.24.0 Implementation Report

## Four-Category End-to-End Activation Parity

**Implemented:** 2026-08-31  
**Acceptance status:** repository candidate complete; local dependency-aware and production acceptance pending.

## Goal

Extend the accepted v0.23 commercial relationship into a truthful category-aware read-only runtime journey for Rebalancing, Grid Trading, Yield Optimisation and Health Factor Monitoring without pretending all four categories share Rebalancing's financial execution semantics.

## Implemented

- `ActivationControlProfile` with category runtime capability, explicit read-only/financial-write permissions and authority flags.
- Buyer-bound idempotent marketplace Activation revocation.
- `ServiceTask.originKind = JOB_INTENT | ACTIVATION`.
- Activation-bound task contracts:
  - `ANALYZE_POSITION`
  - `ANALYZE_GRID_MARKET`
  - `SCAN_YIELD_OPPORTUNITIES`
  - `INSPECT_HEALTH`
- First-party runtime attribution based on canonical service identity/reconciliation, fresh Marketplace Test Lab evidence and same-origin Spotriq reference runtime; external services retain key-control proof.
- `ActivationRuntimeState` with observational activity, Health snapshot monitoring and non-fabricated outcome classification.
- PostgreSQL migration `0017_four_category_activation_tasks.sql`.
- Fastify API routes for Activation controls, revocation, Activation-bound tasks, retry and runtime state.
- Explore UI integration after `Hire free read-only`.
- Unit/regression coverage for category task contracts and commercial Activation control/revocation.
- `pnpm verify:activation-parity` production verifier.

## Preserved boundaries

v0.24 does not claim:

- commercial Activation is a PermissionGrant;
- read-only Grid analysis authorizes trading;
- current Yield rates are realised yield;
- Health monitoring authorizes protective transactions;
- position analysis is an executed rebalance;
- runtime technical success is a good financial outcome.

The existing Rebalancing controlled BSC Testnet execution spine remains unchanged and separate.

## Persistence

Migration `0017` preserves existing Rebalancing task records while allowing Activation-bound category tasks to omit irrelevant JobIntent/Finding foreign keys. New origin/category/result columns and indexes support buyer/service runtime reconciliation.

## Validation contract

Local release gate:

```powershell
pnpm install
pnpm --filter @spotriq/api build
pnpm check
```

Production release gate after Railway deployment/migration:

```powershell
pnpm verify:reference-acceptance
pnpm verify:commercial-acceptance
pnpm verify:activation-parity
```

Only after all three production contracts pass should v0.24 be marked externally accepted.

## Next milestone

**v0.25.0 — Live Explore, Compare, Try and Service Profile Completion.**
