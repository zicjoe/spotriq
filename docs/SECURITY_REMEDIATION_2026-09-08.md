# Security remediation — 2026-09-08

This pass responds to the first public Dependabot and CodeQL runs after GitHub security automation was enabled.

## Dependency actions

- Removed unused `react-router` from `@spotriq/web` instead of upgrading dead code.
- Pinned Vite to `6.4.2`, the patched v6 line for the 2026 arbitrary-file-read advisory.
- Added pnpm overrides for patched `ws` 5/6/7/8 maintenance releases, including `8.21.0` for the tiny-fragment memory-exhaustion DoS.
- Added pnpm overrides for patched `fast-uri` 2/3/4 maintenance releases (`2.4.6`, `3.1.7`, `4.1.4`) covering the August/September 2026 host-confusion and SSRF advisories.
- CI now runs `pnpm audit --audit-level high` so a future High/Critical dependency advisory fails validation.

The lockfile must be regenerated with `pnpm install --no-frozen-lockfile` once after adopting this pass, then committed. Subsequent CI/deploys return to `--frozen-lockfile`.

## CodeQL actions

- Replaced the externally-derived agent slug regex with a bounded linear ASCII normalizer.
- Removed unnecessary persisted plan identifiers from acceptance-script logs.
- Added a CodeQL configuration that scans deployed application/package source and excludes local verification scripts/tests/generated artifacts.
- Excluded CodeQL's per-route `js/missing-rate-limiting` query because Spotriq applies one global Fastify `onRequest` limiter to every non-OPTIONS, non-`/health` API request. Source/test verifiers preserve that invariant.

## No domain-boundary relaxation

This remediation does not enable BSC Mainnet financial execution and does not alter identity/readiness/payment/permission/activation/execution/outcome separation.
