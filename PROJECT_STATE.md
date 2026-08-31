# Spotriq Project State

**Current implementation release:** v0.22.2  
**Reference identity reconciliation:** v0.22.2 lets real ERC-8004 identities be deployment-bound to first-party reference services only after canonical owner/backlink/name/A2A endpoint verification. The earlier v0.22.1 Railway build hotfix remains included.  
**Audited:** 2026-08-29  
**Repository role:** Current implementation truth

## 1. Source-of-truth order

When sources disagree, use this order and record material conflicts in `SPOTRIQ_DRIFT_AUDIT.md`:

1. **Current repository / latest supplied ZIP** — what is actually implemented.
2. **`PROJECT_STATE.md`** — concise present-state map of the repository.
3. **`SPOTRIQ_FOUNDATION.md`** — canonical product/architecture doctrine.
4. **`PROJECT_OPERATING_RULES.md`** — canonical engineering/release/continuation workflow.
5. **Current subsystem documentation in `/docs`** — detailed technical contracts.
6. **Implementation reports / git history** — historical change record.
7. **Historical checkpoints such as `docs/history/SPOTRIQ_FOUNDATIONAL_HANDOFF_ARCHIVE.md` and prior ChatGPT conversations** — historical reasoning/design archive.

A code/foundation mismatch is not automatically resolved in favor of code; code wins only as an implementation fact. Product intent remains governed by the foundation until deliberately superseded.

---

## 2. Product position

Spotriq is currently implemented as a BSC-focused financial-agent marketplace and control surface with a read-only Smart Money Check, live BSC financial-data adapters, live ERC-8004/8004scan discovery, marketplace service normalization/readiness, a Marketplace Test Lab, Finding-to-service matching, and one deep Rebalancing execution vertical.

The repository does **not** yet implement complete commercial marketplace activation/hiring semantics. `marketplaceActivationEnabled` remains intentionally `false` in v0.22.x.

---

## 3. Repository architecture

### Applications

- `apps/web` — React/Vite consumer/operator-oriented frontend shell.
- `apps/api` — Fastify marketplace/application API.
- `apps/worker` — worker application seam.

### Core packages

- `@spotriq/domain` — shared canonical domain types.
- `@spotriq/api-contracts` — normalized API contracts.
- `@spotriq/config` — configuration.
- `@spotriq/db` — PostgreSQL/memory persistence and migrations.
- `@spotriq/evidence` — evidence/provenance/freshness definitions.
- `@spotriq/chain` — BSC chain reads.
- `@spotriq/protocol-pancakeswap` — PancakeSwap V3/Infinity CL data adapter.
- `@spotriq/protocol-venus` — Venus lending/yield adapter.
- `@spotriq/market-context` — Grid market-context/TWAP logic.
- `@spotriq/smart-money` — Smart Money Check / Findings.
- `@spotriq/agent-registry` — ERC-8004 + 8004scan discovery/verification.
- `@spotriq/marketplace-supply` — listings/services/offers/permission profiles/readiness/Test Lab.
- `@spotriq/reference-agents` — four deterministic first-party A2A reference services and runtime cards.
- `@spotriq/job-intents` — Finding/service → Rebalancing Job Intent.
- `@spotriq/service-tasks` — real A2A service invocation/origin proof.
- `@spotriq/authority` — bounded permission and Altana proof/reconciliation.
- `@spotriq/execution-plans` — reviewed Rebalancing execution plans.
- `@spotriq/execution-guard` — argument-level execution checks.
- `@spotriq/execution-boundary` — sealed non-bypassable execution boundary.
- `@spotriq/controlled-execution` — exact bounded BSC Testnet dispatch/reconciliation.
- `@spotriq/activity-outcomes` — execution-scoped activity/outcome evidence.

---

## 4. Current domain coverage

