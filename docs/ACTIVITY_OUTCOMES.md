# Spotriq Activity & Outcomes

Spotriq maintains two complementary deterministic evidence paths.

## Controlled Rebalancing execution outcomes

The original v0.20 path remains execution-scoped:

`JobIntent → bounded authority → sealed boundary → controlled BSC Testnet transaction → receipt/post-state reconciliation → immediate execution metrics`

It can prove technical execution facts such as receipt success, gas, replacement LP token and post-position state. It still does not claim profitability without a defensible measurement window.

## Four-category Activation Activity & Outcomes

v0.27 adds an Activation-scoped path:

`Activation → ServiceTask → Permission review → execution preflight/guard → activity timeline → outcome snapshot`

This path works across Rebalancing, Grid, Yield and Health and deliberately supports partial-data truth.

If a read-only runtime succeeds but no financial transaction is independently observed:

`technicalObservation = OBSERVED`

`transactionObserved = false`

`financialOutcome = COULD_NOT_ASSESS / Could Not Assess`

Category observations remain technical/contextual evidence only. Grid context is not PnL. Yield APY is not realised yield. Health state is not protective effect. Range analysis is not a rebalance.
