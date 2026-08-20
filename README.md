# Spotriq

**BSC financial-agent marketplace**

> Know what your money needs. Spot the right agent for it.

Spotriq is a pnpm monorepo containing the Figma-derived consumer frontend plus the backend, worker, BSC chain, PancakeSwap protocol adapter, Smart Money Check engine, evidence, agent-registry, domain, API-contract, and PostgreSQL foundations for the real financial-agent marketplace.

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
  market-context/ PancakeSwap V3 onchain TWAP context + deterministic Grid regime
  smart-money/    live check orchestration + deterministic findings + persistence adapters
  agent-registry/  ERC-8004 canonical identity + 8004scan indexed discovery
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


## Grid Trading market-context APIs

```text
http://localhost:3001/v1/wallets/0xYOUR_BSC_ADDRESS/grid/market-context
http://localhost:3001/v1/grid/pools/0xPANCAKE_V3_POOL/context
```

The Grid context layer reads supported PancakeSwap V3 current pool state and available onchain oracle observations for 1h, 6h, and 24h windows. Spotriq uses a deterministic, versioned classifier to describe directional/range context. It does **not** call TWAP dispersion realised volatility, predict profitability, infer capital size, or infer the user's risk tolerance. If required pool oracle history is unavailable, the result is `INSUFFICIENT_HISTORY` / Could Not Assess rather than a guessed regime.


## Live Smart Money Check

The existing Figma Smart Money Check is now wired to a real read-only backend for supported BSC data.

Start a live check from the UI by connecting an EIP-1193 compatible wallet or entering a BSC address. The Example Portfolio remains available and clearly labelled as sample data for the complete four-category demo flow.

API:

```text
POST http://localhost:3001/v1/checks
GET  http://localhost:3001/v1/checks/:checkSessionId
GET  http://localhost:3001/v1/checks/:checkSessionId/findings
GET  http://localhost:3001/v1/checks/:checkSessionId/events
```

Current live check coverage now has real data foundations across all four required financial categories: Rebalancing from supported PancakeSwap V3 LP range state, Health from Venus Core/Isolated lending risk, Yield from wallet-relevant Venus supply markets, and Grid from wallet-relevant PancakeSwap V3 onchain oracle averages. Agent matching, wallet-wide token discovery, Infinity wallet-wide discovery, and historical realised-performance analytics remain explicitly unsupported/partial instead of being faked.

## Live ERC-8004 / 8004scan agent discovery

Spotriq now separates **agent identity discovery** from **marketplace service activation**. 8004scan is used as an external indexed discovery source, while a selected identity can be rechecked directly against the configured ERC-8004 Identity Registry. A discovered identity is **not** automatically a Spotriq financial service. v0.10.0 now normalizes supported-category identities into separate listing/service candidates with explicit Offer, PermissionProfile and deterministic ReadinessSnapshot resources; every registry-derived candidate remains non-activatable until required readiness gates pass.

```text
http://localhost:3001/v1/registry/status
http://localhost:3001/v1/agents?chainId=56&limit=5
http://localhost:3001/v1/agents/search?q=yield%20agent%20BSC&chainId=56&limit=5
http://localhost:3001/v1/agents/56/AGENT_TOKEN_ID
http://localhost:3001/v1/agents/56/AGENT_TOKEN_ID/feedback
http://localhost:3001/v1/accounts/0xOWNER_ADDRESS/agents
```

The consumer Explore screen keeps Spotriq's current reference services clearly labelled **Sample data** and shows live registry identities in a separate **Live ERC-8004 registry discoveries** section. Registry-derived financial category labels are metadata hints only and remain **Operator supplied**, not marketplace-tested capability. External 8004scan feedback remains external evidence and is never converted into a Spotriq marketplace review or opaque trust score.

Default discovery uses BSC Mainnet (`AGENT_DISCOVERY_CHAIN_ID=56`) so the marketplace can inspect live BSC identities while transactional engineering can continue on BSC Testnet. The discovery chain can be changed to 97 for testing. An 8004scan API key is optional; configure `SCAN8004_API_KEY` when available.

Remote HTTPS/IPFS registration URIs are intentionally not fetched server-side in this milestone. `data:` registration files can be parsed and backlink-checked safely; remote URIs remain visible but are marked as not fetched until Spotriq adds a hardened metadata-fetch subsystem.

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

PostgreSQL is optional for ephemeral local development, but is now recommended for durable Smart Money Check sessions/evidence/findings. If configured, run all migrations:

```powershell
pnpm db:health
pnpm db:migrate
```

