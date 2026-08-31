# Spotriq

> Project continuity: read `PROJECT_STATE.md` for the present implementation, `SPOTRIQ_FOUNDATION.md` for canonical product/architecture doctrine, `SPOTRIQ_DRIFT_AUDIT.md` for alignment gaps, `CORRECTED_ROADMAP.md` for sequencing, and `PROJECT_OPERATING_RULES.md` for the engineering handoff/release contract. The recovered foundational handoff is preserved at `docs/history/SPOTRIQ_FOUNDATIONAL_HANDOFF_ARCHIVE.md`.

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
  marketplace-supply/ financial service normalization, Test Lab, matching, trusted runtime evidence
  reference-agents/ first-party four-category deterministic A2A services
  commercial/       Offer → Quote → Hire → payment evidence → Marketplace Activation
  job-intents/      reviewable Rebalancing job intent lifecycle
  authority/        bounded permission requests, Altana verification and safety prerequisites
  execution-guard/  deterministic PancakeSwap V3 calldata validation
  execution-plans/  reviewed deterministic Rebalancing execution plans
  execution-boundary/ exact-plan non-bypassable financial enforcement boundary
  controlled-execution/ exact wallet-admin approvals + one-shot BSC Testnet dispatch/receipt reconciliation
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
GET  http://localhost:3001/v1/checks/:checkSessionId/findings/:findingId/matches
POST http://localhost:3001/v1/checks/:checkSessionId/findings/:findingId/job-intents
GET  http://localhost:3001/v1/job-intents/:jobIntentId
PATCH http://localhost:3001/v1/job-intents/:jobIntentId
POST http://localhost:3001/v1/job-intents/:jobIntentId/confirm
POST http://localhost:3001/v1/job-intents/:jobIntentId/service-tasks
GET  http://localhost:3001/v1/job-intents/:jobIntentId/service-task
GET  http://localhost:3001/v1/service-tasks/:serviceTaskId
POST http://localhost:3001/v1/service-tasks/:serviceTaskId/reconcile
POST http://localhost:3001/v1/service-tasks/:serviceTaskId/retry
POST http://localhost:3001/v1/service-tasks/:serviceTaskId/cancel
POST http://localhost:3001/v1/job-intents/:jobIntentId/permissions
GET  http://localhost:3001/v1/permissions/:permissionRequestId
PATCH http://localhost:3001/v1/permissions/:permissionRequestId
POST http://localhost:3001/v1/permissions/:permissionRequestId/reconcile
GET  http://localhost:3001/v1/permission-grants/:permissionGrantId
POST http://localhost:3001/v1/permission-grants/:permissionGrantId/reverify
GET  http://localhost:3001/v1/checks/:checkSessionId/events
```

Current live check coverage now has real data foundations across all four required financial categories: Rebalancing from supported PancakeSwap V3 LP range state, Health from Venus Core/Isolated lending risk, Yield from wallet-relevant Venus supply markets, and Grid from wallet-relevant PancakeSwap V3 onchain oracle averages. v0.13.0 adds an on-demand deterministic Finding → AgentService compatibility handoff. v0.14.0 adds the first live Rebalancing vertical handoff into a reviewable, persisted PREPARE_ONLY Job Intent. v0.15.0 derives exact bounded Altana-oriented authority requests, reconciles observed grants against the reviewed scope, and independently verifies current Keystore validity while keeping execution disabled. Wallet-wide token discovery, Infinity wallet-wide discovery, and historical realised-performance analytics remain explicitly unsupported/partial instead of being faked.

## Live ERC-8004 / 8004scan agent discovery

Spotriq separates **agent identity discovery** from **marketplace service activation**. 8004scan is used as an external indexed discovery source, while a selected identity can be rechecked directly against the configured ERC-8004 Identity Registry. A discovered identity is **not** automatically a Spotriq financial service. v0.12.0 added Marketplace Test Lab; v0.13.0 connects real Smart Money Findings to normalized live AgentService candidates through deterministic, explainable compatibility ranking; v0.14.0 lets a user select a compatible Rebalancing service and prepare a reviewable job; v0.15.0 adds a bounded authority review/reconciliation layer without pretending a trusted external-agent session key or live grant already exists. Test/evidence quality and readiness can affect ordering, but neither compatibility nor a high rank bypasses the independent permission/authority gate.

```text
http://localhost:3001/v1/registry/status
http://localhost:3001/v1/agents?chainId=56&limit=5
http://localhost:3001/v1/agents/search?q=yield%20agent%20BSC&chainId=56&limit=5
http://localhost:3001/v1/agents/56/AGENT_TOKEN_ID
http://localhost:3001/v1/agents/56/AGENT_TOKEN_ID/feedback
http://localhost:3001/v1/accounts/0xOWNER_ADDRESS/agents
```

Explore now combines two truthful live-supply sources: first-party Spotriq reference AgentServices and external ERC-8004-derived candidates. RangeKeeper, GridPilot, YieldPilot and VenusGuard are backed by real read-only A2A runtimes in v0.22; duplicate legacy sample cards are suppressed while any remaining fixture is still clearly labelled sample data. Live registry identities remain separate in **Live ERC-8004 registry discoveries**. Registry-derived financial category labels are metadata hints only and remain **Operator supplied**, not marketplace-tested capability. External 8004scan feedback remains external evidence and is never converted into a Spotriq marketplace review or opaque trust score.

Default discovery uses BSC Mainnet (`AGENT_DISCOVERY_CHAIN_ID=56`) so the marketplace can inspect live BSC identities while transactional engineering can continue on BSC Testnet. The discovery chain can be changed to 97 for testing. An 8004scan API key is optional; configure `SCAN8004_API_KEY` when available.

Remote HTTPS/IPFS registration URIs are intentionally not fetched server-side in this milestone. `data:` registration files can be parsed and backlink-checked safely; remote URIs remain visible but are marked as not fetched until Spotriq adds a hardened metadata-fetch subsystem.

## v0.23.0 Commercial Hiring + Marketplace Activation Kernel

Spotriq now implements the first real commercial relationship lifecycle while preserving `Payment ≠ Permission ≠ Activation ≠ Execution ≠ Outcome`. The four accepted reference services publish structured zero-price `FREE / READ_ONLY_SERVICE / FREE` offers. Explore can execute a real connected-wallet API flow: `Offer → immutable Quote → idempotent Hire → FREE payment state NOT_REQUIRED → read-only Marketplace Activation`. This Activation grants no wallet signing or financial execution authority and does not change the separate financial `marketplaceActivationEligible` readiness flag.

Commercial APIs:

```text
GET  http://localhost:3001/v1/services/:serviceId/offers
POST http://localhost:3001/v1/quotes
GET  http://localhost:3001/v1/quotes/:quoteId
POST http://localhost:3001/v1/hires
GET  http://localhost:3001/v1/hires/:hireId
GET  http://localhost:3001/v1/hires/:hireId/payment
POST http://localhost:3001/v1/hires/:hireId/payment/reconcile
POST http://localhost:3001/v1/hires/:hireId/activate
GET  http://localhost:3001/v1/activations/:activationId
GET  http://localhost:3001/v1/accounts/:address/commercial-state
```

The provider-neutral payment adapter seam includes a read-only ERC-8183 on-chain observer/reconciler. X402/B402 are represented payment rails but do not yet have live adapters. A browser cannot make a Hire paid by submitting a trusted `paid=true` flag.

Verification commands added/restored in this release:

```powershell
pnpm verify:reference-acceptance
pnpm verify:commercial-acceptance
```

See `docs/COMMERCIAL_HIRING_ACTIVATION.md` and `docs/IMPLEMENTATION_REPORT_COMMERCIAL_HIRING_ACTIVATION_v0.23.0.md`.

## v0.22.2 Reference-agent ERC-8004 identity reconciliation

Spotriq can now bind a first-party reference AgentService to a real ERC-8004 identity **without hard-coding registry IDs into source**. Deployment configuration supplies the candidate ID, the API performs direct canonical verification, and the binding is accepted only when all of these agree:

- canonical ERC-8004 verification is `VERIFIED`;
- the ERC-8004 registration backlink identifies the same token/registry;
- registration metadata names the expected Spotriq reference agent;
- the registered `A2A` endpoint exactly matches the expected public Spotriq Agent Card.

Configuration:

```env
# Independent from AGENT_DISCOVERY_CHAIN_ID. Use 97 for the current Testnet acceptance identities.
REFERENCE_AGENT_REGISTRY_CHAIN_ID=97

