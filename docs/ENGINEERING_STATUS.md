# Spotriq Engineering Status

## Completed
- Figma Make product design and Spotriq naming
- Frontend stabilization and backend-fusion seams
- Foundation Hardening + Backend Skeleton
- BSC Chain Adapter + Evidence Engine
- PancakeSwap Adapter — V3 + Infinity CL current-state normalization
- Smart Money Check Core + Rebalancing Finding Engine
- Venus Adapter + Health Factor Monitoring
- Yield Optimisation Data Foundation
- Grid Trading Market-Context Foundation
- ERC-8004 + 8004scan Agent Registry & Discovery
- Agent Service + Marketplace Listing/Readiness Engine
- Targeted Financial Supply Discovery
- Marketplace Test Lab + Service Readiness Verification

## Current source of truth
Use Spotriq **v0.12.0**.

## Current live-data spine
BSC JSON-RPC → protocol adapters → Evidence Engine → Smart Money Engine → Findings → Spotriq UI.

Live financial categories:
1. Rebalancing — PancakeSwap LP range state
2. Health Factor Monitoring — Venus Core/Isolated lending risk
3. Yield Optimisation — Venus wallet-relevant supply opportunities with current base APY provenance
4. Grid Trading — PancakeSwap V3 current price + onchain TWAP market context

## Current marketplace-supply spine
Targeted four-category 8004scan search → deduplicated `FinancialSupplyLead` set → operator-metadata capability gate → `DiscoveredAgent` / `AgentIdentity` → `AgentListing` → supported-category `AgentService` candidate → `Offer` + `PermissionProfile` → Marketplace Test Lab → Marketplace Observed evidence → deterministic `ReadinessSnapshot` → Explore.

Targeted discovery no longer relies on a generic newest-agents page to populate financial supply. Rebalancing, Grid, Yield and Health each receive one bounded registry search. Search relevance remains External discovery evidence and never becomes capability proof by itself.

The following boundaries are enforced:
- AgentIdentity is not AgentListing.
- AgentListing is not AgentService.
- AgentService is not Offer.
- PermissionProfile is not PermissionRequest or PermissionGrant.
- External reputation is not marketplace testing.
- Registry capability text is Operator Supplied evidence, not a tested capability.
- A declared machine endpoint is not an observed reachable runtime.
- Marketplace Test Lab validates protocol/category contract behaviour without executing financial actions or proving profitability.
- Readiness is operational eligibility, not a trust score or performance prediction.

## Readiness state in v0.12.0
Deterministic gates now cover:
1. BSC network
2. Canonical ERC-8004 identity
3. Active registration declaration
4. Machine-callable A2A/MCP endpoint declaration
5. Test-Lab-observed runtime reachability
6. Explicit permission profile
7. Spotriq Marketplace Test Lab contract/category coverage

A canonical mismatch or inactive declaration suspends the candidate. BSC testnet candidates remain TESTNET_ONLY. Runtime failure can produce OFFLINE; completed failing Test Lab coverage can produce DEGRADED. A verified identity with a reachable, protocol-valid runtime remains LIMITED until all independent required gates pass.

`READY` is now a real computed state rather than artificially unreachable, but current registry-derived candidates still normally remain non-activatable because Spotriq does not infer permission authority from prose. Test Lab PASS does not substitute for PermissionProfile.

Pricing is never inferred from prose; Offer stays UNDECLARED until structured terms exist.

## Current APIs
Registry/discovery:
- `GET /v1/registry/status`
- `GET /v1/agents`
- `GET /v1/agents/search`
- `GET /v1/agents/:chainId/:agentId`
- `GET /v1/agents/:chainId/:agentId/feedback`
- `GET /v1/accounts/:address/agents`

Marketplace supply/readiness:
- `GET /v1/marketplace/status`
- `GET /v1/listings`
- `GET /v1/services`
- `GET /v1/services/:serviceId`
- `GET /v1/services/:serviceId/readiness`
- `GET /v1/services/:serviceId/evidence`
- `GET /v1/services/:serviceId/tests`
- `POST /v1/services/:serviceId/tests` — run bounded non-financial Test Lab verification

## Test Lab contract
A Test Lab PASS means Spotriq observed a safe-to-probe public runtime that satisfied the relevant protocol discovery/contract checks and exposed category-relevant machine capability evidence. It does **not** mean:
- the agent is profitable;
- user funds are safe;
- strategy performance is proven;
- permission authority exists;
- activation is approved.

A2A verification uses Agent Card discovery/validation. Modern MCP verification targets protocol revision `2026-07-28` with `server/discover` plus read-only `tools/list`; a bounded legacy fallback exists for declared older MCP runtimes. No discovered tool is invoked.

## Persistence
- No `DATABASE_URL`: memory stores support local development.
- `DATABASE_URL` configured: PostgreSQL persistence is selected automatically.
- Migration 0007 stores agent registry/discovery evidence.
- Migration 0008 stores distinct service offers, permission profiles, readiness snapshots, capability claims and normalized service cache.
- Migration 0009 stores immutable Marketplace Test Lab runs and coverage payloads.
- Railway PostgreSQL can be attached when the API itself is deployed in Railway; local Railway tunnelling is not required.

## Next
Build **deterministic Smart Money Finding → AgentService compatibility/ranking**. This should map a real Finding's category/protocol/context to eligible service candidates using explicit, explainable compatibility rules and evidence quality/readiness — not an opaque trust score. It must not make a non-ready service activatable. After matching/ranking, take one category through the first complete end-to-end vertical, then add explicit permission/authority integration and real BSC Testnet activation.

## Rule
Every completed replacement ZIP becomes the new source of truth.

Hotfix history:
- v0.9.1 — registry request resilience and semantic-search fallback.
- v0.9.2 — Explore All renders every returned live identity; financial metadata hints are relevance metadata rather than a visibility gate.
