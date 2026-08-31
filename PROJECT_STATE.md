# Spotriq Project State

**Current implementation release:** v0.24.0  
**Implementation status:** Four-Category End-to-End Activation Parity implemented; dependency-aware local validation and external v0.24 acceptance pending.  
**Last state update:** 2026-08-31  
**Repository role:** Concise present-state map. Current repository remains implementation truth.

## 1. Product position

Spotriq is a **BSC financial-agent marketplace** for understanding a wallet need, discovering specialist financial AgentServices, evaluating evidence, hiring/activating a service relationship, controlling authority, observing what the service does and measuring outcomes when evidence exists.

Core lifecycle:

`Understand → Discover → Match → Evaluate → Compare → Try → Authorize → Hire / Activate → Monitor → Measure → Reassess`

Locked separation:

`AgentIdentity ≠ AgentListing ≠ AgentService ≠ Offer`

`Offer ≠ Quote ≠ Hire ≠ Payment ≠ Activation`

`Payment ≠ Permission ≠ Activation ≠ Execution ≠ Outcome`

`Finding ≠ Recommendation`

`Evidence ≠ AI explanation`

AI may explain; deterministic systems decide readiness, authority, payment reconciliation, runtime attribution and financial truth.

## 2. Current applications/packages

- `apps/web` — React/Vite marketplace UX.
- `apps/api` — Fastify API.
- `apps/worker` — worker seam.
- `@spotriq/domain` / `@spotriq/api-contracts` — canonical domain + REST contracts.
- `@spotriq/db` — PostgreSQL and immutable migrations.
- `@spotriq/evidence`, `@spotriq/chain`, PancakeSwap/Venus/Grid adapters — deterministic truth/data spine.
- `@spotriq/smart-money` — Smart Money Check / Findings.
- `@spotriq/agent-registry`, `@spotriq/marketplace-supply` — ERC-8004 discovery/verification, service normalization/readiness/Test Lab.
- `@spotriq/reference-agents` — RangeKeeper, GridPilot, YieldPilot, VenusGuard deterministic A2A runtimes.
- `@spotriq/commercial` — Offer/Quote/Hire/Payment/Activation + activation controls/revocation.
- `@spotriq/service-tasks` — Rebalancing JobIntent task-origin proof plus four-category Activation-bound read-only tasks/runtime state.
- Rebalancing authority/execution packages remain intact: `job-intents`, `authority`, `execution-plans`, `execution-guard`, `execution-boundary`, `controlled-execution`, `activity-outcomes`.

## 3. Accepted release baseline

### v0.22 external reference acceptance — COMPLETE

All four first-party reference services passed public runtime, A2A Agent Card, Marketplace Test Lab, ERC-8004 BSC Testnet registration/canonical verification and service↔identity reconciliation. Their financial readiness remains `TESTNET_ONLY`; existing financial `marketplaceActivationEligible = false` remains deliberate.

Known explicit identity fact: RangeKeeper BSC Testnet ERC-8004 Agent ID `2017`, owner `0x08a594e828133D18A43918cc804754f46dAF44dB`. Do not fabricate the other numeric IDs.

### v0.23 commercial acceptance — COMPLETE

The deployed production API passed:

- local `pnpm check`;
- Railway build/start and migration `0016`;
- `pnpm verify:commercial-acceptance` for RangeKeeper, GridPilot, YieldPilot and VenusGuard;
- `pnpm verify:reference-acceptance` regression after v0.23 deployment.

Accepted live commercial path:

`AgentService → FREE Offer → immutable Quote → idempotent Hire → Payment NOT_REQUIRED → ACTIVE read-only MarketplaceActivation`

No signing or financial execution authority is implied by that path.

## 4. v0.24 implementation

v0.24 generalizes the post-Activation runtime journey across all four categories without forcing Grid/Yield/Health through Rebalancing's JobIntent or financial execution model.

### Activation controls

Every marketplace Activation can expose a deterministic `ActivationControlProfile` containing:

- category;
- current Activation state;
- category runtime capability/input requirements;
- read-only permissions;
- explicit financial-write permissions (empty for current FREE reference relationships);
- wallet-signing / financial-execution flags;
- revocability and revoke effect.

