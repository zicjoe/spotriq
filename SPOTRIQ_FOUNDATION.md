# Spotriq Foundation

**Status:** Canonical product and engineering doctrine  
**Project:** Spotriq (formerly **BNB Smart Money Marketplace**)  
**Baseline implementation reviewed:** v0.21.0  
**Foundation recovered:** 2026-08-28

## 1. Purpose of this document

This file preserves **what Spotriq is supposed to be**, independent of whichever milestone happens to be implemented today.

It is a normalized reconstruction of the original Spotriq / BNB Smart Money Marketplace product-and-engineering work, not a transcript. It is intended to prevent future implementation work from silently narrowing, flattening, or redefining the product.

### Foundation sources

1. The original foundational Spotriq conversation shared at:
   `https://chatgpt.com/share/6a8f0792-2a6c-83ea-b36e-055887bfc048`
2. Historical conversation context recovered from that project discussion, especially the 2026-08-14 through 2026-08-17 product/architecture decisions.
3. The embedded original UI/product specification:
   `apps/web/src/imports/pasted_text/bsc-agent-marketplace-prompt.md`
4. The user-supplied **Spotriq — Master Product + Engineering Continuation Prompt**. This is a high-confidence historical checkpoint because it was created immediately after the original foundation work and explicitly preserved product thesis, architecture, UX, evidence, failure, deployment, roadmap and engineering-operating rules.
5. The BNB Chain **Build the Era / Smart Money Era** marketplace brief, including the canonical-front-door goal and four required first-class categories.

When historical prose conflicts with the present implementation, the conflict must be recorded in `SPOTRIQ_DRIFT_AUDIT.md`; it must not be silently resolved by rewriting history.

---

## 2. Product definition

Spotriq is a **decision-and-activation marketplace for BSC financial agents**.

It is deliberately **not**:

- a generic AI-agent marketplace;
- AgentPlace or a general multichain agent economy;
- an NFT marketplace;
- an app-store catalog of agent cards;
- a chatbot with a marketplace attached;
- a workflow builder;
- a social network for agents;
- a generic DeFi dashboard;
- a trading terminal;
- a BSC block explorer;
- a demo-only hackathon shell.

The product should be credible as a **public/canonical front door for financial agents on BNB Smart Chain**, while keeping internal provider integrations normalized and replaceable.

The marketplace must answer seven user questions:

1. What could an agent help me with?
2. Which specialist fits my exact financial situation?
3. Why should I trust this service?
4. What exactly will this service be allowed to do?
5. What is it doing after activation?
6. Did using it actually help?
7. Should I continue, switch, combine specialists, or revoke access?

### Canonical lifecycle

`Understand → Discover → Match → Evaluate → Compare → Try → Authorize → Hire/Activate → Monitor → Measure → Reassess → Continue / Switch / Combine`

A shorter marketplace loop is:

`Find → Evaluate → Compare → Trust → Authorize → Activate → Observe`

Both are expressions of the same product model.

---

## 3. Required first-class financial categories

All four categories are **first-class**. Equal depth is a product requirement, not a cosmetic requirement.

### 3.1 Rebalancing

Human goal: **Manage my liquidity**.

Decision question: Which service can manage this LP position effectively?

Important decision data includes protocol, pool, pair, concentrated-liquidity support, range compatibility, strategy type, time-in-range history, rebalance frequency/success, costs, minimum capital, execution mode, permissions, marketplace tests and readiness.

### 3.2 Grid Trading

Human goal: **Automate a trading strategy**.

Decision question: Which strategy fits this pair, capital level and market context?

Important decision data includes pair, grid type/range/count/spacing, capital, stop-loss/take-profit support, adaptive re-grid, market-regime compatibility, realised/unrealised/net P&L when actually evidenced, max drawdown, fills, fees, runtime, permissions and marketplace tests.

### 3.3 Yield Optimisation

Human goal: **Put capital to work**.

Decision question: Which service gives an appropriate risk/liquidity-adjusted yield strategy for this context?

