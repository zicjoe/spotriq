# Spotriq Foundation → v0.22.2 Drift Audit

**Audit date:** 2026-08-29  
**Foundation:** `SPOTRIQ_FOUNDATION.md`  
**Implementation:** Spotriq v0.22.2

## Status vocabulary

- **ALIGNED** — implementation preserves the intended product/engineering rule.
- **PARTIALLY ALIGNED** — foundation exists, but coverage/depth is incomplete.
- **DRIFTED** — current implementation direction materially departs from the foundation.
- **MISSING** — expected capability is not implemented as a real backend/product flow.
- **INTENTIONALLY DEFERRED** — absence is explicit and safe, not accidental pretending.

---

## Executive finding

Spotriq has **not lost its core architecture**. In several trust/authority areas, the current implementation is more rigorous than the initial product specification. v0.22 also corrects the most obvious supply-sequencing drift by shipping real first-party runtimes across all four required categories.

The main drift is **product balance and marketplace completeness**, not architectural collapse:

1. Rebalancing became an extremely deep vertical while the other three required categories remained primarily data/finding foundations.
2. Real commercial hiring/activation is still intentionally absent, so the product cannot yet complete its original marketplace lifecycle with live services.
3. Consumer/operator UI still contains sample/reference seams because live marketplace supply/commercial APIs are not complete.
4. Smart Money Plans, generalized post-activation management and operator supply workflows remain mostly product/domain/UI foundations rather than live marketplace systems.

Therefore the correct response is **not to rewrite Spotriq**. Preserve the existing architecture, restore the missing commerce/activation kernel, then rebalance engineering effort across all four categories.

---

## 1. Product identity and BSC focus — ALIGNED

### Foundation

Spotriq is a BSC-focused financial-agent marketplace, separate from AgentPlace and not a generic multichain agent economy.

### v0.21

- BSC is the explicit network domain.
- Mainnet discovery and testnet transactional engineering are separately represented.
- Provider-specific integrations sit behind packages/application boundaries.

### Action

Preserve. Do not introduce generic multichain product navigation into Spotriq.

---

## 2. Canonical-front-door / production ambition — PARTIALLY ALIGNED

### Foundation

Spotriq should be credible as the public/canonical front door for BSC financial agents, not merely a hackathon prototype.

### v0.21

The backend trust/authority architecture is production-minded, but the marketplace is not yet commercially complete and several consumer/operator surfaces remain sample-backed.

### Action

Treat production adoption requirements as architectural requirements: durable operator onboarding, commercial state, monitoring, reconciliation, observability, abuse/security controls and category parity.

---

## 3. Four required categories with equal depth — DRIFTED / PARTIALLY CORRECTED

### Foundation

Rebalancing, Grid Trading, Yield Optimisation and Health Factor Monitoring must all be first-class with equal product depth.

### v0.21

- **Rebalancing:** deep end-to-end Finding → service → task-origin → authority → reviewed plan → controlled BSC Testnet execution → Activity/Outcomes.
- **Health:** real Venus data + findings foundation.
- **Yield:** real Venus opportunity/rate data + findings foundation.
- **Grid:** real PancakeSwap V3/TWAP market context + findings foundation.

The latter three do not yet have Rebalancing-equivalent marketplace/hiring/runtime/outcome depth.

### v0.22 update

GridPilot, YieldPilot and VenusGuard now exist as genuine first-party read-only A2A AgentServices backed by their category's deterministic protocol readers, alongside RangeKeeper. This fixes the missing four-category runtime-supply layer, but not yet the deeper hiring/Activation/activity/outcome parity.

### Risk

Spotriq can begin to look like a Rebalancing product with three supporting tabs, contrary to the foundational product and BNB marketplace requirement.

### Corrective action

Complete public verification/identity for the v0.22 services, then generalize commercial hiring/Activation and build thin but real end-to-end vertical slices for Health, Yield and Grid before adding substantially more Rebalancing specialization.

---

## 4. Smart Money Check as read-only diagnostic — ALIGNED

### Foundation

Smart Money Check discovers context and produces Findings but never moves funds.

### v0.21

