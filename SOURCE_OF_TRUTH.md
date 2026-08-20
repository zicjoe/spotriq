# Spotriq Source of Truth

Current release: **v0.12.0**

This ZIP supersedes Spotriq v0.11.0.

Implemented live financial-data categories:
1. Rebalancing — PancakeSwap V3/Infinity CL current-state foundation and V3 wallet discovery.
2. Health Factor Monitoring — Venus Core/Isolated Pool health state.
3. Yield Optimisation — wallet-relevant Venus base supply-rate opportunities with strict rate provenance.
4. Grid Trading — wallet-relevant PancakeSwap V3 spot + onchain 1h/6h/24h TWAP market context with deterministic regime classification.

Marketplace supply implemented:
- 8004scan indexed BSC agent discovery plus direct ERC-8004 canonical verification for selected identities.
- AgentIdentity, AgentListing, AgentService, Offer and PermissionProfile remain distinct domain resources.
- Targeted Financial Supply Discovery performs one bounded registry search per required category instead of depending on the newest generic agent page.
- Search relevance is External discovery evidence only. It is never capability proof.
- Search-relevant identities without a matching operator metadata hint remain discovery leads and are not promoted to AgentService.
- Category searches are isolated with partial-failure handling; one failed category does not suppress the others.
- All-category results are merged/deduplicated and normalized services are returned with balanced category ordering.
- Supported-category registry claims can become non-activatable AgentService candidates.
- Runtime registration services are normalized; only A2A/MCP are treated as machine-callable candidates.
- Capability claims remain Operator Supplied; 8004scan reputation remains External evidence.
- Pricing and permission authority are not inferred.

Marketplace Test Lab implemented in v0.12.0:
- Safe, bounded verification of declared A2A/MCP runtimes without executing financial actions.
- HTTPS URL policy, DNS/private-network blocking, redirect revalidation, timeouts and response-size ceilings reduce SSRF exposure.
- A2A Agent Card discovery/contract checks and category-capability observation.
- MCP 2026-07-28 `server/discover` + read-only `tools/list`, with a bounded legacy initialization fallback for declared older runtimes.
- Marketplace Observed evidence is recorded separately from External, Operator Supplied and Marketplace Derived evidence.
- Immutable test runs are persisted and latest coverage is folded back into deterministic service readiness.
- Readiness now distinguishes endpoint declaration from observed runtime reachability.
- Test Lab PASS cannot bypass the independent permission/authority gate. Registry-derived services remain non-activatable while PermissionProfile is UNDECLARED.

Persistence:
- Local development can continue with memory stores and blank `DATABASE_URL`.
- Migration `0009_marketplace_test_lab.sql` persists immutable marketplace test runs and is now the latest migration.
- Railway PostgreSQL remains a deployment-time integration rather than a local-development requirement.

Next engineering milestone: **deterministic Smart Money Finding → AgentService compatibility/ranking**, followed by the first complete financial vertical and explicit permission/authority integration.
