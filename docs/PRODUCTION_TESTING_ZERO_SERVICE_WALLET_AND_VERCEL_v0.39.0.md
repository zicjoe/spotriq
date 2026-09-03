# Spotriq v0.39 Production Testing — Zero-service wallet + Vercel deployment

This production-testing hotfix removes Reown AppKit and all wallet-provider project-ID requirements.

Wallet connectivity now uses browser standards only:

- EIP-6963 discovery for multiple installed EVM wallets;
- legacy EIP-1193 `window.ethereum` fallback;
- BSC Mainnet (56) and BSC Testnet (97) enforcement;
- a mobile no-provider path that opens the current Spotriq URL in Trust Wallet's dapp browser;
- read-only Smart Money Check remains available when no wallet is connected.

There is no Reown, thirdweb or WalletConnect account/subscription dependency in the frontend.

`Connect Wallet ≠ PermissionGrant ≠ Activation ≠ Payment ≠ Execution ≠ Transaction ≠ Outcome`.

## Vercel

Deploy the Spotriq repository root as the Vercel Root Directory. The checked-in root `vercel.json` installs the pnpm workspace, builds `@spotriq/web`, publishes `apps/web/dist`, proxies `/v1/*` and `/health` to the existing Railway production API, and then applies the SPA fallback. No frontend API-base environment variable is required for this deployment shape.

Mainnet financial execution remains unapproved.