REFERENCE_AGENT_RANGEKEEPER_ID=2017
REFERENCE_AGENT_GRIDPILOT_ID=   # set to the real accepted Testnet ID in deployment
REFERENCE_AGENT_YIELDPILOT_ID=   # set to the real accepted Testnet ID in deployment
REFERENCE_AGENT_VENUSGUARD_ID=   # set to the real accepted Testnet ID in deployment
```

`AGENT_DISCOVERY_CHAIN_ID=56` may remain unchanged for live external marketplace discovery. First-party reference services remain visible even when their current identity is BSC Testnet-only, and each record exposes its own identity chain/readiness state. A verified first-party identity can make `CANONICAL_IDENTITY = PASS`, while financial `marketplaceActivationEligible` remains false because financial authority/execution remains a separate gate from v0.23 read-only commercial Activation.

External v0.22 acceptance is complete for all four reference services. RangeKeeper is explicitly known as BSC Testnet ERC-8004 Agent ID `2017`, with Spotriq-observed canonical owner/backlink/registration metadata and the public RangeKeeper A2A Agent Card all matching. This README intentionally does not invent the other numeric IDs; use the real deployment configuration accepted for those services.

## v0.22.1 Railway TypeScript Build Hotfix

v0.22.1 preserves the v0.22.0 four-category reference-agent functionality and fixes production TypeScript build failures surfaced by Railway's clean `pnpm --filter @spotriq/api build` environment. The hotfix aligns PostgreSQL query generics, viem Hex decoding types, PancakeSwap test doubles, direct API workspace dependencies, and execution-guard narrowing. No marketplace semantics or readiness gates are weakened.

## v0.22.0 Live four-category reference AgentServices

Spotriq now ships genuine first-party deterministic service runtimes for all four required categories:

- RangeKeeper — PancakeSwap V3 position/range analysis;
- GridPilot — PancakeSwap V3 current/TWAP market context;
- YieldPilot — Venus current supply-opportunity/base-rate data;
- VenusGuard — Venus lending-risk/health state.

Service discovery/runtime APIs:

```text
GET  http://localhost:3001/v1/reference-agents
GET  http://localhost:3001/v1/reference-agents/rangekeeper/.well-known/agent-card.json
GET  http://localhost:3001/v1/reference-agents/gridpilot/.well-known/agent-card.json
GET  http://localhost:3001/v1/reference-agents/yieldpilot/.well-known/agent-card.json
GET  http://localhost:3001/v1/reference-agents/venusguard/.well-known/agent-card.json
POST http://localhost:3001/v1/reference-agents/:slug/a2a
```

These records flow through the normal Spotriq listing/service/readiness/Test Lab/Finding-matching pipeline with `origin = REFERENCE`. In v0.23 they remain `READ_ONLY` but now publish truthful structured `FREE / READ_ONLY_SERVICE / FREE` commercial terms and can form a read-only Spotriq Marketplace Activation. Their separate financial execution readiness remains gated. `erc8004Verified` becomes true only for a deployment-configured reference identity that passes canonical name/backlink/A2A endpoint reconciliation. A first-party callable runtime is never treated as an ERC-8004 identity merely because Spotriq ships it, and ERC-8004 verification is never treated as financial permission or execution authority.

Local runtime calls work on `127.0.0.1`; Marketplace Test Lab intentionally refuses private/localhost addresses. For a deployed environment set `PUBLIC_API_BASE_URL=https://YOUR_PUBLIC_API_HOST`. Production requires this value and HTTPS. After public deployment, run Test Lab and perform genuine ERC-8004 registration/reconciliation rather than embedding fake agent IDs.

