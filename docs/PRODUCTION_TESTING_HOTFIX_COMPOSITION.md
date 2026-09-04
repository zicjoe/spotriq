# v0.39.0 production-testing hotfix composition

This replacement was rebuilt deliberately from the latest accepted production-testing wallet-session repository before applying the later core-runtime correction. It is **not** a new v0.40 milestone.

## Base used for composition

`Spotriq-v0.39.0-production-testing-wallet-session-preflight-hotfix.zip`  
SHA-256: `b6da135c8be65f4053816145d6be6ef7d77235f44d87ad3200eb83c6539eed07`

This base supplied the zero-service wallet architecture, session preference, refresh reconciliation, cross-tab handling, production-testing preflight, Vercel deployment configuration, and all previously accepted v0.39 behavior.

## Later correction layered on top

The core-runtime changes from `Spotriq-v0.39.0-production-core-runtime-autopreflight-hotfix.zip` were then applied to the wallet-session base: service-task Test Lab auto-revalidation, explicit runtime retry behavior, its regression verifier, and the corresponding UI copy/launch behavior.

## Additional refresh hardening from production evidence

Manual production testing showed that the previous wallet lifecycle mock assumed every EIP-6963 wallet would re-announce itself after refresh. The current implementation removes that assumption:

- it still prefers the remembered EIP-6963 provider by stable `rdns`;
- it waits briefly for asynchronous provider announcements;
- when the preferred provider does not re-announce but `window.ethereum` remains available, Spotriq performs only non-interactive `eth_accounts`/`eth_chainId` reconciliation;
- a one-way SHA-256 account fingerprint stored locally prevents the fallback from silently binding to a different injected account;
- raw wallet addresses are not stored in the wallet-provider preference;
- refresh never calls `eth_requestAccounts`;
- explicit Spotriq disconnect removes the preference and prevents silent reconnection.

## Required combined gates

```powershell
pnpm verify:wallet-session
pnpm verify:core-runtime-flow
pnpm preflight:production-testing
pnpm check
```

`pnpm verify` includes the wallet architecture, strengthened wallet-session lifecycle and core-runtime-flow verifiers so the two hotfix families must coexist in the same repository.
