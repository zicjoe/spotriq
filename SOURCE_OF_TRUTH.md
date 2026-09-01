# Spotriq Source of Truth

**Current repository release:** **v0.28.0**  
**Release status:** My Agents + Switching/Revocation + Marketplace UX Completion implementation candidate; v0.27 externally accepted; local dependency-aware validation and external v0.28 acceptance pending.  
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

`wallet need → deterministic finding → AgentService → evidence/readiness → recommendation → Offer → Quote → Hire → Activation → Permission Checkout where needed → PermissionGrant where real → guarded execution where eligible → Activity → Outcome → Continue / Switch / Revoke`

Locked invariants include:

`Offer ≠ Quote ≠ Hire ≠ Payment ≠ Activation`

`PermissionProfile ≠ PermissionCheckout ≠ ScopedPermissionRequest ≠ PermissionGrant`

`Payment ≠ Permission ≠ Activation ≠ Execution ≠ Outcome`

`Transaction ≠ Outcome`

AI explains. Deterministic systems decide.

## Four categories

1. Rebalancing — RangeKeeper.
2. Grid Trading — GridPilot.
3. Yield Optimisation — YieldPilot.
4. Health Factor Monitoring — VenusGuard.

## Network truth

- Marketplace discovery may use BSC Mainnet `56`.
- Reference identity/authority/execution acceptance uses BSC Testnet `97`.
- Mainnet financial execution remains prohibited until explicitly approved.

## Accepted release truth

- **v0.22 ✅** four public reference runtimes/Test Lab/ERC-8004 canonical acceptance.
- **v0.23 ✅** four-category FREE commercial hiring/read-only Activation.
- **v0.24 ✅** four-category Activation/runtime/control/revocation parity.
- **v0.25 ✅** four-category Permission Checkout with no fabricated financial authority.
- **v0.26 ✅** four-category execution adapter/argument guard acceptance without unauthorized dispatch.
- **v0.27 ✅** four-category Activity + Outcome parity; unsupported financial outcomes remain `Could Not Assess`.

## v0.28 implementation truth

New package: `@spotriq/my-agents`.

My Agents is a buyer-scoped aggregation over existing resources. It does **not** create a universal status that collapses commercial, permission, runtime and outcome truth.

Switching rules:

- source Activation belongs to the buyer and is ACTIVE;
- target must differ from source;
- same category is required;
- current live switch path requires same BSC service chain plus truthful FREE/read-only terms;
- degraded/offline/suspended targets are blocked;
- independently reconciled PermissionGrant on the source blocks switching and direct relationship ending;
- replacement Activation is created first, then old marketplace Activation is revoked;
- switch records are persisted with buyer-scoped idempotency.

UX truth:

- My Agents uses the live buyer API;
- Agent Profile and Compare consume live MarketplaceService records;
- Try runs Marketplace Test Lab;
- sample portfolio returns/reviews are not presented as live buyer or service performance.

Latest migration: `0021_my_agents_switching.sql`.

New acceptance: `pnpm verify:my-agents`.

## Next milestone after v0.28 acceptance

**v0.29 — Smart Money Plans + Compatibility/Conflict Handling.**