See `docs/LIVE_REFERENCE_AGENT_SUPPLY.md`.

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

Migration `0002_chain_evidence_spine.sql` introduces Spotriq's data-source, evidence-method, raw-observation, freshness, and conflict schema. Migration `0003_smart_money_rebalancing.sql` adds check-event persistence and the additional Smart Money finding fields. Migration `0004_venus_health_positions.sql` adds normalized Venus pool/market lending snapshots. Migration `0005_yield_opportunities.sql` persists Yield opportunity snapshots. Migration `0006_grid_market_context.sql` persists Grid market-context snapshots plus Grid evidence methods. Migration `0007_agent_registry_discovery.sql` extends canonical agent identity fields, discovery cache, external feedback records, and registry sync history. Migration `0008_marketplace_service_readiness.sql` persists service offers, permission profiles, readiness snapshots, capability claims and normalized service cache. Migration `0009_marketplace_test_lab.sql` persists immutable Marketplace Test Lab runs and coverage payloads. Migration `0015_service_task_origin_proof.sql` persists real AgentService task invocation/origin/proposal evidence. Migration `0016_commercial_hiring_activation.sql` adds structured Offer terms, immutable Quotes, Hires, independent payment evidence, commercial fields on the existing Activation resource, and optional ServiceTask → Activation binding.

