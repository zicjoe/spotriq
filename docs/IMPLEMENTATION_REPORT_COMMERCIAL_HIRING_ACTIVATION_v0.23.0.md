# Spotriq v0.23.0 Implementation Report
## Commercial Hiring + Marketplace Activation Kernel

**Implementation status:** Complete in repository candidate  
**External acceptance:** Pending local `pnpm check`, deployment, migration 0016 and live commercial acceptance

## Delivered

v0.23.0 adds the commercial state machine that was intentionally absent from v0.22:

`Offer → Quote → Hire → Payment/Funding Evidence → Activation`

It also introduces optional `Activation → ServiceTask` binding without changing the meaning of an existing ServiceTask, PermissionGrant, AgentAction, blockchain Transaction or Outcome.

### Domain and persistence

- Structured `CommercialOfferTerms` on `ServiceOffer`.
- Immutable buyer Quote with `termsHash`, expiry and idempotency key.
- Idempotent Hire bound to one Quote.
- Independent payment/funding evidence.
- Marketplace Activation stored in the existing `activations` resource.
- Buyer commercial-state aggregation.
- Migration `0016_commercial_hiring_activation.sql`.
- Memory and PostgreSQL commercial stores.

### Reference-service commercial path

All four accepted first-party services publish zero-price FREE read-only offers. The Explore UI now performs a real connected-wallet API sequence:

`create Quote → create Hire → activate`

The UI explicitly states that this relationship grants no wallet signing, transaction, or financial execution authority.

### Paid rail architecture

`@spotriq/commercial` contains a provider-neutral adapter interface. ERC-8183 is implemented as a read-only on-chain observer/reconciler; X402 and B402 remain represented rails without live adapters in this release.

ERC-8183 reconciliation compares on-chain facts against the immutable Quote rather than trusting a browser assertion. It keeps ERC-8183 job/payment evidence separate from ERC-8004 agent identity.

### ServiceTask binding

A ServiceTask invocation may carry `activationId`. The API asks the commercial engine to prove that the activation is ACTIVE, belongs to the same buyer and targets the same AgentService before the task is marked commercially bound.

Commercial binding does not give the remote service Spotriq's financial signer or bypass the existing execution boundary.

## Failure and security behavior

Implemented negative behavior includes:

- invalid/malformed buyer address rejection;
- unsupported buyer chain rejection;
- wrong buyer rejection;
- wrong Offer/service rejection;
- Quote expiration;
- Offer mutation/staleness rejection before Activation;
- conflicting idempotency-key rejection;
- duplicate provider payment-reference rejection across Hires;
- paid activation blocked without independently verified payment evidence;
- financial-permission activation blocked in v0.23;
- unavailable/degraded service activation blocked;
- FREE payment represented as `NOT_REQUIRED`, never fabricated as paid.

Fastify framework-level 4xx preservation from v0.22.2 remains intact.

## Verification assets

Added/restored:

- `scripts/verify-reference-acceptance.mjs`
- `scripts/verify-commercial-acceptance.mjs`
- v0.23 guards in `scripts/verify-foundation.mjs`
- deterministic tests in `packages/commercial/src/index.test.ts`

The packaging environment could not run the dependency-aware pnpm workspace command because pnpm/dependencies are not available there. The release therefore remains a candidate until the user runs the authoritative local `pnpm check`.

## Acceptance sequence

1. Run `pnpm install` and `pnpm check` locally.
2. Resolve any source failures before deploy.
3. Commit/push.
4. Let Railway pre-deploy run `pnpm db:migrate` and apply migration 0016.
5. Check production health and capabilities.
6. Re-run v0.22 `verify:reference-acceptance`.
7. Run `verify:commercial-acceptance` using a BSC Testnet buyer address.
8. Record live results in the canonical project state.

Only after steps 1–7 pass should v0.23 be marked externally accepted.

## Next milestone after acceptance

**v0.24 — Four-Category End-to-End Activation Parity**

The next product work is to bring Grid Trading, Yield Optimisation and Health Factor Monitoring toward the same meaningful activation/authority/runtime depth already present for Rebalancing, without collapsing commercial Activation into financial permission or execution.