| Domain | State | Current implementation |
|---|---|---|
| AgentIdentity | LIVE | ERC-8004/8004scan external discovery + canonical verification; first-party reference services can remain explicit marketplace identities or reconcile to configured real ERC-8004 identities without changing stable service IDs |
| AgentListing | LIVE/PARTIAL | normalized listing surface from external identities plus first-party reference listings |
| AgentService | LIVE/PARTIAL | external supported-category normalized candidates plus four real first-party reference AgentServices |
| ServiceOffer | PARTIAL | modeled/persisted; often undeclared because commercial provider terms are not proven |
| PermissionProfile | LIVE/PARTIAL | distinct modeled/persisted declaration state |
| ReadinessSnapshot | LIVE | deterministic readiness, Test Lab and authority-related gates |
| Finding | LIVE | four-category Smart Money Check findings/data foundation |
| RecommendationCandidate | LIVE for compatibility | deterministic Finding → service matching/ranking implemented |
| Checkout | PARTIAL | frontend checkout UX exists; Rebalancing Job Intent/authority flow provides backend state seams but there is no complete generalized commercial Checkout resource |
| PermissionRequest/Grant | LIVE for Rebalancing path | bounded request + Altana grant/session reconciliation |
| Commercial hiring | MISSING | no production commercial hiring adapter/job lifecycle yet |
| Activation | MODELED / NOT LIVE | type/UI/sample seams exist; real marketplace activation deliberately disabled |
| AgentAction | MODELED/PARTIAL | execution/task evidence exists, but canonical activation-linked runtime action model is not generalized |
| TransactionRecord | PARTIAL | real BSC execution/receipt evidence exists in Rebalancing path |
| ActivityEvent | LIVE for execution scope | v0.20 materializes execution-scoped activity |
| OutcomeWindow/Metric | LIVE/PARTIAL | immediate execution evidence; long-horizon financial outcomes remain collecting/insufficient history |
| SmartMoneyPlan | UI/DOMAIN FOUNDATION | templates/UI exist; real recommendation/instance/member activation backend is not implemented end-to-end |
| Operator workspace | UI FOUNDATION | routed/backend-ready sample surface; real operator APIs remain incomplete |

---

## 5. Financial category state

### Rebalancing — DEEP / TESTNET EXECUTION CAPABLE

Current path:

`BSC/PancakeSwap state → Smart Money Finding → compatible AgentService → Job Intent → real A2A ServiceTask/origin proof → bounded authority → reviewed execution plan → sealed financial boundary → Altana financial session → bounded approval if needed → controlled BSC Testnet dispatch → independent receipt/post-state reconciliation → Activity & Outcomes`

Important constraint: this is **not yet commercial marketplace activation**. The selected service can be proven as proposal origin without receiving unrestricted financial signing authority.

### Health Factor Monitoring — LIVE DATA / FINDINGS FOUNDATION

- Venus Core/Isolated pool position/risk normalization exists.
- Smart Money Check Health findings exist.
- Canonical service hiring/activation/runtime monitoring/outcome flow is not at Rebalancing depth.

### Yield Optimisation — LIVE DATA / FINDINGS FOUNDATION

- wallet-relevant Venus supply opportunities exist;
- current base supply APY provenance is distinguished from estimated net/realised yield;
- Smart Money Check Yield findings exist;
- end-to-end commercial service lifecycle is not at Rebalancing depth.

### Grid Trading — LIVE MARKET-CONTEXT / FINDINGS FOUNDATION

- PancakeSwap V3 current price + onchain 1h/6h/24h TWAP context exists;
- deterministic market-regime classification exists;
- TWAP dispersion is not mislabelled realised volatility;
- end-to-end commercial service lifecycle is not at Rebalancing depth.

---

## 6. Marketplace discovery/supply state

Current supply path:

`four-category 8004scan search → deduplicated identities/leads → operator metadata category hints → normalized listings/services → selected ERC-8004 canonical verification → runtime endpoint normalization → Marketplace Test Lab → readiness`

Locked current behavior:

- search relevance is discovery evidence only;
- no matching operator metadata hint means no AgentService promotion;
- category search failures are isolated;
- only A2A/MCP are treated as machine-callable candidates;
- capability claims remain operator-claimed unless separately observed;
- 8004scan reputation remains external evidence;
- pricing/permission authority is not inferred;
- Test Lab PASS cannot bypass permission/authority readiness.

