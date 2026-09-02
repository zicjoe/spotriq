# Spotriq Corrected Roadmap

**Reconciled:** 2026-09-02  
**Current implementation:** v0.37.0  
**Current milestone:** Production Hardening + Scale Readiness

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

**Status: COMPLETE / externally accepted.**

Deterministic Spotriq resources are converted into bounded grounding packets for Findings, AgentServices, Activations, Smart Money Plans and ScopedPermissionRequests. Finding packets include deterministic match context where available; Activation packets include payment, authority, activity, transaction-observation and outcome truth. Optional AI may explain only those facts using structured output; every claim must cite known fact IDs, and decision-grade language must be backed by cited DECISION facts or the response falls back to deterministic cited text.

The explanation provider has no arbitrary user prompt, web/tool access or write-back path. It cannot decide or mutate financial truth, readiness, compatibility, payment, PermissionGrant state, execution eligibility or outcomes.

Migration: `0026_grounded_ai_explanations.sql`.

Acceptance: `API build → pnpm check → Railway migration 0026/deploy → v0.22–v0.32 regressions → verify:grounded-explanations → record acceptance`.

## v0.34.0 — Agent Advantage Measurement + Report

**Status: COMPLETE / externally accepted.**

Persist deterministic Activation-scoped Agent Advantage reports over explicit measurement windows. The report separately states service contribution, transaction evidence, financial outcome and Agent Advantage. Unchanged source facts are fingerprint-idempotent.

Current FREE read-only reference activations may truthfully show service contribution while financial outcome and Agent Advantage remain `Could Not Assess`. Transaction success never becomes financial advantage automatically, and a measured financial outcome still requires a standardized evidence-backed advantage metric before the Agent Advantage field may become `MEASURED`.

Migration: `0027_agent_advantage_reports.sql`.

Acceptance: `API build → pnpm check → Railway migration 0027/deploy → v0.22–v0.33 regressions → verify:agent-advantage → record acceptance`. **Passed.**

## v0.35.0 — Observability + Marketplace/System Health

**Status: COMPLETE / externally accepted.**

Add structured operational visibility for API/database, BSC RPC/provider degradation, Marketplace Test Lab, known AgentService runtime freshness, payment adapters, Agent Studio and worker/job posture without converting operational health into marketplace trust or financial readiness.

Public `GET /v1/system/health` is redacted and non-authoritative. Bearer-protected admin diagnostics/history fail closed when not configured. Runtime status is derived from persisted Test Lab observations rather than arbitrary endpoint probing. Worker heartbeat freshness is operational evidence only and does not prove individual job success.

Migration: `0028_operational_observability.sql`.

Acceptance: `API build → pnpm check → Railway migration 0028/deploy → v0.22–v0.34 regressions → verify:observability → record acceptance`. **Passed.**

## v0.36.0 — Security + Failure Injection Hardening

**Status: COMPLETE / externally accepted.**

Harden hostile failure boundaries without creating a production chaos control plane. Shared public-network URL policy, DNS-pinned/revalidated Test Lab requests, bounded Agent Card/provider payloads, BSC JSON-RPC validation/failover/divergence detection, malicious operator/Studio metadata validation, payment replay-race handling and durable Activation idempotency claims preserve fail-closed semantics under adversarial input and partial provider failure.

Migration: `0029_security_failure_injection_hardening.sql`.

Acceptance: `API build → pnpm check → Railway migration 0029/deploy → v0.22–v0.35 regressions → verify:security-hardening → record acceptance`.

## v0.37.0 — Production Hardening + Scale Readiness

**Status: IMPLEMENTATION CANDIDATE COMPLETE; local/Railway/live acceptance pending.**

Adds bounded request/body/connection budgets, trusted-proxy configuration, distributed PostgreSQL rate limiting with local degraded fallback, conservative cache/security headers, DB pool tuning, migration advisory locking/checksum drift detection, targeted indexes, a durable lease/retry/dead-letter maintenance queue, graceful worker drain and production backup/restore/deployment runbooks. Financial Smart Money jobs remain `API_INLINE`; worker financial dispatch remains disabled.

Migration: `0030_production_hardening_scale_readiness.sql`.

Acceptance: `API build → pnpm check → Railway migration 0030/deploy → v0.22–v0.36 regressions → verify:production-hardening → record acceptance`.

## v0.38 — Ecosystem Adoption + Judge/Public Launch Readiness

**Status: NEXT after v0.37 acceptance.**

Polish public README/docs, architecture/adoption evidence, demo playbook, deployment screenshots/proofs and BNB ecosystem adoption package. This milestone does not approve BSC Mainnet financial execution.

## Later production milestones

- BSC Mainnet financial readiness only after explicit approval;
- further scale work driven by measured production load, not speculative complexity.
