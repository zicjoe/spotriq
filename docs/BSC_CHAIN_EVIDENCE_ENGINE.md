# Spotriq BSC Chain Adapter + Evidence Engine

## Purpose
This milestone creates Spotriq's first real financial-truth layer. Protocol adapters and Smart Money Check must consume this normalized layer rather than calling arbitrary RPC endpoints from UI or feature code.

## Chain boundary
`@spotriq/chain` owns BSC JSON-RPC access.

Supported networks:
- BSC Mainnet — chain ID 56
- BSC Testnet — chain ID 97

Development can use official public BSC fallback endpoints when `BSC_RPC_PRIMARY` / `BSC_RPC_SECONDARY` are blank. Production requires an explicit primary RPC in server configuration. Public fallbacks are not intended to become Spotriq's production indexing infrastructure.

### Current normalized reads
- chain status / chain-ID validation
- latest or explicit block
- transaction by hash
- transaction receipt
- native BNB/tBNB wallet balance
- requested ERC-20 balances and metadata

### Failover
Every endpoint is chain-ID validated before normal reads. A primary failure or wrong-chain endpoint causes the adapter to try the secondary endpoint. If every endpoint fails, the adapter returns a typed `RPC_UNAVAILABLE` error rather than fabricating data.

### Provider secret handling
The public chain-status API strips configured RPC paths/query strings and only exposes safe origins. This prevents provider API keys embedded in RPC URLs from being leaked in diagnostics.

## Evidence boundary
`@spotriq/evidence` owns provenance, truth layers, source definitions, method definitions, freshness policy, and evidence-conflict detection.

### Truth layers
1. `CANONICAL_ONCHAIN`
2. `PROTOCOL_STATE`
3. `EXTERNAL_INDEXED`
4. `OPERATOR_SUPPLIED`
5. `MARKETPLACE_OBSERVED`
6. `MARKETPLACE_DERIVED`
7. `AI_EXPLANATION`

The four user-facing provenance labels remain separate:
- Marketplace Observed
- Marketplace Derived
- External
- Operator Supplied

Canonical onchain data is represented technically as `CANONICAL_ONCHAIN` and surfaced to consumers through the appropriate evidence/provenance treatment; it is never mislabeled as marketplace-observed.

## Evidence envelope
Chain-derived evidence can include:
- subject and metric
- value/unit
- source ID/name
- truth layer
- observed/effective time
- network and chain ID
- block number/hash where available
- transaction hash where applicable
- finality state
- confidence
- method/version and inputs
- freshness assessment
- availability state

## Freshness
Initial versioned product policies are encoded for chain block, wallet balances, transaction state, permission state, health, liquidity, current price, yield rates, and grid regime. These are Spotriq product policies, not BNB/protocol guarantees.

## Partial token coverage
Wallet balance reads use one observed block for native/requested ERC-20 reads. If a valid token contract read fails, successful results remain available and `failedTokenAddresses` records incomplete coverage. Invalid addresses produce a structured input error instead of a partial result.

## Persistence schema
Migration `0002_chain_evidence_spine.sql` adds:
- `data_sources`
- `evidence_methods`
- `raw_observations`
- additional provenance/chain/freshness columns on `evidence_records`
- `evidence_conflicts`

The schema is ready for Smart Money Check persistence; chain diagnostic endpoints currently return normalized evidence directly even when PostgreSQL is not configured.

## Deliberate limits
This milestone does not yet add:
- PancakeSwap position/pool normalization
- Venus lending normalization
- `eth_getLogs` based indexing
- Smart Money Check persistence/execution
- agent discovery

Those systems must build on this layer instead of bypassing it.