Important decision data includes asset, protocols, current reported rate, estimated net rate only when calculable, realised yield only when observed, reward composition, liquidity/withdrawal constraints, risk band, protocol diversity, reallocation support, service fees, protocol costs, permissions and tests.

Current APR/APY must never be presented as guaranteed future return.

### 3.4 Health Factor Monitoring

Human goal: **Protect my borrowing position**.

Decision question: Which service can reliably monitor or protect this lending position?

Important decision data includes protocol, collateral, debt, current health/risk state, monitoring interval, detection latency, alerts, recommendations, automatic interventions, supported interventions, observed reliability/failures, permissions and tests.

This category must not be evaluated using generic investment-return metrics.

---

## 4. Primary product loops

### 4.1 Explore-led

`Explore → Category → Services → Compare → Service Profile → Try/Checkout → Authorize → Hire/Activate → Activity → Outcome`

### 4.2 Smart Money Check-led

`Smart Money Check → Findings → Compatible Services → Compare → Service Profile → Try/Checkout → Authorize → Hire/Activate → Activity → Outcome`

### 4.3 Multi-need / Smart Money Plan

`Smart Money Check → Multiple Findings → Plan Recommendation → Specialist Services → Combined Authority Review → Individual Activations → Plan Activity → Plan Outcomes`

A Smart Money Plan is **not a super-agent** and not an arbitrary workflow builder. Each specialist remains an independent service with its own permission, activation, activity and outcome state.

---

## 5. Smart Money Check doctrine

Smart Money Check is a **read-only diagnostic front door**.

It may:

- accept a connected wallet, verified wallet, watch-only address or clearly labelled example portfolio;
- inspect supported BSC portfolio and protocol state;
- produce deterministic Findings;
- show coverage, uncertainty, freshness and unsupported-source states;
- hand a Finding to the recommendation/matching system.

It must **never move funds**.

It is not a portfolio dashboard and not an AI recommendation engine.

A `Finding` means **what Spotriq detected**. A `RecommendationCandidate` means **which services fit that finding**. These are separate resources.

AI may explain evidence in human language but must not determine financial hard gates, eligibility, safety state, recommendation constraints, readiness, or permission scope.


### Deterministic systems vs AI

This is a locked architectural rule:

**AI explains. Deterministic systems decide.**

Deterministic systems are responsible for protocol reads, financial findings, readiness gates, compatibility, permission rules, evidence evaluation, activation safety and outcome measurement. AI may summarize, translate and personalize explanations only from structured evidence. It must not invent protocol state, financial truth, supported capability, authority, trust, readiness, fees, performance or outcomes.

---

## 6. Canonical domain model

The minimum product domain must preserve the following separations.

### Marketplace identity and commerce

`AgentOperator → AgentIdentity → AgentListing → AgentService → ServiceOffer / Commercial Terms`

- **AgentIdentity** — canonical identity/pedigree.
- **AgentListing** — marketplace presentation/discoverability.
- **AgentService** — exact executable financial capability that can be evaluated and activated.
- **Offer / Commercial Terms** — current pricing, availability, scope and commercial terms for a service.

One identity may expose multiple services. Activation targets a **service**, not an abstract identity.

### Authority

`PermissionProfile → PermissionRequest → PermissionGrant`

- **PermissionProfile** — what a service normally needs.
- **PermissionRequest** — what this exact checkout requests from this exact user.
- **PermissionGrant** — what the user actually authorized and what was independently reconciled.

Requested permission must never be assumed to equal granted permission.

### Discovery and recommendation

`CheckSession → Finding → RecommendationCandidate → Comparison`

Finding and recommendation are distinct. Candidate eligibility/hard-gate failures/ranking belong in backend deterministic logic, not React or an LLM.

### Runtime and outcomes

`Activation → AgentAction → TransactionRecord → ActivityEvent → OutcomeWindow / OutcomeMetric`

These are all distinct:

- activation is not permission;
- action is not transaction;
- successful transaction is not positive outcome;
- outcome attribution may be DIRECT, OBSERVED, DERIVED or COUNTERFACTUAL.

### Plans

`SmartMoneyPlanTemplate → PlanRecommendation → PlanInstance → PlanMember[]`

