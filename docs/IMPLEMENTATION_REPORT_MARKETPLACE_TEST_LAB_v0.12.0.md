# Spotriq v0.12.0 Implementation Report

## Milestone

**Marketplace Test Lab + Service Readiness Verification**

## Objective

Turn the previous `MARKETPLACE_TESTS = UNKNOWN` placeholder into real, bounded Marketplace Observed runtime evidence without weakening the existing trust model or executing uncontrolled financial actions.

## Implemented

### 1. Marketplace Test Lab engine

Added `packages/marketplace-supply/src/test-lab.ts` with:

- HTTPS-only endpoint policy;
- public-IP DNS validation;
- localhost/private/link-local/reserved network blocking;
- bounded redirects;
- request timeouts;
- response-size caps;
- A2A Agent Card discovery/validation;
- MCP 2026-07-28 `server/discover` support;
- MCP read-only `tools/list` capability observation;
- legacy MCP initialization fallback;
- deterministic category-capability matching;
- Marketplace Observed evidence envelopes;
- explicit PASS/PARTIAL/FAIL coverage.

### 2. Readiness engine upgrade

Added a new required readiness gate:

```text
RUNTIME_REACHABILITY
```

`MARKETPLACE_TESTS` is no longer permanently UNKNOWN. The latest persisted Test Lab coverage is applied to service list/detail/readiness responses.

Passing tests do not bypass authority. `PERMISSION_PROFILE` remains independent and current registry-derived services stay non-activatable while authority is undeclared.

### 3. Persistence

Added migration:

```text
packages/db/migrations/0009_marketplace_test_lab.sql
```

for immutable Test Lab run storage.

Memory storage also retains recent runs for local development.

### 4. API

Existing:

```text
GET /v1/services/:serviceId/tests
```

now returns the latest real coverage instead of a hard-coded placeholder.

Added:

```text
POST /v1/services/:serviceId/tests
```

which executes the bounded Test Lab and returns:

- test coverage;
- recomputed readiness.

### 5. Frontend

Live normalized financial service candidates now show:

- current marketplace-test state;
- passed contract-check count;
- `Run Test Lab` action for A2A/MCP candidates;
- updated readiness after the run;
- activation remains visibly blocked when other gates are missing.

The former “Marketplace tests not implemented yet” status was removed from the live candidate surface.

### 6. Evidence Engine

Added method:

```text
marketplace.test-lab@1.0.0
```

and freshness policies for runtime reachability, protocol contract and category capability observations.

### 7. Configuration

Added bounded Test Lab settings:

```env
MARKETPLACE_TEST_TIMEOUT_MS=5000
MARKETPLACE_TEST_MAX_RESPONSE_BYTES=256000
MARKETPLACE_TEST_MAX_REDIRECTS=2
```

No insecure-HTTP production escape hatch was added.

## Protocol references verified for this milestone

- A2A latest released protocol: 1.0.0, Agent Card available via standardized `/.well-known/agent-card.json` discovery.
- MCP current protocol: 2026-07-28, stateless core using `server/discover`; legacy initialization retained only as compatibility fallback.

## Validation performed in this environment

### Marketplace/Test Lab tests

15 targeted tests passed, covering:

- existing marketplace normalization behavior;
- targeted four-category supply discovery;
- partial upstream discovery failure;
- A2A Agent Card verification;
- MCP 2026-07-28 discovery + tool catalog;
- private-network/SSRF blocking;
- Test Lab persistence/readiness hydration;
- successful Test Lab coverage not bypassing undeclared permission authority.

### TypeScript

The modified marketplace/Test Lab source was checked with TypeScript successfully. Full workspace typecheck cannot be executed here because the uploaded ZIP contains no installed dependencies and this environment cannot reach npm to provision pnpm/packages. The only remaining error in the targeted package check was the pre-existing unresolved external `viem` module caused by missing dependencies, not a source error in the modified marketplace files.

### Structural verification

`scripts/verify-foundation.mjs` was updated to require the Test Lab implementation, migration, API route, frontend action and evidence method.

## Security limitations

Application-layer DNS validation cannot completely eliminate DNS rebinding/TOCTOU risk because the runtime HTTP client performs its own connection-time resolution. Production deployment should pair the application deny policy with network-level egress controls.

## Product meaning

A Test Lab PASS means:

> Spotriq observed at least one declared machine endpoint that satisfied endpoint safety policy, runtime reachability, protocol contract and category-relevant machine metadata checks.

It does **not** mean:

- the service is profitable;
- financial execution succeeded;
- the service is safe with arbitrary capital;
- the service has user authority;
- activation should be allowed.

## Next milestone

**Deterministic Smart Money Finding → AgentService compatibility/ranking**, followed by the first complete end-to-end financial vertical and explicit permission/authority integration.
