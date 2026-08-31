# Spotriq Source of Truth

**Current repository release:** **v0.23.0**  
**Release status:** implementation candidate; local dependency-aware validation and external v0.23 acceptance pending  
**Updated:** 2026-08-31

This file records the current repository/runtime contract. The latest supplied repository/ZIP is implementation truth. `SPOTRIQ_FOUNDATION.md` remains the canonical product doctrine and `PROJECT_STATE.md` is the concise current-state map.

## Product

Spotriq is a **BSC financial-agent marketplace**.

Primary lifecycle:

`Wallet need → Finding → real AgentService → evidence/readiness → recommendation → Offer → Quote → Hire → payment where required → permission where required → Activation → ServiceTask/AgentAction → Transaction where applicable → Outcome`

Locked boundaries:

- `AgentIdentity ≠ AgentListing ≠ AgentService ≠ Offer`
- `Offer ≠ Quote ≠ Hire ≠ Payment ≠ Activation`
- `Payment ≠ Permission ≠ Activation ≠ Execution ≠ Outcome`
- `Finding ≠ Recommendation`
- `Evidence ≠ AI explanation`
- `Search relevance ≠ Capability proof`
- `Registry identity ≠ Marketplace readiness`

## Current applications

- API: Fastify (`apps/api`), production direction Railway.
- Web: React/Vite (`apps/web`), production direction Vercel.
- Worker seam: `apps/worker`.
- PostgreSQL is used when `DATABASE_URL` is configured; local memory fallbacks are retained where architecture supports them.

## Network truth

Two BSC contexts remain deliberately separate:

1. **Marketplace discovery:** may use BSC Mainnet, chain ID `56`.
2. **Reference identity / authority / transactional development:** BSC Testnet, chain ID `97`.

`AGENT_DISCOVERY_CHAIN_ID` and `REFERENCE_AGENT_REGISTRY_CHAIN_ID` must not be conflated. Mainnet transactional execution remains out of scope until explicitly approved.

## Four reference AgentServices

The repository contains four genuine first-party deterministic A2A services:

- **RangeKeeper** — Rebalancing — PancakeSwap concentrated-liquidity range/position analysis.
- **GridPilot** — Grid Trading — PancakeSwap V3/TWAP market-context analysis.
- **YieldPilot** — Yield Optimisation — supported current yield-opportunity analysis including Venus data.
- **VenusGuard** — Health Factor Monitoring — Venus lending/liquidation-risk monitoring.

The accepted v0.22 external contract established for all four:

- public HTTPS runtime;
- public A2A Agent Card;
- Marketplace Test Lab PASS;
- runtime/capability observation;
- Marketplace Observed evidence;
- BSC Testnet ERC-8004 registration;
- canonical on-chain verification;
- registration backlink/A2A endpoint reconciliation;
- stable AgentService ↔ ERC-8004 identity reconciliation.

The financial readiness state remains `TESTNET_ONLY` and the existing financial `marketplaceActivationEligible` flag remains false. This does not block v0.23's separate FREE read-only commercial relationship.

Known explicit acceptance fact: RangeKeeper is BSC Testnet ERC-8004 Agent ID `2017`, owner `0x08a594e828133D18A43918cc804754f46dAF44dB`. Do not infer numeric IDs for the other services from this document.

## v0.23 Commercial Hiring + Marketplace Activation Kernel

New package: `@spotriq/commercial`.

Implemented commercial state machine:

`ServiceOffer → CommercialQuote → CommercialHire → CommercialPaymentEvidence → MarketplaceActivation`

### Offer

Structured reusable terms. Four reference services now publish truthful:

- `commercialModel = FREE`
- `serviceType = READ_ONLY_SERVICE`
- `paymentRail = FREE`
- zero price
- no wallet signing requirement
- no financial authority requirement

External services remain undeclared unless structured commercial evidence exists.

### Quote

