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

## Acceptance hardening

The inherited v0.33 live verifier now validates the cryptographic self-consistency of both the grounding preview and the exact packet persisted with an explanation. It no longer assumes two separate SERVICE requests share an identical content hash, because marketplace readiness timestamps are intentionally recomputed as live deterministic evidence. This changes verifier correctness only; it does not weaken the grounded-AI contract. The verifier also reconstructs the original `grounded-ai.packet@1.0.0` schema insertion order before hashing a packet read back from PostgreSQL, because `jsonb` preserves values but not JSON object-key order while the accepted v0.33 packet hash used ordinary `JSON.stringify()` insertion order.
