# Spotriq v0.28.0 — My Agents + Switching/Revocation + Marketplace UX Completion

## Goal

Replace mock buyer-agent management with a real portfolio over Spotriq commercial, authority, runtime and outcome resources, while adding safe same-category relationship switching and live marketplace profile/compare/try surfaces.

## Implemented

- `@spotriq/my-agents` engine and memory/PostgreSQL store.
- `MyAgentsPortfolio`, `MyAgentPortfolioItem`, `MyAgentAlternative`, `MyAgentSwitchRecord` domain types.
- migration `0021_my_agents_switching.sql`.
- buyer portfolio, switch history, switch and safe revoke APIs.
- buyer-scoped switch idempotency with changed-input conflict protection.
- active reconciled PermissionGrant blocks switch/revoke.
- replacement Activation before source revocation.
- live My Agents web page.
- live Agent Profile / Compare / Marketplace Test Lab Try pages.
- new capability flags and `verify:my-agents` production acceptance contract.

## Safety invariants

`Commercial relationship ≠ PermissionGrant`

`Switch ≠ revoke PermissionGrant`

`Runtime observation ≠ financial performance`

`Missing outcome evidence = Could Not Assess`

Current switch execution is limited to truthful same-category/same-network FREE read-only replacement offers. Broader paid/financial switching remains a later milestone.

## Release gate

`pnpm --filter @spotriq/api build → pnpm check → migration 0021 → Railway deploy → all prior production regressions → pnpm verify:my-agents`
