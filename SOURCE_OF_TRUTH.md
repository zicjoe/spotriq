# Spotriq Source of Truth

Current release: **v0.18.0**

This ZIP supersedes Spotriq v0.17.0.

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

Reviewed Rebalancing execution plan + non-bypassable execution boundary implemented in v0.17.0:
- A confirmed V3 Rebalancing Job Intent with bounded authority can produce a deterministic three-step `decreaseLiquidity → collect → mint` execution plan.
- The user explicitly reviews the replacement tick range before the plan becomes `REVIEWED`; Spotriq never invents or silently accepts a replacement range.
- PancakeSwap expected outputs come from an owner-context, block-specific read-only `eth_call` simulation of `decreaseLiquidity`; simulation failure stops plan construction rather than fabricating outputs.
- The plan snapshots fresh LP ownership, Position Manager, pair/fee tier, current liquidity/range, block number, reviewed target range, quote evidence, exact calldata and exact call hashes.
- The execution guard now evaluates the complete plan: decrease-liquidity minimums are checked against independently observed expected outputs and mint becomes PASS only for the exact user-reviewed replacement range.
- A `FinancialExecutionBoundary` seals the exact reviewed plan hash and ordered call hashes. The selected external AgentService is explicitly `AUTHENTICATED_PROPOSER_ONLY`; the future financial signing key is boundary-controlled and unavailable to that service.
- Fresh boundary preflight re-reads LP ownership/state and re-simulates expected outputs before any future financial dispatch. Stale ownership, range/liquidity changes, target-range drift or quote deterioration block the plan.
- The boundary has no signer in v0.17 (`BOUNDARY_CONTROLLED_NOT_PROVISIONED`). `executionEligible` remains false and there is no transaction-submission route.
- Authority can now satisfy all three safety prerequisites from a reviewed plan + sealed boundary, but transitions to `BOUNDARY_SIGNER_REQUIRED`, not activation.
- Migration `0011_rebalancing_execution_plan_boundary.sql` persists execution plans and sealed financial execution boundaries.

Boundary-controlled Altana financial session + asset readiness implemented in v0.18.0:
- A sealed BSC Testnet `FinancialExecutionBoundary` can now receive a distinct Altana financial session owned by the Spotriq boundary, never by the external AgentService proposal key.
- The web client uses a bring-your-own Altana `sessionSigner` with the exact reviewed Position Manager call allowlist, token spend caps and expiry. Missing call/spend scope is refused rather than becoming unrestricted authority.
- Spotriq independently reconciles provider-returned calls/spend/expiry against the persisted `BoundedPermissionRequest` and verifies the session through the Altana BSC Testnet Keystore.
- The financial session key must be cryptographically distinct from the verified AgentService proposal key. The external service remains `AUTHENTICATED_PROPOSER_ONLY` and never receives the financial signer.
- A linked boundary reports `BOUNDARY_CONTROLLED_ALTANA_TESTNET_SESSION`, but `executionEligible` remains false and there is still no transaction-submission API. Fresh preflight with a valid linked session becomes `PASS_EXECUTION_DISABLED`, not executable.
- Plan-specific financial readiness reads current ERC-20 balances and exact allowances to the V3 Position Manager at a BSC block. It distinguishes current balance from projected post-collect balance using the reviewed execution-plan quote.
- Missing allowance returns `APPROVAL_REQUIRED`. v0.18 never auto-approves tokens and never creates unlimited allowance.
- Keystore re-verification/revocation can make a previously ACTIVE financial session unusable.
- Migration `0012_boundary_financial_session_readiness.sql` persists financial-session and readiness observations.
- Automated repository validation does not claim a live grant transaction was broadcast; live provider/onchain evidence is produced when the matching Altana BSC Testnet wallet invokes the implemented web flow.

Persistence:
- Local development can continue with memory stores and blank `DATABASE_URL`.
- Migration `0009_marketplace_test_lab.sql` persists immutable marketplace test runs.
- Migration `0010_trusted_agent_binding_and_altana_probe.sql` persists authority bindings and Altana testnet probe observations.
- Migration `0011_rebalancing_execution_plan_boundary.sql` persists reviewed execution plans plus sealed execution boundaries.
- Migration `0012_boundary_financial_session_readiness.sql` is now the latest migration and persists boundary financial-session evidence plus asset/allowance readiness observations.
- Railway PostgreSQL remains a deployment-time integration rather than a local-development requirement.

Next engineering milestone: **v0.19.0 First Controlled BSC Testnet Rebalancing Execution** — dispatch only the exact sealed reviewed calls through the boundary-controlled Altana financial session after fresh boundary preflight, current Keystore re-verification and plan-specific balance/allowance readiness. If ERC-20 allowance is insufficient, add a bounded user-controlled approval path; never give the AgentService approval authority or create unlimited allowance.
