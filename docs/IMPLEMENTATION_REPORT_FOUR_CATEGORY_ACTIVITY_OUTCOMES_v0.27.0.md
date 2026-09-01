# Spotriq v0.27.0 — Four-Category Activity + Outcome Parity

## Objective

Extend Spotriq's Activity & Outcomes truth from the deep Rebalancing controlled-execution path to the full four-category marketplace Activation lifecycle without fabricating transactions or financial performance.

## Implemented

- Added `ActivationActivityEvent`, `ActivationOutcomeMetric`, `ActivationOutcomeSnapshot` and `ActivationActivityOutcomeBundle` domain contracts.
- Extended `@spotriq/activity-outcomes` with an Activation-scoped reconciliation engine and memory/PostgreSQL persistence.
- Added migration `0020_four_category_activity_outcomes.sql`.
- Added Activation Activity/Outcome REST resources.
- Added Explore UI reconciliation through an API repository.
- Added category technical metrics for Rebalancing, Grid, Yield and Health.
- Added explicit `COULD_NOT_ASSESS / Could Not Assess` financial-outcome semantics when no independent transaction/performance evidence exists.
- Preserved the separate v0.20 controlled Rebalancing transaction-outcome pipeline.
- Added unit regression coverage and `pnpm verify:activity-outcome-parity` live acceptance.

## Safety invariants

`Technical observation ≠ financial outcome`

`Permission review ≠ execution`

`Guarded calldata ≠ submitted transaction`

`Transaction success ≠ profitability / Agent Advantage`

Grid market context does not become fills/PnL. Current Yield APY does not become realised return. Health monitoring does not become proof of intervention or avoided liquidation. Missing outcome evidence is represented as `Could Not Assess`.

## Acceptance gate

`API build → pnpm check → commit/push → Railway migration 0020/deploy → v0.22–v0.26 regressions → pnpm verify:activity-outcome-parity → record external acceptance`