Immutable buyer-specific Offer snapshot with `termsHash`, expiry and idempotency key. Later Offer edits do not mutate the Quote.

### Hire

Buyer acceptance of one Quote. Idempotent retries return the same commercial relationship; a conflicting reuse of the key is rejected.

### Payment evidence

Payment is independent state. FREE records are `NOT_REQUIRED`, never fabricated as paid. Paid adapters must independently reconcile provider/on-chain evidence.

The kernel exposes a provider-neutral `CommercialPaymentAdapter` seam. v0.23 includes a read-only ERC-8183 observer/reconciler. X402/B402 are represented rails without live adapters.

### Marketplace Activation

v0.23 live Activation supports FREE read-only service relationships only. Activation requires a valid current Offer/Quote/Hire and deterministic readiness gates. It records:

- `walletSigningAuthorityGranted = false`
- `financialExecutionAuthorityGranted = false`

Financial services that require signing/authority remain gated by the separate Permission/authority architecture.

### ServiceTask binding

A ServiceTask may optionally be bound to an ACTIVE commercial Activation after service and buyer reconciliation. This binding does not make the task a payment, PermissionGrant, AgentAction, Transaction or Outcome.

## HTTP commercial resources

- `GET /v1/services/:serviceId/offers`
- `POST /v1/quotes`
- `GET /v1/quotes/:quoteId`
- `POST /v1/hires`
- `GET /v1/hires/:hireId`
- `GET /v1/hires/:hireId/payment`
- `POST /v1/hires/:hireId/payment/reconcile`
- `POST /v1/hires/:hireId/activate`
- `GET /v1/activations/:activationId`
- `GET /v1/accounts/:address/commercial-state`

The Explore UI uses the real Quote → Hire → Activation endpoints for **Hire free read-only**.

## Persistence truth

Migration history is immutable. Current latest migration:

`0016_commercial_hiring_activation.sql`

It adds:

- structured commercial terms on `service_offers`;
- `commercial_quotes`;
- `commercial_hires`;
- `commercial_payment_evidence`;
- commercial columns on the existing `activations` table;
- optional `service_tasks.activation_id`.

Railway pre-deploy command remains:

`pnpm db:migrate`

## Existing execution/authority truth

The deep Rebalancing path remains intact:

`Finding → compatible AgentService → Job Intent → real A2A ServiceTask/origin proof → bounded permission → reviewed execution plan → sealed execution boundary → scoped financial session → exact approval where needed → controlled BSC Testnet dispatch → independent receipt/post-state → activity/outcome evidence`

Commercial Activation does not bypass this chain.

## Error handling truth

The v0.22.2 Fastify fix that preserves framework/client 4xx responses remains required. Commercial domain errors are mapped to explicit 4xx/5xx outcomes; the API must not convert every client error into `500 INTERNAL_ERROR`.

## Verification truth

Root verification commands now include:

```powershell
pnpm check
pnpm verify:reference-acceptance
pnpm verify:commercial-acceptance
```

`verify:reference-acceptance` checks the deployed four-agent v0.22 contract.

`verify:commercial-acceptance` performs real FREE Offer → Quote → Hire → `NOT_REQUIRED` payment → read-only Activation checks and buyer commercial-state reconciliation. It requires an explicit buyer address and should be run only against a v0.23 API/migration deployment.

Repository/static verification alone is not external acceptance. v0.23 acceptance sequence is:

`pnpm check → commit/push → Railway deploy → migration 0016 → health/capability checks → reference verifier → commercial verifier → update project state with live evidence`

## Current roadmap position

- v0.22.x — external reference-agent acceptance: **complete**.
- v0.23.0 — commercial hiring/read-only Activation implementation: **repository candidate complete; acceptance pending**.
- v0.24 — Four-Category End-to-End Activation Parity: **next after acceptance**.

Do not broaden transactional work to BSC Mainnet without explicit approval.
