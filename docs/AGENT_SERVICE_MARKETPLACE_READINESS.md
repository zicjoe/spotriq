# Agent Service + Marketplace Listing/Readiness Architecture

Spotriq v0.12.0 preserves the supply-side normalization layer between raw ERC-8004 discovery and activation, and adds Marketplace Test Lab as the first **Marketplace Observed** verification layer for declared machine runtimes.

## Domain sequence

```text
ERC-8004 AgentIdentity
        ↓
AgentListing
        ↓
AgentService
        ↓
Offer                PermissionProfile
        \              /
         Marketplace Test Lab
                ↓
         ReadinessSnapshot
                ↓
        activation eligibility
```

These resources are intentionally distinct. A registry identity can exist without a financial listing. A listing can exist without a supported financial service. A service can exist without commercial terms or an authority declaration. A declared runtime can exist without being reachable. A tested runtime can exist without permission authority. Readiness is computed from explicit evidence; it is not inferred from reputation.

## Registry-to-listing normalization

Every discovered identity can become a Spotriq `AgentListing` representation. Listing status is deterministic:

- `DISCOVERED`: identity exists but no supported financial category was normalized.
- `SUBMITTED`: at least one supported financial-category hint exists, but stronger readiness evidence is missing.
- `TESTING`: canonical verification, supported category and a machine-callable runtime endpoint are present while test/authority readiness is incomplete.
- `READY`: all required readiness gates genuinely pass.
- `DEGRADED`: completed marketplace tests materially fail while the identity itself is not suspended.
- `SUSPENDED`: canonical identity mismatches or the registration declares the agent inactive.

A listing status is never itself an activation permission.

## Listing-to-service normalization

A live identity becomes an `AgentService` candidate only when its current registry metadata carries a supported Spotriq category hint:

- Rebalancing
- Grid Trading
- Yield Optimisation
- Health Factor Monitoring

The category claim remains `operator-claimed` until independently observed. Protocol mentions such as PancakeSwap or Venus may be normalized from explicit registry text, but remain claimed capability, not tested capability.

Search relevance alone never promotes an identity to `AgentService`. Search-only identities remain `FinancialSupplyLead` records.

## Runtime endpoints

Registration services are normalized into `ServiceRuntimeEndpoint` records. Spotriq treats only declared `A2A` and `MCP` endpoints as machine-callable candidates.

Endpoint declaration is not endpoint verification.

v0.12.0 adds Marketplace Test Lab to observe runtime reachability and protocol/category contract behaviour safely.

### A2A

Test Lab validates a public HTTPS runtime through the standardized Agent Card discovery surface and inspects machine-readable skills/capability text for category relevance. It does not submit a financial task.

### MCP

For modern MCP, Test Lab uses protocol revision `2026-07-28`, calls `server/discover`, and may issue read-only `tools/list`. It never calls an advertised tool. For runtimes that explicitly declare older MCP behaviour, a bounded legacy initialize/list fallback is supported.

### Endpoint safety policy

Before outbound probing, Test Lab applies URL/DNS controls including:
- HTTPS-only probing;
- no embedded credentials;
- localhost/private/link-local/reserved-address blocking;
- DNS resolution checks;
- redirect revalidation;
- bounded redirects;
- timeout;
- response-size ceiling;
- no credential forwarding.

Application-layer DNS validation reduces SSRF exposure but cannot by itself eliminate DNS-rebinding TOCTOU; production deployment should also enforce network egress controls.

## Offer

`ServiceOffer` is independent from `AgentService`.

Spotriq does not parse prose into prices. If the registry does not provide a structured Spotriq-compatible commercial offer, the state is:

```text
UNDECLARED
```

This prevents phrases in descriptions from silently becoming executable fees.

## PermissionProfile

The `PermissionProfile` describes authority a service would require. It remains separate from a later user's `PermissionRequest` and actual `PermissionGrant`.

Registry text is not used to infer spend limits, token allowances or execution authority. Until an explicit profile exists:

```text
declarationState = UNDECLARED
executionMode = UNDECLARED
intensity = unknown
```

Passing Test Lab does not alter this state.

## Deterministic readiness checks

Each service candidate receives a versioned readiness snapshot with explicit checks:

1. `BSC_NETWORK`
2. `CANONICAL_IDENTITY`
3. `ACTIVE_METADATA`
4. `MACHINE_ENDPOINT`
5. `RUNTIME_REACHABILITY`
6. `PERMISSION_PROFILE`
7. `MARKETPLACE_TESTS`

Readiness method:

```text
marketplace.service-readiness@1.0.0
```

Normalization method:

```text
marketplace.agent-service-normalization@1.0.0
```

Marketplace Test Lab method:

```text
marketplace.test-lab@1.0.0
```

## Marketplace Test Lab results

Coverage is explicit:

- `NOT_RUN`
- `PASS`
- `PARTIAL`
- `FAIL`

Individual checks use explicit outcomes such as `PASS`, `WARN`, `FAIL`, `SKIPPED` and `INCONCLUSIVE`.

The Test Lab records Marketplace Observed evidence for:
- runtime reachability;
- protocol contract/discovery;
- category-capability observation.

A Test Lab PASS means Spotriq observed the declared runtime satisfying the bounded non-financial contract. It does not prove performance, safety of user funds, profitability, correct autonomous strategy behaviour or permission authority.

## State rules

- canonical identity mismatch → `SUSPENDED`
- registration explicitly inactive → `SUSPENDED`
- BSC Testnet identity → `TESTNET_ONLY`
- observed runtime failure → `OFFLINE`
- completed materially failing marketplace coverage → `DEGRADED`
- incomplete/unknown required gates → `LIMITED`
- every required gate PASS → `READY`

Unlike v0.10/v0.11, `READY` is no longer artificially unreachable. It is computed honestly from independent gates.

Current registry-derived candidates still normally have:

```text
activationEligible = false
```

because an explicit permission profile is not inferred from registry prose. Therefore Test Lab PASS alone cannot enable activation.

## Evidence boundaries

- ERC-8004 registry reads → canonical/onchain identity evidence.
- 8004scan discovery/reputation → external indexed evidence.
- registry capability/category text → Operator Supplied claim.
- normalization/readiness → Marketplace Derived evidence.
- Test Lab runtime/protocol/category observations → Marketplace Observed evidence.

Readiness is not a trust score and does not predict profitability.

## Explore behaviour

Explore keeps distinct concepts visible:

1. Sample/reference services from the Figma product baseline, clearly labelled sample data.
2. Targeted financial discovery leads that are search-relevant but not service claims.
3. Normalized live financial service candidates with readiness gates.
4. Raw live ERC-8004 registry identities, including identities with no supported financial category hint.

For eligible A2A/MCP service candidates, **Run Test Lab** performs the bounded verification and then refreshes readiness. Services without a declared machine runtime cannot be tested and remain explicit about the missing gate.

## API

- `GET /v1/marketplace/status`
- `GET /v1/listings`
- `GET /v1/services`
- `GET /v1/services/:serviceId`
- `GET /v1/services/:serviceId/readiness`
- `GET /v1/services/:serviceId/evidence`
- `GET /v1/services/:serviceId/tests`
- `POST /v1/services/:serviceId/tests`

`POST /v1/services/:serviceId/tests` executes a bounded non-financial run and returns both the resulting test coverage and recomputed readiness.

## Persistence

Migration `0008_marketplace_service_readiness.sql` persists the distinct marketplace supply resources. Migration `0009_marketplace_test_lab.sql` adds immutable Test Lab run persistence. A database remains optional for local development; memory stores preserve the same service interface.
