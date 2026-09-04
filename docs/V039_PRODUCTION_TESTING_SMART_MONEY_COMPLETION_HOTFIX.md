# Spotriq v0.39 Production Testing — Smart Money Completion Hotfix

This hotfix is layered on top of `Spotriq-v0.39.0-production-testing-consistent-wallet-runtime-hotfix.zip`.

It preserves the accepted wallet-session persistence and runtime auto-preflight corrections while fixing an observed production failure where Smart Money Check could remain on the final scan row indefinitely after the financial sources had already completed.

## Root cause addressed

SSE was treated too strongly as the completion signal. A terminal event could be missed/buffered, race between the initial event read and subscription, or be produced by a different API process. The browser then had no independent terminal-state reconciliation while the SSE connection remained open.

## Corrections

- lightweight check-status endpoint;
- browser status watchdog every ~0.9s during a live scan;
- a genuinely non-progressing SCANNING session surfaces recovery after 45 seconds instead of spinning indefinitely;
- SSE remains low-latency but is not authoritative for completion;
- API SSE database-backed event/session reconciliation every second;
- deduplicated SSE event sequence handling;
- concurrent persistence for independent normalized portfolio child snapshots;
- one terminal session finalization instead of redundant session updates;
- one final finding read instead of repeated reads;
- final scan copy renamed from `Agent compatibility` to `Preparing findings & agent matches` because actual compatibility ranking is on demand.

## Locked invariants preserved

- Finding ≠ AgentService;
- Search relevance ≠ Capability proof;
- Agent compatibility does not grant Activation or PermissionGrant;
- BSC Mainnet financial execution remains unapproved;
- wallet persistence and core-runtime auto-preflight remain required regression gates.


## Railway API build-contract correction

The Smart Money completion hotfix added `SmartMoneyEngine.getSession()` for lightweight terminal-state reconciliation. The API route tests use injected SmartMoneyEngine mocks, so those mocks must implement the same interface. Production testing exposed a Railway `tsc --noEmit` failure where two mocks had not been updated. They now implement `getSession`, and `verify:smart-money-completion` explicitly guards this compile contract so the packaged release cannot silently reintroduce that mismatch.
