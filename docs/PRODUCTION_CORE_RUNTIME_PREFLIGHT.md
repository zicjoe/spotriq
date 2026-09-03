# Production Core Runtime Preflight — v0.39.0 hotfix

During the first real YieldPilot buyer journey, Spotriq correctly failed closed because the persisted Marketplace Test Lab PASS was older than the service-task one-hour freshness window. The buyer UI, however, exposed an active read-only relationship and a **Run read-only task** action without automatically refreshing the required runtime evidence. A second click would also have returned the same deterministic activation task instead of creating an explicit retry attempt.

The v0.39.0 production-testing hotfix preserves the safety boundary while removing that dead-end:

- the service-task engine checks whether the exact A2A Test Lab PASS set is fresh;
- if it is stale or missing, Spotriq runs the bounded Marketplace Test Lab automatically before any real task invocation;
- invocation still fails closed unless the fresh test produces endpoint reachability, protocol-contract and category-capability PASS evidence for the exact A2A endpoint;
- a buyer's first task uses the initial activation-task route;
- any later explicit **Run** action uses the retry route, so failed or completed observations can be refreshed without duplicating the marketplace Activation;
- wallet connection, Hire, Activation, PermissionGrant, transaction and financial outcome remain separate states;
- no financial execution authority is introduced by this hotfix.

Validation command:

```powershell
pnpm verify:core-runtime-flow
```

The full production-testing preflight continues to be:

```powershell
pnpm preflight:production-testing
pnpm check
```
