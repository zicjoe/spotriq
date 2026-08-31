# Spotriq Corrected Roadmap

**Reconciled:** 2026-08-31  
**Current implementation:** v0.24.0  
**Historical baseline added:** foundational Master Product + Engineering Continuation checkpoint

This roadmap is derived from `SPOTRIQ_FOUNDATION.md`, `PROJECT_STATE.md`, `SPOTRIQ_DRIFT_AUDIT.md`, the recovered foundational handoff checkpoint and the current repository.

The roadmap does **not** discard v0.9–v0.21. It preserves the strong evidence/readiness/authority/execution architecture while correcting the sequence drift that made Rebalancing much deeper than the other required categories.

## Roadmap rule

Every milestone must answer:

1. Does it preserve the canonical domain/trust boundaries?
2. Does it advance a real end-to-end user journey?
3. Does it avoid fabricating unsupported capability/evidence/performance?
4. Does it improve or preserve four-category parity?
5. Does it move sample/reference supply toward real live BSC services?

Each completed milestone must update `PROJECT_STATE.md`. Foundational doctrine changes only when explicitly reopened.

---

## v0.22.0 — Live Four-Category Reference Agent Supply

**Status: COMPLETE — repository, public runtime/Test Lab and ERC-8004 Testnet reconciliation acceptance are complete for all four reference services.**

The repository contains four first-party deterministic A2A services integrated into normal Spotriq supply/readiness/matching. All four are publicly deployed, Marketplace Test Lab accepted and canonically reconciled to real BSC Testnet ERC-8004 identities. RangeKeeper is explicitly known as Agent ID `2017`; this roadmap does not invent the other numeric IDs.

### Goal

Correct the largest foundation→current roadmap drift: turn the four long-standing reference services from frontend fixtures into genuine live/callable BSC financial-agent supply where feasible.

Target reference services:

- **RangeKeeper** — Rebalancing;
- **GridPilot** — Grid Trading;
- **YieldPilot** — Yield Optimisation;
- **VenusGuard** — Health Factor Monitoring.

### Architecture

BNB Agent Studio may be used as the reference-agent deployment/runtime path, but Spotriq remains a TypeScript marketplace with provider-neutral domain contracts.

Each agent must flow through:

`first-party runtime → Spotriq AgentIdentity/Listing/Service → runtime descriptor → Marketplace Test Lab → ERC-8004 deployment identity reconciliation → readiness evidence → category discovery/profile`

### Minimum acceptance criteria

For every category:

- a real service/runtime exists or the release explicitly documents the blocker;
- live BSC identity/registration evidence is available where the platform requires it;
- structured category/protocol capability metadata exists;
- runtime is machine-callable through a safe, documented contract;
- Spotriq can normalize it into a real `AgentService` without special-casing a mock;
- Test Lab can safely observe reachability/descriptor/capability behavior;
- sample/reference cards cannot masquerade as the live service;
- no agent receives financial write authority merely to satisfy this milestone.

### Category task shape

- Rebalancing: leverage the existing proposal/task-origin path, not a new duplicate path.
- Grid: bounded strategy/market-context task contract; no fabricated PnL.
- Yield: bounded opportunity/strategy task contract; no realised-yield claim without measurement.
- Health: read-only monitoring/alert task first; protective write actions remain separately gated.

### v0.22.2 acceptance closure

External acceptance is complete for all four services. The retained contract is: canonical identity + runtime + Marketplace Test Lab can pass while financial readiness remains `TESTNET_ONLY` and financial `activationEligible = false`. v0.23 commercial read-only Activation is a separate resource and does not change that financial gate.


---

## v0.23.0 — Commercial Hiring + Marketplace Activation Kernel

**Status: COMPLETE — local validation, Railway deployment/migration, four-service commercial acceptance and v0.22 regression acceptance passed.**

Implemented in the repository: structured FREE reference Offers, immutable Quotes, idempotent Hires, independent payment/funding evidence, read-only Marketplace Activation, buyer commercial state, optional Activation-bound ServiceTask, PostgreSQL migration 0016, API routes, Explore hiring flow, provider-neutral payment adapters and an ERC-8183 read-only observer. X402/B402 remain adapter rails without live v0.23 adapters.

### Goal

With real services available, close the semantic gap between free invocation and genuine marketplace hiring/activation.

### Domain seam

`AgentService → Offer/Quote → Commercial Hire/Job → Commercial/Funding Evidence → Activation → Activation-bound ServiceTask`

Commercial state must remain independent from PermissionGrant and financial execution.

### ERC-8183

Use behind a provider-neutral hiring adapter when the real service exposes discrete job/escrow semantics. Independently reconcile relevant onchain state before representing a job as funded/active/completed.

### x402/B402

Use where the real service exposes per-call/payment semantics. Do not infer payment support from metadata alone and do not make x402 the product narrative.

### Acceptance criteria

- [x] live reference service exposes structured evidence-backed FREE read-only terms/offer;
- [x] Quote has expiry/limitations and immutable terms hash;
- [x] hiring/commercial state is persisted and idempotent;
- [x] FREE payment is `NOT_REQUIRED`, distinguishable from paid/hired funding evidence;
- [x] `Activation` is created only when explicit commercial/readiness gates pass;
- [x] Activation and PermissionGrant remain independent;
- [x] ServiceTask can reference a legitimate Activation;
- [x] no external service receives unrestricted financial signer access;
- [x] authoritative local `pnpm check` passes;
- [x] Railway migration/deployment + live v0.23 commercial acceptance pass;
- [x] post-deployment v0.22 external reference regression acceptance passes.

---

