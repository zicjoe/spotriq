# Spotriq Commercial Hiring + Marketplace Activation

**Release:** v0.23.0  
**Status:** Repository implementation complete; dependency-aware local validation and external acceptance pending.

## Purpose

Spotriq v0.23 introduces the first truthful commercial lifecycle for an `AgentService`:

`AgentService → Offer → immutable Quote → idempotent Hire → Payment/Funding Evidence → Marketplace Activation → Activation-bound ServiceTask`

The lifecycle preserves the locked boundary:

`Payment ≠ Permission ≠ Activation ≠ Execution ≠ Outcome`

Commercial activation is therefore not a shortcut around the existing permission, financial-session, execution-boundary, transaction, or outcome systems.

## Domain resources

### Offer

A reusable set of commercial terms published by an `AgentService`. Structured terms include model, price/token, network, payment rail, service type, scope, availability, quote validity and `termsVersion`. Pricing is never inferred from prose.

### Quote

An immutable snapshot of an Offer for a buyer. The Quote records the exact terms and a deterministic `termsHash`. A later Offer edit cannot mutate an existing Quote.

### Hire

Buyer acceptance of a Quote. Quote/Hire/Activation creation uses buyer-scoped idempotency keys and deterministic identifiers so normal API retries do not manufacture duplicate commercial relationships.

### Payment / funding evidence

Payment state is independent from Hire and Activation. A FREE Offer records `NOT_REQUIRED`; this is deliberately not represented as `PAID` or `VERIFIED` payment.

Paid rails are provider-neutral adapters. A client cannot submit `paid=true` or an equivalent trusted flag.

### Marketplace Activation

Activation enables the hired Spotriq service relationship after deterministic gates pass. v0.23 live activation is limited to read-only service relationships that do not require financial permission or wallet signing.

An active read-only relationship records:

- `walletSigningAuthorityGranted = false`
- `financialExecutionAuthorityGranted = false`
- `activationKind = READ_ONLY_SERVICE_RELATIONSHIP`

## Four reference-service path

RangeKeeper, GridPilot, YieldPilot and VenusGuard publish truthful structured terms:

- `commercialModel = FREE`
- `serviceType = READ_ONLY_SERVICE`
- `paymentRail = FREE`
- price = zero
- no financial authority required
- no wallet signing required

A connected user can therefore execute the real API-backed path:

`View Offer → Get Quote → Hire → Activate FREE read-only relationship`

This does not change the separate financial/execution readiness flag on the AgentService. A service may be commercially active for read-only analysis while still being non-eligible for financial execution.

## Paid payment-adapter seam

The commercial kernel exposes a `CommercialPaymentAdapter` interface for:

- ERC-8183
- X402
- B402

The domain meaning of Quote, Hire and Activation does not change when a payment adapter changes.

### ERC-8183 observer

v0.23 contains a read-only ERC-8183 reconciliation adapter. It observes the configured BSC contract rather than trusting frontend claims. For an immutable Quote it reconciles job/client/provider/budget/payment-token/status facts and produces explicit evidence.

The adapter does not make Spotriq itself an ERC-8183 implementation and does not force discrete-job semantics onto long-lived monitoring relationships.

As of v0.31, X402/B402 have live **reconciliation** adapters. Spotriq does not sign or dispatch these payments; it verifies canonical BSC ERC-20 settlement evidence against the immutable Quote.

## Persistence

Migration `0016_commercial_hiring_activation.sql`:

- adds structured commercial terms to `service_offers`;
- creates `commercial_quotes`;
- creates `commercial_hires`;
- creates `commercial_payment_evidence`;
- extends the existing `activations` resource with commercial relationship fields;
- adds optional `activation_id` binding to `service_tasks`.

The commercial engine uses PostgreSQL when `DATABASE_URL` is available and a memory store where the existing development architecture supports it.

## HTTP resources

The v0.23 API exposes:

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

`ServiceTask` invocation can optionally bind a legitimate active Marketplace Activation after service/buyer checks.

## Security and retry behavior

The kernel currently enforces:

- normalized EVM buyer addresses;
- supported BSC chain IDs;
- immutable Quote terms hashes;
- Quote expiry;
- stale Offer rejection at activation;
- buyer/service identity checks;
- buyer-scoped Quote/Hire/Activation idempotency;
- duplicate external payment-reference rejection;
- payment-adapter reconciliation instead of client payment assertions;
- service/readiness checks before read-only Activation;
- explicit refusal to treat commercial state as permission or execution authority.

## Acceptance

Repository/static verification:

```powershell
node scripts/verify-foundation.mjs
```

Authoritative dependency-aware local verification:

```powershell
pnpm check
```

Existing v0.22 external reference acceptance:

```powershell
pnpm verify:reference-acceptance
```

v0.23 commercial acceptance, after the API is running with migration 0016:

```powershell
$env:SPOTRIQ_ACCEPTANCE_BASE_URL="http://localhost:3001"
$env:SPOTRIQ_ACCEPTANCE_BUYER_ADDRESS="0xYOUR_BSC_TEST_WALLET"
$env:SPOTRIQ_ACCEPTANCE_BUYER_CHAIN_ID="97"
pnpm verify:commercial-acceptance
```

External production acceptance is a separate gate and must not be inferred from repository validation.
