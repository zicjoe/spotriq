# Spotriq Marketplace Test Lab

Release: **v0.12.0**

The Marketplace Test Lab converts a declared machine runtime from an operator claim into bounded **Marketplace Observed** contract evidence. It deliberately does not execute financial actions, move funds, sign transactions, or infer profitability.

## Trust boundary

```text
Operator-declared A2A/MCP endpoint
        ↓
Endpoint safety policy
        ↓
Bounded reachability probe
        ↓
Protocol discovery + contract validation
        ↓
Category-relevant machine capability observation
        ↓
Marketplace Observed evidence
        ↓
Readiness recomputation
```

A passing Test Lab run means Spotriq directly observed a safe-to-probe remote endpoint, a valid supported protocol discovery contract, and machine-readable metadata relevant to the normalized financial category. It does **not** mean the agent is profitable, safe with arbitrary capital, or authorized to act for a user.

## Test states

Individual checks use:

- `PASS`
- `WARN`
- `FAIL`
- `SKIPPED`
- `INCONCLUSIVE`

Coverage uses:

- `NOT_RUN`
- `PASS`
- `PARTIAL`
- `FAIL`

A service receives overall `PASS` coverage only when at least one declared machine endpoint passes all required contract-level checks:

1. `ENDPOINT_POLICY`
2. `ENDPOINT_REACHABILITY`
3. `PROTOCOL_DISCOVERY`
4. `PROTOCOL_CONTRACT`
5. `CATEGORY_CAPABILITY`

## A2A verification

Spotriq uses the current A2A Agent Card discovery model. For a declared A2A endpoint, the Test Lab reads the standardized public Agent Card surface (`/.well-known/agent-card.json`) unless the registry already declares an Agent Card URL.

The Test Lab validates a compatible Agent Card shape, protocol/interface declaration, and category-relevant skill/description metadata. It does not send a task/message to the remote agent in this milestone.

Protocol reference used for v0.12.0 implementation: A2A latest released specification 1.0.0.

## MCP verification

Spotriq prefers the MCP **2026-07-28** stateless protocol revision:

1. `server/discover`
2. `tools/list`

No tool is called.

If the modern discovery path is unavailable, Spotriq can perform a bounded legacy MCP initialization fallback using the declared legacy protocol revision when available, otherwise `2025-11-25`, followed by a read-only tool catalog request when possible.

The Test Lab records the negotiated/observed protocol version as evidence. A valid MCP transport without readable category-relevant tool metadata remains `PARTIAL`/`INCONCLUSIVE`, not a capability proof.

## Category capability observation

Category matching is deterministic and based only on machine-readable A2A skills/descriptions or MCP tool metadata observed at runtime.

Supported top-level categories remain:

- Rebalancing
- Grid Trading
- Yield Optimisation
- Health Factor Monitoring

A category-capability PASS is still only contract evidence. It does not prove successful financial execution.

## SSRF / outbound request safety

Runtime endpoints are untrusted operator metadata. The Test Lab therefore applies a strict outbound policy:

- HTTPS only;
- absolute URL required;
- embedded credentials rejected;
- localhost / `.localhost` / `.local` rejected;
- loopback, private, link-local, carrier-grade NAT, documentation-only and reserved IPv4 ranges blocked;
- loopback, unique-local, link-local and documentation IPv6 ranges blocked;
- DNS resolution checked before every hop;
- redirects are manual, bounded and revalidated;
- response timeout enforced;
- response body size capped;
- no operator/user credentials forwarded;
- no arbitrary tool/task execution.

The application-layer DNS check reduces common SSRF paths but does not by itself eliminate DNS-rebinding/TOCTOU risk because the platform HTTP client resolves the hostname again when connecting. Production deployment should enforce the same deny policy at the network-egress layer.

Configurable bounds:

```env
MARKETPLACE_TEST_TIMEOUT_MS=5000
MARKETPLACE_TEST_MAX_RESPONSE_BYTES=256000
MARKETPLACE_TEST_MAX_REDIRECTS=2
```

There is intentionally no production option to enable insecure HTTP.

## Readiness integration

v0.12.0 readiness checks are:

1. `BSC_NETWORK`
2. `CANONICAL_IDENTITY`
3. `ACTIVE_METADATA`
4. `MACHINE_ENDPOINT`
5. `RUNTIME_REACHABILITY`
6. `PERMISSION_PROFILE`
7. `MARKETPLACE_TESTS`

`RUNTIME_REACHABILITY` and `MARKETPLACE_TESTS` are now fed by persisted Test Lab observations rather than endpoint declarations.

A passing Test Lab run cannot bypass `PERMISSION_PROFILE`. Registry-derived services therefore remain non-activatable while authority requirements are undeclared.

## Persistence

Migration:

```text
0009_marketplace_test_lab.sql
```

persists immutable Test Lab run payloads in `marketplace_service_test_runs`.

The latest run is rehydrated into service detail/list responses so readiness and test evidence survive process restarts when PostgreSQL is configured. Memory persistence remains available for local development.

## API

Read latest coverage:

```http
GET /v1/services/:serviceId/tests
```

Run the bounded Test Lab:

```http
POST /v1/services/:serviceId/tests
```

The POST response returns both the new test coverage and recomputed readiness snapshot.

The user cannot supply an arbitrary URL to this API. Spotriq tests only machine endpoints already normalized from the selected ERC-8004 service candidate.

## Evidence

Test Lab observations use:

```text
provenance = marketplace-observed
source = Spotriq Marketplace
method = marketplace.test-lab@1.0.0
```

Observed metrics currently include:

- `service.runtime_reachability`
- `service.protocol_contract`
- `service.category_capability`

All evidence carries explicit limitations separating runtime contract observation from financial execution/performance.
