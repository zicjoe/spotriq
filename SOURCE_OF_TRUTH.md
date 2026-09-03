# Spotriq Source of Truth

**Current repository release:** **v0.39.0**  
**Release status:** v0.39.0 Production Analytics + Adoption Feedback Loop externally accepted; production testing/adoption validation is active.  
**State date:** 2026-09-03

## Authority hierarchy

1. Current repository / latest replacement ZIP — implementation truth.
2. `PROJECT_STATE.md` — concise present state.
3. `SPOTRIQ_FOUNDATION.md` — locked product doctrine.
4. `PROJECT_OPERATING_RULES.md` — engineering workflow.
5. `CORRECTED_ROADMAP.md` — active milestone sequence.
6. `SPOTRIQ_DRIFT_AUDIT.md` — alignment history.
7. `docs/` — subsystem/release detail.
8. Old conversations — historical reasoning only.

## Product truth

Spotriq is a **BSC financial-agent marketplace**, not a generic agent marketplace or super-agent.

`wallet need → deterministic finding → AgentService → evidence/readiness → recommendation → Offer → Quote → Hire → Activation → Permission Checkout where needed → PermissionGrant where real → guarded execution where eligible → Activity → Outcome → Continue / Switch / Revoke / Plan`

Locked invariants include:

`Offer ≠ Quote ≠ Hire ≠ Payment ≠ Activation`

`PermissionProfile ≠ PermissionCheckout ≠ ScopedPermissionRequest ≠ PermissionGrant`

`Payment ≠ Permission ≠ Activation ≠ Execution ≠ Outcome`

`Plan ≠ Super-agent`

AI explains. Deterministic systems decide.

## Accepted release truth

- **v0.22 ✅** four public reference runtimes/Test Lab/ERC-8004 canonical acceptance.
- **v0.23 ✅** four-category FREE commercial hiring/read-only Activation.
- **v0.24 ✅** four-category Activation/runtime/control/revocation parity.
- **v0.25 ✅** four-category Permission Checkout with no fabricated financial authority.
- **v0.26 ✅** four-category execution adapter/argument guard acceptance without unauthorized dispatch.
- **v0.27 ✅** four-category Activity + Outcome parity; unsupported financial outcomes remain `Could Not Assess`.
- **v0.28 ✅** live My Agents + safe switching/revocation + live marketplace profile/compare/Test Lab UX.
- **v0.29 ✅** persisted Smart Money Plans + compatibility/conflict handling with independent specialist authority/execution.
- **v0.30 ✅** signed Operator Workspace + canonical ERC-8004 owner-gated supply lifecycle.
- **v0.31 ✅** paid ERC-8183/x402/B402 reconciliation with payment settlement dispatch disabled.
- **v0.32 ✅** normalized BNB Agent Studio integration with no CLI/readiness/payment/execution bypass.
- **v0.33 ✅** grounded AI explanations constrained to deterministic facts/citations with no decision or write authority.
- **v0.34 ✅** Agent Advantage Measurement + Report with explicit windows and no inferred financial benefit.
- **v0.35 ✅** Operational observability with redacted/non-authoritative health.
- **v0.36 ✅** Security + Failure Injection Hardening with fail-closed hostile-input/race/provider boundaries.
- **v0.37 ✅** Production Hardening + Scale Readiness with abuse controls, migration resilience and durable maintenance queueing.
- **v0.38 ✅** Ecosystem Adoption + Judge/Public Launch Readiness with public proof/evidence surfaces and mainnet execution still unapproved.
- **v0.39 ✅** Production Analytics + Adoption Feedback Loop with privacy-bounded telemetry, deterministic funnel reporting, feedback separation and private baseline capture.

## v0.29 accepted truth

New package: `@spotriq/smart-money-plans`.

A Smart Money Plan is a persisted, buyer-scoped review object built from specific live Smart Money findings and deterministic Finding → AgentService matches. It records every member independently and never creates shared commercial, authority or execution state.

