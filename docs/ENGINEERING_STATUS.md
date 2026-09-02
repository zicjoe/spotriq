# Spotriq Engineering Status

**Release candidate:** v0.35.0  
**Date:** 2026-09-02  
**State:** Observability + Marketplace/System Health implemented; v0.34 externally accepted; local dependency-aware validation and external v0.35 acceptance pending.

## Accepted baseline

Production acceptance is complete through v0.34.

## v0.29 package

`@spotriq/smart-money-plans`

Responsibilities:

- create buyer-scoped plans from actual Smart Money Check findings;
- preserve Finding → FindingServiceMatch → AgentService provenance;
- prefer a compatible already-active service when available;
- persist immutable/idempotent plan composition;
- detect network, readiness, asset/capital, protocol, authority and service-role conflicts;
- keep all member Activations/PermissionGrants/execution boundaries independent;
- never dispatch transactions or create a shared signer.

## Persistence

Migration `0022_smart_money_plans.sql` adds `smart_money_plans` with buyer-scoped idempotency and a deterministic composition hash.

## API

- `POST /v1/checks/:checkSessionId/plans`
- `GET /v1/plans/:planId`
- `GET /v1/accounts/:address/plans`

## Web

Live Smart Money Check results expose **Build Smart Money Plan**. The live plan profile displays specialist members, deterministic conflict severity/resolution and independent service review links. It intentionally provides no universal “Activate Plan” action.

The Plans page lists persisted live plans for the buyer wallet rather than the old template catalog.

## Capability truth

- `smartMoneyPlansEnabled = true`
- `planCompatibilityConflictHandlingEnabled = true`

These flags do not imply shared authority, shared execution, financial advice or mainnet readiness.

## Verification

Local:

`pnpm --filter @spotriq/api build`

`pnpm check`

Production regressions:

`verify:reference-acceptance → verify:commercial-acceptance → verify:activation-parity → verify:permission-checkout → verify:execution-adapter-parity → verify:activity-outcome-parity → verify:my-agents`

New v0.29 gate:

`pnpm verify:smart-money-plans`

The verifier uses a real Smart Money Check with at least one supported finding, persists a plan, proves exact retry idempotency, proves buyer history persistence and asserts `NO_SHARED_EXECUTION` plus independent Activation/authority modes.

## Next after acceptance

v0.30 — Operator Supply Lifecycle + Workspace.


## v0.30 operator package

`@spotriq/operator-workspace` provides replay-resistant signed challenge/session auth, canonical owner claims, lifecycle/declaration persistence, Operator Supplied evidence and owned-service Test Lab triggering. Migration `0023_operator_supply_lifecycle.sql`. Capability flags expose signed auth, canonical owner claim, supply lifecycle and Test Lab trigger independently. New production gate: `pnpm verify:operator-workspace`.


## v0.31 paid payment rails

`@spotriq/payment-rails` adds x402/B402 canonical BSC ERC-20 settlement reconciliation. The immutable Quote pins chain, token, raw amount and payee; reconciliation requires a successful post-Hire transaction with an exact matching Transfer log. Existing ERC-8183 observation remains job/escrow based.

API: `GET /v1/payment-rails/status`; commercial payment reconcile now accepts `transactionHash` for x402/B402.

Capabilities: `x402B402PaymentAdaptersEnabled = true`, `paidCommercialRailsReconciliationEnabled = true`, `paymentSettlementDispatchEnabled = false`.

Migration: `0024_paid_commercial_payment_rails.sql`. New production gate: `pnpm verify:paid-rails`.


## v0.32 Agent Studio integration

New package: `@spotriq/agent-studio`. Signed operators may import Studio deployment declarations for canonically owned services; PostgreSQL persistence uses migration `0025_agent_studio_integration.sql`.

API:
- `GET /v1/agent-studio/status`
- `GET /v1/operator/agent-studio/deployments`
- `POST /v1/operator/agent-studio/deployments`
- `POST /v1/operator/agent-studio/deployments/:deploymentId/reconcile`

Reconciliation covers canonical identity/owner, BSC network, Spotriq AgentService binding, parsed A2A registration, Marketplace Test Lab, declared Studio deploy verification, read-only MCP, commerce alignment and storage posture.

Capability truth: `agentStudioIntegrationEnabled = true`, `agentStudioDeploymentReconciliationEnabled = true`, `agentStudioCliDispatchEnabled = false`.

New production gate: `pnpm verify:agent-studio`.


## v0.33 Grounded AI Explanation Layer