Known practical issue: live normalized service supply can be sparse/empty when registry metadata is insufficient. The system correctly refuses to fabricate service capability merely to fill Explore.

### Reference-agent supply status

**LIVE IN REPOSITORY / PUBLIC DEPLOYMENT EVIDENCE PENDING.**

The four original reference names now have genuine first-party machine-callable implementations in `@spotriq/reference-agents`:

- RangeKeeper — Rebalancing → PancakeSwap V3 position/range analysis;
- GridPilot — Grid Trading → PancakeSwap V3 market/TWAP context;
- YieldPilot — Yield Optimisation → Venus current supply-opportunity data;
- VenusGuard — Health Factor Monitoring → Venus lending-risk/health data.

They publish A2A Agent Cards and JSON-RPC runtimes under `/v1/reference-agents/*`, are normalized as `origin = REFERENCE`, and flow through the same readiness/Test Lab/Finding compatibility surfaces as external supply. Duplicate legacy sample cards are suppressed when the live counterpart is present.

They are deliberately **not** labelled ERC-8004 verified merely because Spotriq ships their runtime. v0.22.2 can bind a configured real identity only after direct canonical verification plus registration-name/A2A endpoint reconciliation. Commercial activation remains separate. `first-party runtime ≠ ERC-8004 identity ≠ activation`.

---

## 7. Trust and authority state

Implemented Rebalancing safeguards include:

- explicit bounded permission request;
- server-derived Position Manager/token facts;
- exact selector/target scope;
- token spend caps and expiry;
- verified service-owned session-key challenge binding where declared;
- argument-level calldata guard;
- reviewed target range;
- independent quote/simulation evidence;
- sealed exact plan/call hashes;
- boundary-controlled financial signer unavailable to the external service;
- independent Altana Keystore verification/reverification;
- fresh preflight;
- exact bounded approvals rather than unlimited approval;
- independent BSC receipt/post-state reconciliation;
- replay prevention after successful execution.

This is substantially aligned with the foundation's bounded-authority doctrine.

---

## 8. Commerce / activation state

**Current state: NOT YET LIVE.**

v0.21 proves a selected A2A AgentService was actually invoked and originated a structured proposal. It explicitly marks commercial state as not proven.

The repository currently contains no generalized live ERC-8183 hiring lifecycle and no complete x402/B402 commercial payment path.

`marketplaceActivationEnabled = false` is therefore correct.

The next implementation must preserve these distinctions:

`Service selection ≠ quote ≠ commercial job ≠ funded/authorized job ≠ task invocation ≠ activation ≠ financial execution ≠ payout/settlement`

---

## 9. Frontend state

The frontend still preserves much of the original product structure:

- Home
- Explore
- Smart Money Check
- service profile/tabs
- compare-oriented seams
- checkout flow
- Smart Money Plans
- My Agents
- Activity
- Authority
- Outcomes
- operator surface

However, several surfaces still rely on clearly labelled sample/reference data. The live backend is much deeper than some consumer marketplace screens, while some original marketplace UX is deeper than the live commercial backend.

The original Figma/product specification remains in the repo at:

`apps/web/src/imports/pasted_text/bsc-agent-marketplace-prompt.md`

It is now historical design input; `SPOTRIQ_FOUNDATION.md` is the concise canonical doctrine extracted from it.

---

## 10. Persistence

- No `DATABASE_URL` → memory stores for local development.
- `DATABASE_URL` → PostgreSQL persistence.
- Migrations 0001 through 0015 are present.
- v0.21 uses migration `0015_service_task_origin_proof.sql` for service task/origin/proposal evidence.
- v0.22 requires no new migration; existing marketplace tables store first-party reference identities/listings/services with explicit source kinds.

---

## 11. Environment

