# Spotriq Source of Truth

This project is Spotriq v0.5.1 and supersedes Spotriq v0.5.0.

Use this project as the only source of truth for the next engineering milestone.
Do not merge future work back into older Figma exports or replacement ZIPs.

Current stage:
Smart Money Check Core + Rebalancing Finding Engine complete, with the Windows/runtime workspace hotfix applied. The live read-only BSC wallet check persists/streams source progress and generates deterministic evidence-backed Rebalancing findings from supported PancakeSwap V3 positions.

Hotfixes in v0.5.1:
- @spotriq/smart-money exports its TypeScript source entrypoint for tsx workspace development.
- Worker stays alive through its referenced heartbeat interval without an unsettled top-level-await warning.
- Ineffective app-level pnpm override removed.

Next stage:
Venus Adapter + Health Factor Monitoring foundation.
