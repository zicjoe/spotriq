# Implementation Report — BSC Chain Adapter + Evidence Engine

## Version
Spotriq `0.3.0`

## Implemented
- Added `@spotriq/chain` package.
- Added BSC Mainnet/Testnet definitions and expected chain IDs.
- Added primary/secondary JSON-RPC failover.
- Added chain-ID verification so a wrong-chain RPC cannot silently serve Spotriq.
- Added canonical block, transaction, receipt, native-balance, and requested ERC-20 balance reads.
- Added same-block wallet balance snapshots.
- Added partial ERC-20 coverage reporting.
- Added safe RPC diagnostic redaction.
- Added `@spotriq/evidence` package.
- Added data-source registry and versioned evidence-method registry.
- Added truth-layer/provenance model, evidence envelopes, freshness policies, and conflict detection.
- Added evidence database migration and source/method seed data.
- Added typed API contracts and BSC/evidence routes.
- Added BSC dependency to API health.
- Updated capability reporting, environment configuration, docs, and structural verification.

## API routes added
- `GET /v1/chain/status`
- `GET /v1/chain/blocks/:blockNumber` (`latest` supported)
- `GET /v1/chain/transactions/:hash`
- `GET /v1/wallets/:address/balances`
- `GET /v1/wallets/:address/balances?tokens=0x...,0x...`
- `GET /v1/evidence/sources`

## Environment
Added/activated:
- `BSC_NETWORK=testnet|mainnet`
- `BSC_RPC_PRIMARY`
- `BSC_RPC_SECONDARY`
- `BSC_RPC_TIMEOUT_MS`

Blank RPC URLs are allowed in development and use official public BSC fallbacks. Production continues to require `BSC_RPC_PRIMARY`.

## Validation performed in build environment
Runtime-isolated deterministic tests passed for:
1. primary RPC failure → secondary failover
2. wrong chain ID → valid secondary fallback
3. native balance normalization + canonical evidence
4. ERC-20 `balanceOf` + decimals/symbol/name decoding
5. freshness-state transitions
6. evidence-conflict detection

Static source verification is also included in `pnpm verify`.

## Validation that must run locally after replacement
Because the packaging environment does not contain the project's installed pnpm dependency graph, run:

```powershell
pnpm install
pnpm check
pnpm dev
```

Then exercise the local API routes documented in README.

## Known limits
- Protocol-specific PancakeSwap and Venus reads are intentionally not implemented in this milestone.
- Public BNB RPC endpoints are suitable as development fallback, not production-grade indexing infrastructure.
- Mainnet public endpoint limitations (including log-query constraints on some public endpoints) mean future event/indexing work must use an appropriate provider rather than assuming all public endpoints support every RPC method.
- Evidence persistence schema is ready, but Smart Money Check persistence is introduced when the check engine starts writing real snapshots/findings.

## Next milestone
PancakeSwap Adapter — normalize supported liquidity positions, pools, pair/price/range state, and evidence for the Rebalancing vertical.
