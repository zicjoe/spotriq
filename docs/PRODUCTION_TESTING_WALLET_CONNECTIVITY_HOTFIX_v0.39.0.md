# Spotriq v0.39.0 — Production-testing wallet connectivity hotfix

## Status

Post-acceptance production-testing correction. This does not create a v0.40 milestone and does not approve BSC Mainnet financial execution.

## Problem found during manual testing

The accepted v0.39 frontend exposed wallet-dependent product flows, but its original browser boundary relied on a single injected `window.ethereum` provider. That is insufficient when several browser wallets are installed and unavailable in an ordinary mobile browser that does not inject an EVM provider.

A short-lived implementation candidate added a hosted wallet-modal service. That approach was removed before deployment so Spotriq does not depend on a wallet-service project ID, subscription plan or hosted relay for its core connection path.

## Accepted correction

Spotriq now owns a small wallet-connection boundary using standards already implemented by EVM wallets:

- EIP-6963 multi-injected-provider discovery;
- legacy EIP-1193 `window.ethereum` fallback;
- explicit wallet selection when multiple compatible wallets are detected;
- app-level connected-account state reused by Spotriq wallet-dependent flows;
- account/chain reconciliation on provider events;
- local **Disconnect from Spotriq** behavior;
- BSC Mainnet (56) and BSC Testnet (97) wallet-session restriction;
- no hosted wallet SDK, WalletConnect relay, embedded-custody provider or wallet-service project ID.

On mobile, a relay-free web application cannot universally connect from an arbitrary Safari/Chrome tab to every wallet app. The zero-service-dependency path is to open Spotriq inside a compatible wallet app's built-in dapp browser. Read-only Smart Money Check remains available from any browser by entering a BSC address.

## Locked authority boundary

`Connect Wallet ≠ PermissionGrant ≠ Activation ≠ Payment ≠ Execution ≠ Transaction ≠ Outcome`

Connecting identifies the user's account to the frontend. It never authorizes an agent to move assets.

## Vercel deployment

The repository root now includes `vercel.json` for the frontend deployment. It:

- installs the pnpm workspace;
- builds `@spotriq/web`;
- serves `apps/web/dist`;
- rewrites `/v1/*` and `/health` to the existing Railway production API;
- falls back to `index.html` for the client-side SPA.

No wallet-specific Vercel environment variable is required.