## Run one process only

```powershell
pnpm dev:web
pnpm dev:api
pnpm dev:worker
```

## Current product-data state

- Four first-party reference AgentServices are live and suppress duplicate legacy sample cards; Explore also displays a separate live ERC-8004 registry discovery surface.
- Live discovered ERC-8004 identities remain distinct from normalized AgentServices; search relevance alone never creates a service claim. Eligible normalized A2A/MCP candidates can be contract-tested, live Smart Money Findings can be matched/ranked against normalized services using explicit context rules, a selected Rebalancing match can become a PREPARE_ONLY Job Intent, and a confirmed V3 intent can now produce an exact bounded permission request plus independently verified Altana grant state. Read-only commercial Activation is live for the four FREE reference offers; financial permission/execution remains separately gated.
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
- `docs/COMMERCIAL_HIRING_ACTIVATION.md`
- `docs/IMPLEMENTATION_REPORT_COMMERCIAL_HIRING_ACTIVATION_v0.23.0.md`
- `docs/ERC8004_AGENT_REGISTRY_DISCOVERY.md`
- `docs/IMPLEMENTATION_REPORT_AGENT_REGISTRY_DISCOVERY.md`
- `docs/IMPLEMENTATION_REPORT_MARKETPLACE_SUPPLY_v0.10.0.md`
- `docs/IMPLEMENTATION_REPORT_FINANCIAL_SUPPLY_DISCOVERY_v0.11.0.md`
- `docs/MARKETPLACE_TEST_LAB.md`
- `docs/IMPLEMENTATION_REPORT_MARKETPLACE_TEST_LAB_v0.12.0.md`
- `docs/FINDING_SERVICE_COMPATIBILITY.md`
- `docs/IMPLEMENTATION_REPORT_FINDING_SERVICE_COMPATIBILITY_v0.13.0.md`
- `docs/REBALANCING_JOB_INTENT.md`
- `docs/IMPLEMENTATION_REPORT_REBALANCING_JOB_INTENT_v0.14.0.md`
- `docs/BOUNDED_PERMISSION_AUTHORITY.md`
- `docs/IMPLEMENTATION_REPORT_BOUNDED_PERMISSION_AUTHORITY_v0.15.0.md`
- `docs/ENGINEERING_STATUS.md`

## v0.11.0 targeted financial supply discovery

`GET /v1/services?chainId=56&limit=8` now performs bounded category-aware discovery instead of sampling only the generic newest-agent page. Spotriq issues one live registry search for each required category — Rebalancing, Grid Trading, Yield Optimisation and Health Factor Monitoring — then merges and deduplicates identities.

