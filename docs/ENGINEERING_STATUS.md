# Spotriq Engineering Status

## Completed
- Figma Make product design
- Frontend stabilization and Spotriq naming
- Backend-fusion seams
- Windows pnpm native-dependency fix
- Foundation Hardening + Backend Skeleton
- BSC Chain Adapter + Evidence Engine
- PancakeSwap Adapter — V3 + Infinity CL current-state normalization
- Smart Money Check Core + Rebalancing Finding Engine
- v0.5.1 workspace/runtime hotfix
- Venus Adapter + Health Factor Monitoring
- Yield Optimisation Data Foundation — wallet-relevant Venus current base supply-rate context + deterministic Yield findings

## Current source of truth
Use Spotriq v0.7.0.

## Current live-data spine
BSC JSON-RPC → Chain Adapter → protocol adapters → Evidence Engine → Smart Money Engine → persisted/live Findings → Spotriq UI.

Live financial categories:
1. Rebalancing — PancakeSwap LP range state
2. Health Factor Monitoring — Venus Core/Isolated lending risk
3. Yield Optimisation — Venus wallet-relevant supply opportunities with current base APY provenance

## Persistence
- No `DATABASE_URL`: in-memory local development store.
- `DATABASE_URL` configured: PostgreSQL persistence selected automatically.
- Migration 0004 adds normalized Venus lending snapshots.
- Migration 0005 adds normalized Yield opportunity snapshots.
- Railway PostgreSQL is recommended now for durable Smart Money Check history.

## Next
Grid Trading market-context foundation so all four required financial categories have a real data foundation before agent discovery/matching.

## Rule
Every completed replacement becomes the new source of truth.


## v0.8.0 — Grid Trading Market-Context Foundation

- Added `@spotriq/market-context`.
- Added PancakeSwap V3 pool reads and `observe()`-based 1h/6h/24h TWAP observations.
- Added deterministic Grid regime classification: `RANGE_LIKE`, `TRENDING_UP`, `TRENDING_DOWN`, `MIXED`, `INSUFFICIENT_HISTORY`.
- Added wallet-relevant Grid Smart Money findings and live scan source progress.
- Added Grid market-context API routes and PostgreSQL migration `0006_grid_market_context.sql`.
- All four required financial categories now have real data foundations.
- Explicit limitation: TWAP dispersion is not realised volatility and Grid context is not a profit forecast or recommendation.

Next: Railway PostgreSQL persistence, then ERC-8004/8004scan discovery + Agent Service listing engine.