Migration `0002_chain_evidence_spine.sql` introduces Spotriq's data-source, evidence-method, raw-observation, freshness, and conflict schema. Migration `0003_smart_money_rebalancing.sql` adds check-event persistence and the additional Smart Money finding fields. Migration `0004_venus_health_positions.sql` adds normalized Venus pool/market lending snapshots. Migration `0005_yield_opportunities.sql` persists Yield opportunity snapshots. Migration `0006_grid_market_context.sql` persists Grid market-context snapshots plus Grid evidence methods. Migration `0007_agent_registry_discovery.sql` extends canonical agent identity fields, discovery cache, external feedback records, and registry sync history.

## Run one process only

```powershell
pnpm dev:web
pnpm dev:api
pnpm dev:worker
```

## Current product-data state

- Reference financial-service cards remain clearly labelled sample data; Explore now also displays a separate live ERC-8004 registry discovery surface.
- Live discovered ERC-8004 identities are explicitly `DISCOVERED` / `NOT_CREATED` and are not activatable Spotriq services yet.
- BSC chain status, block, transaction, native balance, and requested ERC-20 balance APIs are now real provider-backed reads.
- Those chain reads return normalized evidence/provenance/freshness structures.
- PancakeSwap V3 and Infinity CL current-state normalization is live at the API layer.
- PancakeSwap V3 data is now wired into live/persisted Smart Money Check Rebalancing findings.
- The live Smart Money Check deliberately reports partial coverage for unsupported sources.
- Venus Core Pool and registered Isolated Pool health normalization is live and feeds Smart Money Check Health findings. Canonical protocol shortfall takes precedence over Spotriq's explanatory derived health factor.
- Wallet-relevant Venus supply opportunities now expose current base supply APY as a distinct, variable protocol-rate metric and feed Smart Money Check Yield findings. Estimated net APY and observed realised yield remain intentionally unavailable until Spotriq has the evidence required to calculate them credibly.
- Wallet-relevant PancakeSwap V3 Grid contexts now use current pool price plus available onchain 1h/6h/24h oracle TWAP windows. The versioned regime classifier can return `RANGE_LIKE`, `TRENDING_UP`, `TRENDING_DOWN`, `MIXED`, or `INSUFFICIENT_HISTORY`. TWAP dispersion is not labelled as realised volatility and no profitability/advisability claim is made.

## Engineering documentation

- `docs/FIGMA_EXPORT_AUDIT.md`
- `docs/BACKEND_FUSION_CONTRACT.md`
- `docs/FOUNDATION_HARDENING_BACKEND_SKELETON.md`
- `docs/BSC_CHAIN_EVIDENCE_ENGINE.md`
- `docs/IMPLEMENTATION_REPORT_BSC_CHAIN_EVIDENCE.md`
- `docs/PANCAKESWAP_ADAPTER.md`
- `docs/IMPLEMENTATION_REPORT_PANCAKESWAP_ADAPTER.md`
- `docs/SMART_MONEY_CHECK_REBALANCING.md`
- `docs/IMPLEMENTATION_REPORT_SMART_MONEY_CHECK_REBALANCING.md`
- `docs/VENUS_ADAPTER_HEALTH_MONITORING.md`
- `docs/IMPLEMENTATION_REPORT_VENUS_HEALTH.md`
- `docs/IMPLEMENTATION_REPORT_YIELD_FOUNDATION.md`
- `docs/GRID_MARKET_CONTEXT.md`
- `docs/IMPLEMENTATION_REPORT_GRID_MARKET_CONTEXT.md`
- `docs/ERC8004_AGENT_REGISTRY_DISCOVERY.md`
- `docs/IMPLEMENTATION_REPORT_AGENT_REGISTRY_DISCOVERY.md`
- `docs/ENGINEERING_STATUS.md`

## Next milestone

Implement the **Marketplace Test Lab + Service Readiness Verification**. It should safely verify declared A2A/MCP runtime endpoints and service contract behaviour, create Marketplace Observed evidence, and move readiness gates from UNKNOWN to explicit PASS/FAIL without uncontrolled fund movement. After that, Smart Money Check can deterministically map Findings to eligible AgentServices and rank compatible candidates.


## v0.9.2 registry visibility
Explore now renders all live ERC-8004 identities in the All view. Recognized financial-category hints are displayed and used only for explicit category filtering; they no longer hide valid registry identities from the general live-discovery surface.


## v0.10.0 marketplace supply/readiness

Spotriq now preserves the full supply sequence `AgentIdentity → AgentListing → AgentService → Offer/PermissionProfile → ReadinessSnapshot`. Supported-category ERC-8004 identities can appear as normalized service candidates in Explore, but capability remains operator-claimed until Marketplace Test Lab evidence exists. Pricing and authority remain undeclared unless explicitly supplied, canonical mismatches suspend candidates, testnet candidates remain testnet-only, and all registry-derived candidates have activation blocked in this release.
