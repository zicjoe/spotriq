# Spotriq v0.36.0 — Security + Failure Injection Hardening

**Implementation status:** complete acceptance candidate. v0.35 is externally accepted; dependency-aware local/Railway/live v0.36 acceptance remains required.

## Goal

Exercise and harden adversarial failure paths without weakening Spotriq's deterministic product boundaries or adding a dangerous production chaos plane.

## Implemented

### Shared hostile-input boundary

New package: `@spotriq/security-hardening`.

It centralizes public-network URL checks, untrusted-text normalization, structured provider-response budgets and PostgreSQL unique-violation classification.

### Marketplace Test Lab SSRF / provider defense

- URL shape validation before DNS/network access.
- DNS resolution must contain only public addresses.
- Production transport pins the validated resolution for the request.
- Redirects are manual and every target is revalidated/re-resolved.
- Response bytes are bounded.
- A2A/MCP JSON is structurally bounded.
- Agent Card arrays/text/URLs are bounded and validated.

### BSC provider hardening

- bounded JSON-RPC response bytes;
- JSON-RPC envelope/ID/error validation;
- method-result validation/failover;
- transaction-hash and receipt coherence checks;
- provider block-divergence detection;
- observability reports divergence as degradation only.

### Operator + Agent Studio metadata

Untrusted declaration text and external URLs are normalized/validated before persistence. Unsafe control/bidi formatting, malformed arrays/enums, and local/private endpoint tricks fail closed.

### Payment replay/race hardening

x402/B402 now reconcile transaction/receipt block evidence, exact transfer log with `logIndex`, and sane Hire-relative timing in addition to the accepted Quote terms. Concurrent uniqueness conflicts are mapped into `PAYMENT_MISMATCH` rather than raw 500/`23505` leakage.

### Activation idempotency race hardening

Migration `0029_security_failure_injection_hardening.sql` adds `commercial_activation_idempotency_claims`, creating a durable buyer/idempotency-key claim before Activation persistence.

### Production failure-injection policy

No runtime fault-injection endpoint was added. `runtimeFailureInjectionEndpointEnabled = false`, and the acceptance verifier requires `/v1/admin/failure-injection` to remain absent.

## Capability truth

v0.36 adds truthful capability flags:

- `securityFailureHardeningEnabled = true`
- `ssrfPinnedTransportEnabled = true`
- `maliciousMetadataValidationEnabled = true`
- `rpcResponseValidationEnabled = true`
- `rpcDivergenceDetectionEnabled = true`
- `paymentReplayRaceProtectionEnabled = true`
- `activationIdempotencyClaimEnabled = true`
- `runtimeFailureInjectionEndpointEnabled = false`

These flags do not imply agent readiness, trust, payment, PermissionGrant, execution safety or financial success.

## Candidate compile corrections

During dependency-aware acceptance hardening, two source-level TypeScript compatibility issues were corrected before external acceptance: Agent Studio safe-URL validation now returns canonical string values at the declaration/domain boundary, and BSC divergence sorting uses a target-compatible copied-array `sort()` rather than ES2023-only `toSorted()`. No domain invariant or migration changed.

## Validation coverage

Focused/adversarial coverage includes:

- private/loopback/metadata/reserved outbound targets;
- redirect-to-private SSRF;
- maliciously large/deep Agent Cards;
- unsafe operator/Studio text and URL metadata;
- malformed/mismatched JSON-RPC responses with secondary failover;
- materially divergent healthy BSC endpoints;
- transaction evidence returned for the wrong hash;
- transaction/receipt/block incoherence;
- settlement transfer without usable log index;
- future/pre-Hire settlement timestamps;
- concurrent payment replay uniqueness conflicts;
- concurrent Activation idempotency-key claims;
- absence of a production fault-injection route.

## Migration

`0029_security_failure_injection_hardening.sql`

## Production acceptance

```powershell
pnpm --filter @spotriq/api build
pnpm check
pnpm verify:reference-acceptance
pnpm verify:commercial-acceptance
pnpm verify:activation-parity
pnpm verify:permission-checkout
pnpm verify:execution-adapter-parity
pnpm verify:activity-outcome-parity
pnpm verify:my-agents
pnpm verify:smart-money-plans
pnpm verify:operator-workspace
pnpm verify:paid-rails
pnpm verify:agent-studio
pnpm verify:grounded-explanations
pnpm verify:agent-advantage
pnpm verify:observability
pnpm verify:security-hardening
```

Do not mark v0.36 externally accepted until the dependency-aware checks, migration/deployment, accepted regression chain and new live verifier pass.

## Next milestone

After v0.36 acceptance: **v0.37 — Production Hardening + Scale Readiness** (queue/worker maturity, caching/index review, rate limiting/API abuse protection, operational runbooks, migration resilience, backup/recovery and deployment hardening), while BSC Mainnet financial execution remains blocked until explicitly approved.

## Acceptance verifier deployment ordering hotfix

The v0.36 security acceptance verifier is a **live deployment gate** by default. It reads `SPOTRIQ_ACCEPTANCE_BASE_URL` / `PUBLIC_API_BASE_URL` and otherwise targets the Railway production API. Therefore the current v0.36 repository must be committed/pushed and deployed before `pnpm verify:security-hardening` can pass against production. A local build alone does not advance the live `/health` version.

Historical live verifiers now use minimum compatible release floors rather than exact version equality: `verify:observability` requires a deployed API `>=0.35.0`, while `verify:security-hardening` requires `>=0.36.0`. This preserves accepted milestone regression coverage after later Spotriq releases. The security verifier now reports the actual live `/health` payload when deployment is behind, rather than presenting version lag as a generic contract failure.

