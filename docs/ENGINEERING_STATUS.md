# Spotriq Engineering Status

**Release candidate:** v0.24.0  
**Date:** 2026-08-31  
**State:** Four-Category End-to-End Activation Parity implemented; dependency-aware local validation and external v0.24 acceptance pending.

## Current system spine

Spotriq remains a BSC-focused TypeScript/pnpm monorepo:

`apps/web → apps/api → domain/service packages → evidence + chain/protocol adapters → PostgreSQL`

The governing boundary remains:

`Payment ≠ Permission ≠ Activation ≠ Execution ≠ Outcome`

v0.24 extends the existing `MarketplaceActivation` and `ServiceTask` architecture. It does not create a second marketplace state machine or force Grid/Yield/Health through the Rebalancing execution model.

## Accepted baselines

### v0.22

RangeKeeper, GridPilot, YieldPilot and VenusGuard have public first-party A2A runtimes, Marketplace Test Lab evidence and reconciled BSC Testnet ERC-8004 identities. Their financial readiness remains `TESTNET_ONLY`.

### v0.23

The production FREE commercial path is externally accepted for all four:

`Offer → immutable Quote → idempotent Hire → NOT_REQUIRED payment → ACTIVE read-only MarketplaceActivation`

The post-v0.23 v0.22 reference regression verifier also passed.

## v0.24 architecture

### 1. Activation control profile

`@spotriq/commercial` now derives `ActivationControlProfile` from the real Activation + AgentService category. Current reference Activations expose only read operations and explicitly report no financial-write, wallet-signing or financial-execution authority.

Buyer-bound marketplace revocation is idempotent and preserves historical commercial/task evidence. Separate permission grants remain separate resources.

### 2. Category-aware ServiceTask

`ServiceTask.originKind` is explicit:

- `JOB_INTENT` keeps the existing Rebalancing proposal path;
- `ACTIVATION` supports bounded read-only runtime observations from an ACTIVE commercial relationship.

Activation capabilities:

- RangeKeeper — `ANALYZE_POSITION`
- GridPilot — `ANALYZE_GRID_MARKET`
- YieldPilot — `SCAN_YIELD_OPPORTUNITIES`
- VenusGuard — `INSPECT_HEALTH`

Grid capital context is descriptive only. Yield uses current supported opportunity/rate evidence, not realised yield. Health begins with an observational monitoring snapshot and does not imply protective-write permission.

### 3. Runtime attribution

Reference-service Activation tasks accept origin attribution only after current first-party service identity/runtime conditions are reconciled, including fresh Marketplace Test Lab evidence. External AgentServices retain service-owned key-control proof. No authority key is fabricated for first-party services.

### 4. Runtime / monitoring / outcome state

`ActivationRuntimeState` prevents technical observations from becoming fake performance claims. It exposes observational activity and health monitoring state while keeping financial outcomes `INSUFFICIENT_DATA` or `NOT_APPLICABLE` until genuine measurement/activity evidence exists.

### 5. Persistence

New immutable migration:

`0017_four_category_activation_tasks.sql`

It:

- allows Activation-bound ServiceTasks without invented Rebalancing JobIntent/Finding references;
- persists `origin_kind`, `category` and `result_state`;
- adds Activation/category and Activation/context indexes.

No previous migration is mutated.

## API surface

v0.24 adds/extends:

- `GET /v1/activations/:activationId/control`
- `POST /v1/activations/:activationId/revoke`
- `POST /v1/activations/:activationId/service-tasks`
- `GET /v1/activations/:activationId/service-task`
- `POST /v1/activations/:activationId/service-task/retry`
- `GET /v1/activations/:activationId/runtime-state`

Existing v0.23 commercial endpoints and the deeper Rebalancing JobIntent/authority/execution endpoints remain intact.

## UX

Explore now continues beyond Hire/Activation for the four reference services. The connected buyer can:

`Hire free read-only → inspect controls → run supported read-only service observation → inspect runtime/monitoring/outcome state → revoke marketplace relationship`

The UI explicitly separates read-only service activation from signing, transaction and financial execution authority.

## Verification

Repository commands:

```powershell
pnpm --filter @spotriq/api build
pnpm check
pnpm verify:reference-acceptance
pnpm verify:commercial-acceptance
pnpm verify:activation-parity
```

`verify:activation-parity` tests all four categories using real production APIs and real PancakeSwap context where RangeKeeper/GridPilot require it.

## Release gate

v0.24 is **not externally accepted yet**.

Required sequence:

1. local API package build;
2. local `pnpm check`;
3. commit/push;
4. Railway migration `0017` + deployment;
5. v0.22 reference regression verifier;
6. v0.23 commercial regression verifier;
7. v0.24 activation-parity verifier;
8. record production acceptance in `PROJECT_STATE.md`/roadmap/docs.

## Next milestone after acceptance

**v0.25.0 — Live Explore, Compare, Try and Service Profile Completion.**
