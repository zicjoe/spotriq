# BNB Agent Studio Integration

Spotriq v0.32 treats BNB Agent Studio as a normalized ecosystem integration, not as the marketplace domain itself.

## Trust boundary

`Studio declaration ≠ canonical identity ≠ AgentService readiness ≠ payment ≠ PermissionGrant ≠ execution ≠ outcome`

Operator Studio metadata is **Operator Supplied**. Decision-grade checks remain canonical ERC-8004 reads and Marketplace Observed Test Lab evidence.

## Supported Studio surface

Spotriq records BSC Testnet/Mainnet declarations using the current Studio deployment targets `bnb`, `aws`, and `azure`, and protocol compatibility for A2A, read-only MCP, x402, and ERC-8183. The `bnb` managed deployment target is treated as testnet-only.

Spotriq does not invoke `bag`, deploy infrastructure, store Studio keystores/passwords, sign Studio transactions, or auto-settle commerce.

## Reconciliation

A signed operator may import a Studio deployment only for an Operator Workspace service bound to an ERC-8004 identity they currently own canonically. Reconciliation checks:

- canonical ERC-8004 identity and current owner;
- BSC network consistency;
- AgentService binding;
- parsed A2A registration endpoint;
- Marketplace Test Lab coverage;
- operator-declared `bag deploy verify` state (kept Operator Supplied);
- MCP read-only posture;
- x402/ERC-8183 commerce alignment with the marketplace Offer;
- durable-storage posture.

A `VERIFIED` Studio reconciliation never grants financial authority or execution eligibility.

## Current upstream references used for v0.32

- BNB Agent Studio Quickstart: `https://docs.bnbchain.org/developer-kit/bnbchain-studio/quickstart/`
- BNB Agent Studio CLI Reference: `https://docs.bnbchain.org/developer-kit/bnbchain-studio/cli-reference/`
- BNB Agent Studio Security: `https://docs.bnbchain.org/developer-kit/bnbchain-studio/security/`
- BNB Agent SDK TypeScript Quickstart: `https://docs.bnbchain.org/developer-kit/bnbagent-sdk/quickstart-typescript/`

The upstream Studio/SDK is actively evolving. Spotriq therefore normalizes stable protocol facts and keeps Studio-specific declarations provider-isolated rather than spreading SDK/CLI types through the marketplace domain.
