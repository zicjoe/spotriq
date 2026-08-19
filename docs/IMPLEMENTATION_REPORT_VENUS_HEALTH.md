# Implementation Report — Venus Adapter + Health Factor Monitoring

Version: 0.6.0

## Implemented

- New `@spotriq/protocol-venus` package.
- Runtime discovery of Core Pool Comptroller and Isolated Pool Registry through Venus ProtocolShareReserve.
- Core Pool and Isolated Pool market discovery.
- Wallet vToken supply/borrow snapshots.
- Collateral membership, collateral factor/liquidation-threshold reads, oracle price reads.
- Current Core Pool seven-field market configuration decoding, including the explicit liquidation-threshold field.
- Canonical Venus account liquidity/shortfall evidence.
- Versioned Spotriq derived health-factor evidence.
- Conservative risk classification with conflict handling.
- Smart Money Check Venus scan stage.
- Health findings in live Check results.
- Dynamic category handoff from live findings (Health findings route to Health marketplace, Rebalancing findings to Rebalancing).
- `Could Not Assess` live finding rendering.
- Venus API routes and capability reporting.
- PostgreSQL normalized lending snapshot migration (`0004_venus_health_positions.sql`).
- Deterministic health-finding and risk-policy tests.

## Safety choices

- Venus protocol shortfall takes precedence over Spotriq derived health factor.
- Missing valuation/risk inputs cannot yield `NO_BORROW` if a raw borrow exists.
- Derived health factor below 1 without canonical shortfall is treated as a data conflict, not a confident liquidation/healthy state.
- No future liquidation timing or guaranteed protection claim is made.
- Automatic intervention remains outside this milestone.
- Core E-Mode user-specific risk settings are respected at the aggregate level by deriving the explanatory health ratio from Venus canonical account liquidity/shortfall rather than base market LT aggregation.
- Isolated-pool forced-liquidation flags are checked for borrowed entered markets and override normal account-liquidity comfort bands; unreadable flags downgrade coverage rather than defaulting to false.

## Validation

Run locally:

```powershell
pnpm install
pnpm check
pnpm dev
```

The packaging environment performs static/transpilation and deterministic checks but does not have registry access for a fresh pnpm installation. The user machine remains the authoritative installed-dependency validation environment.

## Next milestone

Yield Optimisation data foundation or ERC-8004 marketplace discovery can proceed next. Product sequencing recommends Yield next so three of four required financial categories have real wallet/protocol data before marketplace matching is introduced.
