# Spotriq Source of Truth

**Current repository release:** **v0.24.0**  
**Release status:** implementation candidate complete; local dependency-aware validation and external v0.24 acceptance pending  
**Updated:** 2026-08-31

This file records the current repository/runtime contract. The latest supplied repository/ZIP is implementation truth. `SPOTRIQ_FOUNDATION.md` remains the canonical product doctrine and `PROJECT_STATE.md` is the concise present-state map.

## Product

Spotriq is a **BSC financial-agent marketplace**.

Primary lifecycle:

`Wallet need → Finding → real AgentService → evidence/readiness → recommendation → Offer → Quote → Hire → payment where required → permission where required → Activation → ServiceTask/AgentAction → Transaction where applicable → Outcome`

Locked boundaries remain:

- `AgentIdentity ≠ AgentListing ≠ AgentService ≠ Offer`
- `Offer ≠ Quote ≠ Hire ≠ Payment ≠ Activation`
- `Payment ≠ Permission ≠ Activation ≠ Execution ≠ Outcome`
- `Finding ≠ Recommendation`
- `Evidence ≠ AI explanation`
- `Search relevance ≠ Capability proof`
- `Registry identity ≠ Marketplace readiness`

AI may explain. Deterministic systems decide financial truth, identity, compatibility, readiness, authority, payment reconciliation, runtime attribution and outcomes.

## Network truth

Two BSC contexts remain deliberately separate:

1. **Marketplace discovery:** may use BSC Mainnet, chain ID `56`.
2. **Reference identity / authority / transactional development:** BSC Testnet, chain ID `97`.

`AGENT_DISCOVERY_CHAIN_ID` and `REFERENCE_AGENT_REGISTRY_CHAIN_ID` must not be conflated. Mainnet transactional execution remains out of scope until explicitly approved.

## Accepted v0.22 reference-service baseline

The repository contains four genuine first-party deterministic A2A AgentServices:

- **RangeKeeper** — Rebalancing — PancakeSwap concentrated-liquidity range/position analysis.
- **GridPilot** — Grid Trading — PancakeSwap V3/TWAP market-context analysis.
- **YieldPilot** — Yield Optimisation — supported current yield-opportunity analysis including Venus data.
- **VenusGuard** — Health Factor Monitoring — Venus lending/liquidation-risk monitoring.

All four passed the v0.22 external contract: public HTTPS runtime, public A2A Agent Card, Marketplace Test Lab PASS, runtime/capability observation, BSC Testnet ERC-8004 registration, canonical on-chain verification, backlink/A2A endpoint reconciliation and stable AgentService ↔ identity reconciliation.

Their financial readiness remains `TESTNET_ONLY` and existing financial `marketplaceActivationEligible = false` remains deliberate. Canonical identity or commercial Activation does not grant financial authority.

Known explicit acceptance fact: RangeKeeper is BSC Testnet ERC-8004 Agent ID `2017`, owner `0x08a594e828133D18A43918cc804754f46dAF44dB`. Do not infer numeric IDs for the other services from this document.

## Accepted v0.23 commercial baseline

`@spotriq/commercial` implements:

`ServiceOffer → CommercialQuote → CommercialHire → CommercialPaymentEvidence → MarketplaceActivation`

The four reference services publish truthful `FREE / READ_ONLY_SERVICE / FREE` offers with zero price, no wallet-signing requirement and no financial-authority requirement. Quotes are immutable snapshots. Hires are idempotent. FREE payment evidence is `NOT_REQUIRED`, never fabricated as paid. Paid rails remain provider-neutral adapters; ERC-8183 is observed/reconciled read-only and X402/B402 remain represented rails without live adapters.

Production v0.23 acceptance passed all four reference services through:

`Offer → Quote → Hire → NOT_REQUIRED payment → ACTIVE read-only Activation`

The v0.22 external reference acceptance verifier also passed after the v0.23 deployment.

## v0.24 Four-Category End-to-End Activation Parity

v0.24 generalizes the **post-Activation read-only runtime relationship** across all four categories while preserving the deeper Rebalancing financial execution spine as a separate authority path.

### Activation controls

Every Activation can expose an `ActivationControlProfile` describing:

- category and Activation state;
- runtime capability and required inputs;
- read-only permissions;
- financial-write permissions;
- wallet-signing and financial-execution authority flags;
- revocability and revoke effect.

The current four reference-service Activations are `READ_ONLY`: `financialWrite = []`, `walletSigningAuthorityGranted = false`, `financialExecutionAuthorityGranted = false`.

