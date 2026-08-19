# Spotriq v0.5.1 Runtime Hotfix

## Trigger
On Windows, `pnpm dev` started the web and worker processes but the API failed with `ERR_MODULE_NOT_FOUND` for `@spotriq/smart-money/index.js`. The worker also emitted an unsettled top-level-await warning, and the web package emitted a pnpm override-location warning.

## Root cause
`packages/smart-money/package.json` was the only consumed workspace library missing an `exports` entry. With no package export/main entrypoint, Node attempted the legacy default `index.js`, which is not emitted in Spotriq's source-first `tsx` development model.

## Fixes
- Added `exports: { ".": "./src/index.ts" }` to `@spotriq/smart-money`.
- Added a structural verifier assertion so this package-entrypoint regression fails `pnpm verify` in future.
- Reworked the worker keep-alive to use its referenced heartbeat interval instead of an intentionally unresolved top-level await.
- Removed the ineffective `pnpm.overrides` block from `apps/web/package.json`; Vite remains explicitly pinned in the app dependency.
- Bumped workspace/runtime version metadata to 0.5.1.

## Product impact
No product architecture, UI, Smart Money Check behavior, findings, persistence model, evidence semantics, or API contracts were removed or simplified. This is a runtime/package-resolution hotfix only.

## Local acceptance
Run:

```powershell
pnpm install
pnpm check
pnpm dev
```

Expected:
- Web starts on port 5173.
- API starts on port 3001 without `ERR_MODULE_NOT_FOUND`.
- Worker emits its heartbeat and stays alive without the unsettled top-level-await warning.