Live BSC/protocol reads feed deterministic Findings. Financial execution occurs only later through explicit Job Intent, authority and execution-boundary systems.

### Action

Preserve this separation permanently.

---

## 5. Finding ≠ Recommendation — ALIGNED

### Foundation

Finding explains what Spotriq detected; recommendation/matching explains which services fit.

### v0.21

`Finding` remains distinct from compatibility/ranking and `RecommendationCandidate` concepts. Matching is deterministic and category/context constrained.

### Action

Preserve. Expand recommendation evidence/trade-offs as live supply improves.

---

## 6. Identity → Listing → Service → Offer — ALIGNED / PARTIAL

### Foundation

These resources must remain distinct.

### v0.21

They are distinct in the domain and marketplace-supply package. Offers exist but often remain `UNDECLARED` because live commercial terms are not proven.

### Action

Do not flatten. v0.23 commercial work should make Offer/Quote state real rather than inferring it from registry metadata.

---

## 7. Discovery ≠ capability ≠ readiness — STRONGLY ALIGNED

### Foundation

Search relevance is not capability proof. Identity verification is not readiness. Readiness is evidence-backed.

### v0.21

This rule is repeatedly enforced:

- targeted 8004scan searches produce leads;
- no matching operator metadata hint → no service promotion;
- canonical identity verification is separate;
- Test Lab is separate;
- permission/authority remains an independent gate;
- readiness does not become READY merely because discovery succeeded.

### Action

Preserve even when live supply is sparse. Never weaken gates to create prettier marketplace results.

---

## 8. Provenance/freshness/evidence — STRONGLY ALIGNED

### Foundation

Marketplace Observed, Marketplace Derived, External and Operator Claimed information must stay distinguishable; freshness and uncertainty must be visible.

### v0.21

Evidence/freshness structures are first-class and used across chain, protocols, discovery, Test Lab, execution and outcomes.

### Action

Preserve. Extend the same rigor to commercial/hiring evidence.

---

## 9. Explainable deterministic ranking — ALIGNED

### Foundation

No opaque AI/trust/profitability score; hard gates before ranking.

### v0.21

Finding/service compatibility uses deterministic structured context and lexicographic ranking. `activationEligible` is never overridden by ranking.

### Action

Preserve; do not replace with LLM ranking.

---

## 10. PermissionProfile ≠ Request ≠ Grant — STRONGLY ALIGNED

### Foundation

Normal requested authority, checkout-specific request and actual grant must remain separate.

### v0.21

The Rebalancing path implements explicit request/grant/reconciliation semantics and exposes independent safety prerequisites.

### Action

Generalize these contracts to other categories and commercial checkout rather than creating provider-specific shortcuts.

---

## 11. Bounded/non-bypassable financial authority — STRONGLY ALIGNED / FOUNDATION EXTENDED

### Foundation

Authority must be understandable and bounded; external agents must not receive unrestricted signing authority.

### v0.21

The implementation goes beyond the original UI-level requirement with trusted service-key binding, exact selector/target scope, reviewed calldata, a sealed non-bypassable execution boundary, a separate boundary-controlled signer, bounded approvals, fresh preflight and independent receipt reconciliation.

### Assessment

This is a legitimate strengthening of the foundation, not drift.

### Action

Keep it, but do not let security-depth work on Rebalancing indefinitely postpone marketplace/category parity.

---

## 12. Service task/proposal origin — ALIGNED / FOUNDATION EXTENDED

### Foundation

Post-selection runtime activity should be attributable to the selected service.

### v0.21

A real A2A ServiceTask is invoked with persisted Job Intent context; proposal origin is verified and carried into the execution plan. User-overridden ticks remain distinguishable from service-proposed ticks.

### Action

Bind future commercial hiring evidence to this task path instead of replacing it.

---

## 13. Commercial hiring — MISSING / INTENTIONALLY DEFERRED

### Foundation

The marketplace lifecycle includes actual hiring/activation and commercial terms.

### v0.21

A2A invocation is real, but it is deliberately **not** called paid hiring. ERC-8183/x402/B402 are not implemented as a generalized commercial lifecycle. `marketplaceActivationEnabled=false` is correct.

### Risk

