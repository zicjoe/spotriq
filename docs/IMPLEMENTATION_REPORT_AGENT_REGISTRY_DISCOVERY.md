# Implementation Report — ERC-8004 + 8004scan Agent Registry & Discovery

Release: **Spotriq v0.9.0**

## Objective

Add real BSC agent supply discovery while preserving Spotriq's identity/service/evidence boundaries.

## Implemented

### New package

`packages/agent-registry`

Provides:
- 8004scan indexed discovery;
- semantic search;
- owner-account lookup;
- external feedback normalization;
- direct ERC-8004 canonical identity verification;
- `data:` registration parsing/backlink verification;
- deterministic financial category metadata hints;
- memory/PostgreSQL caching stores;
- rate-limit-aware response caching.

### Shared domain

Added normalized resources for:
- discovered agents;
- registration references/services;
- canonical verification;
- external reputation summaries;
- external feedback;
- registry status;
- discovery pagination;
- category hints.

### Evidence

Added methods/freshness policies for:
- ERC-8004 identity evidence;
- 8004scan discovery evidence;
- indexed owner/feedback freshness;
- canonical owner/URI freshness.

### Database

Added migration `0007_agent_registry_discovery.sql`.

### API

Added:
- `GET /v1/registry/status`
- `GET /v1/agents`
- `GET /v1/agents/search`
- `GET /v1/agents/:chainId/:agentId`
- `GET /v1/agents/:chainId/:agentId/feedback`
- `GET /v1/accounts/:address/agents`

### Frontend

Explore now:
- labels current reference financial-service cards as Sample data/reference services;
- loads a separate live ERC-8004 discovery surface;
- supports backend semantic registry search;
- shows category metadata hints as Operator supplied;
- shows external feedback as 8004scan External evidence;
- supports a direct identity recheck action;
- states clearly that discovered identities are not yet activatable Spotriq services.

## Architecture decisions

1. **Discovery defaults to BSC Mainnet.** Marketplace supply needs real live BSC identities; transaction development can remain testnet-centric independently.
2. **8004scan is indexed discovery, not canonical truth.** Direct Identity Registry reads verify selected identities.
3. **Identity is not service.** A real ERC-8004 identity stays `DISCOVERED` / `NOT_CREATED` until financial service fields and readiness are known.
4. **External reputation stays external.** No opaque Spotriq trust score is created.
5. **Category inference is only a metadata hint.** It cannot bypass future capability/readiness tests.
6. **No arbitrary remote registration fetch.** Remote URI fetching is deferred until it can be hardened safely.
7. **Response caching protects external quota.** Live Explore does not fire a fresh external search on every render.

## Validation

Completed in the packaging environment:
- Spotriq structural verifier: passed;
- 99 TypeScript/TSX files syntax transpilation: passed;
- `@spotriq/agent-registry` semantic TypeScript check: passed;
- deterministic agent-registry runtime tests: 5/5 passed.

Runtime tests cover:
1. operator-claimed category-hint provenance;
2. indexed BSC discovery + external reputation separation;
3. canonical ERC-8004 owner/URI/backlink verification;
4. indexed-vs-canonical owner mismatch detection;
5. external feedback remaining separate from Spotriq reviews.

The user's local `pnpm check` remains the authoritative full installed-dependency validation before commit.

## Environment variables

```env
AGENT_DISCOVERY_CHAIN_ID=56
SCAN8004_BASE_URL=https://8004scan.io/api/v1/public
SCAN8004_API_KEY=
SCAN8004_TIMEOUT_MS=7500
AGENT_REGISTRY_MAINNET_RPC=
AGENT_REGISTRY_TESTNET_RPC=
```

No 8004scan key is required to start local development, but anonymous quota is limited by the external provider.

## Known limitations

- No Agent Service normalization/readiness yet.
- No real Smart Money agent compatibility/matching yet.
- No activation path for external discovered identities.
- No hardened remote HTTPS/IPFS registration metadata fetch.
- No marketplace test evidence for discovered external agents yet.

## Next milestone

Agent Service + Marketplace Listing/Readiness Engine.
