# PancakeSwap Adapter

Spotriq v0.4.0 adds the first protocol adapter on top of the shared BSC chain and evidence layers.

## Scope

The adapter currently supports current-state concentrated-liquidity reads for:

- PancakeSwap V3
- PancakeSwap Infinity CL

The adapter normalizes protocol-specific contract state into shared Spotriq domain snapshots. UI and Smart Money code should consume these normalized snapshots rather than call PancakeSwap contracts directly.

## V3 coverage

Spotriq can:

- discover V3 position NFTs owned by a wallet through the V3 NonfungiblePositionManager ERC-721 enumerable interface;
- read a V3 position by token ID;
- resolve its pool from the V3 factory;
- read the pool current tick, sqrt price, in-range liquidity, and tick spacing at one observed block;
- read token symbol/name/decimals when available;
- classify current range state deterministically;
- derive a token0-in-token1 current sqrt-price when token decimals are available;
- preserve the position manager's recorded `tokensOwed` values without presenting them as a complete current fee calculation.

Wallet discovery is capped and concurrency-limited so a wallet with many NFTs does not create an uncontrolled burst of public-RPC requests.

## Infinity CL coverage

Spotriq can:

- read an Infinity CL position by token ID;
- read the returned PoolKey;
- verify that the PoolKey references Spotriq's configured official CL pool manager;
- derive the PoolId from the PoolKey;
- decode CL tick spacing from PoolKey parameters;
- read current `getSlot0` and pool liquidity;
- normalize native currency address zero correctly;
- classify current range state and derive current sqrt-price when decimals are available.

Wallet-wide Infinity CL discovery is intentionally reported as `TOKEN_ID_REQUIRED` in this milestone. We will add an indexed event source rather than pretending public RPC provides complete historical NFT ownership discovery.

## Range-state method

`pancakeswap.cl-range-state` v1 classifies:

- `NO_LIQUIDITY`
- `OUT_OF_RANGE_BELOW`
- `OUT_OF_RANGE_ABOVE`
- `NEAR_LOWER`
- `NEAR_UPPER`
- `IN_RANGE`

A live position is considered near a boundary when its current tick is within the greater of:

- two tick spacings; or
- 10% of the position's tick-range width.

This is a Spotriq marketplace-derived method, not a PancakeSwap risk guarantee. The method is versioned so later changes do not rewrite historical interpretation silently.

## Evidence

Direct position/pool values are protocol-state evidence sourced to PancakeSwap contracts and anchored to a BSC block.

Range state and sqrt-price-derived current price are Marketplace Derived evidence with explicit method IDs and inputs.

Current evidence freshness target for LP current state is 30 seconds, warning at 60 seconds, and hard expiry at 120 seconds. These are Spotriq product policies, not protocol guarantees.

## API

```text
GET /v1/protocols/pancakeswap/status
GET /v1/protocols/pancakeswap/positions/v3/:tokenId
GET /v1/protocols/pancakeswap/positions/infinity-cl/:tokenId
GET /v1/wallets/:address/pancakeswap/positions
```

Optional exact-block read:

```text
GET /v1/protocols/pancakeswap/positions/v3/:tokenId?block=123456
```

Wallet V3 discovery can be bounded:

```text
GET /v1/wallets/:address/pancakeswap/positions?max=20
```

Maximum is 100.

## Explicit non-goals in v0.4.0

Not yet implemented:

- USD position valuation;
- complete current unclaimed-fee calculation;
- historical time-in-range;
- historical volume/fee analytics;
- Infinity wallet-wide indexed discovery;
- position mutation/rebalancing execution;
- Smart Money Finding generation.

These omissions are surfaced in coverage rather than replaced with estimates.