Without this layer, Spotriq can discover, verify, test and even execute controlled work, yet still cannot truthfully say the user hired/activated a live marketplace service commercially.

### Corrective action

This is the immediate next milestone.

---

## 14. Activation ≠ permission ≠ execution — ALIGNED CONCEPTUALLY / MISSING LIVE ACTIVATION

### Foundation

Activation is an independent marketplace state; permission can remain active while activation fails, and transaction success does not define activation.

### v0.21

Domain types and UI sample seams preserve Activation, but the live backend deliberately does not fabricate Activation from task invocation/execution evidence.

### Corrective action

Create real activation only after the required commercial/hiring state is independently proven.

---

## 15. Activity ≠ transaction ≠ outcome — ALIGNED / PARTIAL

### Foundation

Agent actions, transactions and measured outcomes are distinct.

### v0.21

v0.20 creates execution-scoped Activity & Outcomes and explicitly refuses to fabricate PnL, LP fees, APY or Agent Advantage claims from one execution.

### Gap

Activity/outcomes are currently tied to execution scope rather than a fully commercial Activation/service lifecycle.

### Corrective action

Once real activation exists, attach service-task, commercial and activation identities without losing the existing evidence model.

---

## 16. Smart Money Plans — PARTIALLY ALIGNED / MOSTLY NOT LIVE

### Foundation

Plans combine compatible specialist services while preserving independent authority, activation and outcomes per member.

### v0.21

Plan templates/UI/domain seams exist, but generalized live recommendation, combined authority, member activation and plan outcomes are not implemented end-to-end.

### Corrective action

Do not prioritize full Plan automation before the individual-service commercial activation kernel and four-category parity are real.

---

## 17. Operator marketplace supply — PARTIALLY ALIGNED / MISSING BACKEND DEPTH

### Foundation

Operators need a real workspace to manage listings, services, pricing, permission profiles, runtime configuration and operator-supplied evidence while being unable to edit marketplace-observed truth.

### v0.21

The frontend contains a routed/backend-ready operator surface, but live operator lifecycle APIs are not a complete production system.

### Corrective action

Add operator claim/submission/update flows after the commercial schema is stable. This is important for canonical-front-door adoption because Spotriq cannot depend indefinitely on passive registry inference.

---

## 18. Consumer Explore/profile/compare — PARTIALLY ALIGNED

### Foundation

Users should discover, understand and compare category-specific services using evidence and readiness.

### v0.21

Live discovery/service candidates exist, but reference/sample service cards remain visibly present because live normalized supply can be sparse. Live compatibility ranking is strongest when entered from a real Smart Money Finding.

### Corrective action

Keep sample data clearly labelled, but progressively replace reference cards with live verified service data as commercial/operator supply becomes real. Do not fabricate category support.

---

## 19. Provider-neutral backend boundaries — ALIGNED

### Foundation

UI must consume normalized marketplace resources; provider integrations belong behind API/domain adapters.

### v0.21

The monorepo has distinct packages for BSC, PancakeSwap, Venus, agent registry, marketplace supply, Altana authority and execution concerns.

### Action

Preserve. Implement commerce through a `HiringAdapter`/commercial abstraction rather than baking ERC-8183 directly into every domain object.

---

## 20. Mainnet production readiness — PARTIAL

### Foundation

Spotriq should become a real BSC marketplace, not remain testnet-only.

### v0.21

- Mainnet discovery is real.
- Financial execution is intentionally controlled on BSC Testnet.
- No audit during this reconciliation proves a production mainnet activation/execution path.

### Action

Do not rush mainnet signing. First complete commercial semantics, observability, operator controls, abuse/security controls, failure recovery and category parity. Then define an explicit production-readiness gate.

---


## 21. foundational roadmap sequencing — DRIFTED AFTER v0.13

### Foundation checkpoint

The recovered foundational Master Handoff explicitly ordered: Test Lab → deterministic matching → four genuine reference financial agents → scoped authority → first real Testnet activation → Activity/Outcomes → My Agents/Plans/Operator → later ERC-8183/x402/B402 adapters.

### v0.21

