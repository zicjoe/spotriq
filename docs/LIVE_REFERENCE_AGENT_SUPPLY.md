# Live Four-Category Reference Agent Supply

Release: **v0.22.0**

## Purpose

v0.22.0 restores the four-category marketplace sequence defined in Spotriq's foundation without discarding the deeper Rebalancing execution work built in v0.14–v0.21.

The long-standing reference names are now backed by real first-party, machine-callable runtime contracts inside the Spotriq API:

| Reference service | Category | Deterministic runtime action | Protocol data source |
|---|---|---|---|
| RangeKeeper | Rebalancing | `analyze_position` | PancakeSwap V3 position/current range state |
| GridPilot | Grid Trading | `analyze_market` | PancakeSwap V3 current/TWAP market context |
| YieldPilot | Yield Optimisation | `scan_opportunities` | Venus wallet-relevant supply opportunities/current base APY |
| VenusGuard | Health Factor Monitoring | `inspect_health` | Venus lending position/liquidity/shortfall state |

These are decision-support runtimes. They do not receive a wallet signer, broadcast financial transactions, invent historical performance, or convert a runtime response into marketplace Activation.

## Runtime contract

The API exposes:

```text
GET  /v1/reference-agents
GET  /v1/reference-agents/:slug/.well-known/agent-card.json
POST /v1/reference-agents/:slug/a2a
```

Each service publishes an A2A Agent Card. The marketplace records the discovery-document URL as the service endpoint; the card points to the same-origin JSON-RPC interaction URL.

Supported JSON-RPC methods:

- `spotriq.run` — explicit Spotriq read-only action envelope;
- `SendMessage` / `message/send` — A2A-style synchronous message/task operation.

Reference tasks are synchronous in this release. `GetTask`/cancel-style methods return an explicit unsupported response rather than simulating persistence that does not exist.

## Marketplace integration

Reference services do **not** bypass the marketplace domain model. They are injected into the normal marketplace-supply reader as `origin = REFERENCE` records and flow through:

```text
first-party definition
  → AgentIdentity representation
  → AgentListing
  → AgentService
  → PermissionProfile
  → Offer state
  → ReadinessSnapshot
  → Marketplace Test Lab coverage
  → Finding compatibility / Explore
```

The service declaration is versioned Marketplace Derived evidence. Public reachability/protocol/capability observations still come from Marketplace Test Lab.

### Explicit identity boundary

The in-repository first-party identity uses the `marketplace` namespace and `sourceKind = MARKETPLACE_REFERENCE`.

It is **not** labelled ERC-8004 verified.

Spotriq does not fabricate:

- an ERC-8004 `agentId`;
- registry owner evidence;
- an 8004scan reputation history;
- deployment reachability;
- commercial pricing;
- payment;
- Activation.

The readiness gate therefore keeps canonical ERC-8004 identity `UNKNOWN` and `marketplaceActivationEligible = false` until deployment/registration/reconciliation work supplies those independent facts.

## Authority contract

All four v0.22 reference runtimes declare:

```text
executionMode = READ_ONLY
commercial state = UNDECLARED
marketplace activation = false
```

Their runtime code only invokes existing Spotriq protocol readers. It is not a shortcut into the Rebalancing financial signer or Altana execution boundary.

RangeKeeper can describe current LP/range state, but actual Rebalancing financial execution still belongs to the separately reviewed Job Intent → Permission → Execution Plan → Boundary → Controlled Execution architecture.

GridPilot does not autonomously trade.

YieldPilot reports current supported protocol rate/opportunity state and does not call current APY realised yield.

VenusGuard reports current risk/health evidence and does not silently perform a protective transaction.

## Public deployment and Test Lab

Local development defaults `PUBLIC_API_BASE_URL` to `http://127.0.0.1:3001`. The routes are callable locally, but Marketplace Test Lab intentionally rejects localhost/private addresses because remote marketplace testing has an SSRF-safe public-address policy.

For a deployed API, configure:

```env
PUBLIC_API_BASE_URL=https://YOUR_PUBLIC_SPOTRIQ_API_HOST
```

`PUBLIC_API_BASE_URL` is required and HTTPS-only when `SPOTRIQ_ENV=production`.

After deployment, each service can be submitted to Marketplace Test Lab through the existing service tests endpoint. Test Lab can independently observe the public Agent Card, protocol contract and category capability metadata. A PASS remains technical evidence only; it is not financial-performance proof or Activation.

## ERC-8004 / BNB Agent Studio deployment boundary

Current BNB Agent tooling supports TypeScript agents, A2A service surfaces and post-deployment ERC-8004 registration/verification. Spotriq v0.22 deliberately stops before claiming those on-chain registrations because a real public URL and operator/deployment wallet are required.

The reference runtime is structured so the next deployment step can register the public A2A discovery URL for each service. Registration should produce real on-chain identity evidence that Spotriq can reconcile rather than hard-coding a token ID into the repository.

BNB Agent Studio is therefore a compatible deployment/identity path, not the Spotriq marketplace architecture itself.

## Local smoke checks

With the API running:

```text
GET http://localhost:3001/v1/reference-agents
GET http://localhost:3001/v1/reference-agents/rangekeeper/.well-known/agent-card.json
GET http://localhost:3001/v1/reference-agents/gridpilot/.well-known/agent-card.json
GET http://localhost:3001/v1/reference-agents/yieldpilot/.well-known/agent-card.json
GET http://localhost:3001/v1/reference-agents/venusguard/.well-known/agent-card.json
```

Example RangeKeeper request:

```json
{
  "jsonrpc": "2.0",
  "id": "rk-1",
  "method": "spotriq.run",
  "params": {
    "action": "analyze_position",
    "input": { "tokenId": "POSITION_TOKEN_ID" }
  }
}
```

POST it to:

```text
http://localhost:3001/v1/reference-agents/rangekeeper/a2a
```

The other actions require their explicit category context:

- GridPilot: `poolAddress` and optional `walletAddress`;
- YieldPilot: `walletAddress`;
- VenusGuard: `walletAddress`.

## What v0.22 proves

v0.22 proves that Spotriq itself now ships real callable first-party service supply across all four required categories and feeds that supply through the marketplace domain/readiness/matching surfaces.

It does **not** prove that the four services are already:

- publicly deployed;
- ERC-8004 registered;
- externally reputed;
- paid/hired;
- financially authorized;
- activated.

Those distinctions are intentional.
