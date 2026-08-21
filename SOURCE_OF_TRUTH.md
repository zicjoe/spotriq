# Spotriq Source of Truth

Current release: **v0.15.0**

This ZIP supersedes Spotriq v0.14.0.

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

Explicit bounded permission / authority implemented in v0.15.0:
- A confirmed `AWAITING_AUTHORITY` PancakeSwap V3 Rebalancing Job Intent can become one deterministic `BoundedPermissionRequest` using `marketplace.bounded-authority@1.0.0`.
- The server derives the exact Position Manager, token addresses/decimals, protocol, network and token ID from the persisted Job Intent; clients submit only user-proposed token caps and expiry.
- Authority is selector-scoped to the exact observed V3 Position Manager for `decreaseLiquidity`, `collect`, `increaseLiquidity` and `mint`; no `multicall`, arbitrary target, token approval, Permit2, router swap, withdrawal or transfer authority is added.
- User token caps are converted to raw smallest units from observed token decimals and stored with their reviewed display values. Expiry is explicitly bounded.
- Infinity CL authority is blocked instead of being guessed from the V3 call surface.
- Provider-returned Altana grant proof is reconciled against the reviewed request. A broader/different wallet/call/spend/expiry scope cannot become an active Spotriq grant.
- Spotriq independently derives `keccak256(sessionPublicKey)` and reads Altana Keystore `isValidKey(wallet,keyId)` on BSC Mainnet/Testnet. Re-verification can downgrade a previously active grant after revocation or expiry.
- A request remains `SAFETY_PREREQUISITES_REQUIRED` behind two machine-readable independent gates: `TRUSTED_AGENT_SESSION_KEY` and `ARGUMENT_LEVEL_EXECUTION_GUARD`. Current external AgentService metadata does not yet bind a trusted service-owned Altana delegate/session public key, and Altana selector-scoped permissions do not bind PancakeSwap V3 `tokenId`/recipient/amount/deadline arguments. Spotriq does not fabricate or browser-store an external agent's session private key and does not treat selector scope alone as execution safety.
- Even an exact, currently onchain-valid grant has `executionEligible: false`; the linked Job Intent remains `NO_EXECUTION` in v0.15.0.
- The existing `permission_requests` and `permission_grants` tables from migration 0001 are now used for durable authority state. No new migration is required; migration 0009 remains latest.

Persistence:
- Local development can continue with memory stores and blank `DATABASE_URL`.
- Migration `0009_marketplace_test_lab.sql` persists immutable marketplace test runs and is now the latest migration.
- Railway PostgreSQL remains a deployment-time integration rather than a local-development requirement.

Next engineering milestone: **v0.16.0 Trusted Agent Session-Key Binding + Argument-Level Execution Guard + Live Altana BSC Testnet Grant** — satisfy both structured v0.15 safety prerequisites, bind a trustworthy service-owned delegate/session public key to the selected AgentService, decode/validate exact PancakeSwap V3 calldata against the reviewed Job Intent, prove a user/admin-controlled Altana wallet on BSC Testnet, submit the exact reviewed grant, capture and reconcile its transaction/policy evidence, independently verify current Keystore validity, expose real revocation, and keep financial transaction execution separately gated behind immediate state/calldata/grant revalidation.
