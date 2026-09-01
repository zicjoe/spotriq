# Spotriq Corrected Roadmap

**Reconciled:** 2026-09-01  
**Current implementation:** v0.29.0  
**Current milestone:** Smart Money Plans + Compatibility/Conflict Handling

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

**Status: IMPLEMENTATION CANDIDATE COMPLETE; local/Railway/live acceptance pending.**

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

Turn the currently illustrative operator workspace into a real provider workflow for service/listing lifecycle, commercial terms, runtime declarations, testing/evidence, suspension and readiness operations while preserving `AgentIdentity ≠ AgentListing ≠ AgentService ≠ Offer`.

## Later production milestones

- paid rails expansion, richer ERC-8183 and x402/B402;
- deeper Agent Studio integration;
- AI explanation only after deterministic truth;
- Agent Advantage measurement/reporting;
- observability, failure injection, security and production hardening;
- BSC Mainnet financial readiness only after explicit approval;
- canonical-front-door/judge portfolio/demo/submission evidence.
