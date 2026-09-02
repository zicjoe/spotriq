# Spotriq Project State

**Current implementation release:** v0.38.0  
**Implementation status:** Ecosystem Adoption + Judge/Public Launch Readiness implemented as an acceptance candidate; v0.37 is externally accepted; dependency-aware local/Railway/live v0.38 acceptance pending.  
**Last state update:** 2026-09-02  
**Repository role:** concise present-state map; current repository remains implementation truth.

## Product position

Spotriq is a **BSC financial-agent marketplace**. It helps a wallet understand financial needs, discover and evaluate specialist AgentServices, hire/activate them, review scoped authority, observe runtime/execution state, measure only defensible outcomes, understand those outcomes, and decide whether to continue, switch, revoke or compose independent specialists into a reviewable plan.

Locked separations remain:

`Payment ≠ Permission ≠ Activation ≠ Execution ≠ Outcome`

`Service contribution ≠ Transaction ≠ Financial outcome ≠ Agent Advantage`

`Operational health ≠ marketplace readiness ≠ trust ≠ payment ≠ permission ≠ execution ≠ outcome`

`Production scalability ≠ financial authority ≠ mainnet execution approval`

`Agent Studio deployment ≠ canonical identity ≠ readiness ≠ payment ≠ permission ≠ execution ≠ outcome`

`Plan ≠ Super-agent`

**AI explains. Deterministic systems decide.**

## Externally accepted baseline

- **v0.22 ✅** Four reference runtimes + Test Lab + canonical BSC Testnet ERC-8004 acceptance.
- **v0.23 ✅** Commercial FREE Offer → Quote → Hire → Activation.
- **v0.24 ✅** Four-category runtime/control parity.
- **v0.25 ✅** Permission Checkout parity.
- **v0.26 ✅** Four-category execution-adapter parity.
- **v0.27 ✅** Activity + Outcome parity.
- **v0.28 ✅** My Agents + switching/revocation + marketplace UX.
- **v0.29 ✅** Smart Money Plans + deterministic conflict handling.
- **v0.30 ✅** Operator Workspace + canonical owner gating.
- **v0.31 ✅** ERC-8183/x402/B402 paid reconciliation.
- **v0.32 ✅** BNB Agent Studio normalized integration.
- **v0.33 ✅** Grounded AI Explanation Layer.
- **v0.34 ✅** Agent Advantage Measurement + Report.
- **v0.35 ✅** Observability + Marketplace/System Health.
- **v0.36 ✅** Security + Failure Injection Hardening.
- **v0.37 ✅** Production Hardening + Scale Readiness.

## Current architecture

- `apps/web` — React/Vite marketplace UX plus public BNB/adoption explanation surface.
- `apps/api` — Fastify API including `GET /v1/public/adoption`.
- `apps/worker` — operational maintenance queue consumer; financial Smart Money jobs remain `API_INLINE`.
- PostgreSQL migrations `0001`–`0030`; v0.38 requires no schema migration.
- Existing deterministic BSC/DeFi/marketplace/commercial/permission/execution/outcome/operator/AI/observability/security/production packages remain intact.
- `@spotriq/adoption-readiness` — deterministic public adoption manifest and launch-package truth.

## Current v0.38 implementation truth

v0.38 packages the accepted product for ecosystem/judge/public scrutiny without inventing proof:

- machine-readable `GET /v1/public/adoption` manifest;
- visible web `Why Spotriq` / BNB integration surface;
- polished public architecture and trust-boundary documentation;
- BNB ecosystem integration brief covering BSC, ERC-8004, BNB Agent Studio, ERC-8183, x402/B402, PancakeSwap and Venus;
- judge/ecosystem demo playbook;
- adoption evidence guide and production screenshot checklist;
- security/operations public brief plus root `SECURITY.md`;
- submission checklist that keeps external URLs/video/screenshots explicit rather than fabricated;
- `pnpm capture:public-launch-evidence` to archive timestamped live public API proof after deployment;
- `pnpm verify:adoption-readiness` live acceptance gate.

Network truth remains:

- BSC Mainnet `56` may be used for real ERC-8004 discovery;
- BSC Testnet `97` remains transactional/authority/reference-agent development;
- `bscMainnetFinancialExecutionApproved = false`.

## Current validation state

Authoritative local gate:

`pnpm --filter @spotriq/api build → pnpm check`

Externally accepted regression verifier chain through v0.37 remains required before the v0.38 gate.

v0.38 must not be recorded externally accepted until local checks, deployment, prior regressions and `pnpm verify:adoption-readiness` pass against the deployed API.

## Next milestone after v0.38 acceptance

The core roadmap through production/adoption readiness is complete. Any next engineering milestone should be driven by **measured production/adoption feedback** or by a separately approved **BSC Mainnet financial-readiness** program. Mainnet financial execution must not be enabled implicitly.
