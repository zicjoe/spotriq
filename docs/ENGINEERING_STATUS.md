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
- Agent Service + Marketplace Listing/Readiness Engine
- Targeted Financial Supply Discovery
- Marketplace Test Lab + Service Readiness Verification
- Smart Money Finding → AgentService Compatibility & Ranking
- Rebalancing Vertical Handoff / Reviewable Job Intent
- Explicit Bounded Permission / Altana Authority Verification
- Trusted Agent Session-Key Binding + V3 Calldata Guard + Altana BSC Testnet Integration Proof
- Reviewed Rebalancing Execution Plan + Non-Bypassable Financial Execution Boundary
- Boundary-Controlled Altana Financial Session + Plan-Specific Balance/Allowance Readiness
- First Controlled BSC Testnet Rebalancing Execution + Exact User-Controlled Approval Flow
- Execution-scoped Activity & Outcomes evidence
- Real AgentService A2A Task Invocation + Origin Proof
- Live Four-Category First-Party Reference Agent Supply
- First-Party ERC-8004 Identity Reconciliation

## Current source of truth
Use Spotriq **v0.22.2**.

## Current live-data spine
BSC JSON-RPC → protocol adapters → Evidence Engine → Smart Money Engine → Findings → Spotriq UI.

Live financial categories:
1. Rebalancing — PancakeSwap LP range state
2. Health Factor Monitoring — Venus Core/Isolated lending risk
3. Yield Optimisation — Venus wallet-relevant supply opportunities with current base APY provenance
4. Grid Trading — PancakeSwap V3 current price + onchain TWAP market context

## Current marketplace-supply spine
Two truthful supply sources now converge on one marketplace model:

- external: targeted four-category 8004scan search → discovery lead → operator-metadata capability gate → ERC-8004-derived `AgentService` candidate;
- first-party: versioned Spotriq reference definition → `MARKETPLACE_REFERENCE` identity → real A2A `AgentService`.

Both continue through `AgentListing` → `AgentService` → `Offer` + `PermissionProfile` → Marketplace Test Lab → Marketplace Observed evidence → deterministic `ReadinessSnapshot` → Finding compatibility/ranking → Explore. A first-party runtime does not imply ERC-8004 identity; v0.22.2 binds one only after canonical registry/name/backlink/A2A endpoint reconciliation. ERC-8004 verification still does not imply Activation.

Targeted discovery no longer relies on a generic newest-agents page to populate financial supply. Rebalancing, Grid, Yield and Health each receive one bounded registry search. Search relevance remains External discovery evidence and never becomes capability proof by itself.

The following boundaries are enforced:
- AgentIdentity is not AgentListing.
- AgentListing is not AgentService.
- AgentService is not Offer.
- PermissionProfile is not PermissionRequest or PermissionGrant.
- External reputation is not marketplace testing.
- Registry capability text is Operator Supplied evidence, not a tested capability.
- A declared machine endpoint is not an observed reachable runtime.
- Marketplace Test Lab validates protocol/category contract behaviour without executing financial actions or proving profitability.
- Readiness is operational eligibility, not a trust score or performance prediction.

## Finding compatibility state in v0.13.0
A real `Finding` now has a first-class marketplace handoff. `GET /v1/checks/:checkSessionId/findings/:findingId/matches` reconstructs the requested Finding from its Smart Money Check, performs bounded category-scoped live supply discovery, then applies `marketplace.finding-service-compatibility@1.0.0`.

Compatibility rules:
1. Financial category is a hard match.
2. Finding protocol is compared with structured service protocol declarations. An explicit conflict is excluded; missing service protocol metadata is UNKNOWN.
3. Finding asset/address and pair context are compared when the service publishes structured coverage. Missing coverage is UNKNOWN; explicit contradiction is excluded.
4. Canonical identity, runtime reachability and Marketplace Test Lab results are evidence-quality ordering signals.
5. Operational readiness is a later ordering signal.
6. Stable service ID is the deterministic tie break.

Result tiers are `EXACT_CONTEXT`, `CONTEXT_COMPATIBLE`, and `CATEGORY_ONLY`. The API exposes checks/strengths/limitations rather than a hidden numeric trust score. A rank is not a safety/performance prediction and never changes `activationEligible`. Suspended identities are excluded from usable matches.

Explore consumes the existing `fromFinding` navigation seam. A live Finding now opens a **Best live matches for this finding** section before generic marketplace supply. A zero live match remains a zero live match; sample/reference services are not used as a hidden fallback.

