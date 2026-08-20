# Spotriq v0.11.0 Implementation Report

## Milestone
Targeted Financial Supply Discovery.

## Problem fixed
The v0.10.0 `/v1/services` path normalized only the identities returned by a generic newest-agents page. A valid response with zero services therefore meant only that the sampled page lacked supported financial metadata; it did not establish that financial agents were absent from the BSC registry.

## Implementation
- Added `FINANCIAL_DISCOVERY_QUERIES` for Rebalancing, Grid Trading, Yield Optimisation and Health Factor Monitoring.
- `listServices()` performs one bounded 8004scan semantic/hybrid search per requested category when no user query is supplied.
- Uses `Promise.allSettled` so one failed category search does not suppress successful categories.
- Merges/deduplicates identities across category searches.
- Returns balanced normalized services across categories rather than allowing one category to consume the result limit.
- Adds `MarketplaceFinancialDiscovery`, `FinancialSupplySearchRun`, `FinancialSupplyLead` and `FinancialSupplyDiscoveryMatch` domain resources.
- Preserves the evidence rule: **search relevance is External discovery evidence, not capability proof**.
- A search hit becomes an `AgentService` only when the identity's current operator metadata independently contains the matching supported financial-category hint.
- Search-only leads remain visible in Explore with an explicit `Discovery lead only · not a service claim` label.
- User-entered Explore searches use one user-directed registry search and retain the same promotion gate.
- Existing readiness, Offer and PermissionProfile gates are unchanged.

## API
`GET /v1/services?chainId=56&limit=8` now includes `page.discovery` with:
- `mode` (`TARGETED` or `USER_QUERY`)
- category search runs
- returned counts
- metadata-backed counts
- normalized-service counts
- deduplicated search leads
- categories with normalized supply
- explicit limitations

## Quota discipline
The automatic all-category path performs at most four upstream category searches. Search result limits are capped at 10 to respect the anonymous 8004scan tier. Existing registry caching/fallback behavior remains in place.

## Validation
- 10 marketplace-supply deterministic tests pass in the isolated runtime harness.
- Added tests for four-category targeting, no promotion from relevance alone, category-specific promotion, and partial upstream failure.
- Release-wide syntax transpilation and architecture verification are performed before packaging.

## Persistence
No new database migration is required. Existing listing/service persistence stores normalized results and registry cache as before.

## Next
Marketplace Test Lab + Service Readiness Verification.