Marketplace relationship revocation is buyer-bound and idempotent. It stops new Activation-bound tasks and retains commercial/task history. It does **not** silently revoke or create a separate `PermissionGrant`.

### Category-aware Activation tasks

`ServiceTask` now has two explicit origins:

- `JOB_INTENT` — existing deep Rebalancing proposal/origin-proof path;
- `ACTIVATION` — category-aware read-only service relationship task.

Activation task contracts:

- Rebalancing → `ANALYZE_POSITION` with PancakeSwap V3 `tokenId`;
- Grid → `ANALYZE_GRID_MARKET` with PancakeSwap V3 `poolAddress`; optional capital context is descriptive only and grants no spend/trading authority;
- Yield → `SCAN_YIELD_OPPORTUNITIES` using the Activation buyer wallet server-side;
- Health → `INSPECT_HEALTH` using the Activation buyer wallet and a monitoring-snapshot mode.

First-party task attribution requires canonical ERC-8004 reconciliation, fresh Marketplace Test Lab PASS and the same-origin Spotriq reference runtime. External-service task attribution retains fresh service-owned key-control proof. Spotriq does not fabricate a first-party signing key merely to fit the external proof mechanism.

### Runtime and outcome truth

`ActivationRuntimeState` distinguishes `NOT_RUN`, `OBSERVED`, `FAILED` and `REVOKED` relationship/runtime states.

Technical success is not promoted into financial success:

- Grid market context ≠ profit, drawdown or fill quality;
- Yield current rates/opportunities ≠ realised yield;
- Health snapshot = monitoring state, not protective intervention;
- Rebalancing read-only position analysis ≠ executed rebalance outcome.

Health exposes a genuine `SNAPSHOT_OBSERVED` monitoring state when a structured health snapshot is accepted.

## HTTP resources added/extended in v0.24

- `GET /v1/activations/:activationId/control`
- `POST /v1/activations/:activationId/revoke`
- `POST /v1/activations/:activationId/service-tasks`
- `GET /v1/activations/:activationId/service-task`
- `POST /v1/activations/:activationId/service-task/retry`
- `GET /v1/activations/:activationId/runtime-state`

The Explore UI uses the same real API contracts after **Hire free read-only** to display controls, request category-specific observations, show runtime/monitoring/outcome state and revoke the marketplace relationship.

## Persistence truth

Migration history is immutable. Current latest migration:

`0017_four_category_activation_tasks.sql`

It keeps the existing Rebalancing linkage while allowing legitimate Activation-bound tasks without inventing a `job_intent_id` or `finding_id`, and persists explicit task origin/category/result state.

Railway pre-deploy remains:

`pnpm db:migrate`

## Existing financial execution truth

The deep Rebalancing path remains intact:

`Finding → compatible AgentService → Job Intent → real A2A ServiceTask/origin proof → bounded permission → reviewed execution plan → sealed execution boundary → scoped financial session → exact approval where needed → controlled BSC Testnet dispatch → independent receipt/post-state → activity/outcome evidence`

v0.24 read-only category parity does not bypass or dilute that chain.

## Verification truth

Root commands:

```powershell
pnpm check
pnpm verify:reference-acceptance
pnpm verify:commercial-acceptance
pnpm verify:activation-parity
```

`verify:activation-parity` performs, for all four reference services:

`fresh Test Lab → FREE Offer → Quote → Hire → Activation → category control → Activation-bound runtime observation → truthful outcome/monitoring classification → relationship revocation`

RangeKeeper/GridPilot require real readable PancakeSwap Testnet context; the verifier attempts discovery from the acceptance wallet and otherwise requires explicit real token/pool inputs. It does not substitute dummy values.

Repository/static verification alone is not external acceptance. v0.24 acceptance sequence is:

`pnpm --filter @spotriq/api build → pnpm check → commit/push → Railway migration 0017/deploy → v0.22 reference regression → v0.23 commercial regression → v0.24 activation-parity verifier → record acceptance`

## Current roadmap position

- v0.22.x — external reference-agent acceptance: **complete**.
- v0.23.0 — commercial hiring/read-only Activation: **externally accepted**.
- v0.24.0 — four-category read-only Activation/runtime parity: **implementation candidate complete; acceptance pending**.
- v0.25.0 — Live Explore, Compare, Try and Service Profile Completion: **next after v0.24 acceptance**.

Do not broaden transactional work to BSC Mainnet without explicit approval.