v0.12 Test Lab and v0.13 matching align exactly. v0.14–v0.21 then moved into a deep Rebalancing-only implementation sequence before the four-reference-agent step was completed.

### Assessment

This is the clearest implementation-sequence drift. The Rebalancing work itself is not wrong; much of it strengthens the original architecture. The problem is opportunity cost and category imbalance.

### Corrective action

Make genuine four-category reference supply the next milestone. Do not delete or roll back the Rebalancing execution spine.

---

## 22. Reference financial agents — PARTIALLY RESOLVED / PUBLIC PROOF PENDING

### Foundation checkpoint

RangeKeeper, GridPilot, YieldPilot and VenusGuard were explicitly intended to become genuine reference implementations, preferably using BNB Agent Studio where appropriate.

### v0.21

Their names remained heavily represented in frontend/sample fixtures. Live ERC-8004 discovery and normalized external AgentService candidates existed, but the repository did not prove a completed live four-reference-agent suite.

### v0.22

The repository now ships RangeKeeper, GridPilot, YieldPilot and VenusGuard as genuine first-party deterministic A2A runtimes and normalized `REFERENCE` AgentServices. They use the same readiness/Test Lab/matching surfaces and do not receive write authority. Legacy duplicate sample cards are suppressed when the live counterpart is present.

What remains unproven by repository code is external/public state: deployed HTTPS reachability, Test Lab observations against that deployment, and genuine ERC-8004 registrations.

### Corrective action

Deploy/test/register/reconcile the four public services and preserve the same readiness gates. Do not convert first-party ownership into a shortcut around canonical identity or Marketplace Observed evidence.

---

## 23. ERC-8183 / x402 / B402 sequencing — PREVIOUS CORRECTION WAS TOO EARLY

### Foundation checkpoint

The foundational roadmap placed these rails after core activation/management/operator depth, while allowing them where semantics fit.

### v0.21

The v0.21 implementation report naturally identified commercial hiring as a remaining semantic gap. The first reconciliation therefore promoted ERC-8183/x402/B402 too close to the front of the roadmap.

### Assessment

Commerce remains necessary, especially because the current BNB Agent Studio ecosystem supports agent earning/hiring, but the rails should not outrank the more fundamental missing requirement: live first-class agent supply across all four categories.

### Corrective action

Move real reference-agent supply ahead of the generalized commercial kernel. Then integrate ERC-8183/x402/B402 through provider-neutral adapters against real services that actually expose those semantics.

---

## 24. Deterministic-vs-AI doctrine — ALIGNED

The recovered handoff states the rule explicitly: **AI explains. Deterministic systems decide.** Current financial data, Findings, readiness, matching, authority, execution guards and outcomes are deterministic. Preserve this separation when adding future explanation/personalization.

---

## 25. Partial-data / failure semantics — STRONGLY ALIGNED

The recovered handoff requires truthful `Could Not Assess`, `Insufficient History`, stale/undeclared/discovery-lead states and isolated upstream failure. Current protocol/data/discovery code repeatedly follows this philosophy. Preserve it in commerce and live reference-agent integrations.

---

## 26. Consumer information architecture — ALIGNED

The original `Home · Explore · Smart Money Check · My Agents` desktop model and mobile bottom navigation remain present. The product has not drifted into a permanent consumer sidebar. Operator tooling remains separable.

---

## 27. Visual/brand doctrine — ALIGNED IN DIRECTION

The current UI remains a premium dark graphite/charcoal financial interface with restrained teal accents and BNB yellow used for attribution. The exact teal value has evolved, but this is not material product drift. Preserve the no-casino/no-generic-AI styling rule.

---

# Corrective priorities

## P0 — preserve current trust/execution architecture

Do not roll back the evidence/readiness/authority/execution safety work already completed.

## P1 — complete public proof for four-category reference supply

The repository runtimes are publicly deployed and all four have passed Marketplace Test Lab. RangeKeeper has additionally been registered on BSC Testnet as ERC-8004 Agent ID `2017` and independently canonically verified by Spotriq. v0.22.2 adds the generic deployment-configured identity binding required to attach that proof to the stable first-party AgentService. Complete the same registration/binding for GridPilot, YieldPilot and VenusGuard without weakening the marketplace evidence/readiness contracts used for external agents.

