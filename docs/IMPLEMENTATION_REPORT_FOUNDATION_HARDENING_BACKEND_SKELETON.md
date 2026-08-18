# Implementation Report — Foundation Hardening + Backend Skeleton

## Milestone
Spotriq Foundation Hardening + Backend Skeleton

## Status
Implemented in source. Local dependency install and full `pnpm check` must be run on the user's Windows machine because this execution environment cannot access the npm registry.

## What changed

1. Converted Spotriq from a single-package Figma export into a pnpm monorepo.
2. Moved the existing visual frontend intact to `apps/web`.
3. Promoted shared domain contracts into `packages/domain` while preserving a compatibility re-export for the Figma-derived UI.
4. Added a TypeScript Fastify API skeleton in `apps/api`.
5. Added a background worker skeleton in `apps/worker`.
6. Added centralized server configuration with safe local defaults and stricter production requirements.
7. Added shared API response/error/health contracts.
8. Added PostgreSQL pool, dependency health checks, transactional migration runner, and initial core schema migration.
9. Added `.env.example` and a proper `.gitignore` so local secrets and `node_modules` are not committed.
10. Added root orchestration commands for web/API/worker, checks, and database migration/health.
11. Aligned the frontend API client with `VITE_SPOTRIQ_API_URL` and the backend's normalized error envelope.
12. Configured Vite to read environment values from the monorepo root.
13. Added API injection tests for health and Spotriq metadata routes.
14. Added a structural verification script to catch accidental workspace/foundation regressions.

## Product invariants preserved

- Agent Identity remains separate from Agent Service.
- Permission Request remains separate from Permission Grant.
- Activation remains separate from permission state.
- Agent Action remains separate from TransactionRecord.
- Transaction success remains separate from Outcome measurement.
- The frontend still uses normalized marketplace/domain resources rather than direct provider response shapes.
- No fake BSC/PancakeSwap/Venus/Altana integration was introduced.

## Primary files/directories added

- `apps/api/**`
- `apps/worker/**`
- `packages/domain/**`
- `packages/config/**`
- `packages/api-contracts/**`
- `packages/db/**`
- `.env.example`
- `.gitignore`
- `tsconfig.base.json`
- `scripts/verify-foundation.mjs`

## Validation completed in the build environment

- Foundation structural verification: PASS.
- TypeScript parser/no-check validation for web, API, worker, domain, config, API contracts, and database source: PASS.
- JSON package manifests parse correctly: PASS.
- Required workspace/import files exist: PASS.

## Validation that must be completed locally

Run:

```powershell
pnpm install
pnpm check
pnpm dev
```

Then verify:

- web: `http://localhost:5173`
- API: `http://localhost:3001/health`
- API metadata: `http://localhost:3001/v1/meta`

No PostgreSQL instance is required yet for those checks.

## Database migration
Do not run `pnpm db:migrate` until a PostgreSQL `DATABASE_URL` has been configured. The API can run without it during this milestone.

## Known intentional limitations

- Frontend marketplace screens still use the normalized demo repository.
- No live BSC chain adapter exists yet.
- Redis/BullMQ queues are not enabled yet.
- Worker is an operational skeleton only.
- PostgreSQL schema exists but no live database is required/configured yet.
- API product-data routes will be implemented once the evidence-backed data layer exists.

## Next milestone
BSC Chain Adapter + Evidence Engine.

## Dependency baseline selected for this milestone

- Fastify `5.10.0`
- `@fastify/cors` `11.3.0`
- node-postgres (`pg`) `8.22.0`
- `tsx` `4.23.1`
- dotenv `17.4.2`

These versions were selected against current upstream project documentation/release information at implementation time. The existing Figma frontend dependency set is otherwise preserved to minimize visual regression risk.
