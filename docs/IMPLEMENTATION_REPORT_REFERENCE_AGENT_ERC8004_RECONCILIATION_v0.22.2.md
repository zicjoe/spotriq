# Spotriq v0.22.2 — Reference-Agent ERC-8004 Identity Reconciliation

## Purpose

Close the gap between a genuine first-party Spotriq runtime and a genuine ERC-8004 identity without hard-coding registry IDs or weakening marketplace readiness semantics.

## External acceptance fact that triggered this patch

RangeKeeper was deployed publicly and passed Spotriq Marketplace Test Lab. It was then registered on BSC Testnet through the BNB Agent SDK as ERC-8004 Agent ID `2017`.

Spotriq independently queried `/v1/agents/97/2017` and observed:

- `canonicalVerification.state = VERIFIED`;
- canonical owner `0x08a594e828133d18a43918cc804754f46daf44db`;
- indexed owner matches canonical owner;
- parsed ERC-8004 data-URI registration metadata;
- correct registration backlink;
- registered `A2A` endpoint equals the public RangeKeeper Agent Card.

That registry proof existed, but `svc:reference:rangekeeper` still used the temporary first-party marketplace identity and therefore could not consume the proof in its readiness snapshot.

## Implementation

### Deployment-configured identity bindings

Added:

```env
REFERENCE_AGENT_REGISTRY_CHAIN_ID=97
REFERENCE_AGENT_RANGEKEEPER_ID=2017
REFERENCE_AGENT_GRIDPILOT_ID=
REFERENCE_AGENT_YIELDPILOT_ID=
REFERENCE_AGENT_VENUSGUARD_ID=
```

The reference registry chain is deliberately independent from `AGENT_DISCOVERY_CHAIN_ID`. External marketplace discovery can remain on BSC Mainnet while current first-party acceptance identities are verified on BSC Testnet.

### Canonical startup verification

For every configured reference ID, the API calls the existing canonical ERC-8004 verifier directly. The first-party binding is accepted only when:

1. canonical state is `VERIFIED`;
2. ERC-8004 registration backlink is not mismatched;
3. registration metadata name exactly matches the expected first-party agent;
4. the registered `A2A` endpoint exactly matches Spotriq's expected public Agent Card URL.

An incorrect/mismatched configured ID is not silently accepted.

### Stable service identity

The marketplace service ID remains stable:

```text
svc:reference:rangekeeper
```

This preserves persisted Marketplace Test Lab history and downstream service references.

When reconciliation succeeds, the AgentIdentity and AgentService agent reference become the real identity:

```text
erc8004:97:2017
```

`erc8004Verified` then reflects the canonical binding. The public reference-agent directory and Agent Card also expose `REGISTERED_VERIFIED` plus the reconciled chain/agent/registry/owner metadata only when the same binding checks pass.

### Readiness

First-party readiness now consumes canonical verification instead of forcing `CANONICAL_IDENTITY = UNKNOWN` for every reference service.

For a Testnet reference identity with successful canonical reconciliation and previously passing Test Lab evidence, the expected state is:

```text
BSC_NETWORK          WARN / testnet-only
CANONICAL_IDENTITY   PASS
ACTIVE_METADATA      PASS
MACHINE_ENDPOINT     PASS
RUNTIME_REACHABILITY PASS
PERMISSION_PROFILE   PASS
MARKETPLACE_TESTS    PASS

Readiness            TESTNET_ONLY
activationEligible   false
```

This is intentional. ERC-8004 identity verification is not commercial hiring or marketplace Activation.

### Cross-chain marketplace visibility

First-party reference services remain visible in the BSC marketplace even when the current reference identity is BSC Testnet-only. External discovery still respects the requested discovery chain. Each reference record explicitly exposes its own identity chain and `TESTNET_ONLY` readiness state.

### Metadata and request-error consistency

The API health metadata and Marketplace Test Lab HTTP/MCP client metadata now report v0.22.2 consistently. Fastify framework-level 4xx errors (including unsupported POST media types) retain their real HTTP status/code instead of being wrapped as a misleading production `500 INTERNAL_ERROR`.

## Security / truth guarantees

The implementation does not:

- infer ERC-8004 IDs;
- accept an ID merely because an environment variable exists;
- treat an owner match alone as service binding proof;
- accept a registration pointing to another A2A runtime;
- equate ERC-8004 verification with financial capability/performance;
- enable commercial Activation.

## Remaining external acceptance

1. deploy v0.22.2;
2. configure RangeKeeper ID `2017` on chain `97`;
3. verify `svc:reference:rangekeeper/readiness` reports `CANONICAL_IDENTITY = PASS`, `TESTNET_ONLY`, `activationEligible = false`;
4. register GridPilot, YieldPilot and VenusGuard;
5. add their real IDs to Railway and verify each binding;
6. only after four-category Test Lab + ERC-8004 acceptance proceed to the commercial hiring/Activation kernel.
