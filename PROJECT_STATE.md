# Spotriq Project State

**Current implementation release:** v0.23.0  
**Implementation status:** Commercial Hiring + Marketplace Activation Kernel implemented; dependency-aware local validation and external v0.23 acceptance pending.  
**Last state update:** 2026-08-31  
**Repository role:** Concise present-state map. Current repository remains implementation truth.

## 1. Product position

Spotriq is a **BSC financial-agent marketplace** for understanding a wallet need, discovering specialist financial AgentServices, evaluating evidence, hiring/activating a service relationship, controlling financial authority, monitoring activity and measuring outcomes.

Core lifecycle:

`Understand → Discover → Match → Evaluate → Compare → Try → Authorize → Hire / Activate → Monitor → Measure → Reassess`

Locked separation:

`AgentIdentity ≠ AgentListing ≠ AgentService ≠ Offer`

`Offer ≠ Quote ≠ Hire ≠ Payment ≠ Activation`

`Permission ≠ Activation ≠ Execution`

`AgentAction ≠ Blockchain Transaction ≠ Outcome`

`Evidence ≠ AI explanation`

AI may explain; deterministic systems decide readiness, authority, payment reconciliation, activation eligibility and financial truth.

## 2. Applications and packages

### Applications

- `apps/web` — React/Vite marketplace UX.
- `apps/api` — Fastify API.
- `apps/worker` — worker seam.

### Core packages

- `@spotriq/domain` — canonical types.
- `@spotriq/api-contracts` — typed REST contracts.
- `@spotriq/config` — environment/configuration.
- `@spotriq/db` — PostgreSQL + migrations.
- `@spotriq/evidence` — evidence/provenance/freshness.
- `@spotriq/chain` — BSC reads.
- `@spotriq/protocol-pancakeswap` — PancakeSwap adapter.
- `@spotriq/protocol-venus` — Venus adapter.
- `@spotriq/market-context` — Grid/TWAP market context.
- `@spotriq/smart-money` — Smart Money Check / Findings.
- `@spotriq/agent-registry` — ERC-8004 + 8004scan discovery/verification.
- `@spotriq/marketplace-supply` — listings/services/offers/readiness/Test Lab.
- `@spotriq/reference-agents` — four deterministic first-party A2A services.
- `@spotriq/commercial` — v0.23 Offer/Quote/Hire/Payment/Activation kernel.
- `@spotriq/service-tasks` — A2A invocation/origin proof + optional Activation binding.
- `@spotriq/job-intents` — Finding/service → Job Intent.
- `@spotriq/authority` — bounded permissions/Altana reconciliation.
- `@spotriq/execution-plans`, `@spotriq/execution-guard`, `@spotriq/execution-boundary`, `@spotriq/controlled-execution` — reviewed guarded testnet execution spine.
- `@spotriq/activity-outcomes` — activity/outcome evidence.

## 3. Domain state

| Domain | State | Present implementation |
|---|---|---|
| AgentIdentity | LIVE | ERC-8004/8004scan discovery + canonical verification; first-party service identity can reconcile to real configured ERC-8004 identity |
| AgentListing | LIVE | external normalized listings + first-party reference listings |
| AgentService | LIVE | external supported-category candidates + four real first-party services |
| ServiceOffer | LIVE/PARTIAL | four reference services publish structured FREE read-only terms; external pricing remains undeclared unless evidenced |
| CommercialQuote | LIVE | immutable terms snapshot, hash, expiry, buyer/idempotency binding |
| CommercialHire | LIVE | idempotent Quote acceptance; distinct payment/permission state |
| PaymentEvidence | LIVE/PARTIAL | FREE=`NOT_REQUIRED`; ERC-8183 read-only reconciliation adapter; X402/B402 rails modeled but not live adapters |
| MarketplaceActivation | LIVE for FREE read-only | real API/database relationship; no signing/execution authority implied |
| BuyerCommercialState | LIVE | wallet-scoped Quotes/Hires/Payments/Activations |
| PermissionProfile | LIVE/PARTIAL | distinct from commerce |
| PermissionRequest/Grant | LIVE for Rebalancing | bounded authority path |
| ServiceTask | LIVE | A2A invocation/origin proof; may bind a legitimate active commercial Activation |
| AgentAction / Transaction | PARTIAL/LIVE for Rebalancing | controlled BSC Testnet execution evidence |
| Activity / Outcomes | LIVE/PARTIAL | execution-scoped evidence; long-horizon financial outcomes remain incomplete |
| SmartMoneyPlan | FOUNDATION | not end-to-end live |
| Operator workspace | FOUNDATION | not complete production workspace |

## 4. Four financial categories

### Rebalancing

