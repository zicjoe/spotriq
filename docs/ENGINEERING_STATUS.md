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

## Current source of truth
Use Spotriq v0.9.2.

## Current live-data spine
BSC JSON-RPC → protocol adapters → Evidence Engine → Smart Money Engine → Findings → Spotriq UI.

Live financial categories:
1. Rebalancing — PancakeSwap LP range state
2. Health Factor Monitoring — Venus Core/Isolated lending risk
3. Yield Optimisation — Venus wallet-relevant supply opportunities with current base APY provenance
4. Grid Trading — PancakeSwap V3 current price + onchain TWAP market context

## Current live marketplace-supply spine
8004scan indexed discovery → normalized `DiscoveredAgent` → optional direct ERC-8004 verification → Explore live discovery surface.

Important boundary: a discovered ERC-8004 identity is **not** yet an activatable `AgentService`. Category hints derived from self-description/registration metadata are operator-claimed hints, not marketplace-tested financial capability. External feedback remains external.

## Persistence
- No `DATABASE_URL`: memory stores support local development.
- `DATABASE_URL` configured: PostgreSQL persistence selected automatically.
- Migration 0007 adds canonical identity/discovery cache/external feedback persistence.
- Railway PostgreSQL will be attached when the API itself is deployed in Railway; local Railway tunnelling is not required.

## Next
Agent Service + Marketplace Listing/Readiness Engine. Normalize selected/claimed identities into specific financial services with category, protocol, assets/pairs, pricing, permission profile, runtime endpoint and readiness. Only after that should Spotriq enable real agent compatibility/matching and activation eligibility.

## Rule
Every completed replacement ZIP becomes the new source of truth.

- v0.9.1 registry resilience: initial live Explore load uses standard agent listing; semantic search falls back to indexed keyword search when unavailable.
- v0.9.2 registry visibility: Explore All renders every returned live identity; financial category hints are relevance metadata, not a visibility gate.
