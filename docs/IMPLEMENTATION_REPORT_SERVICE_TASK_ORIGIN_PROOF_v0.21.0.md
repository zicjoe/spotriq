# Spotriq v0.21.0 Implementation Report
## Real AgentService Task Invocation / Origin Proof

### Objective

Close the conceptual gap left after v0.20: Spotriq could discover/select a service and independently execute a guarded plan, but could not prove that the selected external AgentService actually received the task and originated the proposal.

### Implemented

- Added `@spotriq/service-tasks`.
- Added a dedicated `ServiceTask` domain rather than manufacturing an `Activation`.
- Added deterministic server-derived task request context and SHA-256 context binding.
- Added A2A 1.x JSON-RPC and HTTP+JSON task invocation plus A2A 0.3 JSON-RPC compatibility.
- Added fresh Test Lab and service-owned key-binding gates before task origin can be trusted.
- Added durable task attempt/remote task/message/proposal/origin states.
- Added task retry, reconcile and cancel behavior where the remote A2A task model supports it.
- Added explicit handling for unsupported bindings and unconfigured A2A client authentication.
- Added migration `0015_service_task_origin_proof.sql`.
- Added API routes for task invocation/status/retry/reconcile/cancel.
- Added live Rebalancing UI showing invocation/origin/proposal state.
- Job Intent confirmation now requires a completed task with `VERIFIED` origin and a `STRUCTURED` proposal.
- Revising Job Intent constraints invalidates previously linked origin evidence.
- Execution-plan attribution now records exact agent proposal acceptance vs `USER_OVERRIDE`, and proposal origin participates in the plan hash.
- External AgentService remains proposer-only; no boundary signer or token-approval authority is exposed.
- `marketplaceActivationEnabled` remains `false` because invocation is not commercial hiring/payment/activation.

### Adversarial/security coverage added

- Browser-fabricated runtime/proposal/origin fields are ignored by the invocation API.
- Mismatched request-context hashes cannot produce verified proposal origin.
- A2A 1.0 `securityRequirements` (plus bounded legacy `security` compatibility) are not satisfied with fake credentials or the service-owned proposal key.
- Revised server-derived job constraints produce a different task/context rather than reusing stale origin evidence.
- User-modified proposal ticks are attributed as `USER_OVERRIDE`.
- Reconciliation cannot mint fresh origin attribution from a persisted/stale authority binding; service-owned key control is reverified before later A2A task responses are attributed.

### Protocol verification

Implementation behavior was reconciled on 2026-08-24 against the official A2A 1.0 specification. A2A 1.0 uses PascalCase JSON-RPC methods and separate JSON-RPC/HTTP+JSON bindings; a declared interface tenant must be routed with the selected interface. Historical 0.3 JSON-RPC remains supported where declared.

ERC-8183 remains a separate draft job/escrow commerce standard. v0.21 does not mislabel an A2A task as a paid hire.

### Validation

Validation completed in the packaging environment:

- structural verifier: **PASS**;
- repository TypeScript syntax transpilation: **140 TS/TSX files, 0 syntax errors**;
- relative-import integrity: **142 JS/TS-family files scanned, 0 missing relative imports**;
- package-version consistency: **24 manifests, all `0.21.0`**;
- targeted strict TypeScript checks for ServiceTask/domain/evidence, Job Intent/execution-plan attribution, and the web ServiceTask repository/API contracts: **PASS** using temporary validation-only type shims outside the repository where unavailable workspace dependencies had to be isolated;
- v0.21-focused runtime tests: **16/16 PASS** — Job Intent **9/9**, ServiceTask protocol/origin **6/6**, API anti-fabrication **1/1**. The ServiceTask runtime suite used temporary validation-only stubs for inherited evidence/marketplace-supply module boundaries because the full pnpm workspace dependencies were unavailable; the production source itself was also covered by the strict/syntax checks above;
- final replacement-ZIP integrity and SHA-256: verified after repository packaging and reported with the release artifact delivery.

A full `pnpm check` was **not run** in this sandbox. Corepack attempted to obtain pnpm `10.14.0` from the npm registry and failed with `getaddrinfo EAI_AGAIN registry.npmjs.org`. This is an environment/network limitation, not a passing workspace check. Run the complete local suite before deployment.

### Live evidence limitation

No live external AgentService task or BSC financial transaction is fabricated by this implementation report. A real task-origin record exists only when a qualifying service/runtime is invoked from the actual environment.

### Next product gap

The next logical marketplace gap is real commercial hiring/activation semantics where supported: distinguish free invocation from hired/paid/activated state and use ERC-8183/x402/B402 only when a real service supports/needs them.
