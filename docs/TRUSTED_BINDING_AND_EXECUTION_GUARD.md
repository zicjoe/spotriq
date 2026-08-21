# Trusted Binding and Execution Guard

Spotriq treats three questions separately:

1. **Who controls the session key?** — proven through `AgentAuthorityBinding` against the selected A2A service.
2. **Does this proposed PancakeSwap call match the reviewed job?** — assessed through `RebalancingExecutionGuardReport`.
3. **Can the agent bypass that assessment?** — currently yes if it directly holds a financial selector-scoped session key, therefore `NON_BYPASSABLE_FINANCIAL_EXECUTION_BOUNDARY` remains REQUIRED.

## Trusted service key

The A2A Agent Card can declare `urn:spotriq:authority-binding:v1`. Spotriq performs a fresh same-origin EIP-191 challenge and records Marketplace Observed evidence only when the declared secp256k1 key proves control. The frontend cannot submit a key to satisfy this requirement.

## Calldata guard

Spotriq decodes individual PancakeSwap V3 Position Manager calls and checks them against the reviewed Rebalancing Job Intent. PASS means the observed call matches the currently modeled argument constraints. It never means the agent is financially authorized or that Spotriq submitted the transaction.

## Non-bypassable boundary

The financial grant remains blocked until the exact call policy is enforced on a path the external session key cannot bypass. This is a separate architecture problem from decoding calldata in the API.

## Altana BSC Testnet probe

v0.16.0 proves real Altana wallet/session/Keystore/revocation integration using a read-only `positions(uint256)` session on the exact V3 Position Manager. The probe is intentionally not attached to the selected AgentService and cannot move funds.
