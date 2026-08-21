# Rebalancing Vertical Handoff / Reviewable Job Intent

Release: **v0.14.0**

Method: `marketplace.rebalancing-job-intent@1.0.0`

## Purpose

Spotriq now has a real handoff from a live Smart Money Rebalancing Finding and a user-selected compatible `AgentService` into a structured, reviewable Job Intent.

The Job Intent is deliberately **not** an activation, permission request, permission grant, transaction, or financial execution. Its purpose is to freeze the user's selected service and the exact observed LP context into a reviewable object before Spotriq asks for bounded authority in the next milestone.

## Trust boundary

The client does not submit arbitrary LP facts as authoritative job context.

To prepare an intent, the API:

1. reloads the named Smart Money Check;
2. reloads the named Finding from that check;
3. re-runs current Finding → AgentService compatibility;
4. requires the requested service to be present in that compatible result;
5. derives the job subject from the Finding's structured PancakeSwap fields;
6. snapshots the selected service/readiness/evidence state;
7. records unresolved authority requirements;
8. persists a `PREPARE_ONLY` / `NO_EXECUTION` intent.

Search relevance, free-form UI text, and client-submitted LP coordinates cannot create the job subject.

## Exact Rebalancing subject

A v0.14 Rebalancing Job Intent requires a structured PancakeSwap Finding containing:

- protocol: PancakeSwap;
- V3 or Infinity CL version;
- position token ID;
- BSC network;
- pair;
- lower tick;
- upper tick;
- current tick;
- deterministic range state;
- observed block;
- pool address or pool ID when available.

The intent also retains Finding generation/expiry timestamps and evidence IDs.

## Requested action

v0.14 supports one explicit action:

`PREPARE_RANGE_REBALANCE`

This asks the selected service to *prepare* a bounded range-management plan for the exact observed LP position. It does not authorize the service to remove liquidity, add liquidity, swap assets, sign transactions, or move funds.

## Proposed constraints

The review UI exposes bounded proposed limits:

- max slippage: 1–500 basis points;
- intent validity: 5–1440 minutes;
- max action count: 1;
- optional permission to prepare swap steps when a future rebalance would require them.

`executionMode` is fixed to `PREPARE_ONLY`.

These constraints are future job/permission inputs. They are **not wallet authority** and cannot be widened into a grant by the frontend.

## Authority state

Every v0.14 intent contains an authority block with:

- current wallet-control state;
- selected service PermissionProfile declaration state;
- service activation/readiness state;
- explicit blockers;
- `requiredBeforeExecution: true`.

The authority state remains `UNRESOLVED` throughout v0.14.

A watch-only Smart Money Check remains watch-only. Preparing or confirming a job never proves wallet ownership.

## State machine

`REVIEWABLE → AWAITING_AUTHORITY`

Confirmation means only:

> the user has confirmed the job description and proposed bounds Spotriq should carry into the future authority step.

It does **not** mean:

- PermissionRequest created;
- PermissionGrant created;
- wallet connected;
- wallet control verified;
- service activated;
- transaction signed;
- action submitted;
- funds moved.

`executionState` remains `NO_EXECUTION` in both states.

Confirmed intents are immutable through the preparation/revision APIs. Repeated Prepare taps return the same confirmed intent rather than creating duplicates or changing its limits.

## Persistence

The original Spotriq foundation schema already contains the `checkouts` table with `job_context`. v0.14 activates that existing seam rather than adding a competing persistence concept.

- `checkout_id` stores the Job Intent ID;
- `service_id` stores the selected service;
- `status` stores the Job Intent state;
- `job_context` stores the complete typed intent payload;
- `expires_at` stores the review validity bound.

Therefore v0.14 requires **no new database migration** after `0009_marketplace_test_lab.sql`.

## API

Prepare/re-open the idempotent intent for a compatible Rebalancing service:

```text
POST /v1/checks/:checkSessionId/findings/:findingId/job-intents
```

Body:

```json
{
  "serviceId": "svc:erc8004:56:7:rebalancing",
  "constraints": {
    "maxSlippageBps": 50,
    "validForMinutes": 30,
    "allowSwapPreparation": false
  }
}
```

Retrieve:

```text
GET /v1/job-intents/:jobIntentId
```

Revise proposed limits while `REVIEWABLE`:

```text
PATCH /v1/job-intents/:jobIntentId
```

Confirm the job description and advance to the authority boundary:

```text
POST /v1/job-intents/:jobIntentId/confirm
```

## UI

A live compatible Rebalancing match now exposes **Prepare job**.

The live Job Intent review page shows:

- exact LP NFT/pool/pair/range context;
- selected live AgentService and match tier/rank;
- service readiness/activation status;
- proposed limits;
- captured evidence-reference count;
- wallet-control state;
- permission-declaration state;
- every unresolved authority blocker;
- explicit `PREPARE ONLY` / `NO_EXECUTION` status.

The old reference/sample checkout remains separate. The live Job Intent path never calls the mock activation routine.

## Non-claims

A Job Intent does not prove that:

- the selected agent will improve returns;
- the proposed range will be profitable;
- the service is safe with funds;
- the current LP state will still be current at execution time;
- wallet authority exists;
- the service is activation-ready.

Any later execution must revalidate current LP state, readiness, wallet control, bounded authority, and network conditions.

## Next

**v0.15.0 — Explicit Bounded Permission / Authority**

Use the confirmed `AWAITING_AUTHORITY` Job Intent to construct a precise PermissionRequest, verify wallet control where required, integrate the chosen scoped authority provider (Altana where it maps cleanly), reconcile the actual returned PermissionGrant against the request, and still stop before real financial execution until authority is demonstrably valid.
