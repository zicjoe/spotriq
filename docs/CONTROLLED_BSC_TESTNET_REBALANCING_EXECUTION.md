# Controlled BSC Testnet Rebalancing Execution

Release: **v0.19.0**

## Purpose

v0.19.0 is the first Spotriq milestone that exposes a real financial dispatch path on BSC Testnet. It does not weaken the earlier trust boundaries: the external AgentService remains an authenticated proposer, the wallet-moving Altana session remains boundary-controlled, and only the exact user-reviewed call hashes sealed by v0.17 may be dispatched.

## Execution invariant

A controlled dispatch is prepared only after all of the following are fresh and passing:

1. sealed `FinancialExecutionBoundary` is live and unconsumed;
2. exact `RebalancingExecutionPlan` is still current;
3. boundary-controlled Altana financial session is reverified in Keystore;
4. exact provider scope remains reconciled;
5. token balances/projected post-collect balances are sufficient;
6. ERC-20 allowances to the exact V3 Position Manager are sufficient;
7. fresh LP ownership/state and quote preflight passes;
8. every exact call hash is re-authorized at its sealed step index.

The API does not accept arbitrary financial calldata for preparation. The dispatch object is reconstructed from persisted reviewed state.

## Bounded token approval path

When allowance is insufficient, Spotriq creates an explicit `BoundaryApprovalPlan` instead of granting approval authority to the AgentService.

Rules:
- spender is the exact reviewed PancakeSwap V3 Position Manager;
- amount is exactly the reviewed replacement-mint requirement;
- `uint256.max` / unlimited approval is never requested;
- if a non-zero allowance is insufficient, Spotriq prepares `approve(spender, 0)` then `approve(spender, exactAmount)`;
- user explicitly reviews the approval plan;
- approval execution uses the wallet-admin/passkey path, not the financial session and not the external AgentService;
- provider confirmation is followed by an independent allowance re-read before the plan is considered confirmed.

## Controlled Altana dispatch

The browser must still possess the exact ephemeral Altana `Session` object produced when the boundary financial session was granted. v0.19 uses the current Altana session execution primitive with chain ID 97 and the exact server-prepared calls.

The private session signer is not sent to the API or persisted to the database. If the page/browser process loses the signer, Spotriq refuses to reconstruct private key material and requires a fresh bounded financial session.

## Receipt truth boundary

Provider status and BSC receipt are distinct evidence.

- provider `FAILED` → execution fails without consuming the boundary;
- provider `PENDING` → persisted as submitted/reconcilable;
- provider `CONFIRMED` without an observable BSC receipt → remains submitted/reconcilable when a transaction hash exists;
- BSC receipt `REVERTED` → execution fails;
- BSC receipt `SUCCESS` → controlled execution becomes confirmed and the boundary is consumed exactly once.

Only a successful receipt whose same-transaction Rebalancing effects reconcile to the reviewed plan can advance the linked Job Intent to `COMPLETED / CONTROLLED_TESTNET_EXECUTED`.

## Post-state checks

After receipt success Spotriq:
- refreshes the old V3 LP NFT;
- records its remaining liquidity;
- scans Position Manager receipt logs for an ERC-721 mint `Transfer` from zero address to the reviewed wallet;
- when a candidate replacement NFT is found, re-reads it and verifies owner, token pair, fee tier and reviewed tick range.

Absence of a detectable mint log does not fabricate a replacement NFT. Execution can remain receipt-confirmed while replacement-position verification is explicitly unavailable/false.

## Important limitations

- v0.19 does not add swaps to the reviewed three-step plan.
- v0.19 does not burn the old LP NFT.
- v0.19 does not create unlimited allowances.
- v0.19 does not persist the boundary financial private key.
- repository tests do not constitute a live user-wallet transaction.
- `marketplaceActivationEnabled` remains false: the current controlled path still needs a genuine AgentService task/hiring invocation so the selected service, rather than manual target-range entry, can be proven as the proposal origin.
- realised PnL/APY/performance is not inferred from transaction success. That belongs to Activity & Outcomes.