## Rebalancing Job Intent state in v0.14.0
A live Rebalancing Finding can now move from compatibility ranking into an explicit review boundary. `POST /v1/checks/:checkSessionId/findings/:findingId/job-intents` reloads the real Smart Money Check, reloads the Finding, re-runs current compatibility, and only accepts a selected service that remains a live compatible match.

The resulting `RebalancingJobIntent` records the exact PancakeSwap LP token ID/pool/pair/tick/range/block context, selected AgentService match/readiness snapshot, Finding/service/readiness evidence references, wallet-control state, proposed user limits, and every unresolved authority blocker.

State is deliberately narrow: `REVIEWABLE → AWAITING_AUTHORITY`. `executionState` is always `NO_EXECUTION` in v0.14. Proposed slippage/validity/swap-preparation constraints are job inputs only and never become wallet authority automatically. WATCH_ONLY remains WATCH_ONLY.

One Finding + selected service maps to one deterministic Job Intent ID. Repeated Prepare taps do not create duplicates; once confirmed, repeated preparation cannot revise the confirmed bounds. PostgreSQL persistence uses the existing `checkouts.job_context` table from migration 0001; v0.14 itself added no database migration.

The live Explore match card now exposes **Prepare job** for Rebalancing. The live Job Intent review surface is separate from the existing reference/sample checkout and never calls the mock activation routine.

## Bounded authority state in v0.15.0
A confirmed PancakeSwap V3 Rebalancing Job Intent can now produce a deterministic `BoundedPermissionRequest`. The request is derived server-side from the persisted Job Intent, not from browser-supplied contract/token facts. User inputs are limited to token0/token1 caps and a bounded expiry.

Spotriq maps the job to an Altana-oriented selector allowlist on the exact observed V3 Position Manager: decrease liquidity, collect, increase liquidity and mint. It explicitly excludes arbitrary calls, `multicall`, token approval, Permit2, router swap, withdrawal and transfer authority. Infinity CL is refused until its call surface is modeled separately.

The permission request, provider-returned proof and reconciled grant remain different resources. A grant reaches `ACTIVE` only if wallet/call/spend/expiry scope exactly matches the reviewed request, the expiry is still current, and Altana Keystore `isValidKey` independently returns true for `keccak256(sessionPublicKey)`. Re-verification can mark a previously active grant revoked/unusable.

Consumer financial grant submission remains deliberately blocked as `SAFETY_PREREQUISITES_REQUIRED`. v0.16 can now satisfy `TRUSTED_AGENT_SESSION_KEY` from Marketplace Observed service-key evidence and can satisfy `ARGUMENT_LEVEL_EXECUTION_GUARD` for one proposed calldata payload, but a third independent gate — `NON_BYPASSABLE_FINANCIAL_EXECUTION_BOUNDARY` — remains REQUIRED. Selector-scoped Altana authority does not bind exact PancakeSwap V3 arguments, and an external service holding the session key could bypass a purely off-chain checker. Even an exact, currently valid observed grant remains `executionEligible = false`, and the linked Job Intent remains `NO_EXECUTION`.

Persistence uses the original `permission_requests` and `permission_grants` tables from migration 0001. No new migration was added.



## Reviewed execution-plan / enforcement-boundary state in v0.17.0
A confirmed PancakeSwap V3 Rebalancing Job Intent can now produce one deterministic reviewed execution plan. The user must explicitly review a replacement tick range. Spotriq refreshes the LP position and obtains independent expected-token output evidence via an owner-context, block-specific `eth_call` simulation before constructing the exact `decreaseLiquidity → collect → mint` calldata sequence.

Every step is decoded and checked against the Job Intent, bounded token caps, slippage/deadline limits and reviewed target range. A plan reaches `REVIEWED/PASS` only when the complete step set passes. The plan can then be sealed into a `FinancialExecutionBoundary` containing the exact plan hash and call hashes. The selected AgentService is an authenticated proposer only; it never receives the future financial signing key.

A fresh boundary preflight rechecks LP ownership, Position Manager/pair identity, old range/liquidity, current tick versus the reviewed replacement range, and independently simulated expected outputs. The financial signer is intentionally `BOUNDARY_CONTROLLED_NOT_PROVISIONED`, so even a sealed/fresh plan remains `executionEligible = false`. Authority can satisfy all three safety prerequisites but ends at `BOUNDARY_SIGNER_REQUIRED`. There is no financial execution endpoint in v0.17.

Migration `0011_rebalancing_execution_plan_boundary.sql` persists reviewed execution plans and sealed execution boundaries.

