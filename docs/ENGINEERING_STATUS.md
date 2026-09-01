# Spotriq Engineering Status

**Release candidate:** v0.31.0  
**Date:** 2026-09-01  
**State:** Paid Commercial Rails reconciliation implemented; v0.30 externally accepted; local dependency-aware validation and external v0.31 acceptance pending.

## Accepted baseline

Production acceptance is complete through v0.30.

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
