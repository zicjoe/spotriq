# Spotriq v0.16.0 Implementation Report

## Trusted Agent Session-Key Binding + V3 Calldata Guard + Altana BSC Testnet Integration Proof

### Release

**Spotriq v0.16.0**

This release supersedes v0.15.0. It advances the Rebalancing authority path without weakening Spotriq's core rule that permission evidence and execution safety are separate facts.

## Goal

v0.15.0 created exact bounded Altana-oriented financial permission requests but correctly blocked provider submission because two facts were missing:

1. Spotriq could not prove that a delegate/session public key actually belonged to the selected external AgentService.
2. Selector-scoped authority did not prove that a future PancakeSwap V3 call used the exact reviewed token ID, recipient, amounts, slippage and deadline.

v0.16.0 implements evidence for both of those questions and, during security review, adds a third required condition: the calldata policy must be enforced through a path the external session key cannot bypass.

## 1. Trusted AgentService session-key binding

New module: `packages/marketplace-supply/src/authority-binding.ts`.

Spotriq verifies service-key ownership through the service's existing A2A boundary rather than accepting a browser-entered key.

A service can declare the A2A Agent Card extension:

`urn:spotriq:authority-binding:v1`

with:
- `sessionPublicKey` — compressed/uncompressed SEC1 secp256k1 public key;
- `challengeUrl` — HTTPS challenge endpoint on the same origin as the A2A runtime;
- `signatureScheme` — `eip191-secp256k1`.

Spotriq:
1. loads the Agent Card using the existing bounded SSRF-safe fetcher;
2. requires a same-origin challenge URL;
3. creates a fresh nonce/timestamped challenge bound to service ID and agent ID;
4. POSTs the challenge through the same safe runtime-fetch policy;
5. requires the runtime to echo the exact challenge and key;
6. recovers the EIP-191 signer and compares it to the address derived from the declared public key;
7. records a `VERIFIED`, `FAILED`, or `UNAVAILABLE` `AgentAuthorityBinding`.

A VERIFIED result generates Marketplace Observed evidence. Missing metadata is not failure/capability proof; invalid signatures and unsafe challenge endpoints are never promoted.

Method version: `marketplace.agent-authority-binding@1.0.0`.

## 2. Deterministic PancakeSwap V3 calldata guard

New package: `@spotriq/execution-guard`.

Method version: `marketplace.rebalancing-calldata-guard@1.0.0`.

The guard decodes one proposed Position Manager call and compares it with the persisted/reviewed Rebalancing Job Intent. It never submits the transaction.

Current coverage:
- `collect((uint256,address,uint128,uint128))`
  - exact Position Manager;
  - exact LP NFT/tokenId;
  - recipient must be the reviewed user/job wallet;
  - no native BNB value;
  - can PASS.
- `increaseLiquidity((uint256,uint256,uint256,uint256,uint256,uint256))`
  - exact tokenId;
  - token0/token1 desired amounts cannot exceed reviewed caps;
  - min amounts must satisfy reviewed slippage relationship;
  - deadline must fit the reviewed Job Intent lifetime;
  - no native BNB value;
  - can PASS.
- `decreaseLiquidity((uint256,uint128,uint256,uint256,uint256))`
  - structural checks are applied;
  - remains INCONCLUSIVE until Spotriq has an independently reviewed expected-output/quote basis for amount0Min/amount1Min.
- `mint((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256))`
  - token pair, fee, recipient, tick spacing, caps, slippage and deadline are checked;
  - remains INCONCLUSIVE until the replacement tick range is explicitly reviewed as part of the Job Intent/execution plan.

Every report keeps:
- `nonBypassableBoundarySatisfied: false`;
- `executionEligible: false`.

This is intentional. An external agent that directly holds the Altana session key could bypass an application-level checker and call any selector permitted by its onchain session policy.

## 3. Three structured authority safety prerequisites

`BoundedPermissionRequest` now carries three independent machine-readable gates:

1. `TRUSTED_AGENT_SESSION_KEY`
2. `ARGUMENT_LEVEL_EXECUTION_GUARD`
3. `NON_BYPASSABLE_FINANCIAL_EXECUTION_BOUNDARY`

A VERIFIED service-key binding can satisfy only gate 1.
A PASS calldata-guard observation can satisfy only gate 2.
Gate 3 remains REQUIRED and blocking in v0.16.0.

Therefore v0.16.0 does not expose a selected-agent financial Altana grant path and does not execute a Rebalancing transaction.

## 4. Real Altana BSC Testnet integration proof

