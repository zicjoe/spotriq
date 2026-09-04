# Spotriq v0.39.0 — Production Testing: BSC Mainnet Read-Only Core

## Purpose

This production-testing capability lets Spotriq prove its core marketplace thesis against real BSC Mainnet state without enabling Mainnet financial execution.

Core path:

`real BSC wallet/address → Smart Money Check (56) → deterministic Finding → compatible AgentService → FREE Quote/Hire/Activation → read-only reference-agent task → Activity/Outcome evidence`

## Network separation

- **BSC Mainnet (56):** ERC-8004 discovery, supported Smart Money wallet/protocol observation, supported first-party reference-agent read-only analysis.
- **BSC Testnet (97):** Smart Money sandbox plus financial authority/execution development and controlled transaction testing.
- **BSC Mainnet financial execution:** **not approved / disabled**.

The configured API `BSC_NETWORK` can remain `testnet`; that setting continues to protect the authority/execution spine. Mainnet Smart Money/read-only reference reads use a separate chain-56 reader.

## Identity is not observation network

A first-party reference service's canonical ERC-8004 identity may currently be registered on BSC Testnet. That is an identity fact only. It does not mean its read-only protocol analysis must be Testnet-only.

Reference FREE Offers explicitly declare `readOnlyObservationChainIds: [56, 97]`. A Quote freezes one selected observation chain. The Activation carries that `serviceChainId`; activation-bound A2A task subjects use it to select Mainnet or Testnet PancakeSwap/Venus/Grid readers.

## Authority guarantees

Mainnet read-only mode does not:

- request token approvals;
- create/reconcile a financial PermissionGrant;
- give an AgentService wallet signing authority;
- prepare Mainnet financial dispatch as authorized execution;
- submit a Mainnet transaction;
- infer a financial outcome from a read-only observation.

`@spotriq/financial-execution-adapters` still requires API chain `97` **and** Activation service chain `97`. Controlled execution remains explicitly `testnet` / chain `97`.

## Deployment

No database migration is required for this production-testing capability. No Reown/thirdweb/WalletConnect project ID is introduced.

The existing BSC chain adapter may use configured RPC overrides. When a dedicated Mainnet override is absent, the existing public BSC fallback posture remains available; operators should still use production-grade RPCs for larger real cohorts.

## Validation

Run:

```powershell
pnpm verify:mainnet-read-only
pnpm preflight:production-testing
pnpm check
```

Manual acceptance should first use a real wallet/address with **Mainnet read-only** selected. Confirm that findings and reference runtime results are tagged/routed to chain 56, while any financial execution path remains blocked.
