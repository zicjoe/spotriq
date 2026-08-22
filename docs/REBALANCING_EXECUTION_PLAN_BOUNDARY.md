# Rebalancing Execution Plan and Financial Execution Boundary

## Purpose
v0.17 turns a reviewed PancakeSwap V3 Rebalancing Job Intent into exact, inspectable calldata without giving an external AgentService a financial signing key.

## Trust model
The selected AgentService is an **authenticated proposer only**. Its Marketplace Observed service key proves proposal identity; it is not the wallet/session key that will eventually move funds. A future Altana financial session must be controlled by the Spotriq execution boundary.

## Plan lifecycle
1. Reload the persisted Job Intent and bounded PermissionRequest.
2. Refresh the exact V3 LP position and verify owner, Position Manager, pair and fee tier.
3. Require a user-proposed replacement range aligned to observed tick spacing and containing the current pool tick.
4. Simulate full `decreaseLiquidity` with an owner-context, block-specific `eth_call` and record expected outputs. No simulation means no plan.
5. Build deterministic `decreaseLiquidity → collect → mint` calldata. `collect` returns proceeds to the reviewed wallet; no swap, Permit2, arbitrary target or multicall is introduced.
6. Run the deterministic calldata guard over every step.
7. On explicit range review, refresh the LP state and quote and rebuild the plan. Only `REVIEWED/PASS` can be sealed.

## Boundary
The boundary stores the exact plan hash and ordered call hashes. A candidate dispatch call must match the sealed plan step. v0.17 deliberately has no financial signer and no transaction-submission API, so a boundary approval cannot submit anything.

The boundary preflight refreshes:
- LP NFT ownership;
- Position Manager / pair / fee-tier identity;
- old tick range and liquidity;
- current tick relative to the reviewed replacement range;
- independent decrease-liquidity expected outputs versus reviewed minimum floors.

Any changed material state blocks the plan and requires rebuilding/review.

## Why this is non-bypassable
The intended financial signer is **boundary-controlled**, while the external AgentService holds only its proposal-authentication key. Once a financial signer is provisioned in a later milestone, the signing interface must only accept exact sealed-plan calls through this boundary. The external service cannot possess that signer and therefore cannot bypass Spotriq by calling PancakeSwap directly with broader selector authority.

## Deliberate v0.17 limitations
- No financial Altana session is provisioned.
- No transaction is signed or submitted.
- No swap step is generated, even when the Job Intent allows swap preparation.
- The old V3 NFT is not burned by this three-step plan.
- Token balance/allowance readiness for the replacement mint is deferred to the financial-authority milestone.
- A preflight PASS means the plan is fresh and structurally enforceable, not executable.

## Next boundary
v0.18 must provision a real BSC Testnet Altana financial session to the boundary-controlled signer, reconcile/verify it onchain, and prove the boundary remains the only financial signing path.
