# Spotriq v0.17.0 Implementation Report

## Milestone
Reviewed Rebalancing Execution Plan + Non-Bypassable Financial Execution Boundary.

## Implemented
- Added owner-context read-only BSC `eth_call` support and PancakeSwap V3 `decreaseLiquidity` expected-output simulation.
- Added `@spotriq/execution-plans` with deterministic three-step V3 plan construction, explicit target-range review, quote freshness, exact calldata/call hashes and persistence.
- Upgraded the V3 calldata guard so reviewed decrease-liquidity minimums can be checked against independent quote evidence and mint can be accepted only for the exact reviewed replacement range.
- Added `@spotriq/execution-boundary` with exact sealed plan/call hashes, authenticated-proposer-only external agent role, boundary-controlled/unprovisioned signer state, exact-call authorization checks and fresh LP/quote preflight.
- Connected reviewed plan/boundary state back into bounded-authority prerequisites. Completing the three safety prerequisites leads to `BOUNDARY_SIGNER_REQUIRED`, never activation.
- Added API routes for plan prepare/read/review, boundary seal/read and preflight.
- Added live Job Intent UI for replacement-range preparation, review, boundary sealing and fresh preflight.
- Added migration `0011_rebalancing_execution_plan_boundary.sql`.

## Security invariants
- No browser-supplied LP identity replaces the persisted Job Intent context.
- No fabricated quote is used if live simulation fails.
- The external AgentService proposal key is never treated as a financial signing key.
- Only a `REVIEWED/PASS` exact plan can be sealed.
- `executionEligible` stays false throughout v0.17.
- No execute/send-transaction endpoint exists.

## Validation performed in the build environment
- Strict TypeScript checks: domain, chain, PancakeSwap adapter, execution guard, execution plan, execution boundary, authority and API contracts passed with validation-only dependency stubs where required.
- Execution plan tests: 3/3 passed.
- Execution boundary tests: 3/3 passed.
- Authority tests: 12/12 passed, including plan/boundary prerequisite transitions.
- Final structural verifier and syntax/archive checks are run before release packaging.

## Environment limitation
The build sandbox does not have the repository's real installed pnpm dependency tree and cannot reach npm. Full `pnpm check` must therefore be rerun locally after `pnpm install`.

## Next
v0.18.0 — Boundary-Controlled Altana Financial Session on BSC Testnet.
