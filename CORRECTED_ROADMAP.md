# Spotriq Corrected Roadmap

**Reconciled:** 2026-09-01  
**Current implementation:** v0.25.0  
**Current milestone:** Permission Checkout + Scoped Financial Authority Parity

This roadmap preserves the accepted evidence/readiness/commerce/runtime architecture while correcting the earlier sequence drift that made Rebalancing much deeper than Grid, Yield and Health. The explicit v0.25 approval in the current engineering continuation supersedes the stale earlier label that had assigned v0.25 to Explore/profile polish.

## Roadmap rule

Every milestone must preserve domain separation, deterministic truth/evidence, four-category parity, testnet-first financial authority and the real user lifecycle. Missing prerequisites must block rather than be fabricated.

## v0.22.0–v0.22.2 — Live Four-Category Reference Agent Supply + External Acceptance

**Status: COMPLETE / externally accepted.**

All four first-party deterministic A2A reference services are public, Test Lab accepted and canonically reconciled to BSC Testnet ERC-8004 identities. Financial readiness remains `TESTNET_ONLY`.

## v0.23.0 — Commercial Hiring + Marketplace Activation Kernel

**Status: COMPLETE / externally accepted.**

Accepted path:

`AgentService → FREE Offer → immutable Quote → idempotent Hire → Payment NOT_REQUIRED → ACTIVE read-only MarketplaceActivation`

Commercial Activation remains distinct from Permission and Execution.

## v0.24.0 — Four-Category End-to-End Activation Parity

**Status: COMPLETE / externally accepted.**

On 2026-09-01 production passed:

- `verify:reference-acceptance`;
- `verify:commercial-acceptance`;
- `verify:activation-parity`.

All four categories now have a real read-only post-Activation runtime path with scoped controls, category-specific ServiceTasks, truthful runtime/monitoring/outcome state and marketplace relationship revocation.

## v0.25.0 — Permission Checkout + Scoped Financial Authority Parity

**Status: IMPLEMENTATION CANDIDATE COMPLETE; local/Railway/live acceptance pending.**

### Goal

Answer the user question:

> What exactly am I allowing this agent to do with my money?

without confusing commercial Activation, reviewed scope, provider grant or execution.

### Domain

`PermissionProfile ≠ PermissionCheckout ≠ ScopedPermissionRequest ≠ PermissionGrant`

`PermissionGrant ≠ Execution`

### Four-category reviewed scope

- **Rebalancing:** exact position + token0/token1 spend caps + action/expiry/approval bounds. May bridge to the existing JobIntent/Altana permission spine only when all real prerequisites pass.
- **Grid:** exact pool/capital asset + capital/per-action/action-count bounds. Provider submission remains blocked until a genuine bounded Grid execution adapter and argument guard exist.
- **Yield:** exact asset + optional allowed Venus markets + allocation/action bounds. Provider submission remains blocked until bounded supply/withdraw/reallocation execution exists.
- **Health:** protective-write tier only (`REPAY` / `ADD_COLLATERAL`) + health trigger/intervention/frequency bounds. Borrowing and collateral withdrawal are explicitly denied; provider submission remains blocked until the protective-write adapter exists.

### Current reference-service acceptance truth

All four current reference services are still `READ_ONLY` / `TESTNET_ONLY`. A successful v0.25 acceptance therefore proves:

`ACTIVE read-only Activation → BLOCKED PermissionCheckout → immutable BLOCKED ScopedPermissionRequest → no PermissionGrant`

with exact service/readiness/category blockers. This is intentional safety behavior.

### Persistence/API/UX

Migration `0018_permission_checkout_scoped_authority.sql`; `@spotriq/permission-checkout`; buyer permission state; category checkout/review/confirm/cancel/reconcile routes; real API-backed Permission Checkout UX replacing the old mock checkout.

### Acceptance

`API build → pnpm check → Railway migration 0018/deploy → v0.22 regression → v0.23 regression → v0.24 regression → verify:permission-checkout → record acceptance`

## v0.26.0 — Four-Category Financial Execution Adapter Parity

**Next after v0.25 acceptance.**

Build genuine category-specific guarded execution adapters for Grid/Yield/Health and connect only eligible services to PermissionGrant usage. Rebalancing remains the reference depth but its calldata/semantics are not copied blindly.

Expected work includes deterministic argument-level guards, exact protocol targets/actions, stale-state preflight, scoped signer/boundary integration, replay/idempotency safety and no mainnet execution without explicit approval.

## v0.27.0 — Four-Category Activity + Outcome Parity

Extend activity/reconciliation/outcome truth beyond Rebalancing. Technical success must remain distinct from financial outcome; Grid fills/PnL, Yield realised returns and Health protective effects require defensible evidence and time windows.

## v0.28.0 — My Agents + Switching/Revocation + Marketplace UX Completion

Unify buyer commercial state, permission state, authority revocation, runtime/activity/outcomes, service switching and active-agent management. Complete live Explore/Compare/Try/service-profile gaps without introducing mock readiness or performance.

## v0.29.0 — Smart Money Plans + Compatibility/Conflict Handling

Compose findings and specialist services into deterministic user-reviewable plans. `Plan ≠ Super-agent`; resolve authority/capital/protocol conflicts explicitly before any activation/execution.

## Later production milestones

- operator supply lifecycle/workspace;
- paid commercial rails expansion, richer ERC-8183 and x402/B402 adapters;
- deeper Agent Studio integration;
- AI explanation layer after deterministic truth exists;
- Agent Advantage measurement/reporting;
- observability, security/failure injection and production hardening;
- BSC Mainnet financial readiness only after explicit approval;
- canonical-front-door/judge portfolio/demo/submission evidence.
