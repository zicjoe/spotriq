# Spotriq Corrected Roadmap

**Reconciled:** 2026-09-01  
**Current implementation:** v0.33.0  
**Current milestone:** Grounded AI Explanation Layer

This roadmap preserves deterministic evidence, domain separation, four-category parity and testnet-first financial authority. Missing prerequisites block; they are never fabricated.

## Roadmap rule

`Payment ≠ Permission ≠ Activation ≠ Execution ≠ Outcome`

`Plan ≠ Super-agent`

Every financial write must have explicit scope, independently reconciled authority, exact protocol/action/argument guards, fresh-state checks and a non-bypassable dispatch boundary. Mainnet financial execution requires explicit approval.

## v0.22.0–v0.22.2 — Live Four-Category Reference Agent Supply + External Acceptance

**Status: COMPLETE / externally accepted.**

## v0.23.0 — Commercial Hiring + Marketplace Activation Kernel

**Status: COMPLETE / externally accepted.**

`AgentService → FREE Offer → immutable Quote → idempotent Hire → Payment NOT_REQUIRED → ACTIVE read-only MarketplaceActivation`

## v0.24.0 — Four-Category End-to-End Activation Parity

**Status: COMPLETE / externally accepted.**

## v0.25.0 — Permission Checkout + Scoped Financial Authority Parity

**Status: COMPLETE / externally accepted.**

## v0.26.0 — Four-Category Financial Execution Adapter Parity

**Status: COMPLETE / externally accepted.**

## v0.27.0 — Four-Category Activity + Outcome Parity

**Status: COMPLETE / externally accepted.**

## v0.28.0 — My Agents + Switching/Revocation + Marketplace UX Completion

**Status: COMPLETE / externally accepted.**

Buyer My Agents is live; switching/revocation are persisted and fail closed around independently active PermissionGrants; profile/compare/Try use live marketplace/Test Lab truth.

## v0.29.0 — Smart Money Plans + Compatibility/Conflict Handling

**Status: COMPLETE / externally accepted.**

### Goal

Compose actual Smart Money findings into a deterministic user-reviewable set of specialist AgentServices without creating a shared agent, signer, authority grant or execution session.

### Plan boundaries

Each plan member preserves:

`Finding → FindingServiceMatch → AgentService → existing relationship/readiness`

A plan declares:

- `activationMode = INDEPENDENT_PER_SERVICE`
- `authorityMode = INDEPENDENT_PER_SERVICE`
- `executionMode = NO_SHARED_EXECUTION`

### Deterministic conflicts

- missing compatible service;
- wrong BSC network;
- unavailable/degraded/suspended service;
- shared asset/capital scope;
- shared protocol scope;
- overlapping independently reconciled financial authority;
- accidental same-service multi-role composition;
- already-active relationship;
- stale finding context.

True contradictions are BLOCK. Review-required overlap is WARN. Useful non-blocking context is INFO.

Migration: `0022_smart_money_plans.sql`.

Acceptance:

`API build → pnpm check → Railway migration 0022/deploy → v0.22–v0.28 regressions → verify:smart-money-plans → record acceptance`

## v0.30.0 — Operator Supply Lifecycle + Workspace

**Status: COMPLETE / externally accepted.**

Real provider workflow with signed operator authentication and canonical ERC-8004 ownership gating. Operators can persist service lifecycle/declarations, HTTPS runtime endpoints, commercial/permission declarations, Operator Supplied evidence and trigger Marketplace Test Lab. Operator state may make availability stricter but cannot force marketplace readiness, financial authority, execution or outcomes.

Migration: `0023_operator_supply_lifecycle.sql`.

Acceptance: `API build → pnpm check → Railway migration 0023/deploy → v0.22–v0.29 regressions → verify:operator-workspace → record acceptance`.


## v0.31.0 — Paid Commercial Rails + ERC-8183 / x402 / B402 Reconciliation

**Status: COMPLETE / externally accepted.**

Provider-neutral paid reconciliation extends the v0.23 commercial kernel without merging payment into Hire or Activation. ERC-8183 observes canonical job/escrow state. x402/B402 require immutable Quote payment metadata plus a canonical BSC settlement transaction whose ERC-20 Transfer exactly matches buyer, pinned payee, token and raw amount. Browser/facilitator `paid` assertions are insufficient.

Payment settlement signing/broadcast remains disabled. BSC Mainnet payment/financial dispatch remains unapproved.

Migration: `0024_paid_commercial_payment_rails.sql`.

Acceptance: `API build → pnpm check → Railway migration 0024/deploy → v0.22–v0.30 regressions → verify:paid-rails → record acceptance`.

## v0.32.0 — Deeper BNB Agent Studio Integration

**Status: COMPLETE / externally accepted.**

Signed operators can normalize Studio deployment declarations for canonically owned ERC-8004 services. Spotriq reconciles identity/owner, A2A registration, network, service binding, Marketplace Test Lab, declared Studio deploy verification, read-only MCP posture, commerce alignment and storage posture.

Studio remains an adapter: `Agent Studio deployment declaration ≠ canonical identity ≠ readiness ≠ payment ≠ PermissionGrant ≠ execution ≠ outcome`. Spotriq does not shell out to `bag`, store Studio wallet secrets, override readiness, or dispatch payments/financial execution.

Migration: `0025_agent_studio_integration.sql`.

Acceptance: `API build → pnpm check → Railway migration 0025/deploy → v0.22–v0.31 regressions → verify:agent-studio → record acceptance`.


## v0.33.0 — Grounded AI Explanation Layer

**Status: IMPLEMENTATION CANDIDATE COMPLETE; local/Railway/live acceptance pending.**

Deterministic Spotriq resources are converted into bounded grounding packets for Findings, AgentServices, Activations, Smart Money Plans and ScopedPermissionRequests. Optional AI may explain only those facts using structured output; every claim must cite known fact IDs and unsupported claims fall back to deterministic cited text.

The explanation provider has no arbitrary user prompt, web/tool access or write-back path. It cannot decide or mutate financial truth, readiness, compatibility, payment, PermissionGrant state, execution eligibility or outcomes.

Migration: `0026_grounded_ai_explanations.sql`.

Acceptance: `API build → pnpm check → Railway migration 0026/deploy → v0.22–v0.32 regressions → verify:grounded-explanations → record acceptance`.

## v0.34.0 — Agent Advantage Measurement + Report

**Status: NEXT after v0.33 acceptance.**

Measure whether an activated specialist actually helped using defensible activity/outcome evidence and explicit time windows. Unsupported financial-performance claims remain `Could Not Assess`; technical success never becomes financial benefit automatically.

## Later production milestones

- Agent Advantage measurement/reporting;
- observability, failure injection, security and production hardening;
- BSC Mainnet financial readiness only after explicit approval;
- canonical-front-door/judge portfolio/demo/submission evidence.
