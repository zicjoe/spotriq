# Spotriq Source of Truth

Current release: **v0.14.0**

This ZIP supersedes Spotriq v0.13.0.

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

Finding → AgentService compatibility/ranking implemented in v0.13.0:
- A real Smart Money Finding can be matched against bounded live normalized AgentService supply for the same required financial category.
- Finding context is derived only from structured Finding fields: category plus available protocol, asset/address, pair, network, state and severity.
- Category is a hard constraint. Explicitly contradictory structured protocol/asset/pair declarations can exclude a service; missing declarations stay UNKNOWN instead of becoming false incompatibility.
- Remaining candidates are ranked deterministically and lexicographically: structured context tier first, then canonical/runtime/Test-Lab evidence quality, then operational readiness, then stable service ID.
- No opaque trust, profitability or suitability score is produced.
- Every match returns the exact checks, strengths, limitations and the underlying MarketplaceServiceRecord used for ordering.
- A top-ranked service remains non-activatable whenever its existing readiness/permission gates say so. Compatibility never overrides `activationEligible`.
- Live Smart Money Finding actions now hand off into Explore through `fromFinding`; Explore renders ranked live matches ahead of generic supply and does not substitute sample cards when live matching yields zero.

Rebalancing vertical handoff / Job Intent implemented in v0.14.0:
- A real PancakeSwap Rebalancing Finding plus a user-selected compatible live AgentService can become one idempotent reviewable Job Intent.
- The server reloads the Smart Money Check/Finding and re-runs current compatibility; the browser cannot submit arbitrary LP facts or manufacture compatibility.
- The Job Intent snapshots exact LP token ID/pool/pair/tick/range/block context, selected service match/readiness, Finding/service/readiness evidence references, wallet-control state and unresolved authority requirements.
- User-reviewable proposed constraints include bounded slippage, intent validity and optional swap-step preparation. `executionMode` is fixed to `PREPARE_ONLY` and max action count to 1.
- Proposed constraints are not wallet authority. Job Intent is distinct from PermissionRequest, PermissionGrant, Activation, AgentAction and TransactionRecord.
- Confirmation advances only `REVIEWABLE → AWAITING_AUTHORITY`; `executionState` remains `NO_EXECUTION`.
- WATCH_ONLY never becomes VERIFIED_CONTROL by reviewing or confirming a job.
- The original `checkouts.job_context` persistence seam from migration 0001 is now used for durable Job Intents; no new database migration is required in v0.14.0.
- The live Explore match card exposes **Prepare job** for Rebalancing, and the live checkout review path is separate from the existing sample/mock activation path.

Persistence:
- Local development can continue with memory stores and blank `DATABASE_URL`.
- Migration `0009_marketplace_test_lab.sql` persists immutable marketplace test runs and is now the latest migration.
- Railway PostgreSQL remains a deployment-time integration rather than a local-development requirement.

Next engineering milestone: **v0.15.0 Explicit Bounded Permission / Authority** — construct a precise PermissionRequest from a confirmed `AWAITING_AUTHORITY` Rebalancing Job Intent, verify wallet control where required, integrate scoped authority (Altana where current official interfaces map cleanly), show the exact requested scope before signing, reconcile the actual PermissionGrant after authorization, and keep real financial execution blocked until the grant is demonstrably valid.