Each member remains a real independent service/activation/permission relationship.

---

## 7. Discovery, verification and trust boundaries

The marketplace must preserve this progression:

`External discovery → canonical verification → service normalization → readiness → permissions/authority → commercial hiring/activation → runtime activity → outcomes`

These stages must not be collapsed.

### 7.1 ERC-8004 / 8004scan

- 8004scan is an **indexed discovery and external evidence provider**.
- A search hit does not prove capability.
- Indexed metadata is not canonical marketplace truth.
- A selected identity may be verified directly against the relevant ERC-8004 onchain identity source.
- Identity verification does not prove endpoint reachability, permission safety, profitability or readiness.

### 7.2 Provenance classes

Important information should preserve provenance such as:

- **Marketplace Observed**
- **Marketplace Derived**
- **External**
- **Operator Claimed / Operator Supplied**

Do not combine them into an unexplained universal trust score.

Decision-grade evidence should normally expose:

- `value`;
- `source`;
- `observedAt`;
- `provenance`.

Marketplace-derived values additionally need the derivation contract, including `method`, `methodVersion` and relevant `inputs`. Historical/test metrics should identify the observation `period` and `sample` where applicable.

### 7.3 Freshness

Important evidence should expose `observedAt`, freshness state and/or stale thresholds.

A value may be displayable when stale but unusable for a new financial action.

### 7.4 Readiness

Readiness is an evidence-backed backend-derived resource, not `endpointOnline=true`.

It may incorporate:

- canonical identity state;
- service schema/capability evidence;
- runtime reachability;
- BSC/network state;
- payment/commercial readiness;
- permission-profile declaration;
- required marketplace tests;
- recent execution/runtime evidence where relevant.

A Marketplace Test Lab PASS does not prove profitability, financial safety or authority.

Readiness must never be weakened merely to populate the UI.

### 7.5 Failure and partial-data philosophy

Spotriq must degrade truthfully rather than fabricate completeness.

- One failed upstream source must not erase successful observations from other sources.
- One failed category search must not destroy discovery for the other categories.
- Missing Venus inputs should become `COULD_NOT_ASSESS`/equivalent, not a guessed health state.
- Missing market history should become `INSUFFICIENT_HISTORY`/equivalent, not a fabricated regime.
- Stale evidence should remain visibly stale.
- Missing commercial terms should remain `UNDECLARED` / `NOT_DECLARED`.
- Search-relevant but unproven identities remain discovery leads, not services.
- Permission may exist even if activation later fails.
- External indexed data may disagree with canonical onchain state; the conflict must be visible.
- Missing evidence reduces certainty; it never creates positive financial claims.

---

## 8. Recommendation and ranking doctrine

Recommendation must be deterministic and explainable.

Hard eligibility constraints are evaluated before ranking. Relevant constraints can include:

- BSC support/live state;
- financial category;
- protocol;
- asset/pair/pool compatibility;
- explicit service capability;
- runtime/readiness;
- capital range;
- authority compatibility.

Missing data is not the same as failure unless the contract says it is required.

The product must not invent opaque suitability, profitability, trust or AI scores.

---

## 9. Checkout, authority and activation

The product's financial trust UX depends on keeping these independent.

### 9.1 Checkout

Checkout is a backend resource, not only local React state. It should carry the selected service/job context, quote/commercial state, exact permission request, risk disclosure, expiry and status.

The original product requires a visible multi-step permission checkout covering at minimum:

`Job → Authority → Limits → Cost → Risk → Review → Success`

The exact number of rendered steps can evolve only if the same semantic separation remains explicit.

### 9.2 Wallet ownership

Keep distinct:

- `WATCH_ONLY`
- `CONNECTED`
- `VERIFIED_CONTROL`

Entering an address never proves ownership.

### 9.3 Activation

Activation is a marketplace relationship/state, not a synonym for wallet authorization or transaction submission.

Valid edge case:

- PermissionGrant = ACTIVE
- Activation = FAILED

The user must be able to retry activation or revoke permission independently.