Deepest category. Existing path reaches reviewed/bounded BSC Testnet execution and receipt/outcome evidence. v0.23 does not weaken or bypass that authority stack.

### Grid Trading

Real GridPilot A2A runtime + deterministic PancakeSwap V3/TWAP market context + Smart Money foundation. FREE read-only commercial Activation now exists; financial execution parity remains pending.

### Yield Optimisation

Real YieldPilot A2A runtime + Venus opportunity analysis + Smart Money foundation. FREE read-only commercial Activation now exists; deeper authority/action/outcome parity remains pending.

### Health Factor Monitoring

Real VenusGuard A2A runtime + Venus risk/health analysis + Smart Money foundation. FREE read-only commercial Activation now exists; long-lived monitoring/action parity remains pending.

## 5. v0.22 external reference acceptance

Completed external acceptance baseline for all four first-party reference services:

- public HTTPS runtime;
- A2A Agent Card;
- Marketplace Test Lab PASS;
- runtime/capability observation;
- Marketplace Observed evidence;
- BSC Testnet ERC-8004 registration;
- canonical on-chain verification;
- registration backlink/A2A endpoint reconciliation;
- stable Spotriq service ↔ real identity binding.

Reference financial readiness remains `TESTNET_ONLY`; existing financial `marketplaceActivationEligible` remains false. That flag is **not** reused for v0.23 read-only commercial relationships.

Known explicit identity fact retained in canonical handoff: RangeKeeper BSC Testnet ERC-8004 Agent ID `2017`, owner `0x08a594e828133D18A43918cc804754f46dAF44dB`. Other reference numeric IDs are not fabricated or hard-coded into this state document.

`pnpm verify:reference-acceptance` is included in v0.23 to re-check the deployed v0.22 acceptance contract.

## 6. v0.23 commercial kernel

Implemented lifecycle:

`AgentService → Offer → immutable Quote → idempotent Hire → Payment/Funding Evidence → Marketplace Activation → optional Activation-bound ServiceTask`

Four reference offers are:

- `commercialModel = FREE`
- `serviceType = READ_ONLY_SERVICE`
- `paymentRail = FREE`
- zero price
- no wallet signing requirement
- no financial authority requirement

Explore now exposes a real connected-wallet **Hire free read-only** flow through the API. Successful Activation explicitly records no wallet signing or financial execution authority.

Paid architecture remains adapter-based:

`Spotriq Commercial Kernel → CommercialPaymentAdapter → ERC-8183 / X402 / B402`

ERC-8183 is a read-only on-chain observer/reconciler in v0.23. It does not replace ERC-8004 identity and does not become Spotriq's universal job model. X402/B402 are represented but have no live adapter in this release.

See `docs/COMMERCIAL_HIRING_ACTIVATION.md`.

## 7. Persistence

- No `DATABASE_URL` → existing memory-store development fallback where supported.
- `DATABASE_URL` → PostgreSQL.
- Migrations `0001` through `0016` are present.
- Latest migration: `0016_commercial_hiring_activation.sql`.

Migration 0016 adds commercial Quotes/Hires/payment evidence, structured Offer terms, commercial fields on the existing Activation resource, and optional ServiceTask → Activation binding.

## 8. Network/deployment policy

- Marketplace discovery may use BSC Mainnet (`chainId=56`).
- Reference identity/execution acceptance remains BSC Testnet (`chainId=97`).
- Transactional/authority development remains testnet-first until explicit mainnet approval.
- Railway hosts the API/PostgreSQL; Vercel is the frontend deployment direction.
- Railway pre-deploy command remains `pnpm db:migrate`.

## 9. Verification and release state

Repository candidate includes:

- `node scripts/verify-foundation.mjs`
- `pnpm check`
- `pnpm verify:reference-acceptance`
- `pnpm verify:commercial-acceptance`

The current packaging environment cannot perform the dependency-aware workspace `pnpm check`; the user's local `pnpm check` is therefore the authoritative local validation gate.

**Do not call v0.23 externally accepted yet.** Required sequence:

`local pnpm check → commit/push → Railway deploy → migration 0016 → production health/capabilities → v0.22 reference verifier → v0.23 commercial verifier → record live acceptance`

## 10. Current milestone and next work

**Current:** v0.23.0 implementation candidate — Commercial Hiring + Marketplace Activation Kernel.

**Next acceptance gate:** local dependency-aware `pnpm check` on the replacement ZIP, followed by Railway deployment/migration and live commercial acceptance.

**Next product milestone after v0.23 acceptance:** **v0.24 — Four-Category End-to-End Activation Parity**.

The primary remaining product risk is vertical imbalance: Rebalancing still has materially deeper financial authority/execution/outcome infrastructure than Grid, Yield and Health. v0.24 must close that gap without collapsing commerce into permission or execution.
