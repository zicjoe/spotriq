# Spotriq v0.34.0 — Agent Advantage Measurement + Report

## Scope

Implemented deterministic Agent Advantage reporting over existing Activation Activity & Outcomes without weakening the v0.27 truth boundary.

## Added

- `@spotriq/agent-advantage` engine and memory/PostgreSQL stores;
- explicit Activation measurement windows;
- source-fingerprint idempotency;
- separate service-contribution, transaction-evidence, financial-outcome and Agent-Advantage states;
- migration `0027_agent_advantage_reports.sql`;
- status, sync, latest, Activation history and buyer history API routes;
- My Agents Agent Advantage UI;
- deterministic tests for no-transaction, transaction-only, missing-evidence, insufficient-history, idempotency and revocation-window cases;
- `pnpm verify:agent-advantage`;
- architecture regression guards and v0.34 capability flags.

## Locked truth boundary

`Runtime success ≠ transaction success ≠ financial outcome ≠ Agent Advantage`

A standardized Agent Advantage metric must carry evidence and be paired with attributable transaction/outcome state before the report may say `MEASURED`. Otherwise it remains `Could Not Assess` or `Insufficient History`.

## Acceptance status

Implementation candidate only until dependency-aware local checks, Railway migration/deploy, accepted regression verifiers through v0.33, and `pnpm verify:agent-advantage` pass against production.
