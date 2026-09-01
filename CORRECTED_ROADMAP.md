# Spotriq Corrected Roadmap

**Reconciled:** 2026-09-01  
**Current implementation:** v0.26.0  
**Current milestone:** Four-Category Financial Execution Adapter Parity

This roadmap preserves deterministic evidence, domain separation, four-category parity and testnet-first financial authority. Missing prerequisites block; they are never fabricated.

## Roadmap rule

`Payment ≠ Permission ≠ Activation ≠ Execution ≠ Outcome`

Every financial write must have explicit scope, independently reconciled authority, exact protocol/action/argument guards, fresh-state checks and a non-bypassable dispatch boundary. Mainnet financial execution requires explicit approval.

## v0.22.0–v0.22.2 — Live Four-Category Reference Agent Supply + External Acceptance

**Status: COMPLETE / externally accepted.**

Four first-party deterministic A2A services are public, Test Lab accepted and canonically reconciled to BSC Testnet ERC-8004 identities.

## v0.23.0 — Commercial Hiring + Marketplace Activation Kernel

**Status: COMPLETE / externally accepted.**

`AgentService → FREE Offer → immutable Quote → idempotent Hire → Payment NOT_REQUIRED → ACTIVE read-only MarketplaceActivation`

Commercial Activation remains distinct from Permission and Execution.

## v0.24.0 — Four-Category End-to-End Activation Parity

**Status: COMPLETE / externally accepted.**

All four categories have a real read-only post-Activation runtime path with control profiles, category-specific ServiceTasks, truthful runtime/monitoring/outcome state and marketplace relationship revocation.

## v0.25.0 — Permission Checkout + Scoped Financial Authority Parity

**Status: COMPLETE / externally accepted.**

Production acceptance passed all four current reference services through category-specific Permission Checkout. Each persisted an immutable `BLOCKED` ScopedPermissionRequest and created **no PermissionGrant**, because current services remain read-only/financially non-ready.

Four-category reviewed scope:

- Rebalancing — exact LP position + token spend/action/expiry bounds; existing Altana/JobIntent bridge only when real prerequisites pass.
- Grid — exact pool/capital asset + capital/per-action/frequency bounds.
- Yield — exact asset/allowed Venus markets + allocation/action bounds.
- Health — protective-write only (`REPAY` / `ADD_COLLATERAL`) + health trigger/intervention/frequency bounds.

## v0.26.0 — Four-Category Financial Execution Adapter Parity

**Status: IMPLEMENTATION CANDIDATE COMPLETE; local/Railway/live acceptance pending.**

### Goal

Install genuine category-specific deterministic execution adapters/guards without confusing “adapter exists” with “authority granted” or “transaction executed.”

### Rebalancing

Retain and reuse the existing sealed execution architecture. The v0.26 catalog delegates to the existing JobIntent → PermissionGrant → ExecutionPlan → Boundary → controlled-execution path rather than creating a second signer/guard.

### Grid

PancakeSwap V3 exact-input-single guard with exact reviewed pool/token pair, canonical router, buyer recipient, per-action/capital limits, non-zero minimum output, bounded deadline and fresh-state validation. Multi-hop/multicall/Permit2/unlimited approvals are excluded.

### Yield

Venus ERC-20 vToken `mint(uint256)` / `redeemUnderlying(uint256)` guard with exact allowlisted market/underlying and reviewed allocation/action limits. Borrowing/unrelated protocols/native-asset supply are excluded.

### Health

Venus protective `repayBorrow(uint256)` / add-collateral `mint(uint256)` only, with exact market/underlying, reviewed action, intervention cap, fresh health-trigger check and collateral-enabled requirement where appropriate. Borrow/withdraw are excluded.

### Safety boundary

Current RangeKeeper/GridPilot/YieldPilot/VenusGuard remain read-only. Therefore production acceptance must prove:

`adapter IMPLEMENTED → exact target scope PASS → service financial readiness FAIL and/or PermissionGrant FAIL → preflight BLOCKED → no prepared call for blocked current service → no signer → no transaction`

Rebalancing guard acceptance must delegate to its existing legacy boundary rather than duplicate it.

Migration: `0019_four_category_financial_execution_adapters.sql`.

Acceptance:

`API build → pnpm check → Railway migration 0019/deploy → v0.22/v0.23/v0.24/v0.25 regressions → verify:execution-adapter-parity → record acceptance`

## v0.27.0 — Four-Category Activity + Outcome Parity

**Next after v0.26 acceptance.**

Extend activity/reconciliation/outcome truth beyond Rebalancing. Technical execution success must remain distinct from financial outcome. Grid fills/PnL, Yield realised returns and Health protective effects require defensible evidence/time windows and explicit `Could Not Assess` handling.

## v0.28.0 — My Agents + Switching/Revocation + Marketplace UX Completion

Unify buyer commercial state, permission state, authority revocation, runtime/activity/outcomes, service switching and active-agent management. Complete remaining live Explore/Compare/Try/service-profile gaps without mock readiness/performance.

## v0.29.0 — Smart Money Plans + Compatibility/Conflict Handling

Compose findings/services into deterministic user-reviewable plans. `Plan ≠ Super-agent`; capital, authority, protocol and service conflicts must be explicit before execution.

## Later production milestones

- operator supply lifecycle/workspace;
- paid rails expansion, richer ERC-8183 and x402/B402;
- deeper Agent Studio integration;
- AI explanation only after deterministic truth;
- Agent Advantage measurement/reporting;
- observability, failure injection, security and production hardening;
- BSC Mainnet financial readiness only after explicit approval;
- canonical-front-door/judge portfolio/demo/submission evidence.
