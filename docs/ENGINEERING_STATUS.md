# Spotriq Engineering Status

**Release candidate:** v0.23.0  
**Date:** 2026-08-31  
**State:** Commercial Hiring + Marketplace Activation Kernel implemented; local dependency-aware validation and external acceptance pending.

## Current system spine

Spotriq remains a BSC-focused TypeScript/pnpm monorepo:

`apps/web → apps/api → domain/service packages → evidence + chain/protocol adapters → PostgreSQL`

The authoritative product boundary remains:

`Payment ≠ Permission ≠ Activation ≠ Execution ≠ Outcome`

The new commerce work extends the existing `AgentService`, `ServiceOffer`, `activations` and `ServiceTask` architecture rather than creating a parallel marketplace state machine.

## Supply and identity

Four first-party deterministic reference AgentServices are live in the repository and were externally accepted in v0.22:

- RangeKeeper / Rebalancing
- GridPilot / Grid Trading
- YieldPilot / Yield Optimisation
- VenusGuard / Health Factor Monitoring

They have public A2A runtimes, Marketplace Test Lab evidence and reconciled BSC Testnet ERC-8004 identities. Their financial readiness remains `TESTNET_ONLY`; canonical identity does not equal financial activation eligibility.

External ERC-8004/8004scan discovery remains separate from first-party supply. Search relevance remains discovery evidence, not capability proof. External reputation remains external evidence.

## v0.23 commercial architecture

New workspace package:

`packages/commercial`

Core resources:

1. `ServiceOffer` — reusable structured commercial terms.
2. `CommercialQuote` — immutable buyer-specific snapshot with terms hash and expiry.
3. `CommercialHire` — idempotent acceptance of one Quote.
4. `CommercialPaymentEvidence` — independent funding/payment evidence.
5. `MarketplaceActivation` — enabled service relationship after commercial gates.
6. `BuyerCommercialState` — wallet-scoped commercial state aggregation.

Four reference offers are structured `FREE / READ_ONLY_SERVICE / FREE` offers with zero price and no financial/wallet signing authority requirement.

### Activation semantics

The v0.23 live activation path is deliberately limited to read-only service relationships. It checks current service/Offer coherence and readiness but does not use the existing financial `marketplaceActivationEligible` flag as a shortcut.

A successful reference activation records no signing or financial execution authority.

### Payment adapters

`CommercialPaymentAdapter` is provider-neutral.

- `FREE` — handled natively as payment `NOT_REQUIRED`.
- `ERC8183` — read-only BSC observer/reconciliation adapter implemented.
- `X402` — rail represented; live adapter not implemented.
- `B402` — rail represented; live adapter not implemented.

ERC-8183 reconciliation reads on-chain job/payment-token facts and compares client/provider/budget/token/status against the immutable Quote. A frontend payment claim cannot make a Hire paid.

## API

v0.23 adds:

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

Fastify error handling preserves framework/client 4xx responses from v0.22.2. Commercial errors have explicit mappings instead of becoming generic 500s.

## Frontend

Explore now supports a real connected-wallet **Hire free read-only** sequence:

`connect wallet → create Quote → create Hire → create Activation`

The success UI exposes the Activation ID and explicitly states that no wallet signing, transaction or financial execution authority was granted.

Financial/execution readiness is labelled separately so a FREE read-only commercial relationship is not visually confused with financial execution eligibility.

## ServiceTask integration

`ServiceTask` now supports optional commercial binding:

`Hire → ACTIVE MarketplaceActivation → ServiceTask`

The API validates that the Activation is active, belongs to the same buyer and targets the same AgentService before binding it. Origin-proof semantics remain intact.

## Database

Latest migration:

`0016_commercial_hiring_activation.sql`

Adds:

- `service_offers.terms` and `terms_version`;
- `commercial_quotes`;
- `commercial_hires`;
- `commercial_payment_evidence`;
- commercial fields/indexes on existing `activations`;
- optional `service_tasks.activation_id`.

Existing migrations were not mutated.

## Security / correctness coverage

The commercial kernel includes checks for:

- buyer address normalization;
- BSC chain validation;
- Quote expiry;
- immutable terms hashing;
- stale Offer rejection;
- wrong buyer / wrong service;
- buyer-scoped idempotency;
- idempotency conflicts;
- duplicate provider payment-reference reuse;
- missing payment adapters;
- paid Activation without verified payment;
- permission-required Activation;
- unavailable/degraded services;
- free-payment truth (`NOT_REQUIRED`, not `PAID`).

Unit tests in `packages/commercial/src/index.test.ts` cover the FREE path and representative retry/negative cases.

## Verification assets

Repository verifier:

`node scripts/verify-foundation.mjs`

Authoritative full workspace validation:

`pnpm check`

External reference contract:

`pnpm verify:reference-acceptance`

v0.23 commercial acceptance:

`pnpm verify:commercial-acceptance`

The packaging sandbox does not have a dependency-aware pnpm workspace available. `pnpm check` must therefore be run on the user's local repository before commit/deployment; any failures are source-fix gates, not instructions to weaken validation.

## Release / deployment gate

v0.23 is **not externally accepted yet**.

Required sequence:

1. local `pnpm install` + `pnpm check`;
2. commit/push;
3. Railway pre-deploy `pnpm db:migrate` applies migration 0016;
4. production health/capabilities check;
5. `pnpm verify:reference-acceptance`;
6. `pnpm verify:commercial-acceptance` with an explicit BSC Testnet buyer address;
7. record production acceptance in canonical state docs.

## Next milestone

After v0.23 external acceptance: **v0.24 — Four-Category End-to-End Activation Parity**.

Rebalancing remains substantially deeper in authority/execution/outcome infrastructure. Grid, Yield and Health must be brought closer to that depth without treating Hire/Activation as permission or giving a read-only service financial authority.