## P2 — truthful commercial hiring + Activation kernel

Once real services exist, close the free-invocation vs hired/paid/activated gap using provider-neutral commerce adapters. ERC-8183/x402/B402 are integrations, not the domain model.

## P3 — four-category end-to-end parity

Bring Grid, Yield and Health through service selection, safe task/authority semantics, activation/runtime and category-appropriate activity/outcomes without inheriting Rebalancing-specific write authority.

## P4 — replace sample/reference UI progressively

Never use sample inventory as hidden fallback for missing live supply.

## P5 — generalized My Agents / monitoring / outcomes

Make the original post-activation product real across categories.

## P6 — Smart Money Plans

Only after individual specialist lifecycles are robust.

## P7 — operator workspace + production/submission hardening

Supply lifecycle, moderation, observability, incident response, rate limiting, Agent Advantage evidence, reconciliation and production-readiness controls.

---

# Final assessment

**The foundational handoff checkpoint confirms that Spotriq has veered mainly in roadmap sequence and category emphasis, not in its core truth/safety architecture.**

v0.12 and v0.13 followed the intended plan. v0.14–v0.21 then invested heavily in a sophisticated Rebalancing authority/execution spine before the planned four-reference-agent layer. v0.22 corrects that missing repository supply layer; public/Test Lab acceptance is now complete for all four and canonical ERC-8004 proof is complete for RangeKeeper. The remaining near-term correction is to bind RangeKeeper at service level and repeat ERC-8004 registration/binding for the other three, then build truthful commercial Activation and end-to-end parity for Grid, Yield and Health before another Rebalancing-only detour.

## v0.32 alignment note — BNB Agent Studio

v0.32 closes the earlier foundation gap that said Agent Studio should be a native ecosystem integration while remaining provider-normalized. Spotriq now accepts signed-operator Agent Studio deployment declarations and reconciles them against canonical ERC-8004 ownership, A2A registration and Marketplace Test Lab evidence. Studio-specific metadata remains Operator Supplied and cannot override readiness, payment, PermissionGrant, execution or outcome truth. No CLI custody or Studio wallet-secret handling was introduced.

## v0.33–v0.35 alignment note — explanation, value measurement and observability

v0.33 implemented the foundation rule **AI explains. Deterministic systems decide.** through bounded grounding packets, citation validation and deterministic fallback rather than delegating decision-grade state to a model.

v0.34 then added Agent Advantage reporting without introducing a universal performance score: service contribution, transaction evidence, financial outcome and Agent Advantage remain separate, and insufficient evidence remains `Could Not Assess`.

v0.35 continues the same doctrine for operations. Platform/runtime/provider health is a new observational plane, not a trust/readiness/financial authority. Public diagnostics are redacted, admin diagnostics fail closed behind an independent server-side secret, and AgentService runtime health is derived from persisted Marketplace Test Lab observations rather than arbitrary health-time endpoint probing. This closes part of the earlier production-hardening obligation without weakening marketplace evidence boundaries.


## v0.36 alignment note — hostile failure boundaries

v0.36 advances the foundation's production-hardening obligation without changing Spotriq's authority model. Untrusted operator/runtime/provider data is bounded before use; Marketplace Test Lab adds DNS-pinned public transport and redirect revalidation; BSC provider corruption/divergence is detected; payment and Activation races fail closed through database-backed uniqueness/idempotency claims.

Failure injection remains in deterministic tests/verifiers rather than becoming a production API. Operational degradation still does not equal marketplace unreadiness, financial unsafety or poor outcomes, and the hardening layer cannot create payment, PermissionGrant, execution or outcome truth.

## v0.37 alignment note — Production Hardening + Scale Readiness

v0.37 advances operational scale/readiness without changing product doctrine. Distributed abuse protection, migration serialization/checksums, queue leases/retries/dead-lettering, DB tuning and recovery runbooks remain operational infrastructure only. They do not create AgentService readiness, trust, payment, PermissionGrant, execution or outcome truth. Smart Money financial jobs remain `API_INLINE`, and BSC Mainnet financial execution remains prohibited without explicit approval.
