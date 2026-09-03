# Spotriq v0.39.0 — Production Testing Wallet Session Hotfix

Status: post-acceptance production-testing correction; no v0.40 feature milestone is introduced.

## Defect

The zero-service EIP-6963/EIP-1193 connection layer held the connected wallet only in module memory. A browser refresh therefore lost Spotriq's connected-wallet session even though the wallet had already authorized the dapp. Smart Money Check also continued to present a generic Connect Wallet action instead of visibly reusing the restored account.

## Correction

- Persist only a non-sensitive wallet-provider locator (`rdns` or legacy injected marker), never the wallet address.
- On refresh, reconcile the previously selected provider with non-interactive `eth_accounts` and `eth_chainId` calls. Do not call `eth_requestAccounts` merely because the page reloaded.
- Reconcile EIP-6963 providers by stable `rdns` rather than assuming a previous announcement UUID survives reload.
- Reconcile accountsChanged and chainChanged events; unsupported chains fail closed.
- Explicit `Disconnect from Spotriq` removes the provider preference so refresh does not reconnect.
- Reconcile connect/disconnect preference changes across tabs through the browser `storage` event.
- Smart Money Check subscribes to the wallet session and presents the already-connected account as the check target.
- Header wallet UI exposes a short restoring state instead of falsely appearing disconnected during silent reconciliation.

## Authority invariant

Wallet connection and restoration identify an account only. They do not create a Quote, Hire, Payment, Activation, PermissionRequest, PermissionGrant, transaction, or financial execution authority.

## Automated verification

`pnpm verify:wallet-session` behaviorally covers:

- rejected connection;
- successful EIP-6963 connection;
- no address persistence;
- refresh restoration without a second approval prompt;
- account changes;
- BSC Mainnet/Testnet chain changes;
- unsupported-chain fail-closed behavior;
- explicit Spotriq disconnect;
- no reconnect after explicit disconnect;
- cross-tab connect/disconnect reconciliation;
- legacy EIP-1193 fallback.

Use `pnpm preflight:production-testing` before manual production testing. Human testing remains required for actual browser-extension/mobile wallet UI, third-party provider behavior, deployment behavior, responsive visuals, and comprehension.
