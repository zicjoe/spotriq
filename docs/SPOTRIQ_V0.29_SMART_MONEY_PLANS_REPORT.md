# Spotriq v0.29.0 — Smart Money Plans + Compatibility/Conflict Handling

## Goal

Turn one wallet's deterministic Smart Money findings into a reviewable composition of specialist AgentServices while preventing the plan layer from becoming a hidden super-agent or shared financial authority.

## Implemented

- `@spotriq/smart-money-plans` domain/engine/store.
- PostgreSQL migration `0022_smart_money_plans.sql`.
- buyer/check/finding-bound idempotent plan creation.
- deterministic Finding → AgentService membership using existing marketplace matching.
- preference for an already-active compatible relationship.
- explicit network/readiness/asset/protocol/authority/service-role/staleness conflict report.
- severity model: BLOCK / WARN / INFO.
- API resources for create/get/list.
- live Smart Money Check → Build Plan UX.
- live buyer Plans page and plan profile.
- no live Activate Plan shortcut; each specialist remains independent.
- production verifier `verify:smart-money-plans`.

## Safety invariants

`Plan ≠ Super-agent`

`Plan membership ≠ Hire ≠ Activation ≠ PermissionGrant ≠ Execution`

A plan cannot create a signer, move funds or manufacture financial outcomes.

## Acceptance pending

`pnpm --filter @spotriq/api build → pnpm check → Railway migration 0022/deploy → accepted regression verifiers → pnpm verify:smart-money-plans`