The response includes a `discovery` object containing per-category search coverage and search-relevant leads. A lead can be relevant to a search without becoming an `AgentService`; promotion still requires an independently matching operator-supplied metadata hint. This preserves the invariant **search relevance ≠ capability proof**. Individual category search failures are isolated so partial live supply can still be returned.

The Explore UI now displays targeted-search coverage and search-only leads separately from normalized financial service candidates.

## v0.12.0 Marketplace Test Lab + Service Readiness Verification

Spotriq can now run bounded verification against normalized live service candidates with declared A2A/MCP runtimes. The Test Lab validates public HTTPS endpoint policy, observed reachability, protocol discovery/contract behaviour, and category-relevant machine capability without submitting a financial task or invoking an advertised MCP tool.

A2A verification uses Agent Card discovery. Modern MCP verification uses protocol revision `2026-07-28` with `server/discover` and read-only `tools/list`; a bounded legacy fallback is available for declared older MCP runtimes. Test results become explicitly provenance-labelled **Marketplace Observed** evidence and are persisted through migration `0009_marketplace_test_lab.sql`.

New endpoint:

```text
POST /v1/services/:serviceId/tests
```

`GET /v1/services/:serviceId/tests` returns the latest coverage. Test coverage feeds back into readiness, including a distinct runtime-reachability gate. A PASS means Spotriq observed the bounded protocol/category contract; it does **not** prove profitability, fund safety, strategy performance or permission authority. Registry-derived services therefore remain activation-blocked while their `PermissionProfile` is undeclared.

The Explore UI exposes **Run Test Lab** for eligible live A2A/MCP candidates and refreshes the readiness card after a run.

## v0.13.0 Finding → AgentService Compatibility & Ranking

A live Smart Money Finding can now be handed to the marketplace through:

```text
GET /v1/checks/:checkSessionId/findings/:findingId/matches
```

Spotriq derives structured finding context (financial category plus available protocol, asset/address and pair information), performs a bounded live search for normalized services in that category, excludes only hard contradictions it can actually prove, and ranks the remaining candidates deterministically. Missing structured asset/pair coverage remains `UNKNOWN`; it is not silently treated as incompatibility.

The ranking is lexicographic and explainable rather than an opaque score: structured context fit first, then Marketplace/identity evidence quality, then operational readiness, with a stable service-ID tie break. Returned matches expose the exact compatibility checks, strengths, limitations, readiness record and current `activationEligible` value. A top-ranked `LIMITED` service therefore remains activation-blocked.

Explore now recognizes the `fromFinding` handoff from live Smart Money Check results and places **Best live matches for this finding** ahead of generic supply. Sample/reference cards remain separate and are never used as a hidden fallback for a zero-match live result.

## v0.14.0 Rebalancing Vertical Handoff / Reviewable Job Intent

A live Rebalancing match now exposes **Prepare job**. The server reloads the Smart Money Check/Finding, re-runs current compatibility, and constructs one deterministic Job Intent from the structured PancakeSwap LP context plus the selected service. The browser cannot submit arbitrary LP coordinates as authoritative job context.

The intent records the position NFT/pool/pair/ticks/range state/block, selected service match/readiness, evidence references, wallet-control state, proposed slippage/validity/swap-preparation bounds, and unresolved authority blockers. Its execution policy is fixed to `PREPARE_ONLY` / `NO_EXECUTION`. Confirmation advances only `REVIEWABLE → AWAITING_AUTHORITY`; it does not create a PermissionRequest, PermissionGrant, activation or transaction.

PostgreSQL persistence uses the existing `checkouts.job_context` foundation from migration 0001; v0.14 itself added no database migration. The live Job Intent review UI is intentionally separate from the existing reference/sample mock-activation checkout.

## v0.15.0 Explicit Bounded Permission / Authority

