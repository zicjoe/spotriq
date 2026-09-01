# Spotriq Source of Truth

**Current repository release:** **v0.29.0**  
**Release status:** Smart Money Plans + Compatibility/Conflict Handling implementation candidate; v0.28 externally accepted; local dependency-aware validation and external v0.29 acceptance pending.  
**State date:** 2026-09-01

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

## v0.29 implementation truth

New package: `@spotriq/smart-money-plans`.

A Smart Money Plan is a persisted, buyer-scoped review object built from specific live Smart Money findings and deterministic Finding → AgentService matches. It records every member independently and never creates shared commercial, authority or execution state.

Compatibility/conflict handling includes asset/capital overlap, protocol overlap, active PermissionGrant overlap, service readiness, network mismatch, stale findings, existing relationships and accidental multi-role service composition.

Only genuine contradictions block. Reviewable overlaps remain warnings or informational facts rather than being hidden or treated as universal risk scores.

Latest migration: `0022_smart_money_plans.sql`.

New acceptance: `pnpm verify:smart-money-plans`.

## Network truth

- Marketplace discovery may use BSC Mainnet `56`.
- Reference identity/authority/execution acceptance uses BSC Testnet `97`.
- Mainnet financial execution remains prohibited until explicitly approved.

## Next milestone after v0.29 acceptance

**v0.30 — Operator Supply Lifecycle + Workspace.**