Marketplace relationship revocation is buyer-bound and idempotent. It stops new Activation-bound tasks while retaining commercial/task history. It does **not** masquerade as revocation of a separate financial PermissionGrant.

### Category task parity

`ServiceTask` now has explicit origin kinds:

- `JOB_INTENT` — existing deep Rebalancing proposal path;
- `ACTIVATION` — category-aware read-only service relationship task.

Activation task contracts:

- Rebalancing → `ANALYZE_POSITION` using PancakeSwap `tokenId`;
- Grid → `ANALYZE_GRID_MARKET` using a PancakeSwap V3 `poolAddress`, with optional descriptive capital context that grants no spend/trading authority;
- Yield → `SCAN_YIELD_OPPORTUNITIES` using the Activation buyer wallet server-side;
- Health → `INSPECT_HEALTH` using the Activation buyer wallet and a monitoring-snapshot mode.

Reference-runtime origin attribution uses canonical ERC-8004 reconciliation + fresh Test Lab evidence + the same-origin first-party A2A runtime. External services retain fresh service-owned key-control proof. Spotriq does not fabricate a key for first-party services just to fit the external-agent proof scheme.

### Runtime / outcome truth

`ActivationRuntimeState` distinguishes:

- no task yet;
- observed structured runtime state;
- failed observation;
- revoked relationship.

It does not turn technical success into financial success:

- Grid market context ≠ profit/drawdown/fill outcome;
- current Yield rates/opportunities ≠ realised yield;
- Health snapshot = monitoring state, not protective-write authority;
- Rebalancing read-only position analysis ≠ executed rebalance outcome.

The existing deeper Rebalancing controlled BSC Testnet execution/activity/outcome spine remains separate and intact.

## 5. Persistence

- No `DATABASE_URL` → memory fallback where supported.
- `DATABASE_URL` → PostgreSQL.
- Migrations `0001` through `0017` are present.
- Latest migration: `0017_four_category_activation_tasks.sql`.

Migration `0017` makes `ServiceTask` category/origin/result state explicit and allows Activation-bound tasks without inventing a Rebalancing JobIntent/Finding.

## 6. API / UX additions in v0.24

New/extended resources include:

- `GET /v1/activations/:activationId/control`
- `POST /v1/activations/:activationId/revoke`
- `POST /v1/activations/:activationId/service-tasks`
- `GET /v1/activations/:activationId/service-task`
- `POST /v1/activations/:activationId/service-task/retry`
- `GET /v1/activations/:activationId/runtime-state`

Explore uses those real APIs after **Hire free read-only** to show category controls, run the read-only runtime task, show observational/monitoring/outcome state and revoke the relationship.

## 7. Network/deployment policy

- Marketplace discovery may use BSC Mainnet (`chainId=56`).
- Reference identity/authority/runtime acceptance remains BSC Testnet (`chainId=97`).
- Transactional/authority development remains testnet-first until explicit mainnet approval.
- Railway hosts API/PostgreSQL; Vercel remains frontend deployment direction.
- Railway pre-deploy command remains `pnpm db:migrate`.

## 8. Verification / release state

Repository commands:

- `pnpm check`
- `pnpm verify:reference-acceptance`
- `pnpm verify:commercial-acceptance`
- `pnpm verify:activation-parity`

The packaging environment performs repository/static/syntax validation but not the dependency-aware workspace check. The user's local `pnpm check` remains the authoritative local gate.

**Do not call v0.24 externally accepted yet.** Required sequence:

`local pnpm check → exact API build → commit/push → Railway migration 0017/deploy → v0.22 regression verifier → v0.23 commercial regression verifier → v0.24 activation-parity verifier → record acceptance`

## 9. Current milestone and next work

**Current:** v0.24.0 implementation candidate — Four-Category End-to-End Activation Parity.

**Next acceptance gate:** dependency-aware local validation, then Railway migration/deploy and live four-category Activation/runtime parity.

**Next roadmap milestone after v0.24 acceptance:** v0.25 — Live Explore, Compare, Try and Service Profile Completion.
