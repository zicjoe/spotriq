# Spotriq Activity & Outcomes

Release: **v0.20.0**

## Purpose
Activity & Outcomes turns a controlled BSC Testnet Rebalancing execution into durable, provenance-labelled marketplace evidence without pretending that one transaction proves strategy performance or marketplace agent activation.

The evidence subject is the `ControlledRebalancingExecution`, not a fabricated `Activation`. The original `activity_events`, `outcome_windows`, `outcome_metrics`, and `evidence_records` persistence foundation is reused with execution-scoped linkage.

## Activity timeline
`@spotriq/activity-outcomes` can materialize deterministic events for:
- Job Intent review/completion state;
- boundary-controlled financial authority being active;
- exact approval confirmation when an approval was required;
- controlled execution preparation/submission;
- BSC receipt-confirmed execution;
- replacement PancakeSwap V3 NFT verification;
- sealed boundary consumption;
- Job Intent completion;
- later Altana financial-session revocation.

Refresh/sync is idempotent. The current underlying resources are re-read and the execution-scoped timeline is replaced deterministically rather than appending duplicate UI events.

## Immediate outcome evidence
For a `CONFIRMED` controlled execution with independently reconciled Rebalancing effects, Spotriq records only facts it can defend:
- BSC receipt status;
- gas used;
- effective gas price when the RPC receipt exposes it;
- native gas cost derived as `gasUsed × effectiveGasPrice` in wei/tBNB;
- old LP liquidity after execution;
- replacement LP NFT ID;
- replacement LP liquidity;
- replacement range state;
- replacement range width;
- receipt-block PancakeSwap position snapshot.

The outcome remains `COLLECTING` with `INSUFFICIENT_HISTORY` for strategy performance. v0.20 does **not** fabricate:
- PnL;
- fees earned;
- APY;
- USD gas cost;
- time-in-range performance;
- drawdown;
- agent success rate;
- counterfactual advantage.

Those require later measurement windows and defensible price/performance methodology.

## Evidence provenance
- BSC receipt/gas and PancakeSwap position observations are `marketplace-observed`.
- Native gas cost and range width are `marketplace-derived` from referenced observed facts.
- No operator claim is promoted into an outcome.

## Agent activation boundary
Execution Activity & Outcomes does not prove that the selected external AgentService was actually hired or invoked as the proposal origin. `marketplaceActivationEnabled` therefore remains `false` in v0.20. A later milestone must establish a genuine service task/hiring invocation and bind the resulting proposal/task evidence to the Job Intent/execution path.