- Marketplace discovery defaults to BSC Mainnet (`chainId=56`) so real identities can be inspected.
- Transactional controlled engineering currently uses BSC Testnet where explicitly configured.
- Dedicated BSC RPC endpoints are recommended for production/staging; public fallbacks support development.
- `SCAN8004_API_KEY` is optional but useful for higher-quality live discovery throughput.
- `PUBLIC_API_BASE_URL` defaults to localhost for development, but is explicit and HTTPS-only in production because first-party A2A cards need a truthful public origin.
- No secrets belong in this document or repository.

---

## 12. Current verification

For v0.22 the repository-level foundation verifier covers the four-category first-party reference-agent package/routes, marketplace integration, evidence methods, truthful UI labeling, activation gating and release-version consistency in addition to all earlier invariants:

`node scripts/verify-foundation.mjs`

The packaging environment also performs repository-wide TypeScript/TSX syntax transpilation and targeted reference-agent tests where installed dependencies permit. The user's `pnpm check` remains the authoritative full workspace validation because the packaging environment cannot download the dependency graph.

Repository validation is not public-deployment evidence, ERC-8004 registration evidence, or evidence that a user wallet broadcast a financial transaction.

---

## 13. foundational roadmap reconciliation

The newly recovered foundational Master Handoff provides a precise historical sequencing baseline:

| Intended from the foundational handoff | Actual repository |
|---|---|
| Test Lab | completed v0.12 |
| Deterministic matching | completed v0.13 |
| Four genuine reference financial agents | **not completed as a four-agent live supply layer** |
| Scoped authority / Permission Checkout | implemented deeply for Rebalancing v0.15–v0.18 |
| First real Testnet activation/execution path | controlled Rebalancing dispatch v0.19, but commercial marketplace Activation still not fabricated |
| Activity / Outcomes | implemented for execution scope v0.20 |
| Real selected-service task origin | implemented v0.21 |
| ERC-8183 / x402 / B402 | still not generalized/live; historically intended after core activation rather than before reference supply |

The implementation after v0.13 therefore strengthened one category far beyond the original sequence while skipping the planned four-reference-agent supply step.

---

## 14. Current milestone

**v0.22 implementation:** live four-category reference-agent supply is present in the repository, public Railway deployment has been exercised, and Marketplace Test Lab has produced PASS coverage for all four public reference Agent Cards.

**Current external acceptance checkpoint:** RangeKeeper has been registered on BSC Testnet as ERC-8004 Agent ID `2017`. Spotriq independently returned `canonicalVerification.state = VERIFIED`, canonical owner `0x08a594e828133d18a43918cc804754f46daf44db`, a matching registry backlink, parsed registration metadata, and the expected public RangeKeeper A2A Agent Card. v0.22.2 adds the deployment-configured binding needed for `svc:reference:rangekeeper` to consume that canonical proof without hard-coding the ID. GridPilot, YieldPilot and VenusGuard still require their own real ERC-8004 registrations/bindings.

**Next product/engineering milestone:** v0.23 — truthful Commercial Hiring + Marketplace Activation Kernel.

Target seam:

`AgentService → Offer/Quote → Commercial Hire/Job → funding/payment evidence → Activation → Activation-bound ServiceTask`

ERC-8183 and x402/B402 should be adapters only where their real service semantics fit. PermissionGrant, commercial Activation and financial execution remain independent resources.


## 15. Immediate product risk

The repository is architecturally strong but **vertically imbalanced**.

Rebalancing has received far more implementation depth than Grid, Yield and Health. The recovered foundational roadmap proves that this imbalance is a sequence drift: after v0.13 matching, Spotriq was supposed to establish genuine reference agents across all four categories before continuing into deep authority/activation infrastructure.

The priority order is now:

1. deploy v0.22.2, bind RangeKeeper Agent ID 2017, verify its service-level `CANONICAL_IDENTITY = PASS`, then register/bind GridPilot, YieldPilot and VenusGuard;
2. generalize truthful commercial hiring/Activation semantics over real services;
3. bring each category through a meaningful end-to-end activation/runtime path;
4. then deepen My Agents, Plans, operator tooling and production hardening.

ERC-8183/x402/B402 remain important and current BNB tooling makes them useful, but they must support this journey rather than displace the all-four-category requirement.
