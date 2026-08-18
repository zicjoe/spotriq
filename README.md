# Spotriq

**BSC financial-agent marketplace**

> Know what your money needs. Spot the right agent for it.

Spotriq is now a pnpm monorepo with the Figma-derived consumer frontend plus a backend/worker/persistence foundation designed for the real BSC financial-agent marketplace.

## Workspace

```text
apps/
  web/       React/Vite Spotriq product
  api/       Fastify TypeScript API
  worker/    background worker skeleton
packages/
  domain/        shared domain resources
  config/        server configuration
  api-contracts/ normalized API contracts
  db/            PostgreSQL foundation/migrations
```

## Windows PowerShell setup

From the repository root, for example `C:\dev\Spotriq`:

```powershell
pnpm install
pnpm check
pnpm dev
```

`pnpm dev` starts:

- Spotriq Web: `http://localhost:5173`
- Spotriq API: `http://localhost:3001`
- Spotriq Worker: local worker process/heartbeat

Useful API checks:

```text
http://localhost:3001/health
http://localhost:3001/v1/meta
http://localhost:3001/v1/system/capabilities
```

PostgreSQL, Redis, and BSC RPC credentials are intentionally optional for the current local-development milestone. The API reports unconfigured dependencies rather than failing.

## Run one process only

```powershell
pnpm dev:web
pnpm dev:api
pnpm dev:worker
```

## Environment

Copy `.env.example` to `.env` only when configuration is needed. Never commit `.env`.

The next milestone will introduce the real BSC chain/evidence data layer.

## Database

The first persistence migration is included, but do **not** run it until a PostgreSQL `DATABASE_URL` is configured.

Then:

```powershell
pnpm db:health
pnpm db:migrate
```

## Engineering documentation

- `docs/FIGMA_EXPORT_AUDIT.md`
- `docs/BACKEND_FUSION_CONTRACT.md`
- `docs/FOUNDATION_HARDENING_BACKEND_SKELETON.md`
- `docs/IMPLEMENTATION_REPORT_FOUNDATION_HARDENING_BACKEND_SKELETON.md`
- `docs/ENGINEERING_STATUS.md`

## Current data state

The consumer UI still uses clearly labelled normalized sample marketplace data. Real BSC/protocol/provider data begins in the next milestone; fake provider integration is deliberately avoided.