## Trusted service-key binding + execution-guard state in v0.16.0
A2A services can now expose Spotriq's explicit `urn:spotriq:authority-binding:v1` Agent Card extension. The extension declares a SEC1 secp256k1 session public key, a same-origin challenge endpoint and the EIP-191 verification scheme. Spotriq creates a fresh challenge, reaches the challenge endpoint through the existing SSRF-safe runtime fetcher, and marks the binding `VERIFIED` only when the exact declared key signs the challenge successfully. Missing extension evidence remains `UNAVAILABLE`; malformed/cross-origin/bad-signature evidence becomes `FAILED`. The browser cannot type a key into existence, and Spotriq never generates or stores the external service's private key.

`@spotriq/execution-guard` now decodes proposed PancakeSwap V3 Position Manager calldata against the reviewed Job Intent and bounded permission request. It checks the exact target, selector, LP token ID, recipient, token caps, slippage/deadline constraints, fee/tick conditions where evidence exists, and refuses to turn missing evidence into a PASS. Exact `collect` and bounded `increaseLiquidity` proposals can PASS. `decreaseLiquidity` is INCONCLUSIVE without independently reviewed expected-token-out evidence; `mint` is INCONCLUSIVE until a replacement range has itself been reviewed.

A PASS is proposal-level evidence only. It does not create a non-bypassable execution boundary. Therefore authority now has three separate prerequisites: `TRUSTED_AGENT_SESSION_KEY`, `ARGUMENT_LEVEL_EXECUTION_GUARD`, and `NON_BYPASSABLE_FINANCIAL_EXECUTION_BOUNDARY`. The first two can be satisfied in v0.16; the third remains REQUIRED/blocking.

v0.16 also proves the Altana provider/onchain integration on **BSC Testnet only** using a deliberately harmless read-only `positions(uint256)` session on the exact V3 Position Manager. The user/admin-controlled Altana passkey wallet can create/recover the wallet, grant the probe, persist the returned session/transaction evidence, independently verify the key through the Altana Keystore, re-check validity later, and revoke the probe. This probe is never represented as the selected AgentService's financial authority and never changes the Job Intent from `NO_EXECUTION`.

Migration `0010_trusted_agent_binding_and_altana_probe.sql` persists service authority-binding evidence and Altana Testnet probe observations. `@altananetwork/sdk` is pinned exactly at `0.7.1` in the web app.

## Boundary-controlled financial authority state in v0.18.0
A sealed BSC Testnet execution boundary can now receive a distinct Altana financial session whose signer is generated inside the Spotriq client boundary. The external AgentService remains proposer-only and never receives that financial signer.

Spotriq accepts the observed financial session only when provider-returned calls, spend caps and expiry exactly match the reviewed `PermissionRequest`, the session key is different from the verified AgentService proposal key, and the Altana Keystore currently reports the key valid. The session can be reverified and revocation evidence can be recorded.

A linked financial signer changes boundary custody to `BOUNDARY_CONTROLLED_ALTANA_TESTNET_SESSION`, but `executionEligible` stays false. A fresh boundary preflight with current valid authority returns `PASS_EXECUTION_DISABLED`; v0.18 intentionally exposes no financial transaction-submission endpoint.

Financial readiness reads the exact reviewed plan's token requirements, current wallet ERC-20 balances, projected post-collect balances, and current allowance to the exact V3 Position Manager. Projected balance can be sufficient while allowance remains `APPROVAL_REQUIRED`. Spotriq does not auto-create approvals or unlimited allowance.

Migration `0012_boundary_financial_session_readiness.sql` persists the boundary financial session and financial-readiness observations. Automated tests verify the integration model but do not claim that the user's live Altana wallet broadcast a grant transaction during repository validation.

## Readiness state inherited from v0.12.0
Deterministic gates now cover:
1. BSC network
2. Canonical ERC-8004 identity
3. Active registration declaration
4. Machine-callable A2A/MCP endpoint declaration
5. Test-Lab-observed runtime reachability
6. Explicit permission profile
7. Spotriq Marketplace Test Lab contract/category coverage

A canonical mismatch or inactive declaration suspends the candidate. BSC testnet candidates remain TESTNET_ONLY. Runtime failure can produce OFFLINE; completed failing Test Lab coverage can produce DEGRADED. A verified identity with a reachable, protocol-valid runtime remains LIMITED until all independent required gates pass.

