# Spotriq v0.20.0 Implementation Report

## Activity & Outcomes

### Implemented
- New `@spotriq/activity-outcomes` package with memory/PostgreSQL persistence.
- Deterministic execution-scoped activity timeline built from existing Job Intent, financial session, approval, controlled execution, BSC receipt, replacement position and execution-boundary resources.
- Durable immediate Rebalancing outcome snapshot for independently confirmed controlled executions.
- Marketplace Observed evidence for BSC receipt/gas and replacement PancakeSwap V3 position state.
- Marketplace Derived evidence for native gas cost and replacement-range width.
- Explicit `INSUFFICIENT_HISTORY` performance state: no PnL/fees/APY/success-rate claims are fabricated.
- Activity refresh can surface later Altana financial-session revocation.
- New read/sync API endpoints and a live Activity & Outcomes page reachable from a confirmed Job Intent execution.
- Existing My Agents mock portfolio is explicitly labelled Sample Data so its illustrative historical metrics cannot be confused with the new live execution evidence.
- Migration `0014_execution_activity_outcomes.sql` reuses the original activity/outcome schema without fabricating a marketplace Activation.

### Trust properties
- A successful transaction hash alone still does not create an outcome; v0.19 must first have reconciled the reviewed Rebalancing effects and marked the controlled execution `CONFIRMED`.
- Immediate outcome evidence remains execution-scoped and does not claim long-horizon financial performance.
- No USD cost is derived without a versioned price source.
- No marketplace agent activation/hiring is inferred from service selection or controlled execution.

### Next
**v0.21.0 — Real AgentService Task Invocation / Hiring Origin Proof.** Close the remaining marketplace activation gap by invoking/hiring the selected service through a real supported machine/task interface, binding a trustworthy task/proposal identifier to the Job Intent and execution path, and proving that the actual marketplace service originated the proposed work rather than being selected only as metadata.

### Release validation
- Activity & Outcomes engine: **4/4** tests passing.
- Inherited execution/authority/Job Intent/Smart Money regression chain: **56/56** tests passing.
- Combined targeted regression state for this release: **60/60** tests passing.
- Shared Domain, API Contracts, Activity & Outcomes, and Smart Money packages passed targeted TypeScript checking in the validation harness.
- Final cleaned tree structural verifier: **PASS**.
- Final cleaned tree syntax transpilation: **135 TypeScript/TSX files, 0 syntax errors**.
- All **23** root/app/package manifests are version `0.20.0`.
- Latest migration: `0014_execution_activity_outcomes.sql`.

### Post-confirmation enrichment resilience
Activity/Outcome materialization is downstream evidence enrichment, not the source of transaction truth. After a controlled execution has independently reconciled to `CONFIRMED` and its Job Intent has been completed, an Activity & Outcomes sync failure is logged and can be retried through the dedicated sync endpoint; it does **not** roll back or misreport the already-confirmed BSC execution.