## v0.24.0 — Four-Category End-to-End Activation Parity

**Repository implementation status: COMPLETE CANDIDATE; local dependency-aware validation and external v0.24 acceptance PENDING.**

Implemented in the repository: category-aware Activation controls/revocation, generalized Activation-bound ServiceTask contracts for all four categories, first-party reference-runtime attribution without fabricated authority keys, explicit observational/runtime state, Health monitoring snapshots, migration 0017, API/UI integration and a live parity verifier. The current parity tier is read-only; it does not pretend Grid/Yield/Health have Rebalancing's financial execution depth.

### Goal

Bring all four required categories through a meaningful live marketplace journey:

`Finding/Explore → live AgentService → evidence/readiness → compare/profile → hire/activate → runtime/task → activity/outcome or monitoring state`

### Rebalancing

Preserve the existing deep controlled BSC Testnet execution spine and bind it to truthful service/Activation/commercial state.

### Grid Trading

Add category-specific activation/task semantics for supported pair/capital/market-context. Execution authority must be explicitly bounded; no historical profit/drawdown is invented.

### Yield Optimisation

Add category-specific activation/task semantics using evidenced protocol/rate data. Current protocol APY is not realised yield; outcome measurement requires time.

### Health Factor Monitoring

Support a genuine monitoring/alert activation first. Protective interventions are a separate authority tier and must not inherit Rebalancing's write permissions.

### Acceptance criteria

- [x] every category has real live first-party supply or a clearly truthful no-supply state;
- [x] every category retains category-specific profile/evidence semantics;
- [x] compatible reference supply has a real category-aware Activation → runtime task contract;
- [x] category-specific read-only controls are visible and marketplace relationships are revocable;
- [x] missing financial authority/payment/performance evidence stays unavailable rather than synthesized;
- [x] Health has a genuine monitoring-snapshot state before any protective-write tier;
- [x] Grid context is not promoted into profit/drawdown/fill outcomes;
- [x] Yield current rates/opportunities are not promoted into realised yield;
- [ ] authoritative local `pnpm check` + API package build pass;
- [ ] Railway migration 0017/deployment passes;
- [ ] live `verify:activation-parity` passes all four services;
- [ ] v0.22/v0.23 production regression verifiers still pass after deployment.

---

## v0.25.0 — Live Explore, Compare, Try and Service Profile Completion

### Goal

Make the consumer marketplace rely on live normalized services rather than reference fixtures.

### Scope

- live category supply and no-supply states;
- real service IDs everywhere;
- evidence/source/freshness labels;
- explainable match reasons/trade-offs;
- live Test Lab/readiness;
- commercial state/terms;
- external feedback kept separate from Spotriq-observed evidence/outcomes;
- Try flows that are safe/read-only unless explicit authority exists.

---

## v0.26.0 — My Agents / Authority / Activity / Outcomes

### Goal

Generalize the original post-activation product across categories.

### Scope

- active service/Activation inventory;
- permission state independent from activation state;
- authority usage, expiry, revocation and reverification;
- category-aware activity/alerts/incidents;
- transactions where applicable;
- category-appropriate outcome windows;
- insufficient-history/confounded states;
- pause/revoke/continue/switch/re-hire flows.

The user should be able to answer: **what currently has authority over my money, what is it doing, and did it help?**

---

## v0.27.0 — Smart Money Plans

Implement curated combinations of independent specialists only after individual service lifecycles are robust.

`PlanTemplate → PlanRecommendation → PlanInstance → PlanMember[]`

Each member retains its own AgentService, commercial relationship, PermissionGrant, Activation, activity and outcomes. Plan-level authority review must not become a merged unrestricted key.

---

## v0.28.0 — Operator Supply Lifecycle

Implement production supply management:

- identity claim/verification;
- listing/service creation and updates;
- protocols/assets/pairs/capital/runtime declarations;
- pricing/offers;
- PermissionProfile;
- operator evidence;
- Test Lab re-runs;
- readiness blockers;
- moderation/suspension;
- operator cannot edit Marketplace Observed truth.

---

## v0.29.0 — Submission + Canonical Front Door Hardening

### Goal

Prepare Spotriq for judging and durable public use.

### Areas

- public deployment and availability;
- production environment validation;
- rate limiting/abuse controls;
- structured logging/correlation IDs/telemetry;
- provider failover and degraded states;
- DB migration/backups;
- reconciliation workers;
- security review/failure injection;
- explicit testnet/mainnet labels;
- user-facing authority and revoke proof;
- real live transaction evidence where required;
- polished judge/demo portfolio covering all four categories;
- submission evidence/playbook/video.

---

## Continuous track — Agent Advantage Report

Do not postpone this until the final day.

Maintain real benchmark records for at least the required paired agent/manual tasks, measuring:

- elapsed time;
- cost;
- actual output;
- output quality;
- trading/security-relevant task coverage where required.

Never manufacture benchmark results. The outcome engine can eventually supply evidence, but a benchmark is not the same resource as a normal user Outcome.

---

## What not to do next

Do not:

- add another Rebalancing-only security/execution subsystem before four-category live supply;
- make ERC-8183/x402/B402 the immediate product goal before real agents exist to use them;
- weaken readiness to make supply appear larger;
- turn search relevance into capability proof;
- turn Spotriq into AgentPlace/multichain infrastructure;
- add AI ranking that bypasses deterministic eligibility;
- call free A2A invocation a paid hire;
- call escrow/funding provider payout;
- call transaction success a positive financial outcome;
- ship unbounded/mainnet financial authority for demo speed;
- let sample fixtures substitute for live BSC agents.
