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
- v0.5.1 workspace/runtime hotfix for smart-money package export and worker lifecycle

## Current source of truth
Use Spotriq v0.5.1 produced after the Smart Money Check + Rebalancing runtime hotfix.

## Current live-data spine
BSC JSON-RPC → Chain Adapter → PancakeSwap Adapter → Evidence Engine → Smart Money Engine → persisted/live Rebalancing Finding → Spotriq Smart Money Check UI.

## Persistence
- No DATABASE_URL: in-memory local development store.
- DATABASE_URL configured: PostgreSQL persistence selected automatically.
- Railway PostgreSQL is now useful and recommended for durable checks/evidence/findings.

## Next
Venus Adapter + Health Factor Monitoring foundation, then extend Smart Money Check with real lending-risk findings.

## Rule
Every completed replacement becomes the new source of truth. Do not branch future implementation from an older Figma export or older replacement ZIP.