Compatibility/conflict handling includes asset/capital overlap, protocol overlap, active PermissionGrant overlap, service readiness, network mismatch, stale findings, existing relationships and accidental multi-role service composition.

Only genuine contradictions block. Reviewable overlaps remain warnings or informational facts rather than being hidden or treated as universal risk scores.

Latest accepted-plan migration: `0022_smart_money_plans.sql`.

Accepted v0.29 gate: `pnpm verify:smart-money-plans`.

## Network truth

- Marketplace discovery may use BSC Mainnet `56`.
- Reference identity/authority/execution acceptance uses BSC Testnet `97`.
- Mainnet financial execution remains prohibited until explicitly approved.

## v0.30 accepted truth

New package: `@spotriq/operator-workspace`. Signed EIP-191 challenge/session authentication plus canonical ERC-8004 owner verification gates every operator write. Provider lifecycle/declarations and Operator Supplied evidence persist in migration `0023_operator_supply_lifecycle.sql`; Marketplace Test Lab evidence/readiness remain independent and cannot be overwritten by an operator.

New gate: `pnpm verify:operator-workspace`.

## v0.31 implementation truth

`@spotriq/payment-rails` provides x402 and B402 canonical BSC settlement reconciliation while the existing ERC-8183 observer remains independent of ERC-8004 identity. An HTTP/facilitator claim alone is never payment evidence: Spotriq requires a successful on-chain ERC-20 Transfer matching the immutable Quote buyer, pinned payee, token and exact raw amount after Hire acceptance. Payment signing/dispatch remains disabled.

Migration: `0024_paid_commercial_payment_rails.sql`. Acceptance: `pnpm verify:paid-rails`.


## v0.32 implementation truth

`@spotriq/agent-studio` normalizes BNB Agent Studio deployment declarations inside the signed Operator Workspace. Import requires an authenticated operator session, an existing operator-managed service and current canonical ERC-8004 ownership. Reconciliation separately checks A2A registration and Marketplace Test Lab evidence.

The integration is intentionally non-custodial and non-bypassable: no `bag` CLI execution, Studio wallet secret ingestion, marketplace readiness override, payment dispatch, PermissionGrant creation or financial execution dispatch.

Migration: `0025_agent_studio_integration.sql`. Acceptance: `pnpm verify:agent-studio`.


## v0.33 implementation truth

`@spotriq/grounded-explanations` builds deterministic fact packets downstream of existing Spotriq resources and optionally asks a structured-output model to explain them. Provider output is post-validated against known fact IDs, unsupported numeric/address tokens, and decision-grade language that must be supported by cited deterministic DECISION facts; invalid/unavailable provider output becomes a deterministic cited fallback. Provider code receives a cloned packet and cannot rewrite the authoritative grounding input.

The provider has no arbitrary prompt, web/tool access or write-back path. AI cannot change evidence, readiness, compatibility, payment, PermissionGrant, execution eligibility or outcomes.

Migration: `0026_grounded_ai_explanations.sql`. Acceptance: `pnpm verify:grounded-explanations`.

## v0.34 implementation truth

`@spotriq/agent-advantage` turns the existing Activation Activity & Outcomes bundle into persisted deterministic reports with explicit measurement windows. Reports keep service contribution, transaction evidence, financial outcome and Agent Advantage as separate facts.

Unchanged source facts are fingerprint-idempotent. Runtime success does not imply a transaction; transaction success does not imply financial advantage; a generally measured financial outcome does not become Agent Advantage unless an explicit standardized advantage metric carries evidence references. Missing evidence remains `Could Not Assess`.

Migration: `0027_agent_advantage_reports.sql`. Acceptance: `pnpm verify:agent-advantage`.

## v0.35 implementation truth

`@spotriq/observability` adds a deterministic operational plane covering API/database, BSC RPC/provider posture, Marketplace Test Lab/runtime freshness, payment-rail integration posture, Agent Studio posture and worker heartbeat state. Operational state is explicitly non-authoritative for marketplace readiness, trust, payment, permission, execution and outcomes.

