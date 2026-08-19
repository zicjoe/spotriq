# Spotriq

**BSC financial-agent marketplace**

> Know what your money needs. Spot the right agent for it.

Spotriq is a pnpm monorepo containing the Figma-derived consumer frontend plus the backend, worker, BSC chain, PancakeSwap protocol adapter, evidence, domain, API-contract, and PostgreSQL foundations for the real financial-agent marketplace.

## Workspace

```text
apps/
  web/       React/Vite Spotriq product
  api/       Fastify TypeScript API
  worker/    background worker foundation
packages/
  domain/        shared domain resources
  config/        server configuration
  api-contracts/ normalized API contracts
  db/            PostgreSQL foundation/migrations
  chain/         normalized BSC JSON-RPC adapter
  evidence/      provenance, freshness, methods, source registry
  protocol-pancakeswap/ PancakeSwap V3 + Infinity CL normalized reads
```

## Windows PowerShell setup

From the repository root, for example `C:\dev\Spotriq`:

```powershell
pnpm install
pnpm check
pnpm dev
```

`pnpm dev` starts:

- Spotriq Web: `http://localhost:5173`
- Spotriq API: `http://localhost:3001`
- Spotriq Worker: local worker process/heartbeat

## Live BSC API checks

The API now supports normalized BSC reads and evidence envelopes.

```text
http://localhost:3001/health
http://localhost:3001/v1/meta
http://localhost:3001/v1/system/capabilities
http://localhost:3001/v1/chain/status
http://localhost:3001/v1/chain/blocks/latest
http://localhost:3001/v1/evidence/sources
```

Wallet balance example:

```text
http://localhost:3001/v1/wallets/0xYOUR_BSC_ADDRESS/balances
```

Requested ERC-20 balances can be included with a comma-separated `tokens` query:

```text
http://localhost:3001/v1/wallets/0xYOUR_BSC_ADDRESS/balances?tokens=0xTOKEN1,0xTOKEN2
```

Transaction lookup:

```text
http://localhost:3001/v1/chain/transactions/0xTRANSACTION_HASH
```

## PancakeSwap current-state APIs

```text
http://localhost:3001/v1/protocols/pancakeswap/status
http://localhost:3001/v1/wallets/0xYOUR_BSC_ADDRESS/pancakeswap/positions
http://localhost:3001/v1/protocols/pancakeswap/positions/v3/POSITION_TOKEN_ID
http://localhost:3001/v1/protocols/pancakeswap/positions/infinity-cl/POSITION_TOKEN_ID
```

The wallet endpoint currently auto-discovers PancakeSwap V3 position NFTs. Infinity CL current state can be read by known token ID; wallet-wide Infinity discovery is explicitly marked `TOKEN_ID_REQUIRED` until Spotriq adds an indexed event source.

Range state is returned as one of `IN_RANGE`, `NEAR_LOWER`, `NEAR_UPPER`, `OUT_OF_RANGE_BELOW`, `OUT_OF_RANGE_ABOVE`, or `NO_LIQUIDITY`, with evidence and method metadata. USD valuation and historical performance are intentionally not fabricated in this milestone.

## BSC RPC configuration

Development works without creating an RPC account: blank `BSC_RPC_PRIMARY` and `BSC_RPC_SECONDARY` use official public BSC fallback endpoints.

For production/staging reliability, configure dedicated endpoints:

```env
BSC_NETWORK=testnet
BSC_RPC_PRIMARY=https://your-primary-rpc
BSC_RPC_SECONDARY=https://your-secondary-rpc
BSC_RPC_TIMEOUT_MS=7500
```

Never commit `.env`. Public API diagnostics redact configured RPC paths/query strings so provider keys are not echoed to clients.

## Database

PostgreSQL is still optional for local frontend/API development. If configured, run both current migrations:

```powershell
pnpm db:health
pnpm db:migrate
```

Migration `0002_chain_evidence_spine.sql` introduces Spotriq's data-source, evidence-method, raw-observation, freshness, and conflict schema.

## Run one process only

```powershell
pnpm dev:web
pnpm dev:api
pnpm dev:worker
```

## Current product-data state

- Consumer marketplace screens still use clearly-labelled normalized sample marketplace data.
- BSC chain status, block, transaction, native balance, and requested ERC-20 balance APIs are now real provider-backed reads.
- Those chain reads return normalized evidence/provenance/freshness structures.
- PancakeSwap V3 and Infinity CL current-state normalization is live at the API layer.
- PancakeSwap data has not yet been wired into persisted Smart Money Check findings.
- Venus protocol normalization is still pending.

## Engineering documentation

- `docs/FIGMA_EXPORT_AUDIT.md`
- `docs/BACKEND_FUSION_CONTRACT.md`
- `docs/FOUNDATION_HARDENING_BACKEND_SKELETON.md`
- `docs/BSC_CHAIN_EVIDENCE_ENGINE.md`
- `docs/IMPLEMENTATION_REPORT_BSC_CHAIN_EVIDENCE.md`
- `docs/PANCAKESWAP_ADAPTER.md`
- `docs/IMPLEMENTATION_REPORT_PANCAKESWAP_ADAPTER.md`
- `docs/ENGINEERING_STATUS.md`

## Next milestone

Smart Money Check Core + Rebalancing Finding Engine — persist scans/snapshots/evidence and turn supported PancakeSwap range state into deterministic Rebalancing findings.
