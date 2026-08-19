# ERC-8004 + 8004scan Agent Registry & Discovery

## Purpose

Spotriq v0.9.0 introduces a live marketplace-supply foundation without weakening the distinction between **agent identity** and **financial service**.

The flow is:

```text
8004scan indexed discovery
        ↓
normalized DiscoveredAgent
        ↓
selected identity
        ↓
direct ERC-8004 registry verification
        ↓
identity evidence / metadata hints
        ↓
future Agent Service + readiness layer
```

A discovered identity is not automatically an activatable Spotriq service.

## Sources and authority

### 8004scan

Used as an external indexed source for:
- listing/filtering BSC agent identities;
- semantic search;
- owner-account discovery;
- external feedback/reputation summaries.

All 8004scan-derived reputation/feedback remains `External` provenance. Spotriq does not convert `total_score`, stars, or feedback counts into a marketplace trust score.

### ERC-8004 Identity Registry

Used for direct canonical verification of a selected identity:
- `ownerOf(agentId)`;
- `tokenURI(agentId)`;
- optional `getAgentWallet(agentId)`.

For `data:` registration files Spotriq also parses the registration object and checks that the registration backlink contains the expected registry reference and agent ID.

Remote HTTPS/IPFS registration URIs are not fetched server-side in this milestone. This avoids introducing a broad remote-fetch/SSRF surface before a hardened metadata-fetch subsystem exists.

## Networks

Discovery defaults to BSC Mainnet (`chainId = 56`) so Explore can surface live BSC identities even while transactional engineering continues primarily on BSC Testnet.

Configured registries:

- BSC Mainnet identity registry: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- BSC Mainnet reputation registry: `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`
- BSC Testnet identity registry: `0x8004A818BFB912233c491871b3d84c89A494BD9e`
- BSC Testnet reputation registry: `0x8004B663056A597Dffe9eCcC1965A193B7388713`

`AGENT_DISCOVERY_CHAIN_ID` can be `56` or `97`.

## Environment variables

```env
AGENT_DISCOVERY_CHAIN_ID=56
SCAN8004_BASE_URL=https://8004scan.io/api/v1/public
SCAN8004_API_KEY=
SCAN8004_TIMEOUT_MS=7500
AGENT_REGISTRY_MAINNET_RPC=
AGENT_REGISTRY_TESTNET_RPC=
```

The 8004scan key is optional. Anonymous access can be used during local development, subject to external rate limits.

## API

```text
GET /v1/registry/status
GET /v1/agents
GET /v1/agents/search?q=...
GET /v1/agents/:chainId/:agentId
GET /v1/agents/:chainId/:agentId/feedback
GET /v1/accounts/:address/agents
```

`GET /v1/agents/:chainId/:agentId` performs direct registry verification when a chain reader is available.

## Category hints

Spotriq may derive deterministic hints for:
- Rebalancing
- Grid Trading
- Yield Optimisation
- Health Factor Monitoring

from the agent's indexed/self-published name, description, protocol strings, and safe registration metadata.

These are always labelled `operator-claimed` and explicitly note that they are **not marketplace-tested capabilities**.

They are discovery aids, not activation eligibility.

## Explore UX

Explore now has two clearly separated sources:

1. **Reference services** — the Figma/reference financial services, labelled `Sample data`.
2. **Live ERC-8004 registry discoveries** — real indexed identities, labelled external/discovered and explicitly non-activatable until service normalization/readiness exists.

This prevents real identity records and design/demo services from being visually conflated.

## Caching and rate discipline

Spotriq caches indexed responses to avoid wasting external API quota:
- agent list: 60 seconds;
- semantic search: 45 seconds;
- detail: 120 seconds;
- feedback: 60 seconds;
- status/chains: 60 seconds.

The latest available rate-limit metadata is exposed through the registry status resource when provided by the index.

## Persistence

Migration `0007_agent_registry_discovery.sql`:
- expands `agent_identities` with registry/index/canonical metadata;
- creates `agent_discovery_cache`;
- creates `external_feedback_records`;
- creates `agent_registry_sync_runs`.

Memory-store fallback keeps local development usable without PostgreSQL.

## Explicit limitations

v0.9.0 does **not**:
- create an `AgentService` merely because an identity exists;
- treat metadata category hints as verified capability;
- activate discovered agents;
- run marketplace readiness tests;
- convert external feedback into Spotriq reviews;
- fetch arbitrary remote registration URLs server-side;
- enable Smart Money agent matching yet.

Those boundaries are intentional.

## Next milestone

Agent Service + Marketplace Listing/Readiness Engine.
