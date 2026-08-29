# Spotriq v0.22.0 — Live Four-Category Reference Agent Supply Implementation Report

## Objective

Correct the largest foundation-to-current sequencing drift by replacing the four long-standing reference names as mere frontend fixtures with genuine first-party machine-callable AgentService supply, while preserving the existing evidence/readiness model and the deep Rebalancing execution spine.

## Implemented

### New `@spotriq/reference-agents` package

Added a first-party catalog and deterministic runtimes for:

- RangeKeeper — Rebalancing;
- GridPilot — Grid Trading;
- YieldPilot — Yield Optimisation;
- VenusGuard — Health Factor Monitoring.

Each runtime is backed by existing Spotriq protocol/data readers rather than an LLM making financial decisions.

### A2A-style service surfaces

Added:

```text
GET  /v1/reference-agents
GET  /v1/reference-agents/:slug/.well-known/agent-card.json
POST /v1/reference-agents/:slug/a2a
```

Agent Cards expose machine-readable category skills and a same-origin JSON-RPC interface.

### Marketplace-supply integration

`createMarketplaceSupply` now accepts first-party reference service records. Reference records are included in:

- listings;
- service discovery;
- category filtering;
- user search;
- Finding compatibility;
- service detail;
- readiness;
- evidence;
- Marketplace Test Lab.

Reference services use the existing `AgentListing`, `AgentService`, `PermissionProfile`, `Offer`, `ReadinessSnapshot` and evidence resources. No parallel fake marketplace model was created.

### Truthful identity/readiness semantics

Added an explicit first-party marketplace identity source distinct from ERC-8004.

Reference records are:

- `origin = REFERENCE`;
- `sourceKind = MARKETPLACE_REFERENCE`;
- `erc8004Verified = false`;
- `marketplaceActivationEligible = false`;
- `executionMode = READ_ONLY`;
- commercial Offer state `UNDECLARED`.

Canonical identity remains UNKNOWN until real post-deployment ERC-8004 registration/reconciliation exists.

### Evidence methods

Added versioned evidence methods for:

- first-party reference catalog publication;
- deterministic reference runtime behavior.

Marketplace Test Lab remains the independent Marketplace Observed runtime verifier.

### Public runtime configuration

Added `PUBLIC_API_BASE_URL`.

- local fallback: `http://127.0.0.1:3001`;
- production: explicit value is required and must use HTTPS.

This prevents production Agent Cards from accidentally advertising localhost.

### Explore UI

Explore now distinguishes:

- live first-party reference services;
- normalized external ERC-8004 financial services;
- discovery leads;
- raw live ERC-8004 identities;
- legacy sample fixtures when no live counterpart is present.

A live first-party service is labelled as such and explicitly states:

`First-party runtime ≠ ERC-8004 identity ≠ activation`

Legacy sample cards with the same names are suppressed when their live reference service is present.

### Persistence

No new migration was required. Existing flexible service/listing tables can persist first-party reference identities and `source_kind = REFERENCE`. PostgreSQL persistence creates a dedicated `spotriq-reference-agents` operator/identity representation before saving listings/services.

## Safety / scope boundaries

v0.22 does not:

- grant wallet authority to a reference runtime;
- route reference runtime calls through the financial signer;
- fabricate ERC-8004 registrations;
- fabricate external feedback;
- declare commercial prices;
- create paid jobs;
- create marketplace Activation;
- claim financial performance.

The deep Rebalancing execution path remains separate and unchanged.

## Validation performed in the packaging environment

Available validation performed before packaging includes:

- repository architecture verifier;
- TypeScript/TSX syntax transpilation across the repository;
- dedicated deterministic reference-agent unit tests where the local dependency environment permits execution;
- static/semantic review of marketplace integration, route contracts, production public-URL configuration, readiness gates and UI labeling;
- all package manifests aligned to `0.22.0`.

The packaging environment cannot download the project's dependency graph, so the user's local `pnpm check` remains the authoritative full workspace validation.

## Environment-bound acceptance still required

A repository cannot truthfully manufacture these external facts. After local validation, the public deployment acceptance for the four reference services is:

1. deploy the Spotriq API to a public HTTPS URL;
2. set `PUBLIC_API_BASE_URL` to that URL;
3. confirm all four Agent Cards are publicly reachable;
4. run Marketplace Test Lab for each reference AgentService;
5. register/reconcile genuine ERC-8004 identities for the public services using the chosen BNB Agent Studio/SDK deployment path;
6. retain `marketplaceActivationEnabled = false` until the later commercial/Activation contract is actually implemented.

## Next milestone

**v0.23.0 — Commercial Hiring + Marketplace Activation Kernel**

Build the truthful seam:

`AgentService → Offer/Quote → Commercial Hire/Job → funding/payment evidence → Activation → Activation-bound ServiceTask`

ERC-8183 and x402/B402 should be integrated only where their real semantics fit and should remain provider-neutral adapters rather than collapsing Spotriq's domain model.