v0.16.0 adds a deliberately non-financial provider/onchain proof so Altana integration is tested for real without granting unsafe financial authority.

Web dependency:
- `@altananetwork/sdk` pinned exactly to `0.7.1`.

The UI can:
- create/recover an Altana passkey smart wallet on BSC Testnet;
- require that wallet to equal the Job Intent wallet;
- generate an ephemeral session signer **only for the integration probe**;
- call Altana `grantSession` with one read-only call policy:
  - exact Job Intent V3 Position Manager;
  - `positions(uint256)` only;
- register the key in Altana Keystore;
- persist the returned session proof/transaction hash;
- independently re-check current Keystore validity;
- revoke the test session and record revocation evidence.

The probe is represented by `AltanaTestnetProbeObservation`, not by `BoundedPermissionGrant`, and its limitations explicitly state that it is not selected AgentService authority.

Method version: `marketplace.altana-testnet-probe@1.0.0`.

## 5. Persistence

New migration:

`packages/db/migrations/0010_trusted_agent_binding_and_altana_probe.sql`

It adds durable storage for:
- `agent_authority_bindings`;
- `altana_testnet_probe_grants`.

Existing permission requests/grants continue to use the original authority tables.

## 6. API additions

- `POST /v1/permissions/:permissionRequestId/trusted-agent-binding`
- `POST /v1/permissions/:permissionRequestId/execution-guard`
- `POST /v1/job-intents/:jobIntentId/altana-testnet-probes`
- `GET /v1/job-intents/:jobIntentId/altana-testnet-probe`
- `GET /v1/altana-testnet-probes/:probeId`
- `POST /v1/altana-testnet-probes/:probeId/reverify`

The trusted-binding route derives the service from the persisted permission request and ignores browser-supplied public-key claims. The guard route derives job/service context server-side; the browser supplies only the proposed call payload.

## 7. UI additions

The live Rebalancing Job Intent authority surface now exposes:
- the three structured safety prerequisites;
- **Verify service-owned key**;
- a developer/review calldata guard panel for exact target + calldata inspection;
- explicit PASS/BLOCKED/INCONCLUSIVE guard checks;
- an Altana BSC Testnet integration-proof panel for passkey wallet create/recover, read-only grant, Keystore re-check and revoke.

The UI explicitly states that the testnet probe is not the selected agent's financial authority and that no financial execution is enabled.

## 8. Security conclusions

The most important result of this milestone is architectural, not cosmetic:

**Selector allowlisting plus an off-chain argument checker is not sufficient for safe external-agent financial authority when the external agent directly holds the session key.**

Before selected-agent financial authority is exposed, Spotriq needs a non-bypassable execution boundary capable of enforcing the exact reviewed calldata/job constraints regardless of what the external agent attempts to submit.

## 9. Validation

Targeted executable regression suites passed:
- trusted service-key binding: **4/4**;
- V3 calldata guard: **7/7**;
- bounded authority: **10/10**;
- Job Intent: **6/6**;
- Smart Money: **9/9**;
- Marketplace Supply / Test Lab / compatibility: **18/18**;
- Authority API trust boundaries: **2/2**.

Total: **56/56** targeted tests passing.

Targeted TypeScript checking passed for:
- Domain;
- API Contracts;
- Evidence;
- Marketplace Supply;
- Execution Guard;
- Authority;
- Job Intents;
- Smart Money;
- API app.

A whole-source TypeScript/TSX syntax transpilation pass also succeeded. Full workspace `pnpm check` still requires a normal local install because the supplied ZIP intentionally contains no `node_modules` and the build sandbox cannot provision the complete dependency graph.

## 10. Known limitations / deliberately deferred

v0.16.0 does **not**:
- give the selected external AgentService financial authority;
- hold or create an external service's private session key;
- submit a Rebalancing financial transaction;
- treat an off-chain guard as non-bypassable;
- infer expected decrease-liquidity outputs without an independent quote;
- approve a replacement mint range that the user did not review;
- relabel the Altana testnet integration probe as an activation.

## Next milestone

**v0.17.0 — Reviewed Rebalancing Execution Plan + Non-Bypassable Financial Execution Boundary**

Required next work:
1. create a deterministic multi-step Rebalancing execution plan;
2. make the replacement range/ticks user-reviewable;
3. add independent quote/expected-output evidence for liquidity changes;
4. immediately revalidate LP ownership and current onchain position state;
5. implement an enforcement path that the external agent key cannot bypass and that validates exact target/selector/calldata/value/job constraints;
6. only after that boundary exists, evaluate a selected-agent financial Altana grant and BSC Testnet financial execution.
