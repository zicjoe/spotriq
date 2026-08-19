# Spotriq Source of Truth

This project is Spotriq v0.6.0 and supersedes Spotriq v0.5.1.

Use this project as the only source of truth for the next engineering milestone. Do not merge future work back into older Figma exports or replacement ZIPs.

## Current stage

Venus Adapter + Health Factor Monitoring complete.

The live Smart Money Check now reads:

BSC wallet → PancakeSwap concentrated-liquidity state → Rebalancing findings

and

BSC wallet → Venus Core/Isolated lending state → canonical account shortfall + derived health factor → Health findings.

PostgreSQL remains optional for local development and is automatically used when `DATABASE_URL` is configured. Migration 0004 adds normalized Venus lending-position persistence.

## Next stage

Yield Optimisation data foundation, followed by Grid market-context data and then marketplace/agent discovery and recommendation matching.
