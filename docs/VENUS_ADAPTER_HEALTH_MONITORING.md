# Venus Adapter + Health Factor Monitoring

Spotriq v0.6.0 introduces direct, read-only Venus Protocol coverage for BNB Chain Core Pool and registered Isolated Pools.

## Truth model

- Venus `Comptroller.getAccountLiquidity` is the canonical current account-liquidity/shortfall signal used by Spotriq.
- Spotriq derives a human-readable health factor from Venus canonical account liquidity/shortfall plus observed debt valuation when all required inputs are available. This lets the aggregate ratio follow Venus's effective account-risk rules, including Core Pool E-Mode, rather than rebuilding the account from base market LT values.
- Core Pool market metadata still reads Venus's current explicit liquidation-threshold field rather than assuming LT equals collateral factor.
- If canonical shortfall and the derived ratio conflict, Spotriq returns `COULD_NOT_ASSESS` rather than overriding Venus.
- Missing oracle/risk inputs never become a Healthy result.

## Discovery

Spotriq bootstraps Venus addresses from the officially deployed `ProtocolShareReserve` on each BNB network, reading `CORE_POOL_COMPTROLLER`, `poolRegistry`, `vBNB`, and `WBNB`. The Pool Registry is then used to discover Isolated Pools.

## Health presentation policy

The protocol boundary remains Venus shortfall/liquidation-threshold logic. For explanatory UX above that boundary Spotriq currently uses versioned presentation bands:

- `COMFORTABLE`: derived health factor >= 1.5 and no Venus shortfall
- `WATCH`: 1.2 <= health factor < 1.5 and no Venus shortfall
- `HIGHER_ATTENTION`: 1.0 <= health factor < 1.2 and no Venus shortfall
- `LIQUIDATABLE`: Venus reports shortfall > 0
- `NO_BORROW`: no supported borrow exposure was detected
- `COULD_NOT_ASSESS`: required risk inputs are unavailable or conflict

These bands are Spotriq UX policy, not guarantees from Venus and not predictions of future liquidation.

## Current limitations

- Core Pool E-Mode can apply user-specific risk parameters. Spotriq uses Venus `getAccountLiquidity`/shortfall for the aggregate health calculation; base market LT values shown in market detail are not presented as the user's effective E-Mode parameters.
- Isolated Pools support forced liquidation for a borrowed market. Spotriq checks that flag for borrowed entered markets; a true flag is treated as a liquidation-risk state regardless of normal account liquidity. If the flag cannot be read, the assessment is marked partial rather than assuming it is disabled.
- These limitations are propagated into Health finding uncertainty text instead of being hidden.

## API

- `GET /v1/protocols/venus/status`
- `GET /v1/wallets/:address/venus/positions`
- Venus is also included automatically in `POST /v1/checks` Smart Money Check runs.

## Persistence

With PostgreSQL configured, Venus pool and market snapshots are stored in normalized `lending_position_snapshots` and `lending_market_position_snapshots` tables in addition to the full immutable portfolio snapshot JSON.

## Not included yet

- Automated protection transactions
- Alerts/notification delivery
- Venus agent activation
- Historical health-factor charting
- Recommendation matching