`READY` is now a real computed state rather than artificially unreachable, but current registry-derived candidates still normally remain non-activatable because Spotriq does not infer permission authority from prose. Test Lab PASS does not substitute for PermissionProfile.

Pricing is never inferred from prose; Offer stays UNDECLARED until structured terms exist.

## Current APIs
Registry/discovery:
- `GET /v1/registry/status`
- `GET /v1/agents`
- `GET /v1/agents/search`
- `GET /v1/agents/:chainId/:agentId`
- `GET /v1/agents/:chainId/:agentId/feedback`
- `GET /v1/accounts/:address/agents`

Marketplace supply/readiness:
- `GET /v1/marketplace/status`
- `GET /v1/listings`
- `GET /v1/services`
- `GET /v1/services/:serviceId`
- `GET /v1/services/:serviceId/readiness`
- `GET /v1/services/:serviceId/evidence`
- `GET /v1/services/:serviceId/tests`
- `POST /v1/services/:serviceId/tests` — run bounded non-financial Test Lab verification
- `GET /v1/checks/:checkSessionId/findings/:findingId/matches` — deterministic live Finding → AgentService compatibility/ranking
- `POST /v1/checks/:checkSessionId/findings/:findingId/job-intents` — prepare/re-open the idempotent live Rebalancing Job Intent
- `GET /v1/job-intents/:jobIntentId` — retrieve the reviewable intent
- `PATCH /v1/job-intents/:jobIntentId` — revise proposed limits while REVIEWABLE
- `POST /v1/job-intents/:jobIntentId/confirm` — confirm the job description and advance only to AWAITING_AUTHORITY
- `POST /v1/job-intents/:jobIntentId/permissions` — derive/re-open the bounded authority request from server-side Job Intent context
- `GET /v1/permissions/:permissionRequestId` — retrieve the reviewed request
- `PATCH /v1/permissions/:permissionRequestId` — revise user caps/expiry before grant reconciliation
- `POST /v1/permissions/:permissionRequestId/reconcile` — compare an observed Altana grant against the reviewed request and verify it onchain
- `GET /v1/permission-grants/:permissionGrantId` — retrieve the reconciled grant
- `POST /v1/permission-grants/:permissionGrantId/reverify` — refresh current Keystore validity/revocation/expiry state
- `POST /v1/permissions/:permissionRequestId/trusted-agent-binding` — re-observe and verify the selected service's declared session-key ownership
- `POST /v1/permissions/:permissionRequestId/execution-guard` — decode one proposed V3 calldata payload against the reviewed Job Intent and bounded request
- `POST /v1/job-intents/:jobIntentId/altana-testnet-probes` — persist a real BSC Testnet read-only Altana probe after provider grant
- `GET /v1/job-intents/:jobIntentId/altana-testnet-probe` — retrieve the latest persisted probe for the Job Intent
- `GET /v1/altana-testnet-probes/:probeId` — retrieve one observed probe
- `POST /v1/altana-testnet-probes/:probeId/reverify` — refresh Keystore validity and record revocation transaction evidence when supplied
- `POST /v1/job-intents/:jobIntentId/execution-plans` — build/re-open the deterministic Rebalancing execution plan
- `GET /v1/job-intents/:jobIntentId/execution-plan` — retrieve the current Job Intent plan
- `GET /v1/execution-plans/:planId` — retrieve one reviewed plan
- `POST /v1/execution-plans/:planId/review` — review replacement range and refresh independent quote evidence
- `POST /v1/execution-plans/:planId/seal-boundary` — seal exact plan/call hashes behind the non-bypassable boundary
- `GET /v1/execution-boundaries/:boundaryId` — retrieve one sealed boundary
- `POST /v1/execution-boundaries/:boundaryId/preflight` — refresh LP state/quote/authority preflight without submitting a transaction
- `POST /v1/execution-boundaries/:boundaryId/financial-sessions` — observe/reconcile a real boundary-controlled Altana BSC Testnet financial session
- `GET /v1/execution-boundaries/:boundaryId/financial-session` — retrieve the latest boundary financial session
- `GET /v1/financial-sessions/:financialSessionId` — retrieve one observed financial session
- `POST /v1/financial-sessions/:financialSessionId/reverify` — refresh Keystore validity/revocation evidence
- `POST /v1/execution-boundaries/:boundaryId/financial-readiness` — read plan-specific token balance/allowance readiness
- `GET /v1/execution-boundaries/:boundaryId/financial-readiness` — retrieve latest persisted financial readiness
- `POST /v1/execution-boundaries/:boundaryId/approval-plans` — prepare/re-open exact non-unlimited wallet-admin ERC-20 approvals when needed
- `GET /v1/execution-boundaries/:boundaryId/approval-plan` — retrieve current exact approval plan
- `POST /v1/approval-plans/:approvalPlanId/review` — explicitly review the bounded approval calls
- `POST /v1/approval-plans/:approvalPlanId/observe` — record Altana wallet-admin execution proof then re-read allowances independently
- `POST /v1/execution-boundaries/:boundaryId/controlled-executions` — prepare a short-lived exact controlled dispatch after all fresh checks
- `GET /v1/execution-boundaries/:boundaryId/controlled-execution` — retrieve the current boundary execution attempt
- `GET /v1/controlled-executions/:executionId` — retrieve one controlled execution
- `POST /v1/controlled-executions/:executionId/observe` — record provider execution proof and independently verify BSC receipt
- `POST /v1/controlled-executions/:executionId/reconcile` — retry independent receipt/post-state reconciliation