A confirmed PancakeSwap V3 Rebalancing Job Intent can now produce a deterministic `BoundedPermissionRequest`. Spotriq derives the Position Manager, token addresses/decimals, protocol, network and token ID from the persisted server-side Job Intent; the browser supplies only explicit token caps and bounded expiry. The request maps to exact Position Manager + function signatures for decrease/collect/increase/mint and explicitly excludes arbitrary calls, multicall, approvals, Permit2, router swaps, withdrawals and transfers.

The reviewed request is not treated as a grant. An externally observed Altana grant must exactly match wallet/calls/spend/expiry and must independently pass the BSC Keystore `isValidKey(wallet, keccak256(sessionPublicKey))` read before Spotriq represents it as active. Re-verification can later downgrade a grant after revocation or expiry.

Consumer grant submission remains deliberately blocked as `SAFETY_PREREQUISITES_REQUIRED` behind two independent machine-readable gates: `TRUSTED_AGENT_SESSION_KEY` and `ARGUMENT_LEVEL_EXECUTION_GUARD`. Current external AgentService metadata does not bind a trustworthy service-owned Altana delegate/session key, and selector-scoped Altana authority cannot by itself bind PancakeSwap V3 `tokenId`, recipient, amount or deadline arguments. Spotriq will not invent/browser-store an external agent secret or mistake selector scope for calldata safety. Even an exact, currently valid grant has `executionEligible = false`; the Job Intent remains `NO_EXECUTION`.

No new database migration is required: the original `permission_requests` and `permission_grants` tables are now used for durable authority state.


## v0.16.0 Trusted Agent Session-Key Binding + V3 Calldata Guard + Altana BSC Testnet Integration Proof

Spotriq can now verify that a selected A2A service controls the exact secp256k1 session public key it declares through `urn:spotriq:authority-binding:v1`. Verification uses a fresh Spotriq challenge, same-origin challenge endpoint enforcement, the existing SSRF-safe runtime fetcher and EIP-191 signature recovery. Missing declarations remain unavailable; failed proof stays failed. The browser cannot supply an arbitrary key to satisfy this gate.

The new `@spotriq/execution-guard` package decodes one proposed PancakeSwap V3 Position Manager call and compares it with the persisted Job Intent and bounded permission request. The guard checks target/selector, exact NFT token ID, recipient, token caps, slippage/deadline and other operation-specific facts where Spotriq has enough evidence. Exact `collect` and bounded `increaseLiquidity` proposals can pass; operations that still need an independently reviewed quote or target range remain `INCONCLUSIVE` instead of being guessed safe.

This off-chain guard is **not** a non-bypassable financial execution boundary. Because an external service can hold the session key directly, authority now exposes three independent prerequisites: `TRUSTED_AGENT_SESSION_KEY`, `ARGUMENT_LEVEL_EXECUTION_GUARD`, and `NON_BYPASSABLE_FINANCIAL_EXECUTION_BOUNDARY`. The last remains blocking in v0.16, so selected-agent financial grant/execution is still disabled.

Spotriq additionally proves the real Altana integration on BSC Testnet with a deliberately non-financial read-only `positions(uint256)` probe on the exact V3 Position Manager. The web app can create/recover the user's Altana passkey wallet, grant the probe, record transaction/session evidence, verify it independently through the Keystore, re-check it later and revoke it. The probe never moves assets and is never represented as the selected AgentService's financial authority.

Migration `0010_trusted_agent_binding_and_altana_probe.sql` persists trusted binding and Altana Testnet probe evidence. The web integration pins `@altananetwork/sdk` at `0.7.1`.



## v0.9.2 registry visibility
Explore now renders all live ERC-8004 identities in the All view. Recognized financial-category hints are displayed and used only for explicit category filtering; they no longer hide valid registry identities from the general live-discovery surface.


## v0.10.0 marketplace supply/readiness

Spotriq now preserves the full supply sequence `AgentIdentity → AgentListing → AgentService → Offer/PermissionProfile → ReadinessSnapshot`. Supported-category ERC-8004 identities can appear as normalized service candidates in Explore, but capability remains operator-claimed until Marketplace Test Lab evidence exists. Pricing and authority remain undeclared unless explicitly supplied, canonical mismatches suspend candidates, testnet candidates remain testnet-only, and all registry-derived candidates have activation blocked in this release.

