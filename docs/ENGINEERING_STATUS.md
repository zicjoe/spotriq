# Spotriq Engineering Status

## Completed
- Figma Make product design
- Frontend stabilization and Spotriq naming
- Backend-fusion seams
- Windows pnpm native-dependency fix
- Foundation Hardening + Backend Skeleton
- BSC Chain Adapter + Evidence Engine
- PancakeSwap Adapter — V3 + Infinity CL current-state normalization

## Current source of truth
Use Spotriq v0.4.0 produced after the PancakeSwap Adapter milestone.

## Current live-data spine
BSC JSON-RPC → Chain Adapter → PancakeSwap Adapter → Evidence Engine → normalized API contracts.

## Next
Smart Money Check Core + Rebalancing Finding Engine. Persist CheckSession, portfolio/liquidity snapshots, evidence, scan progress, and deterministic range findings. Railway PostgreSQL is appropriate to introduce at that stage.

## Rule
Every completed replacement becomes the new source of truth. Do not branch future implementation from an older Figma export or older replacement ZIP.
