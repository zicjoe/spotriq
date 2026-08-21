# Spotriq v0.14.0 Implementation Report

## Milestone

**Rebalancing Vertical Handoff / Reviewable Job Intent**

## Outcome

Spotriq now converts a real PancakeSwap Rebalancing Finding plus a user-selected compatible live AgentService into an idempotent, persisted, reviewable Job Intent. The resource carries exact LP context, selected-service evidence/readiness, user-reviewable proposed bounds, and unresolved authority requirements while enforcing an explicit `NO_EXECUTION` boundary.

## Added

### Domain

Added:

- `RebalancingJobIntent`
- `RebalancingJobIntentSubject`
- `RebalancingJobConstraints`
- `RebalancingJobIntentServiceSnapshot`
- `JobIntentAuthorityRequirement`
- Job Intent state/execution enums
- `jobIntentId` navigation state

### Job Intent engine

New workspace package:

`@spotriq/job-intents`

Responsibilities:

- validate the Finding is Rebalancing;
- require exact structured PancakeSwap LP fields;
- require the selected AgentService match to belong to the Finding;
- create deterministic/idempotent Finding + service intent IDs;
- validate proposed constraints;
- snapshot selected service/readiness/evidence references;
- record wallet-control and permission/readiness blockers;
- persist/retrieve/revise intents;
- freeze revisions after confirmation;
- confirm only to `AWAITING_AUTHORITY`;
- keep `executionState = NO_EXECUTION`.

### Persistence

Added `MemoryJobIntentStore` and `PostgresJobIntentStore`.

PostgreSQL persistence uses the already-existing `checkouts.job_context` foundation from migration `0001_core_foundation.sql`. No new migration was introduced.

### API

Added:

```text
POST  /v1/checks/:checkSessionId/findings/:findingId/job-intents
GET   /v1/job-intents/:jobIntentId
PATCH /v1/job-intents/:jobIntentId
POST  /v1/job-intents/:jobIntentId/confirm
```

The prepare endpoint reloads the Smart Money Check/Finding server-side and re-runs live service compatibility before constructing the intent. A client cannot manufacture a compatible service or arbitrary LP job context.

System capabilities now expose `rebalancingJobIntentEnabled: true` while `marketplaceActivationEnabled` remains false.

### Web

Added `jobIntentRepository` and a live Rebalancing Job Intent review path.

A live Rebalancing match now exposes **Prepare job**.

The review UI presents:

- exact PancakeSwap position context;
- selected service rank/match/readiness;
- proposed slippage/validity/swap-preparation bounds;
- evidence references;
- wallet control;
- permission declaration;
- authority blockers;
- explicit no-execution state.

The existing reference/sample checkout remains available only for sample paths and is not used by the live Job Intent handoff.

## Safety invariants

1. Job Intent is not PermissionRequest.
2. Job Intent is not PermissionGrant.
3. Job Intent is not Activation.
4. Job Intent is not AgentAction.
5. Job Intent is not TransactionRecord.
6. A compatible service can remain activation-gated.
7. WATCH_ONLY never becomes VERIFIED_CONTROL because a user reviewed a job.
8. Proposed bounds never become granted authority automatically.
9. Confirmation advances only to `AWAITING_AUTHORITY`.
10. No v0.14 API invokes an agent runtime or financial protocol action.

## Validation

Completed in the implementation environment:

- `@spotriq/job-intents` TypeScript typecheck: PASS.
- Shared `@spotriq/domain` TypeScript typecheck: PASS.
- Shared `@spotriq/api-contracts` TypeScript typecheck: PASS.
- Job Intent runtime regression suite: **5/5 PASS**.
- Modified TS/TSX syntax transpilation: PASS.
- Structural verifier: required before packaging and recorded in the release response.

The environment still does not provide pnpm or installed frontend/API third-party dependencies, so the user should run `pnpm install && pnpm check` locally before deployment.

## Next milestone

**v0.15.0 — Explicit Bounded Permission / Authority**

Construct a precise PermissionRequest from a confirmed Job Intent, verify wallet control, integrate scoped authority (including Altana where current official interfaces fit), display the exact requested scope before signing, reconcile the actual PermissionGrant after authorization, and preserve the rule `requested permission != granted permission` until explicitly verified.


## Additional API-boundary validation

- Job Intent API trust-boundary test: **1/1 passing**; server reloads the Finding and current compatible supply instead of trusting client-supplied job context.
