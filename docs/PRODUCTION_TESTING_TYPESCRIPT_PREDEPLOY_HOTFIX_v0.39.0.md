# Spotriq v0.39.0 — Production Testing TypeScript Pre-deploy Hotfix

Date: 2026-09-03

This post-acceptance production-testing hotfix corrects TypeScript build regressions discovered before the first Vercel deployment. It does not create a new product milestone and does not change Spotriq's financial authority or BSC mainnet execution policy.

## Corrected regressions

- Footer legal-route navigation now preserves the non-null `Route` type inside the click closure.
- Live marketplace comparison treats optional readiness checks as genuinely optional instead of assuming the array exists.
- Permission Checkout no longer renders an unreachable `ScopedPermissionRequest` explanation branch after the request-success early return; the grounded explanation is rendered inside the narrowed request-success state instead.
- The stale, unused `WalletConnectionDialog` from the superseded wallet draft was removed. The active wallet UI remains `WalletAccountControl` backed by the zero-service EIP-6963/EIP-1193 wallet handler.
- The legacy injected-wallet fallback is explicitly typed as `DiscoveredWallet`, preventing optional icon/RDNS fields from becoming incorrectly required through array inference.

## Invariants preserved

- Connect Wallet does not create PermissionGrant, Activation, payment, transaction or execution authority.
- No Reown, thirdweb or WalletConnect project/service ID is required.
- BSC Mainnet financial execution remains unapproved.
- Read-only/watch-only Smart Money Check remains available without connecting.

## Validation

Repository static verifiers passed in the packaging environment:

- `node scripts/verify-foundation.mjs`
- `node scripts/verify-wallet-connectivity.mjs`

The packaging environment could not download pnpm/npm dependencies, so the dependency-backed TypeScript and Vite build must be validated locally with the repository's normal commands before deployment.
