# Spotriq v0.15.0 Implementation Report

## Milestone

**Explicit Bounded Permission / Authority**

## Outcome

Implemented the first live authority layer between a confirmed Rebalancing Job Intent and future execution. Spotriq can now derive, persist, review, reconcile and re-verify a bounded Altana-oriented authority request/grant while keeping actual financial execution disabled.

## Implemented

### Domain

Added first-class bounded-authority resources:

- `BoundedPermissionRequest`
- `BoundedPermissionGrant`
- `PermissionCallScope`
- `PermissionSpendScope`
- `AltanaGrantProof`
- `AuthoritySafetyPrerequisite` with machine-readable `TRUSTED_AGENT_SESSION_KEY` and `ARGUMENT_LEVEL_EXECUTION_GUARD` gates
- grant reconciliation states

Extended Job Intent authority state with `REQUEST_PREPARED` and `GRANT_VERIFIED` plus linked request/grant IDs.

### Smart Money / Job Intent evidence

Rebalancing Findings and Job Intents now retain exact PancakeSwap position-manager and token0/token1 metadata needed to derive authority without client-supplied contract/token facts.

### New `@spotriq/authority` package

Implemented `marketplace.bounded-authority@1.0.0` with:

- deterministic request preparation;
- strict display-unit → raw-unit cap conversion;
- exact PancakeSwap V3 Position Manager call allowlist;
- memory/PostgreSQL stores;
- request revision before grant reconciliation;
- exact provider-scope comparison;
- independent Altana Keystore validation;
- grant persistence;
- later grant re-verification.

### Altana Keystore reader

Implemented direct RPC verification using:

- `keyId = keccak256(sessionPublicKey)`
- `isValidKey(wallet, keyId)`

for BSC Mainnet and BSC Testnet current Keystore addresses.

### API

Added:

```text
POST  /v1/job-intents/:jobIntentId/permissions
GET   /v1/permissions/:permissionRequestId
PATCH /v1/permissions/:permissionRequestId
POST  /v1/permissions/:permissionRequestId/reconcile
GET   /v1/permission-grants/:permissionGrantId
POST  /v1/permission-grants/:permissionGrantId/reverify
```

The server reloads the persisted Job Intent and derives contract/token authority from that trusted object. The client cannot submit an arbitrary Position Manager or token address as authoritative permission context.

### UI

The live Rebalancing Job Intent review now exposes **Bounded authority · Altana** after confirmation.

The user can review/propose:

- token0 daily cap;
- token1 daily cap;
- expiry.

The UI displays:

- exact allowed contract/functions;
- raw and display spend caps;
- request status/provider;
- expiry;
- submission blockers;
- explicit excluded capabilities;
- reconciled grant state when one exists;
- onchain validity, block and key ID;
- re-verification action.

No consumer-facing fake grant button is shown while a trusted AgentService delegate/session key is unavailable.

## Security decisions

1. No session private key is generated for an arbitrary external agent in browser storage.
2. No delegate key is fabricated from ERC-8004 metadata.
3. No unrestricted contract-level session is produced.
4. No `multicall`, token approval, Permit2, router swap, withdrawal or transfer authority is included.
5. Infinity CL is rejected rather than guessed from the V3 contract surface.
6. Provider-returned authority must exactly match the reviewed Spotriq request.
7. Current Keystore validity is checked independently from the provider proof.
8. Re-verification can downgrade an active grant after revocation/expiry.
9. An active reconciled grant still has `executionEligible = false` in v0.15.0.
10. Job Intent remains `NO_EXECUTION` even when authority state reaches `GRANT_VERIFIED`.
11. Live provider submission is blocked by two independent structured prerequisites: a trusted service-owned session key and an argument-level calldata guard.
12. Selector-scoped authority is treated as a maximum reviewed scope, not proof that `tokenId`, recipient, amounts or deadlines are safe.

## Persistence / migration

No new migration was added.

The milestone activates the original `permission_requests` and `permission_grants` tables from migration 0001. Migration 0009 remains the latest migration.

## Validation

Executed directly against the implementation using the local TypeScript/Node validation environment:

- bounded-authority engine: **7/7 passing**;
- authority API trust-boundary test: **1/1 passing**;
- Job Intent engine including authority-link/no-execution regression: **6/6 passing**;
- Smart Money engine: **9/9 passing**;
- Marketplace Supply + Test Lab + compatibility: **18/18 passing**.

Targeted TypeScript checks pass for:

- `@spotriq/domain`
- `@spotriq/authority`
- `@spotriq/job-intents`
- `@spotriq/api-contracts`

A full repository `pnpm check` cannot be claimed from the build sandbox because workspace dependencies are not installed and pnpm cannot be provisioned from npm here. Temporary validation-only resolution stubs are removed before packaging.

## Deliberately not implemented

- creation/storage of an external agent session private key;
- trusted AgentService delegate/session-public-key registration;
- live `grantSession` from the consumer UI;
- user admin-wallet custody/signing by Spotriq;
- onchain revoke transaction submission;
- financial transaction execution;
- PancakeSwap Infinity CL authority;
- hidden automatic token approvals/router permissions.

These are omissions by design, not unfinished fake UI paths.

## Current provider note

Official Altana documentation reviewed for this milestone confirms that sessions are scoped by call permissions, spend permissions and expiry; `to` + function signature use AND semantics; omitting `calls` is unrestricted; `grantSession` may use a caller-supplied `sessionSigner`; and public Keystore `isValidKey` reads can independently observe current authority. v0.15.0 deliberately does not install or invoke the SDK because the live path still lacks the two safety prerequisites above. A later live-grant milestone must re-verify the current official SDK contract and pin the reviewed dependency version.

## Next milestone

**v0.16.0 — Trusted Agent Session-Key Binding + Argument-Level Execution Guard + Live Altana BSC Testnet Grant**

Before any real financial execution, Spotriq should:

1. establish a trustworthy service-owned delegate/session public key and bind it cryptographically or through a verifiable service registration to the selected AgentService;
2. implement an argument-level guard that decodes proposed PancakeSwap V3 calldata and rejects calls whose target, selector, `tokenId`, recipient, amounts or deadline/slippage constraints contradict the reviewed Job Intent;
3. require both structured safety prerequisites to be `SATISFIED` before live provider submission becomes available;
4. ensure the user/admin-controlled Altana wallet actually controls the target BSC Testnet context;
5. submit the exact reviewed session grant on BSC Testnet;
6. capture the transaction hash and returned byte-exact session/policy evidence;
7. reconcile it through the v0.15 authority engine and independently confirm `isValidKey` onchain;
8. expose a real revocation action and confirm revocation onchain;
9. keep financial transaction execution separately gated behind immediate pre-execution revalidation of position ownership/state, exact calldata and current grant validity.