## v0.17.0 Reviewed Rebalancing Execution Plan + Non-Bypassable Financial Execution Boundary

A confirmed V3 Rebalancing Job Intent can now become an exact three-step `decreaseLiquidity → collect → mint` execution plan after the user reviews a replacement range. Spotriq refreshes the LP state and obtains independent expected-output evidence using a read-only owner-context `eth_call` simulation; failed simulation stops the plan instead of producing synthetic values.

A reviewed/PASS plan can be sealed behind an exact-plan boundary. The external AgentService remains an authenticated proposer only, while the future financial signer is boundary-controlled and intentionally unprovisioned. Fresh preflight revalidates LP ownership/state, target-range relevance and expected outputs. There is no transaction-submission endpoint and `executionEligible` remains false in v0.17.

New persistence migration: `0011_rebalancing_execution_plan_boundary.sql`.

Key APIs:

```text
POST /v1/job-intents/:jobIntentId/execution-plans
GET  /v1/job-intents/:jobIntentId/execution-plan
GET  /v1/execution-plans/:planId
POST /v1/execution-plans/:planId/review
POST /v1/execution-plans/:planId/seal-boundary
GET  /v1/execution-boundaries/:boundaryId
POST /v1/execution-boundaries/:boundaryId/preflight
```

## v0.18.0 Boundary-Controlled Altana Financial Session + Financial Readiness

A sealed BSC Testnet execution boundary can now receive a real Altana financial-session path whose signer is generated inside the Spotriq web-client boundary and is never given to the external AgentService. Provider-returned contract/function calls, token spend caps and expiry must exactly match the reviewed `PermissionRequest`; the financial key must differ from the verified AgentService proposal key; and current Altana Keystore validity is independently checked.

A linked session changes boundary custody to `BOUNDARY_CONTROLLED_ALTANA_TESTNET_SESSION`, but there is still no transaction-submission endpoint. Fresh boundary preflight with valid authority becomes `PASS_EXECUTION_DISABLED`, not executable. Revocation/reverification can make a previously ACTIVE session unusable.

Spotriq also reads current ERC-20 balances and allowance to the exact PancakeSwap V3 Position Manager. For the reviewed `decrease → collect → mint` plan it distinguishes current balance from projected post-collect balance. Missing allowance becomes `APPROVAL_REQUIRED`; Spotriq v0.18 does not auto-approve tokens or create unlimited allowance.

New persistence migration: `0012_boundary_financial_session_readiness.sql`.

Key APIs:

```text
POST /v1/execution-boundaries/:boundaryId/financial-sessions
GET  /v1/execution-boundaries/:boundaryId/financial-session
GET  /v1/financial-sessions/:financialSessionId
POST /v1/financial-sessions/:financialSessionId/reverify
POST /v1/execution-boundaries/:boundaryId/financial-readiness
GET  /v1/execution-boundaries/:boundaryId/financial-readiness
```

## v0.19.0 First Controlled BSC Testnet Rebalancing Execution

Spotriq now has a controlled dispatch path for the exact reviewed `decreaseLiquidity → collect → mint` BSC Testnet plan. Before a dispatch attempt is issued, the backend independently re-verifies the boundary Altana session, refreshes token balance/allowance readiness, reruns the v0.17 LP/quote preflight, and re-authorizes every sealed call hash in order. The browser can submit only the server-prepared exact batch through the boundary-controlled session; arbitrary financial calldata is never accepted from the client.

Missing ERC-20 allowance uses a separate passkey/wallet-admin approval plan with exact amounts only. Insufficient non-zero allowances are reset to zero before setting the reviewed amount; unlimited approval and AgentService-controlled approval remain prohibited. After provider execution, Spotriq independently reads the BSC Testnet receipt before confirming success, consumes the boundary to prevent replay, refreshes the old LP NFT, and can identify/verify a replacement V3 NFT from Position Manager mint logs when those logs are present.

