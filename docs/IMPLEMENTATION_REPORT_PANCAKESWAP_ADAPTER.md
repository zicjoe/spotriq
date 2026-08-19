# Implementation Report — PancakeSwap Adapter

## Release
Spotriq v0.4.0

## Goal
Introduce a provider-normalized PancakeSwap data layer that can become the source for Rebalancing findings without coupling Smart Money Check or the frontend directly to PancakeSwap contracts.

## Added

### `@spotriq/protocol-pancakeswap`
- official BSC Mainnet/Testnet contract registry for V3 and Infinity CL components used by this adapter;
- V3 wallet position discovery;
- V3 position/pool normalization;
- Infinity CL position-by-token-ID normalization;
- deterministic CL range classification;
- current price derivation from `sqrtPriceX96`;
- Infinity PoolId derivation and tick-spacing decoding;
- token metadata normalization;
- bounded/concurrency-limited wallet reads;
- explicit coverage metadata.

### Chain layer
Added generic block-anchored `eth_call` support through `BscChainReader.callContract()`. Protocol packages still never call arbitrary RPC URLs directly.

### Evidence layer
Added:
- PancakeSwap protocol data source activation;
- Spotriq Derived source;
- V3 position method;
- Infinity CL position method;
- CL range-state method;
- CL sqrt-price method;
- freshness policies for range state, pool tick, and pool liquidity.

### Domain
Added normalized PancakeSwap pool, position, wallet-position, token, contract-set, and range-state resources.

### API
Added:
- `GET /v1/protocols/pancakeswap/status`
- `GET /v1/protocols/pancakeswap/positions/:version/:tokenId`
- `GET /v1/wallets/:address/pancakeswap/positions`

Added structured input validation and PancakeSwap adapter error mapping.

## Important data semantics

- A V3 `tokensOwed` value is stored as a **recorded position-manager amount**, not presented as total current unclaimed fees.
- Current token0-in-token1 price is a deterministic calculation from protocol `sqrtPriceX96` and token decimals; it is not a fiat/USD price.
- Range-state classification is Spotriq-derived and method-versioned.
- Position valuation remains `NOT_SUPPORTED` in this release.
- Infinity CL wallet discovery remains `TOKEN_ID_REQUIRED` until an indexed event source is introduced.

## Testing added

Source tests cover:
- BSC generic `eth_call` block anchoring;
- official contract registry separation;
- all CL range-state classes;
- sqrt-price decimal normalization;
- Infinity tick-spacing decoding;
- PancakeSwap API status and wallet coverage responses;
- structured invalid-version API error.

## Validation in packaging environment

The repository structural verifier and syntax/static checks were run in the packaging environment. The packaging environment cannot download the pnpm dependency graph, so the authoritative full workspace `pnpm check` must also be run locally after `pnpm install`.

## Database
No new migration is required. This milestone is current-state protocol reading only. Railway PostgreSQL becomes materially useful in the upcoming Smart Money Check milestone when `CheckSession`, snapshots, findings, and evidence need persistence.

## Known limitations
- no Infinity indexed wallet discovery yet;
- no historical Pancake analytics yet;
- no USD valuation;
- no complete live fee accrual calculation;
- no transaction building/execution;
- consumer Figma screens still use normalized sample marketplace data until Smart Money Check integration.

## Next milestone
Smart Money Check Core + Rebalancing Finding Engine using the new PancakeSwap adapter.
