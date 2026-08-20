# Spotriq Source of Truth

Current release: **v0.10.0**

This ZIP supersedes Spotriq v0.9.2.

Implemented live financial-data categories:
1. Rebalancing — PancakeSwap V3/Infinity CL current-state foundation and V3 wallet discovery.
2. Health Factor Monitoring — Venus Core/Isolated Pool health state.
3. Yield Optimisation — wallet-relevant Venus base supply-rate opportunities with strict rate provenance.
4. Grid Trading — wallet-relevant PancakeSwap V3 spot + onchain 1h/6h/24h TWAP market context with deterministic regime classification.

Marketplace supply implemented:
- 8004scan indexed BSC agent discovery.
- Direct ERC-8004 canonical identity verification for selected identities.
- All live identities remain visible in Explore All; financial metadata hints are not a visibility gate.
- AgentIdentity, AgentListing, AgentService, Offer and PermissionProfile are normalized as distinct domain resources.
- Supported-category registry claims can become non-activatable AgentService candidates.
- Runtime registration services are normalized; only A2A/MCP are treated as machine-callable candidates.
- Capability claims remain Operator Supplied.
- 8004scan reputation remains External evidence.
- Service pricing is not inferred from prose; structured Offer remains UNDECLARED when terms are absent.
- Permission intensity/execution authority is not inferred; PermissionProfile remains UNDECLARED when absent.
- Deterministic readiness gates expose canonical identity, active metadata, BSC network, runtime endpoint, permission profile and marketplace-test status.
- Canonical mismatch/inactive candidates suspend; BSC testnet candidates are TESTNET_ONLY.
- No registry-derived service is activation eligible in v0.10.0.
- Marketplace Test Lab is not implemented yet, so test coverage is explicitly NOT_RUN.

Persistence:
- Local development can continue with memory stores and blank `DATABASE_URL`.
- Migration `0008_marketplace_service_readiness.sql` adds service offers, permission profiles, readiness snapshots, capability claims and normalized service cache.
- Railway PostgreSQL remains a deployment-time integration rather than a local-development requirement.

Next engineering milestone: **Marketplace Test Lab + Service Readiness Verification**, followed by deterministic Smart Money Finding → AgentService compatibility/ranking.