New migration: `0013_controlled_rebalancing_execution.sql`.

Key APIs:

```text
POST /v1/execution-boundaries/:boundaryId/approval-plans
GET  /v1/execution-boundaries/:boundaryId/approval-plan
POST /v1/approval-plans/:approvalPlanId/review
POST /v1/approval-plans/:approvalPlanId/observe
POST /v1/execution-boundaries/:boundaryId/controlled-executions
GET  /v1/execution-boundaries/:boundaryId/controlled-execution
GET  /v1/controlled-executions/:executionId
POST /v1/controlled-executions/:executionId/observe
POST /v1/controlled-executions/:executionId/reconcile
```

A real transaction is produced only when the user runs the flow with the matching Altana/passkey wallet. Repository tests do not fabricate that onchain evidence.

## v0.20.0 Activity & Outcomes

Confirmed controlled Rebalancing executions now produce a durable execution-scoped timeline plus immediate, provenance-labelled outcome evidence. Spotriq records BSC receipt/gas facts, replacement PancakeSwap V3 NFT state, boundary consumption, Job Intent completion and current financial-session revocation state without creating a fake marketplace Activation.

Immediate outcome measurement intentionally stops at what can be proven from the transaction and receipt-block protocol state. PnL, fees earned, APY, USD gas cost and Agent Advantage remain unavailable until a later measurement window supplies defensible history.

New migration: `0014_execution_activity_outcomes.sql`.

Key APIs:

```text
POST /v1/controlled-executions/:executionId/activity-outcomes/sync
GET  /v1/controlled-executions/:executionId/activity-outcomes
GET  /v1/controlled-executions/:executionId/activity
GET  /v1/controlled-executions/:executionId/outcome
```

v0.21.0 closed the task-origin gap that remained after Activity & Outcomes: the selected external service must be genuinely invoked and return attributable proposal evidence before the Job Intent can advance. At that release, commercial hiring/payment/activation was still a separate later gap; v0.23 now implements that separate kernel.


## v0.21.0 Real AgentService Task Invocation / Origin Proof

A selected live Rebalancing AgentService must now be genuinely contacted before the Job Intent can be confirmed. Spotriq invokes a fresh-tested A2A interface server-side, binds the exact persisted Job/Finding/LP/constraint context into `requestContextHash`, requires a fresh service-owned key-control proof, and persists the remote task/message plus structured proposal evidence.

The browser cannot provide trusted proposal/origin data. A returned range only pre-fills the existing user review. Exact acceptance is attributed to `AGENT_SERVICE`; changed ticks are explicitly `USER_OVERRIDE` and that attribution is sealed into the execution plan hash. The external service remains proposer-only and never receives the boundary financial signer.

In v0.21, A2A invocation was deliberately **not** called paid hiring or marketplace activation. v0.23 now adds separate commerce/Activation semantics without changing the v0.21 origin-proof meaning. See `docs/AGENTSERVICE_TASK_ORIGIN_PROOF.md`.

## v0.22.0 Live Four-Category Reference Agent Supply

`@spotriq/reference-agents` corrects the foundation sequencing drift by backing RangeKeeper, GridPilot, YieldPilot and VenusGuard with real first-party read-only A2A runtime contracts. The runtimes use Spotriq's existing deterministic PancakeSwap/Venus/market-context readers and never receive the financial signer.

The four services are injected into normal marketplace supply/readiness/matching rather than a demo-only path. Explore identifies them as **Live reference service**, while preserving the explicit boundary `First-party runtime ≠ ERC-8004 identity ≠ activation`.

Public HTTPS Test Lab evidence and ERC-8004 registration were deployment-bound v0.22 acceptance steps and are now complete for all four reference services. v0.23 adds a separate FREE read-only commercial Activation path while leaving financial execution eligibility independently gated. See `docs/IMPLEMENTATION_REPORT_LIVE_REFERENCE_AGENT_SUPPLY_v0.22.0.md`.