A quote, an open commerce job, a funded escrow, a free A2A invocation, or a successful transaction must not automatically be labelled an Activation unless Spotriq's activation contract is actually satisfied.

---

## 10. Hiring, commerce and payments

Spotriq should be **standards-aware and provider-neutral**.

The domain should model commercial hiring independently of any one protocol. A real implementation may use adapters such as ERC-8183 first where a service genuinely exposes those semantics, while x402/B402 may represent pay-per-call/service payment where appropriate.

Key rules:

- discovery protocol is not commerce protocol;
- free runtime invocation is not paid hiring;
- an offer/quote is not activation;
- an open job is not funded proof;
- escrow/funding is not provider payout/settlement;
- payment state and service runtime state remain independently reconcilable;
- provider confirmation should be independently reconciled where onchain evidence exists.

Agent Studio should be a native ecosystem integration, but Spotriq must not make its internal marketplace domain dependent on one brittle SDK representation.

### Reference financial-agent obligation

The original roadmap explicitly reserved four reference services as genuine implementations, not permanent mock inventory:

- **RangeKeeper** — Rebalancing;
- **GridPilot** — Grid Trading;
- **YieldPilot** — Yield Optimisation;
- **VenusGuard** — Health Factor Monitoring.

They may be implemented with BNB Agent Studio where appropriate, but they must still pass through Spotriq's normalized identity/service/readiness/authority contracts. Their names in frontend fixtures do not count as live supply.

### Ecosystem integration doctrine

- **ERC-8004 / 8004scan:** identity, indexed discovery and external feedback; never automatic service-readiness proof.
- **Altana:** primary scoped autonomous-authority/session integration where it cleanly fits; explicit allowlists, limits, expiry and revocation remain user-visible.
- **PancakeSwap:** primary BSC DEX/LP context and real trader/LP utility.
- **Venus:** initial lending/health and yield data integration.
- **ERC-8183:** use where discrete hiring/job/escrow semantics fit a real service; do not force it onto every monitoring relationship.
- **x402/B402:** machine-payment infrastructure where real service-payment semantics require it; not a homepage gimmick or a readiness shortcut.
- **TermiX / Agent Advantage:** maintain a real paired benchmark path from day one; report time, cost and output quality from measured tasks, never manufactured results.

---

## 11. Financial execution authority

External services must not receive unrestricted user financial authority merely because they are selected or hired.

The marketplace should make authority understandable and bounded by exact contract/function/assets/limits/expiry where applicable.

The frontend must never silently widen authority.

Provider integrations such as Altana belong behind normalized authority abstractions unless provider-specific proof is intentionally being shown.

A service can propose work without owning the final financial signer. The final signing/execution boundary may be controlled separately when that is necessary to enforce non-bypassable user limits.

---

## 12. Activity, monitoring and outcomes

Post-activation is part of the product, not an afterthought.

The user must be able to inspect:

- what is active;
- current authority and usage;
- activity/events;
- transactions where applicable;
- incidents/alerts;
- revocation state;
- measured outcomes;
- insufficient-history/uncertainty states;
- switch/re-hire/reassess options.

Transaction success must never be styled as proof that the service helped financially.

Missing performance data must not be rendered as zero.

Counterfactual estimates must not be presented like directly observed results.

---

## 13. Operator-side doctrine

A production marketplace needs operator supply onboarding/configuration, not only consumer discovery.

Operators may own/edit:

- listing information;
- services;
- pricing/commercial terms;
- permission profile declarations;
- runtime configuration;
- operator-supplied evidence.

Operators must not directly edit marketplace-observed evidence, marketplace test outcomes, computed readiness, verified reviews or production outcomes.

### Consumer information architecture

Primary desktop navigation remains:

`Home · Explore · Smart Money Check · My Agents`

with contextual Search, Notifications and Wallet/Profile. Mobile uses bottom navigation for `Home · Explore · Check · My Agents`. The consumer product must not acquire a permanent global sidebar. A separate Operator Workspace may use its own local management sidebar.

Contextual systems such as Compare, Evidence, Try, Permission Checkout, Smart Money Plans, Activity, Authority and Outcomes should appear where the user needs them rather than becoming unrelated top-level products.

