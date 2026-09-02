# Architecture and Trust Boundaries

## Product

Spotriq is a **BSC financial-agent marketplace** that helps a wallet understand what it needs, discover specialist financial AgentServices, evaluate evidence, hire/activate a service, review scoped authority, monitor activity, measure defensible outcomes and decide whether to continue, switch, combine or revoke.

Lifecycle:

`Understand → Discover → Match → Evaluate → Compare → Try → Quote → Hire → Activate → Permission Checkout → guarded execution where independently authorized → Activity → Outcome → grounded explanation → Continue / Switch / Combine / Revoke`

The four first-class financial categories are Rebalancing, Grid Trading, Yield Optimisation and Health Factor Monitoring.

## Core architecture

```text
Wallet / Operator
      │
      ▼
Spotriq Web
      │
      ▼
Fastify API ───────────────► PostgreSQL
      │                         │
      ├── BSC evidence/RPC      ├── immutable/reconciled marketplace state
      ├── PancakeSwap           ├── activity/outcomes/advantage history
      ├── Venus                 └── observability/queue/rate-limit state
      ├── ERC-8004 discovery
      ├── Marketplace Test Lab
      ├── Commercial adapters (FREE / ERC-8183 / x402 / B402)
      ├── Permission + execution guards
      ├── Grounded AI explanation
      └── Operational health
```

## Locked separations

- `AgentIdentity ≠ AgentListing ≠ AgentService ≠ Offer`
- `Offer ≠ Quote ≠ Hire ≠ Payment ≠ Activation`
- `PermissionProfile ≠ PermissionRequest ≠ PermissionGrant`
- `Permission ≠ Activation ≠ Execution`
- `AgentAction ≠ Blockchain Transaction`
- `Transaction ≠ Outcome ≠ Agent Advantage`
- `Finding ≠ Recommendation`
- `Evidence ≠ AI explanation`
- `Operational health ≠ marketplace readiness ≠ trust`
- `Agent Studio deployment ≠ canonical identity ≠ readiness ≠ payment ≠ PermissionGrant ≠ execution`
- `Production scalability ≠ BSC Mainnet financial execution approval`

**AI explains. Deterministic systems decide.**

## Network policy

- BSC Mainnet (`chainId=56`) may be used for real ERC-8004 marketplace discovery.
- BSC Testnet (`chainId=97`) remains the transactional/authority/reference-agent development network.
- v0.38 does **not** approve BSC Mainnet financial execution.
