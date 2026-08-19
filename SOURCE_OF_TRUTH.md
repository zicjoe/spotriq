# Spotriq Source of Truth

Current release: **v0.9.2**

This ZIP supersedes Spotriq v0.8.0.

Implemented live data categories:
1. Rebalancing — PancakeSwap V3/Infinity CL current-state foundation and V3 wallet discovery.
2. Health Factor Monitoring — Venus Core/Isolated Pool health state.
3. Yield Optimisation — wallet-relevant Venus base supply-rate opportunities with strict rate provenance.
4. Grid Trading — wallet-relevant PancakeSwap V3 spot + onchain 1h/6h/24h TWAP market context with deterministic regime classification.

Marketplace supply foundation now implemented:
- 8004scan indexed BSC agent discovery and semantic search.
- Direct ERC-8004 canonical identity verification for selected agents.
- External feedback provenance kept separate from Spotriq reviews.
- Deterministic financial-category metadata hints remain Operator Supplied and do not become marketplace-tested capabilities.
- Reference Figma services are explicitly Sample data; live registry discoveries are separate and non-activatable until Agent Service/readiness normalization exists.

Local development may continue without PostgreSQL using memory stores. Railway PostgreSQL will be used when the Spotriq API is deployed inside Railway; do not resume local tunnel work unless there is a concrete need.

Next engineering milestone: Agent Service + Marketplace Listing/Readiness Engine, followed by real Smart Money agent compatibility/matching.


Hotfixes: v0.9.1 added registry request resilience; v0.9.2 fixes Explore visibility so the All view renders every live identity even when registry metadata lacks a recognized financial-category hint.
