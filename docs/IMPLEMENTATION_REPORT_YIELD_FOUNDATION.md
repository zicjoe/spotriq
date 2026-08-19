# Spotriq v0.7.0 — Yield Optimisation Data Foundation

## Implemented
- Venus wallet-relevant supply-market discovery across Core and registered Isolated Pools.
- Current base supply APY derived from `supplyRatePerBlock` using the Venus-documented BNB Chain methodology.
- Current rate, estimated net rate, and realised yield remain separate concepts. Only current base APY is populated in this milestone.
- Wallet-held and existing-supply context, with deterministic Yield findings grouped by underlying asset.
- Smart Money Check source progress now includes Yield opportunities.
- Live Results now render Opportunity findings instead of silently omitting them.
- API route: `GET /v1/wallets/:address/venus/yield-opportunities`.
- PostgreSQL migration `0005_yield_opportunities.sql`.

## Explicit limitations
- Current Venus base supply APY is variable and excludes incentives, Prime rewards, gas, agent fees, taxes, and realised performance.
- Spotriq does not infer that wallet-held assets should be supplied. Risk tolerance and liquidity preference remain user inputs.
- Supply caps/paused actions and execution-time eligibility require a future just-in-time activation check.
- PancakeSwap LP positions remain visible as yield-bearing context, but Spotriq does not yet calculate a PancakeSwap fee APR or historical realised LP yield because the required historical fee/valuation inputs are not yet in the adapter.
- Agent matching is not part of v0.7.0.