Public API: `GET /v1/system/health`. The public projection is redacted and briefly cached. Admin diagnostics/history use bearer-authenticated `/v1/admin/observability` routes and fail closed when `SPOTRIQ_ADMIN_DIAGNOSTICS_TOKEN` is absent or invalid. Runtime health is derived from persisted Test Lab evidence rather than probing arbitrary operator endpoints during health requests.

Migration: `0028_operational_observability.sql`. Acceptance: `pnpm verify:observability`.

## v0.36 implementation truth

`@spotriq/security-hardening` centralizes public-network URL policy, untrusted-text normalization and structured provider-response budgets. Marketplace Test Lab performs public DNS validation and pinned outbound connections with redirect revalidation; BSC RPC responses are bounded, envelope/ID/method validated and cross-provider block divergence is surfaced operationally.

Operator/Agent Studio metadata is bounded before persistence. x402/B402 settlement evidence requires transaction/receipt/log/timestamp coherence, concurrent payment replay uniqueness conflicts fail closed as domain errors, and durable Activation idempotency claims close the pre-check/persist race. No production failure-injection endpoint is exposed.

Migration: `0029_security_failure_injection_hardening.sql`. Acceptance: `pnpm verify:security-hardening`.

## v0.37 implementation truth

`@spotriq/production-hardening` adds distributed PostgreSQL rate-limit buckets, a process-local degraded limiter fallback, conservative cache policy and a durable lease/retry/dead-letter maintenance queue. API request/body/connection budgets, trusted proxy hops and database pool/statement limits are configurable.

The migration runner now serializes deploy migrations through an advisory lock and tracks SHA-256 checksums so historical migration drift fails closed. Migration `0030_production_hardening_scale_readiness.sql` adds rate-limit/queue persistence plus targeted indexes. Worker maintenance uses the durable queue, while financial Smart Money execution remains `API_INLINE` and `workerFinancialJobDispatchEnabled=false`.

Operational backup/restore/deploy/rollback procedures are documented under `docs/runbooks/PRODUCTION_OPERATIONS.md`. No BSC Mainnet financial execution is enabled.

Acceptance: `pnpm verify:production-hardening`.

## v0.38 implementation truth

`@spotriq/adoption-readiness` builds the deterministic public adoption manifest exposed at `GET /v1/public/adoption`. The public manifest states product position, BSC Mainnet discovery vs BSC Testnet transactional policy, BNB/protocol integration roles, locked truth boundaries, proof endpoints and unresolved external launch artifacts.

The web product includes a public `Why Spotriq` BNB integration surface. `docs/public/` contains architecture/trust, BNB integration, demo, evidence, security, screenshot and submission packages. `pnpm capture:public-launch-evidence` records timestamped deployed public evidence without fabricating screenshots/video.

No schema migration is required. `bscMainnetFinancialExecutionApproved=false`; payment/category/worker financial dispatch boundaries remain disabled as before. Acceptance: `pnpm verify:adoption-readiness`.

## Post-v0.38 roadmap

Further engineering should be driven by measured adoption/production evidence or an explicitly approved BSC Mainnet financial-readiness program. Mainnet execution is not implicitly authorized by public-launch readiness.


## v0.39 implementation truth

`@spotriq/adoption-analytics` measures privacy-bounded product interaction and feedback while deterministic domain tables remain authoritative for completed marketplace/financial lifecycle stages. Browser analytics cannot manufacture Quote, Hire, Activation, PermissionGrant, transaction, outcome or Agent Advantage state.

Migration: `0031_production_adoption_analytics.sql`.

API: `POST /v1/analytics/events`, `POST /v1/analytics/feedback`, authenticated `GET /v1/admin/adoption-analytics`, and authenticated export.

Acceptance traffic is separated from real `PRODUCT` traffic. Raw wallet addresses are rejected from telemetry. Session IDs are SHA-256 hashed server-side.

New gate: `pnpm verify:adoption-analytics`. Private baseline capture: `pnpm capture:adoption-baseline`.