## Test Lab contract
A Test Lab PASS means Spotriq observed a safe-to-probe public runtime that satisfied the relevant protocol discovery/contract checks and exposed category-relevant machine capability evidence. It does **not** mean:
- the agent is profitable;
- user funds are safe;
- strategy performance is proven;
- permission authority exists;
- activation is approved.

A2A verification uses Agent Card discovery/validation. Modern MCP verification targets protocol revision `2026-07-28` with `server/discover` plus read-only `tools/list`; a bounded legacy fallback exists for declared older MCP runtimes. No discovered tool is invoked.

## Persistence
- No `DATABASE_URL`: memory stores support local development.
- `DATABASE_URL` configured: PostgreSQL persistence is selected automatically.
- Migration 0007 stores agent registry/discovery evidence.
- Migration 0008 stores distinct service offers, permission profiles, readiness snapshots, capability claims and normalized service cache.
- Migration 0009 stores immutable Marketplace Test Lab runs and coverage payloads.
- Migration 0010 stores trusted AgentService authority bindings and Altana BSC Testnet probe observations.
- Migration 0011 stores reviewed Rebalancing execution plans and sealed financial execution boundaries.
- Migration 0012 stores boundary-controlled Altana financial-session evidence and plan-specific asset/allowance readiness.
- Migration 0013 stores exact bounded approval plans/observations and controlled BSC Testnet Rebalancing execution attempts/results.
- Migration 0014 stores execution-scoped Activity & Outcomes linkage using the original activity/outcome tables without fabricating an Activation.
- Migration 0015 stores real AgentService task invocation/origin/proposal evidence without fabricating a commercial Activation.
- Railway PostgreSQL can be attached when the API itself is deployed in Railway; local Railway tunnelling is not required.

## Controlled execution state in v0.19.0
Spotriq can now prepare and dispatch the exact reviewed BSC Testnet Rebalancing call batch through the boundary-controlled Altana financial Session held in the current browser process. The API never accepts arbitrary dispatch calldata: it reloads the sealed plan and boundary, independently re-verifies the session, refreshes balance/allowance readiness, reruns fresh LP/quote preflight and re-authorizes every exact call hash/order before returning a five-minute `READY_TO_DISPATCH` attempt.

If ERC-20 allowance is missing, Spotriq creates a separate wallet-admin approval plan containing only the exact reviewed amount. Existing non-zero insufficient allowance is reset to zero first for token compatibility. Unlimited approval is never requested, and the external AgentService never receives approval authority. Provider confirmation is followed by an independent allowance re-read.

Financial dispatch uses Altana `execute({ session, calls, chainId: 97 })` only with the exact server-prepared calls. The ephemeral boundary session signer is deliberately not persisted; losing it on reload requires a fresh financial session rather than private-key reconstruction. Provider `CONFIRMED` is not treated as final truth: Spotriq independently checks the BSC receipt, records success/revert/pending state, consumes the sealed boundary after one successful confirmation, refreshes the old LP position, and attempts to verify the newly minted V3 NFT from Position Manager ERC-721 Transfer logs.

Only an independently successful receipt can mark the linked Job Intent `COMPLETED / CONTROLLED_TESTNET_EXECUTED`. This architecture is live-execution capable, but repository validation itself does not claim that the user’s passkey wallet broadcast a live BSC Testnet transaction. `marketplaceActivationEnabled` remains false because the selected external AgentService is still not yet invoked/hired as the actual proposal origin in this path.