### Visual/brand doctrine

Spotriq should retain a premium dark financial interface: deep graphite/charcoal surfaces, restrained mineral teal/blue-green accent, subtle borders, tabular financial numerals and sparse semantic colors. BNB yellow is for ecosystem attribution, not the whole visual system.

Avoid white/off-white page backgrounds, neon, casino styling, generic AI-purple, excessive gradients, robot imagery and glassmorphism-heavy UI. The primary wordmark is **Spotriq**; do not append `AI`, `Finance` or `BSC` to the logo. The product descriptor may remain **BSC financial-agent marketplace**.

---

## 14. Architecture doctrine

Preferred dependency flow:

`UI → Hooks/View Models → Repository/API Client → Marketplace Application API → Domain/Data/Integration Systems`

Presentation components must consume normalized marketplace resources rather than directly calling BSC RPC, PancakeSwap, Venus, ERC-8004, 8004scan, Altana, Agent Studio, ERC-8183 or payment providers.

Reusable component names should normally remain provider-agnostic.

Provider-specific adapters may change without redefining the marketplace domain.

---

## 15. BSC scope and environment doctrine

Spotriq is intentionally **BSC-focused**. Do not add generic multichain navigation to this product.

BSC Mainnet and BSC Testnet must remain explicitly labelled and must not have evidence/performance mixed without provenance.

A production/canonical marketplace should eventually operate against real BSC mainnet marketplace supply and production services. Testnet is appropriate for controlled commerce, authority and financial execution proofs until each production path is explicitly approved and hardened.

### Current BNB main-track delivery bar (verified 2026-08-28)

The active Smart Money Era brief reinforces the foundation: the public product must support the end-to-end marketplace journey, all four categories must be equally deep, surfaced agents must be live on BSC, and the user must be able to see/revoke agent authority. Real onchain session-key transactions are part of the eligibility bar. ERC-8183 hiring and x402/B402 selling are valuable bonus integrations, but they do not replace core marketplace functionality or four-category depth. The required Agent Advantage Report should be built from real paired measurements rather than retrofitted at submission time.

---

## 16. Product quality bar

The finished product should make a user feel:

- I understand what needs attention.
- I understand why this service fits.
- I can inspect the evidence.
- I know what I am authorizing.
- I can see what the service is doing.
- I can revoke authority.
- I can measure whether it helped.

The product must make all four categories credible without hiding partial, stale, unsupported, degraded or testnet-only states.

---

## 17. Locked anti-drift rules

Future engineering must not silently:

1. flatten AgentIdentity, AgentListing and AgentService into one object;
2. flatten PermissionProfile, PermissionRequest and PermissionGrant;
3. merge permission and activation state;
4. merge AgentAction, TransactionRecord and Outcome;
5. merge Finding and Recommendation;
6. convert Smart Money Plans into super-agents/workflow builders;
7. turn Smart Money Check into a write-capable portfolio manager;
8. let AI determine financial hard gates or permission scope;
9. treat search relevance as capability proof;
10. treat identity verification as service readiness;
11. treat Test Lab PASS as financial safety/profitability proof;
12. treat current rate as guaranteed return;
13. infer wallet ownership from an entered address;
14. infer risk tolerance/liquidity preference from wallet contents;
15. grant external services unrestricted financial signing power;
16. conflate free invocation, commercial hiring, funding, activation, execution and settlement;
17. hide missing/stale/partial evidence;
18. make Rebalancing the de facto whole product while the other three categories remain shallow;
19. turn Spotriq into AgentPlace or a general multichain marketplace;
20. optimize only for a hackathon demo at the expense of canonical-marketplace architecture;
21. allow permanent sample cards to substitute for live reference-agent supply;
22. let Rebalancing execution depth postpone all-four-category product depth indefinitely;
23. move ERC-8183/x402/B402 ahead of core live-agent/category functionality merely because the rails are available;
24. turn external/provider availability failures into fabricated complete states;
25. allow a consumer redesign to replace the Home / Explore / Smart Money Check / My Agents information architecture without an explicit product decision.

