# Spotriq v0.22.1 — Railway TypeScript Build Hotfix

## Purpose

Railway's clean monorepo build surfaced TypeScript errors that were not detectable in the earlier dependency-free syntax validation environment. This patch release fixes those compile-time defects without changing the v0.22.0 product scope or readiness/activation semantics.

## Fixes

1. Added `@spotriq/domain` as a direct `@spotriq/api` workspace dependency because API route modules import domain types directly.
2. Added a typed PostgreSQL query adapter in `apps/api/src/app.ts` so `pg` query results satisfy the generic store query interfaces without unsafe generic covariance assumptions leaking across package boundaries.
3. Updated the two API PancakeSwap test doubles to implement `quoteV3DecreaseLiquidity`, which became required by `PancakeSwapReader`.
4. Cast raw chain-call return data to viem `Hex` at ABI decode boundaries in ERC-8004 identity verification and Altana allowance verification.
5. Avoided an unreachable `never` access in the V3 execution guard by widening the decoded function name before defensive unsupported-function handling.
6. Made the API fallback error handler safe for `unknown` errors.

## Semantics preserved

- Four reference AgentServices remain deterministic/read-only.
- First-party runtime does not imply ERC-8004 identity.
- Recommendation does not imply readiness or activation eligibility.
- `marketplaceActivationEnabled` remains false.
- No database migration is introduced.

## Deployment note

Because this patch adds a direct workspace dependency to `apps/api/package.json`, run `pnpm install` locally before committing so `pnpm-lock.yaml` is regenerated/updated. Railway uses `pnpm install --frozen-lockfile`, so the updated lockfile must be committed.
