# Spotriq v0.32.0 — Deeper BNB Agent Studio Integration

## Delivered

- `@spotriq/agent-studio` normalized adapter and persistence.
- migration `0025_agent_studio_integration.sql`.
- signed Operator Workspace import/list/reconcile routes.
- current canonical ERC-8004 owner revalidation on import/reconciliation.
- A2A registration + Marketplace Test Lab reconciliation.
- Studio network/target/protocol/MCP/commerce/storage checks.
- Operator Workspace UI for Studio deployment import and reconciliation.
- public Agent Studio integration status/capability truth.
- `pnpm verify:agent-studio`.

## Explicitly not delivered

- shelling out to the `bag` CLI;
- custody of Studio wallet material;
- marketplace readiness override;
- payment or financial execution dispatch;
- automatic creation of PermissionGrants or outcomes.

These remain separate trust boundaries by design.
