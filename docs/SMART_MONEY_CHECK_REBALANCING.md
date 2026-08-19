# Smart Money Check Core + Rebalancing Finding Engine

Spotriq v0.5.0 turns the existing Smart Money Check design into a live, read-only BSC scan for the currently supported financial data spine.

## Live flow

```text
Wallet address / connected EVM wallet
        ↓
POST /v1/checks
        ↓
CheckSession
        ↓
BSC native balance read
        ↓
PancakeSwap V3 wallet position discovery
        ↓
Normalized PortfolioSnapshot
        ↓
Evidence persistence
        ↓
Deterministic Rebalancing finding generation
        ↓
GET /v1/checks/:id
        ↓
Live Spotriq Smart Money Check UI
```

## Current coverage

Live:
- BSC native BNB/tBNB balance.
- PancakeSwap V3 concentrated-liquidity wallet discovery.
- PancakeSwap V3 current LP state.
- Rebalancing range-state findings.
- Evidence/provenance/freshness for the underlying position state.

Explicitly partial/not yet supported:
- Wallet-wide ERC-20 discovery.
- Infinity CL wallet-wide discovery.
- Venus lending positions.
- Historical market context.
- Agent compatibility/recommendation matching.
- USD LP valuation.
- Complete live fee accrual.
- Historical time-in-range/profitability.

Spotriq therefore completes live checks as `PARTIAL` at this stage unless both current source reads fail. `PARTIAL` is a truthful coverage state, not an error.

## Finding method

Method: `smart-money.rebalancing-finding@1.0.0`

Inputs:
- current PancakeSwap pool tick;
- position lower tick;
- position upper tick;
- position liquidity;
- already-derived deterministic `liquidity.range_state` evidence.

Mappings:
- `OUT_OF_RANGE_BELOW` / `OUT_OF_RANGE_ABOVE` → Needs Attention.
- `NEAR_LOWER` / `NEAR_UPPER` → Needs Attention.
- `IN_RANGE` → Healthy.
- `NO_LIQUIDITY` → Informational.

The method never treats out-of-range state by itself as proof of financial loss and never labels partial portfolio coverage as globally safe.

## Persistence

Without `DATABASE_URL`, the API uses `MemorySmartMoneyStore`. This is suitable for local development but is lost when the API process restarts.

With `DATABASE_URL`, the API automatically uses `PostgresSmartMoneyStore` and persists:
- CheckSession;
- source progress/coverage;
- PortfolioSnapshot;
- EvidenceRecord;
- Finding;
- CheckEvent.

Run `pnpm db:migrate` after configuring a new PostgreSQL database.

## Realtime

`GET /v1/checks/:checkSessionId/events` supports:
- ordinary JSON event replay when requested normally;
- Server-Sent Events when the request accepts `text/event-stream`.

The web frontend uses SSE and falls back to polling if the stream is interrupted.

## Safety boundary

Smart Money Check remains read-only. It does not sign, authorize, activate, or execute a transaction.
