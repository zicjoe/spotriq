# Spotriq Source of Truth

Current release: **v0.11.0**

This ZIP supersedes Spotriq v0.10.0.

Implemented live financial-data categories:
1. Rebalancing — PancakeSwap V3/Infinity CL current-state foundation and V3 wallet discovery.
2. Health Factor Monitoring — Venus Core/Isolated Pool health state.
3. Yield Optimisation — wallet-relevant Venus base supply-rate opportunities with strict rate provenance.
4. Grid Trading — wallet-relevant PancakeSwap V3 spot + onchain 1h/6h/24h TWAP market context with deterministic regime classification.

Marketplace supply implemented:
- 8004scan indexed BSC agent discovery plus direct ERC-8004 canonical verification for selected identities.
- AgentIdentity, AgentListing, AgentService, Offer and PermissionProfile remain distinct domain resources.
- v0.11.0 adds **Targeted Financial Supply Discovery**: Spotriq performs one bounded registry search per required category instead of depending on the newest generic agent page.
- Search relevance is External discovery evidence only. It is never capability proof.
- Search-relevant identities without a matching operator metadata hint remain discovery leads and are not promoted to AgentService.
- Category searches are isolated with partial-failure handling; one failed category does not suppress the others.
- All-category results are merged/deduplicated and normalized services are returned with balanced category ordering.
- Supported-category registry claims can become non-activatable AgentService candidates.
- Runtime registration services are normalized; only A2A/MCP are treated as machine-callable candidates.
- Capability claims remain Operator Supplied; 8004scan reputation remains External evidence.
- Pricing and permission authority are not inferred.
- Deterministic readiness gates remain enforced. No registry-derived service is activation eligible in v0.11.0.
- Marketplace Test Lab is not implemented yet, so test coverage remains explicitly NOT_RUN.

Persistence:
- Local development can continue with memory stores and blank `DATABASE_URL`.
- Existing migration `0008_marketplace_service_readiness.sql` remains the latest migration; v0.11.0 adds no schema requirement.
- Railway PostgreSQL remains a deployment-time integration rather than a local-development requirement.

Next engineering milestone: **Marketplace Test Lab + Service Readiness Verification**, followed by deterministic Smart Money Finding → AgentService compatibility/ranking.
