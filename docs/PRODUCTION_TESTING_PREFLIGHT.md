# Production testing preflight

Before a Spotriq production-testing replacement is handed to a human tester, automated checks should cover everything that can be validated without a real browser wallet, third-party UI, live production account, or human comprehension judgment.

Required release-candidate gates:

```powershell
pnpm verify
pnpm --filter @spotriq/web typecheck
pnpm --filter @spotriq/web build
pnpm --filter @spotriq/api build
pnpm check
```

The wallet lifecycle verifier exercises rejection, successful EIP-6963 connection, silent refresh restoration through `eth_accounts`, account changes, BSC chain changes, unsupported-chain fail-closed behavior, explicit Spotriq disconnect, no reconnect after explicit disconnect, provider-preference privacy, and legacy EIP-1193 fallback.

Human production testing remains necessary for behavior that cannot be faithfully emulated in repository tests: actual extension/mobile wallet UI, browser permission prompts, mobile dapp-browser deep links, Vercel/Railway deployment behavior, third-party runtime/provider availability, responsive visual quality, accessibility feel, and user comprehension. Human testing should confirm those boundaries rather than discover source regressions that the automated preflight could have caught.
