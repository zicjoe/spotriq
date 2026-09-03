# Spotriq v0.39.0 — Production Analytics + Adoption Feedback Loop

## Status

Externally accepted. Local build/check, migration/deployment, prior regressions and `pnpm verify:adoption-analytics` passed before the production-testing handoff.

## Implemented

- `@spotriq/adoption-analytics` with allow-listed event/feedback vocabulary.
- SHA-256 browser-session pseudonymization and raw-wallet rejection.
- `PRODUCT` vs `ACCEPTANCE` traffic separation.
- Migration `0031_production_adoption_analytics.sql`.
- Public bounded ingestion routes for interaction and feedback events.
- Bearer-protected private analytics report/export routes.
- Deterministic funnel measurement from existing domain tables for lifecycle completion.
- Agent Advantage coverage without inferring benefit.
- Operator/supply/Test Lab/Agent Studio adoption counts.
- Hidden web admin analytics view (`?admin=analytics`) and contextual feedback prompts.
- `pnpm verify:adoption-analytics` live gate.
- `pnpm capture:adoption-baseline` private production measurement capture.

## Invariants

`Analytics event ≠ Quote ≠ Hire ≠ Activation ≠ PermissionGrant ≠ transaction ≠ outcome ≠ Agent Advantage`

Analytics cannot upgrade readiness, trust, payment, permission, execution or financial outcome state.

BSC Mainnet financial execution remains unapproved.