## Activity & Outcomes state in v0.20.0
`@spotriq/activity-outcomes` now materializes a deterministic execution-scoped timeline and immediate outcome evidence from the confirmed controlled execution. BSC receipt/gas and replacement PancakeSwap position state are Marketplace Observed; native gas cost and range width are Marketplace Derived. Failed/blocked attempts remain activity evidence without becoming successful outcomes.

The outcome deliberately remains `COLLECTING / INSUFFICIENT_HISTORY` for long-horizon strategy performance. No PnL, LP fees earned, APY, USD gas cost, drawdown, success rate or Agent Advantage claim is inferred from one execution. The live Activity & Outcomes page makes those limitations visible.

`marketplaceActivationEnabled` remains false because execution evidence does not prove the external AgentService was actually invoked/hired as proposal origin.

## AgentService task-origin state in v0.21.0
`@spotriq/service-tasks` now closes the gap between service selection and actual external-service proposal origin. The API invokes the selected, fresh-tested A2A runtime with the exact persisted Rebalancing Job Intent context and records a durable `ServiceTask`. A service proposal must echo the exact server-derived request-context hash and is attributable only after fresh service-owned key-control verification plus same-origin A2A observation.

Job Intent confirmation is now gated on `COMPLETED + VERIFIED origin + STRUCTURED proposal`. Revising job constraints invalidates the prior link. The execution plan carries the service task/proposal hash forward; exact accepted ticks retain `AGENT_SERVICE` attribution and changed ticks become `USER_OVERRIDE`. No service receives the boundary-controlled financial signer.

Migration `0015_service_task_origin_proof.sql` persists this evidence separately from `activations`. `marketplaceActivationEnabled` remains false because A2A invocation is not automatically commercial hiring or payment.

## Live reference-agent supply state in v0.22.0

`@spotriq/reference-agents` now backs RangeKeeper, GridPilot, YieldPilot and VenusGuard with deterministic read-only A2A runtimes using existing PancakeSwap/Venus/market-context readers. `/v1/reference-agents` publishes the catalog; each service has a `.well-known/agent-card.json` discovery surface plus same-origin JSON-RPC endpoint.

The records are integrated into normal marketplace supply/readiness/matching with `origin = REFERENCE`, no fake ERC-8004 verification, no invented external reputation, `READ_ONLY` authority and `marketplaceActivationEligible = false`. Public deployment, Test Lab and real ERC-8004 reconciliation have now completed external acceptance for all four services on BSC Testnet; deployment IDs remain environment/runtime facts rather than source constants.

See `docs/LIVE_REFERENCE_AGENT_SUPPLY.md`.

## Reference-agent ERC-8004 reconciliation state in v0.22.2

Deployment configuration can now bind each stable `svc:reference:<slug>` service to a real ERC-8004 token ID without source-code hard-coding. `REFERENCE_AGENT_REGISTRY_CHAIN_ID` is separate from `AGENT_DISCOVERY_CHAIN_ID`, and per-agent IDs are supplied through `REFERENCE_AGENT_*_ID` variables. The API directly runs canonical verification at startup and accepts a binding only if the canonical registry state is VERIFIED, the registration backlink is correct, the registration name matches the intended reference agent, and the A2A endpoint exactly matches Spotriq's public Agent Card.

External acceptance is complete across RangeKeeper, GridPilot, YieldPilot and VenusGuard. Each stable `svc:reference:<slug>` service now has an accepted BSC Testnet ERC-8004 binding with Test Lab `PASS`, `CANONICAL_IDENTITY = PASS`, `RUNTIME_REACHABILITY = PASS`, `MARKETPLACE_TESTS = PASS`, overall `TESTNET_ONLY`, and `activationEligible = false`. RangeKeeper remains the retained concrete proof example at Agent ID `2017`; current IDs for all four can be printed from the live deployment with `pnpm verify:reference-acceptance`.

See `SPOTRIQ_V0.22_EXTERNAL_ACCEPTANCE_REPORT.md`.

## Next

Proceed to **v0.23 truthful commercial hiring / Activation semantics**: `Offer/Quote → Hire/Job → funding/payment evidence → Activation → Activation-bound ServiceTask`.

See `SPOTRIQ_DRIFT_AUDIT.md` and `CORRECTED_ROADMAP.md`.

## Rule
Every completed replacement ZIP becomes the new source of truth.

Hotfix history:
- v0.9.1 — registry request resilience and semantic-search fallback.
- v0.9.2 — Explore All renders every returned live identity; financial metadata hints are relevance metadata rather than a visibility gate.
