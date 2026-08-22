# Spotriq v0.18.0 Implementation Report

## Milestone

**Boundary-Controlled Altana Financial Session on BSC Testnet**

## Outcome

Spotriq can now provision and observe a real Altana-compatible financial-session path for the sealed execution boundary while keeping the external AgentService outside the signing path. The implementation remains BSC Testnet-only and deliberately exposes no financial transaction-submission endpoint.

## Implemented

- Added `BoundaryFinancialSessionProof` and `BoundaryFinancialSessionObservation` domain resources.
- Added `BoundaryFinancialReadiness` and per-token balance/allowance readiness resources.
- Added exact-scope financial-session reconciliation to `@spotriq/authority`.
- Requires the boundary financial session public key to differ from the verified AgentService proposal key.
- Independently verifies current Altana Keystore validity and supports later re-verification/revocation evidence.
- Added `FinancialExecutionBoundary.linkFinancialSession(...)`; a linked signer is boundary-controlled but remains non-executable in v0.18.
- Boundary preflight can now return `PASS_EXECUTION_DISABLED` when the exact financial session is live and the reviewed plan is still fresh.
- Reads current token balances and ERC-20 allowance to the exact V3 Position Manager at a BSC block.
- Distinguishes current balance from projected post-collect balance for the reviewed `decrease → collect → mint` plan.
- Returns `APPROVAL_REQUIRED` instead of creating token approvals automatically.
- Added Altana web handler for bring-your-own boundary session signer, exact reviewed calls/spend/expiry, and revocation.
- Added live Job Intent UI for passkey wallet loading, financial grant/reverify/revoke and token balance/allowance readiness.
- Added PostgreSQL migration `0012_boundary_financial_session_readiness.sql`.
- Marketplace activation remains disabled and no transaction submission API was added.

## Trust boundaries preserved

1. AgentService proposal key != financial session key.
2. Provider-returned session scope must exactly match the reviewed `PermissionRequest`.
3. Provider scope is not trusted without Keystore verification.
4. ACTIVE authority != execution.
5. Projected token availability != allowance.
6. Missing allowance does not trigger an automatic or unlimited approval.
7. The external AgentService never receives the financial signer.

## Validation

New/inherited authority regression suite: **17/17 passing**.

Execution-boundary regression suite: **4/4 passing**.

New coverage includes:
- exact-scope + signer-separation + Keystore-valid financial session;
- rejection when the financial key reuses the AgentService proposal key;
- later Keystore revocation disabling the signer;
- projected post-collect balance sufficient while allowance remains blocking;
- sufficient balance/allowance producing `READY_FOR_CONTROLLED_EXECUTION_MILESTONE` while `executionEligible` remains false;
- linked financial signer producing `PASS_EXECUTION_DISABLED`, never execution.

Targeted TypeScript checking passes for the modified Domain, API Contracts, Authority and Execution Boundary packages under validation-only dependency shims. Full `pnpm check` must still be run in a normal installed workspace.

## Live-evidence limitation

Automated repository validation does not control the user's Altana passkey wallet and therefore does not claim to have broadcast a real financial grant/revoke transaction. The product path uses the actual Altana SDK and BSC Testnet configuration; live onchain evidence is produced when the user executes that flow locally/deployed.

## Next milestone

**v0.19.0 — First Controlled BSC Testnet Rebalancing Execution**

The next implementation should add the exact sealed-call dispatch lifecycle behind the Spotriq boundary. It must require fresh v0.17 preflight, current v0.18 financial-session verification and plan-specific balance/allowance readiness. If allowance is missing, the product needs a bounded user-controlled approval path rather than an unlimited or AgentService-controlled approval.