New package: `@spotriq/grounded-explanations`. It constructs deterministic fact packets for SERVICE, FINDING, ACTIVATION, SMART_MONEY_PLAN and PERMISSION_REQUEST subjects, persists generated/fallback explanations via migration `0026_grounded_ai_explanations.sql`, and exposes status/grounding/explanation APIs.

The optional external provider uses structured output only. Provider claims are accepted only when citations resolve to packet fact IDs, numeric/address tokens are grounded by cited facts, and decision-grade language is supported by cited deterministic DECISION facts. Provider code receives a clone of the grounding packet. Provider failure or validation rejection falls back to deterministic cited copy.

Capability truth: `groundedAiExplanationEnabled = true`, structured output enabled, web search disabled, decision authority disabled.

New production gate: `pnpm verify:grounded-explanations`.


## v0.34 Agent Advantage Measurement + Report

New package: `@spotriq/agent-advantage`. It reconciles persisted Activation Activity & Outcomes into explicit-window Agent Advantage reports while preserving four independent dimensions: service contribution, transaction evidence, financial outcome and Agent Advantage.

Persistence: migration `0027_agent_advantage_reports.sql` stores source-fingerprint-idempotent report snapshots and buyer/Activation history.

API:
- `GET /v1/agent-advantage/status`
- `POST /v1/activations/:activationId/advantage-reports/sync`
- `GET /v1/activations/:activationId/advantage-reports/latest`
- `GET /v1/activations/:activationId/advantage-reports`
- `GET /v1/accounts/:address/advantage-reports`

Truth boundary: read-only runtime success may establish service contribution only. No transaction means Agent Advantage remains `Could Not Assess`. A transaction or generally measured outcome still cannot upgrade Agent Advantage without a standardized evidence-backed advantage metric.

Web: My Agents relationship/outcome surfaces expose a contextual deterministic Agent Advantage report with explicit window and next evidence step.

Capability truth: `agentAdvantageMeasurementEnabled = true`, `agentAdvantageReportHistoryEnabled = true`, `agentAdvantageFinancialInferenceEnabled = false`, `agentAdvantageTransactionSuccessImpliesAdvantage = false`.

New production gate: `pnpm verify:agent-advantage`.

Regression verifier hardening: the accepted v0.29 Smart Money Plans verifier still creates and idempotently re-reads a live plan when the supplied Smart Money Check has supported findings. If current market state produces no supported findings, it may instead verify an already persisted buyer plan from the accepted v0.29 lifecycle; it never fabricates findings merely to keep a regression check green.

Grounded-explanation regression hardening: persisted `grounded-ai.packet@1.0.0` payloads are stored in PostgreSQL `jsonb`, which does not preserve object-key order. The v0.33 production verifier therefore reconstructs the packet builder's accepted schema order before recomputing the SHA-256 content hash; this validates the exact persisted values without changing the accepted packet method or weakening integrity checks.


## v0.35 Observability + Marketplace/System Health

New package: `@spotriq/observability`.

Operational health is explicitly separate from marketplace readiness, trust, payment, permission, execution and outcome truth. Public `GET /v1/system/health` exposes redacted platform/marketplace component health. Bearer-protected `/v1/admin/observability` routes expose diagnostics and explicit persisted snapshot history only when `SPOTRIQ_ADMIN_DIAGNOSTICS_TOKEN` is configured.

The engine covers API request/error/latency posture, PostgreSQL, BSC RPC/provider health, persisted Marketplace Test Lab/runtime freshness, payment-rail posture, Agent Studio posture and worker heartbeat state. It does not probe arbitrary operator endpoints during a health request. Public health reads are briefly cached to reduce upstream amplification.

Persistence: `0028_operational_observability.sql` adds `operational_health_snapshots` and `operational_worker_heartbeats`.

Web: the shell shows a compact platform/marketplace indicator with the explicit label `Operational only — not an agent trust/readiness score.`

Capability truth:

- `operationalObservabilityEnabled = true`
- `publicSystemHealthEnabled = true`
- `adminDiagnosticsConfigured` reflects server configuration only
- `operationalHealthMarketplaceReadinessAuthority = false`
- `operationalHealthFinancialReadinessAuthority = false`

New production gate: `pnpm verify:observability`.

Current status: implementation candidate complete; do not record v0.35 externally accepted until dependency-aware local build/check, Railway migration/deployment, accepted regressions through v0.34 and the new observability verifier pass.

Next after acceptance: **v0.36 Security + Failure Injection Hardening**.
