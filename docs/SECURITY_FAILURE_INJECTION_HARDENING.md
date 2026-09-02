# Spotriq Security + Failure Injection Hardening

Spotriq v0.36 hardens hostile and degraded failure boundaries without introducing a production chaos-control surface.

## Locked boundary

`Security hardening ≠ marketplace readiness ≠ trust ≠ payment ≠ PermissionGrant ≠ execution ≠ financial outcome`

Failure injection is exercised in tests and acceptance verifiers. Production receives the defenses, not an endpoint that can intentionally corrupt RPC/provider/payment/runtime state.

## Outbound URL / SSRF policy

`@spotriq/security-hardening` provides shared external-URL and public-network validation for operator/runtime/payment metadata. It rejects embedded credentials, local/internal/resolver-relative hosts, loopback/private/link-local/metadata/documentation/multicast address ranges, unsafe fragments, unsafe text controls and Unicode bidi formatting.

Marketplace Test Lab resolves runtime hosts before the request, requires every resolved A/AAAA address to be public, pins the validated address into the Node HTTP(S) transport, preserves HTTPS SNI for the declared hostname, uses manual redirects, and repeats URL + DNS validation for every redirect target. Bounded response sizes and structured-JSON budgets prevent oversized/pathological provider payloads.

The observability health path still does not probe arbitrary operator URLs; it consumes persisted Test Lab observations.

## Provider/RPC hardening

The BSC adapter now bounds raw JSON-RPC bodies and validates:

- valid JSON-RPC 2.0 envelope;
- request/response ID coherence;
- well-formed RPC error objects;
- required result presence;
- bounded structured response shape;
- method-specific transaction/receipt/hash/hex constraints.

Invalid primary responses can fail over to a valid secondary. Health additionally compares healthy endpoint block heights and reports material divergence as operational degradation. RPC divergence never becomes marketplace/trust/financial authority and does not silently rewrite pinned decision evidence.

## Untrusted operator / Agent Studio data

Operator and Agent Studio declarations now pass bounded normalization before persistence. Runtime/payment/Agent Card URLs use the shared external URL policy; text fields reject dangerous control/bidirectional formatting characters; arrays and nested declaration structures are bounded and enumerated values are validated.

Operator-supplied metadata remains Operator Supplied evidence. Validation does not promote it to Marketplace Observed evidence or readiness.

## Payment evidence and replay/race hardening

x402/B402 settlement reconciliation now requires coherent transaction + receipt hash/block evidence, a successful receipt, exact ERC-20 Transfer terms, a concrete transfer `logIndex`, and a sane Hire-relative block timestamp.

PostgreSQL uniqueness remains the final replay boundary. Concurrent duplicate provider/settlement claims are translated into a fail-closed commercial domain error instead of leaking a raw database unique violation.

`successful receipt ≠ paid` unless the immutable Quote settlement terms independently reconcile.

## Activation idempotency race hardening

Migration `0029_security_failure_injection_hardening.sql` adds durable buyer/idempotency-key activation claims. A request claims the deterministic Activation identity before persistence; concurrent use of the same key for another Hire fails closed. A retry for the same Hire/Activation remains safe after a transient failure.

## No production failure-injection endpoint

Spotriq deliberately exposes no `/v1/admin/failure-injection` route. The production verifier asserts that this surface is absent. Hostile fault scenarios live in deterministic tests/verifiers instead.

## Acceptance

Run:

```powershell
pnpm --filter @spotriq/api build
pnpm check
pnpm verify:security-hardening
```

After deployment, the full accepted verifier chain through v0.35 should pass before `verify:security-hardening` is used to close v0.36.
