# Spotriq v0.33.0 Implementation Report — Grounded AI Explanation Layer

## Scope

v0.33 introduces grounded explanation as a downstream presentation capability after deterministic Spotriq truth. It does not introduce an AI decision engine.

## Implemented

- `@spotriq/grounded-explanations` domain/engine package.
- deterministic grounding packets for Finding, AgentService, Activation, Smart Money Plan and ScopedPermissionRequest subjects, including deterministic match context on Findings and payment reconciliation on Activations;
- stable fact IDs with provenance, timestamps, method/evidence references and limitations;
- optional OpenAI Responses provider using strict structured JSON output, `store:false`, no tools and no web search;
- post-generation citation, unsupported-token and decision-grade semantic validation;
- deterministic cited fallback when no provider is configured, a provider fails, or generated claims fail validation;
- PostgreSQL explanation persistence via migration `0026_grounded_ai_explanations.sql`;
- public explanation status/grounding/create/read APIs;
- evidence-grounded UI panels on live services, Smart Money Plans, Smart Money Check findings, Permission Checkout and My Agents Activation/activity/outcome state;
- `verify:grounded-explanations` live acceptance contract;
- explicit capabilities proving AI has no decision or write authority.

## Locked boundary

AI cannot alter financial truth, Marketplace readiness, compatibility, payment evidence, PermissionGrant state, execution eligibility or outcome state. Missing/partial deterministic data remains missing/partial; explanation must preserve `Could Not Assess`, blockers and limitations.

## Acceptance sequence

`pnpm --filter @spotriq/api build → pnpm check → Railway migration 0026/deploy → prior regression verifiers → pnpm verify:grounded-explanations`
