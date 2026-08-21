# Bounded Permission / Authority

Release: **v0.15.0**

## Purpose

Spotriq now turns a confirmed Rebalancing Job Intent into a precise, reviewable authority request without pretending that requested authority is already granted and without enabling financial execution.

The live sequence is:

`Finding → compatible AgentService → Rebalancing Job Intent → BoundedPermissionRequest → externally produced Altana grant proof → onchain Keystore reconciliation`

Execution remains disabled in v0.15.0.

## Trust boundaries

The following objects are intentionally distinct:

- `PermissionProfile`: what a marketplace service declares it may need.
- `RebalancingJobIntent`: the exact financial job the user reviewed.
- `BoundedPermissionRequest`: Spotriq's reviewed, deterministic authority scope for that job.
- provider-returned grant proof: what an authority provider says was actually granted.
- `BoundedPermissionGrant`: Spotriq's reconciled view after comparing the returned scope and independently reading onchain authority.
- execution eligibility: a later milestone. It is always false in v0.15.0.

A request never proves a grant. A provider response never proves current onchain validity. An onchain-valid session key never proves that its returned policy matches the reviewed Spotriq request. Spotriq checks these separately.

## Current supported vertical

v0.15.0 supports authority derivation only for a confirmed PancakeSwap **V3 Rebalancing** Job Intent in `AWAITING_AUTHORITY` with `executionState = NO_EXECUTION`.

Infinity CL is deliberately refused until its contract/function surface is modeled explicitly. Spotriq does not map V3 signatures onto Infinity by assumption.

The Smart Money Finding and Job Intent now retain the observed V3 position manager plus token0/token1 address/symbol/decimals so spend caps can be converted without guessing token units.

## Exact call allowlist

The request targets the exact observed PancakeSwap V3 Position Manager and allows only these selector-scoped signatures:

- `decreaseLiquidity((uint256,uint128,uint256,uint256,uint256))`
- `collect((uint256,address,uint128,uint128))`
- `increaseLiquidity((uint256,uint256,uint256,uint256,uint256,uint256))`
- `mint((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256))`

The request does **not** grant:

- ERC-20 `approve`
- Permit2 approval
- router swap execution
- withdrawals
- NFT/token transfers
- arbitrary target calls
- `multicall`

`allowSwapPreparation` on the Job Intent remains a planning constraint only. It does not create swap execution authority.

### Important selector limitation

Altana call permissions can constrain contract + function signature, but they do not bind the V3 `tokenId` or arbitrary calldata arguments at this policy layer. Therefore the request is narrower than an unrestricted contract session but is not sufficient by itself to prove that a future call only affects the exact LP NFT from the Finding. A future executor must revalidate current position ownership/state, arguments, spend bounds, grant validity and the reviewed Job Intent immediately before execution.

## Spend caps

The user explicitly enters token0 and token1 display-unit caps. Spotriq converts those values to raw smallest units using token decimals observed by the Smart Money data layer.

Rules:

- positive decimal values only;
- scientific notation rejected;
- precision cannot exceed the observed token decimals;
- caps use a rolling `day` period;
- expiry is user-selected and bounded to 5–1440 minutes;
- raw amounts are stored alongside display amounts so reconciliation is exact.

Spend caps are user-proposed authority constraints. They are not inferred from wallet balances, APY, LP value or prose.

## Why grant submission is deliberately blocked in the consumer flow

Altana sessions include a session signer/private key and its public key. A real external AgentService needs a trustworthy session/delegate key that it can actually use.

Spotriq's current ERC-8004/AgentService model does not yet publish and cryptographically bind a trusted Altana delegate/session public key for the selected external service. Spotriq therefore does **not**:

- generate an external agent's long-lived session secret in browser storage;
- invent a delegate public key;
- send a generated session private key to an arbitrary runtime endpoint;
- claim a session was granted when no trusted agent-key handoff exists.

The request is marked `SAFETY_PREREQUISITES_REQUIRED` until **both** structured prerequisites are satisfied:

1. `TRUSTED_AGENT_SESSION_KEY` — the selected AgentService must bind a service-owned Altana delegate/session public key that Spotriq can authenticate without taking custody of the agent's secret.
2. `ARGUMENT_LEVEL_EXECUTION_GUARD` — Spotriq must validate exact PancakeSwap calldata against the reviewed Job Intent, including the intended LP token ID, recipient, targets, amounts and deadline/slippage bounds.

These are independent. Solving only one is insufficient for a safe live grant/activation path.

## Altana-aligned permission model

Current Altana session permissions support:

- `calls`: contract/method allowlists, including `to` + function signature together;
- `spend`: per-token rolling caps;
- expiry on the session.

Spotriq's `BoundedPermissionRequest` is shaped to map directly onto those primitives while retaining its own provenance and reconciliation state.

Spotriq intentionally does not install the Altana SDK in v0.15.0 because this milestone does not yet have the two safety prerequisites required for a safe live `grantSession` path. When the SDK is introduced, verify the then-current official SDK surface and pin the exact reviewed dependency version rather than assuming the integration contract has remained unchanged.

Official references:

- `https://docs.altana.network/sdk/grant-session`
- `https://docs.altana.network/concepts/sessions`
- `https://docs.altana.network/use-cases/4-verify-agent-authority`
- `https://docs.altana.network/concepts/networks/testnet`

## Independent onchain verification

Spotriq verifies an observed session public key through Altana's Keystore directly over the configured BSC RPC:

`keyId = keccak256(sessionPublicKey)`

then:

`isValidKey(walletAddress, keyId)`

Current configured Keystore addresses:

- BSC Mainnet (56): `0x6572427ED530BadcF7375Cf9A4709D8d2b0E7E0a`
- BSC Testnet (97): `0x6b8361C29d05D498b1a12B54A37310f94171E94A`

The Keystore read does not require Spotriq to hold an Altana admin key or session secret.

A reconciled grant becomes `ACTIVE` only when:

1. wallet address matches the reviewed request;
2. call scope exactly matches the reviewed request;
3. spend scope exactly matches the reviewed request;
4. expiry exactly matches the reviewed request;
5. the reviewed expiry has not passed; and
6. the Keystore currently reports the session key as valid.

A broader provider-returned scope is rejected rather than silently accepted.

## Re-verification and revocation observation

`POST /v1/permission-grants/:permissionGrantId/reverify` repeats the Keystore read.

A previously active grant becomes unusable when:

- its reviewed expiry passes; or
- `isValidKey` later returns false.

A previously active, non-expired grant that becomes invalid is represented as `REVOKED`. Spotriq observes revocation in v0.15.0; it does not yet submit the revocation transaction itself.

## Persistence

No new migration is required.

The original core schema already contains:

- `permission_requests`
- `permission_grants`

v0.15.0 activates those persistence seams rather than introducing competing authority tables. Migration `0009_marketplace_test_lab.sql` remains the latest migration.

## APIs

```text
POST  /v1/job-intents/:jobIntentId/permissions
GET   /v1/permissions/:permissionRequestId
PATCH /v1/permissions/:permissionRequestId
POST  /v1/permissions/:permissionRequestId/reconcile
GET   /v1/permission-grants/:permissionGrantId
POST  /v1/permission-grants/:permissionGrantId/reverify
```

The prepare/revise endpoints accept only user-proposed token caps and expiry. Contract addresses, token identities, protocol and position context come from the persisted server-side Job Intent.

## Execution boundary

`BoundedPermissionRequest.activationEligible = false`

and

`BoundedPermissionGrant.executionEligible = false`

throughout v0.15.0.

Even an exact, currently valid Altana grant leaves the Job Intent at `NO_EXECUTION`.

The next milestone must satisfy **both** machine-readable safety prerequisites before live provider grant submission:

- trusted AgentService session-key binding; and
- an argument-level execution guard that can prove future PancakeSwap calldata matches the reviewed Job Intent.

Only after those gates are satisfied should Spotriq submit and reconcile a real Altana BSC Testnet grant. Financial execution remains a further boundary: current position ownership/state, exact calldata and current grant validity must still be revalidated immediately before any transaction.
