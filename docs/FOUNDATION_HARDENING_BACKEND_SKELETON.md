# Spotriq Foundation Hardening + Backend Skeleton

## Purpose
This milestone converts the stabilized Figma frontend into a real pnpm monorepo without changing the product experience. The frontend remains the visual source of truth, while backend, worker, domain, configuration, API-contract, and database boundaries now exist as first-class workspaces.

## Workspace layout

```text
apps/
  web/       Figma-derived Spotriq frontend
  api/       Fastify TypeScript application API
  worker/    background-worker process skeleton
packages/
  domain/        shared Spotriq domain contracts
  config/        validated server configuration
  api-contracts/ shared API envelope/health contracts
  db/            PostgreSQL client, health check, migration runner, migrations
```

## API skeleton
Current routes:

- `GET /health`
- `GET /v1/meta`
- `GET /v1/system/capabilities`

The API intentionally does not expose fake live marketplace routes yet. The frontend remains on normalized demo repositories until real BSC/evidence-backed endpoints are implemented.

## Database foundation
`0001_core_foundation.sql` establishes the first persistence spine for:

- users and wallets;
- agent operators, identities, listings, and services;
- evidence records;
- Smart Money Check sessions, snapshots, and findings;
- recommendation sessions/candidates;
- checkout, permission request, and permission grant separation;
- activation, agent action, and transaction separation;
- activity events;
- outcome windows and metrics.

The migration intentionally preserves the product invariants established in the master product specification.

## Local development without infrastructure
PostgreSQL, Redis, and BSC RPC configuration are optional during this milestone. The API and worker report dependencies as `not_configured` instead of crashing.

Production configuration is stricter and requires the core persistence and BSC RPC settings.

## Next milestone
BSC Chain Adapter + Evidence Engine foundation:

- BSC Testnet/Mainnet chain configuration;
- primary/secondary RPC failover;
- native/ERC-20 balances and canonical block/transaction reads;
- source registry;
- evidence envelopes;
- freshness policies;
- first evidence-backed API resources.
