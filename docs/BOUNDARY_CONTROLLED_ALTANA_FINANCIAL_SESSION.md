# Boundary-Controlled Altana Financial Session

Spotriq v0.18.0 provisions financial authority to the sealed Spotriq execution boundary, never to the external AgentService proposal key.

## Security model

The selected AgentService remains `AUTHENTICATED_PROPOSER_ONLY`. Its verified service-owned key proves which service proposed work; it is deliberately different from the financial session public key.

The boundary financial session is restricted to BSC Testnet (chain 97), the exact Job Intent wallet, the reviewed PancakeSwap V3 Position Manager call allowlist, the reviewed token spend caps, and the reviewed expiry. Spotriq accepts an observed Altana session only when the provider-returned scope reconciles exactly and the Altana Keystore currently reports the session key as valid.

An ACTIVE financial session still has `executionEligible = false` in v0.18. The API exposes no transaction-submission route.

## Client-side signer custody

The Altana financial session signer is generated inside the Spotriq web-client boundary using the pinned Altana SDK. The private key is not sent to the Spotriq API and is not given to the external AgentService. Server persistence stores only public/provider/onchain evidence.

A page reload may therefore require a fresh financial session before a later execution milestone. Spotriq prefers losing ephemeral signing state over silently persisting a raw financial private key.

## Exact-scope reconciliation

Spotriq checks:

- Job Intent wallet matches the grant wallet.
- Returned contract/function calls exactly match the reviewed `PermissionRequest`.
- Returned token spend caps and periods exactly match the reviewed limits.
- Returned expiry exactly matches the reviewed expiry.
- The financial public key is different from the verified AgentService proposal key.
- `isValidKey(wallet, keccak256(sessionPublicKey))` is currently true in the Altana BSC Testnet Keystore.

Any broader/different scope, invalid Keystore state, expired key, wallet mismatch, or signer-key reuse makes the observed financial session unusable.

## Balance and allowance readiness

The reviewed Rebalancing plan is `decreaseLiquidity → collect → mint`. Therefore Spotriq distinguishes:

- current ERC-20 wallet balance;
- expected collect inflow from the independently simulated reviewed plan;
- projected post-collect balance;
- exact amount required for replacement mint;
- current allowance from the wallet to the exact PancakeSwap V3 Position Manager.

A projected balance can be sufficient while allowance remains insufficient. In that case readiness is `APPROVAL_REQUIRED`.

Spotriq v0.18 does not create approvals, does not request unlimited allowance, and does not submit the reviewed financial plan.

## Revocation

The web integration can revoke the Altana session using the wallet admin signer and the financial session public key. The API then re-verifies Keystore state. A previously ACTIVE session becomes REVOKED/unusable when `isValidKey` becomes false.

## What v0.18 proves

v0.18 proves that Spotriq can model and implement a bounded, boundary-owned, independently reconciled, revocable BSC Testnet financial authority path plus plan-specific balance/allowance readiness.

It does not claim that a real financial grant transaction was executed during automated repository validation. Live grant/revoke evidence is produced only when the user invokes the web flow with the matching Altana BSC Testnet wallet.

## Next boundary

v0.19 must introduce the first controlled BSC Testnet Rebalancing execution path. It must require fresh boundary preflight, current financial-session re-verification, sufficient token balance/readiness, and explicit safe allowance readiness before exact sealed calls can be dispatched. No arbitrary AgentService calldata may reach the financial signer.
