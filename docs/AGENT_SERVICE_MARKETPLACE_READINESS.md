# Agent Service + Marketplace Listing/Readiness Architecture

Spotriq v0.10.0 introduces the supply-side normalization layer between raw ERC-8004 discovery and future activation.

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
         ReadinessSnapshot
                ↓
        activation eligibility
```

These resources are intentionally distinct. A registry identity can exist without a financial listing. A listing can exist without a supported financial service. A service can exist without commercial terms or an authority declaration. Readiness is computed from explicit evidence; it is not inferred from reputation.

## Registry-to-listing normalization

Every discovered identity can become a Spotriq `AgentListing` representation. Listing status is deterministic:

- `DISCOVERED`: identity exists but no supported financial category was normalized.
- `SUBMITTED`: at least one supported financial-category hint exists, but stronger readiness evidence is missing.
- `TESTING`: canonical verification, supported category and a machine-callable runtime endpoint are present; marketplace testing is still outstanding.
- `SUSPENDED`: canonical identity mismatches or the registration declares the agent inactive.

A listing is never an activation permission.

## Listing-to-service normalization

A live identity becomes an `AgentService` candidate only when its current registry metadata carries a supported Spotriq category hint:

- Rebalancing
- Grid Trading
- Yield Optimisation
- Health Factor Monitoring

The category claim remains `operator-claimed`. Protocol mentions such as PancakeSwap or Venus may be normalized from explicit registry text, but remain claimed capability, not tested capability.

No supported financial hint means no service candidate. The identity remains visible in the broad registry discovery surface.

## Runtime endpoints

Registration services are normalized into `ServiceRuntimeEndpoint` records. Spotriq treats only declared `A2A` and `MCP` endpoints as machine-callable candidates in this milestone. Web URLs and unknown service types remain informational.

Endpoint declaration is not endpoint verification. Reachability and behavioural verification belong to Marketplace Test Lab.

## Offer

`ServiceOffer` is independent from `AgentService`.

v0.10.0 does not parse prose into prices. If the registry does not provide a structured Spotriq-compatible commercial offer, the state is:

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

## Deterministic readiness checks

Each service candidate receives a versioned readiness snapshot with explicit checks:

1. `BSC_NETWORK`
2. `CANONICAL_IDENTITY`
3. `ACTIVE_METADATA`
4. `MACHINE_ENDPOINT`
5. `PERMISSION_PROFILE`
6. `MARKETPLACE_TESTS`

Readiness method:

```text
marketplace.service-readiness@1.0.0
```

Normalization method:

```text
marketplace.agent-service-normalization@1.0.0
```

## State rules

- canonical identity mismatch → `SUSPENDED`
- registration explicitly inactive → `SUSPENDED`
- BSC Testnet identity → `TESTNET_ONLY`
- missing/failed required production gates → `LIMITED`
- `READY` is deliberately unreachable in v0.10.0

All registry-derived candidates have:

```text
activationEligible = false
```

until Marketplace Test Lab and explicit authority requirements are implemented.

## Evidence boundaries

- ERC-8004 registry reads → canonical/onchain identity evidence.
- 8004scan discovery/reputation → external indexed evidence.
- registry capability/category text → operator-supplied claim.
- normalization/readiness → Marketplace Derived evidence.
- future Spotriq endpoint/test executions → Marketplace Observed evidence.

Readiness is not a trust score and does not predict profitability.

## Explore behaviour

Explore now shows three concepts without collapsing them:

1. Sample/reference services from the Figma product baseline, clearly labelled sample data.
2. Normalized live financial service candidates, with readiness gates and activation blocked.
3. Raw live ERC-8004 registry identities, including identities with no supported financial category hint.

`Check readiness` fetches the specific service again, allowing the registry adapter to enrich it with canonical verification before recomputing deterministic readiness.

## API

- `GET /v1/marketplace/status`
- `GET /v1/listings`
- `GET /v1/services`
- `GET /v1/services/:serviceId`
- `GET /v1/services/:serviceId/readiness`
- `GET /v1/services/:serviceId/evidence`
- `GET /v1/services/:serviceId/tests`

## Persistence

Migration `0008_marketplace_service_readiness.sql` persists the distinct supply resources in PostgreSQL without requiring a database for local development.
