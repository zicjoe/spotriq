# Spotriq Source of Truth

Current release: **v0.16.0**

This ZIP supersedes Spotriq v0.15.0.

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
- Readiness distinguishes endpoint declaration from observed runtime reachability.
- Test Lab PASS cannot bypass the independent permission/authority gate.

Finding → AgentService compatibility/ranking implemented in v0.13.0:
- A real Smart Money Finding can be matched against bounded live normalized AgentService supply for the same required financial category.
- Finding context is derived only from structured Finding fields: category plus available protocol, asset/address, pair, network, state and severity.
- Category is a hard constraint. Explicit contradictions can exclude a service; missing declarations stay UNKNOWN.
- Remaining candidates are ranked deterministically and lexicographically: context tier, evidence quality, operational readiness, stable service ID.
- No opaque trust, profitability or suitability score is produced.
- Compatibility never overrides `activationEligible`.

Rebalancing vertical handoff / Job Intent implemented in v0.14.0:
- A real PancakeSwap Rebalancing Finding plus a selected compatible live AgentService can become one idempotent reviewable Job Intent.
- The server reloads the real Finding and re-runs compatibility; the browser cannot manufacture LP context or service compatibility.
- The Job Intent snapshots LP token ID/pool/pair/ticks/range/block, V3 position-manager/token metadata, selected service/readiness and evidence references.
- Proposed slippage/validity/swap-preparation constraints are job inputs only, never wallet authority.
- Confirmation advances only `REVIEWABLE → AWAITING_AUTHORITY`; `executionState` remains `NO_EXECUTION`.
- Persistence uses the original `checkouts.job_context` seam.

Explicit bounded permission / authority implemented in v0.15.0 and hardened in v0.16.0:
- A confirmed PancakeSwap V3 Rebalancing Job Intent can become one deterministic `BoundedPermissionRequest`.
- The server derives exact Position Manager/token facts from the persisted Job Intent; clients can propose only bounded token caps and expiry.
- Financial authority is modeled as exact V3 Position Manager + selector scope for decrease/collect/increase/mint. `multicall`, arbitrary targets, token approvals, Permit2, router swaps, withdrawals and transfers remain excluded.
- Provider-returned Altana grant proof must reconcile exactly against the reviewed request and current Keystore validity.
- `executionEligible` remains false; authority is not execution.

Trusted service key binding + calldata guard + Altana testnet integration proof implemented in v0.16.0:
- A2A services may declare `urn:spotriq:authority-binding:v1` in Agent Card extensions with a secp256k1 session public key, same-origin challenge endpoint and EIP-191 signature scheme.
- Spotriq creates a fresh challenge, uses the existing SSRF-safe runtime fetcher, and marks the binding `VERIFIED` only when the exact declared key proves control of the challenge. Missing declarations remain `UNAVAILABLE`; invalid/cross-origin/signature failures become `FAILED`.
- Verified binding becomes Marketplace Observed evidence. The browser cannot type a public key to satisfy the gate and Spotriq never fabricates or stores an external service's private key.
- A deterministic PancakeSwap V3 calldata guard decodes proposed calls against the reviewed Job Intent. Exact `collect` and bounded `increaseLiquidity` can PASS; unsafe target/tokenId/recipient/caps/slippage/deadline conditions BLOCK. `decreaseLiquidity` stays INCONCLUSIVE without an independently reviewed expected-output quote; `mint` stays INCONCLUSIVE until the replacement range itself is reviewed.
- The off-chain calldata guard is deliberately **not** treated as a non-bypassable enforcement boundary: an external service holding a selector-scoped session key could otherwise call Altana/PancakeSwap without using Spotriq's checker.
- Authority now has three independent structured safety prerequisites: `TRUSTED_AGENT_SESSION_KEY`, `ARGUMENT_LEVEL_EXECUTION_GUARD`, and `NON_BYPASSABLE_FINANCIAL_EXECUTION_BOUNDARY`. The first two can become SATISFIED from observed evidence; the third remains REQUIRED/blocking in v0.16.0.
- Spotriq can create/recover an Altana passkey smart wallet on BSC Testnet and register a **real non-financial integration probe** restricted to `positions(uint256)` on the exact V3 Position Manager. The probe is independently verified through the Altana Keystore and can be reverified/revoked.
- The testnet probe proves wallet/session/Keystore/revocation plumbing only. It is **not** the selected AgentService's financial authority, grants no financial selector, moves no assets, and never changes the Job Intent from `NO_EXECUTION`.
- Altana web integration pins `@altananetwork/sdk` exactly at `0.7.1` because the SDK remains pre-1.0.
- Migration `0010_trusted_agent_binding_and_altana_probe.sql` persists authority bindings and Altana testnet probe observations.

Persistence:
- Local development can continue with memory stores and blank `DATABASE_URL`.
- Migration `0009_marketplace_test_lab.sql` persists immutable marketplace test runs.
- Migration `0010_trusted_agent_binding_and_altana_probe.sql` is now the latest migration.
- Railway PostgreSQL remains a deployment-time integration rather than a local-development requirement.

Next engineering milestone: **v0.17.0 Reviewed Rebalancing Execution Plan + Non-Bypassable Financial Execution Boundary** — add a user-reviewed replacement range and independent quote/expected-output evidence, build a deterministic multi-step Rebalancing execution plan, immediately revalidate LP ownership/current state before any financial action, and implement an enforcement path that an external agent session key cannot bypass. Only after exact calldata can be constrained by that boundary should Spotriq expose selected-agent financial Altana authority or BSC Testnet financial execution. Activity & Outcomes remain after real execution evidence exists.
