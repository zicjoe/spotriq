# Spotriq Corrected Roadmap

**Reconciled:** 2026-08-28  
**Starting implementation:** v0.21.0  
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

**Status: COMPLETE — repository implementation + public deployment + Test Lab + ERC-8004 identity reconciliation for all four reference agents.**

The repository contains four first-party deterministic A2A services integrated into normal Spotriq supply/readiness/matching. All four are publicly deployed, passed Marketplace Test Lab, and completed canonical ERC-8004 service reconciliation on BSC Testnet. The final audit confirmed `REGISTERED_VERIFIED`, `CANONICAL_IDENTITY = PASS`, `RUNTIME_REACHABILITY = PASS`, `MARKETPLACE_TESTS = PASS`, `TESTNET_ONLY`, and `activationEligible = false` across RangeKeeper, GridPilot, YieldPilot and VenusGuard. See `docs/SPOTRIQ_V0.22_EXTERNAL_ACCEPTANCE_REPORT.md`.

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

### v0.22.2 acceptance bridge — COMPLETE

The acceptance bridge has been completed for all four reference agents. Deployment-specific ERC-8004 IDs remain environment configuration rather than source-code constants; the API canonically verifies the configured identity, registration backlink, registration name and expected A2A endpoint before accepting a binding.

Re-run `pnpm verify:reference-acceptance` whenever the deployment, identity bindings or public runtime changes. Do not repeat ERC-8004 registration merely because an index or temporary provider is unavailable; diagnose canonical state first.

This closes v0.22. The active roadmap moves to v0.23.


---

## v0.23.0 — Commercial Hiring + Marketplace Activation Kernel

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

- live service can expose evidence-backed commercial terms/offer;
- quote has expiry/limitations and cannot silently mutate;
- hiring/commercial state is persisted and idempotent;
- free task invocation remains distinguishable from paid/hired invocation;
- `Activation` is created only when its explicit contract is satisfied;
- Activation and PermissionGrant remain independent;
- runtime tasks/activity can reference the real Activation;
- no external service receives unrestricted financial signer access.

---

## v0.24.0 — Four-Category End-to-End Activation Parity

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

- every category has real live supply or a clearly truthful no-supply state;
- every category has category-specific profile/compare evidence;
- compatible live supply can reach a real Activation/runtime state;
- category-specific permissions are visible and revocable;
- missing authority/payment/performance evidence stays unavailable rather than synthesized.

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
