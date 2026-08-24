# AgentService Task Invocation & Origin Proof

Spotriq v0.21.0 closes the Rebalancing marketplace gap between **selecting** an AgentService and proving that the selected external service actually originated a proposal.

## Trust boundary

The selected external AgentService remains an **authenticated proposer only**. Spotriq never gives it the Altana boundary financial signer, wallet-admin approval authority, arbitrary calldata authority, or a shortcut around the existing execution guard/boundary.

The trusted sequence is:

`Finding → selected AgentService → fresh Test Lab evidence → fresh service-owned key proof → server-originated A2A task → exact-context structured proposal → Job Intent confirmation → bounded authority → reviewed execution plan → guard → sealed boundary → fresh preflight → controlled execution`

A2A invocation proves neither commercial hiring nor payment. `marketplaceActivationEnabled` therefore remains `false` in v0.21.0.

## Server-authoritative request context

The browser supplies only the Job Intent identifier to the invocation route. The API reloads the persisted Job Intent and derives the task request from:

- Finding ID;
- selected AgentService/agent identity;
- wallet;
- exact PancakeSwap LP subject and observed block;
- current Job Intent constraints;
- Job Intent expiry;
- requested action (`PREPARE_RANGE_REBALANCE`).

Spotriq canonicalizes this context and produces a SHA-256 `requestContextHash`. Task/message/idempotency identifiers are correlated to that server-derived context. If a user revises job limits or expiry, the previously linked ServiceTask is invalidated and the service must be invoked again.

The service must return a structured data part using `urn:spotriq:rebalancing-proposal:v1` and echo the exact request-context hash. A stale/mismatched proposal cannot satisfy origin proof.

## Origin evidence

A proposal becomes `VERIFIED` origin evidence only when Spotriq can combine:

1. a fresh Marketplace Test Lab PASS for the exact A2A endpoint;
2. a fresh verified `urn:spotriq:authority-binding:v1` service-owned key-control proof;
3. a same-origin Agent Card/task interface;
4. the server-originated A2A exchange;
5. a durable remote task/message reference;
6. a structured proposal bound to the exact request-context hash.

The service response is not required to contain a second proposal signature in v0.21. Origin attribution therefore explicitly records that it relies on the fresh service-key challenge plus the same-origin TLS A2A exchange. Later task reconciliation repeats service-owned key-control verification rather than promoting a persisted binding record into fresh origin proof.

## A2A interoperability

Spotriq v0.21 supports:

- A2A 1.x JSON-RPC (`SendMessage`, `GetTask`, `CancelTask`);
- A2A 1.x HTTP+JSON (`message:send`, task GET/cancel paths);
- historical A2A 0.3 JSON-RPC (`message/send`, `tasks/get`, `tasks/cancel`).

The implementation normalizes `A2A-Version` to `Major.Minor`, respects interface ordering, echoes a declared interface `tenant`, and does not send JSON-RPC to an HTTP+JSON binding. A service declaring A2A 1.0 `securityRequirements` (or the bounded legacy compatibility field) that Spotriq is not configured to satisfy becomes `AUTH_REQUIRED`; Spotriq never fabricates credentials.

Protocol-sensitive implementation was checked against the official A2A 1.0 specification on 2026-08-24.

## Proposal attribution into execution

A verified service proposal can prefill replacement ticks, but it does not become financial truth. The user still explicitly reviews the range and the existing plan/guard/boundary pipeline independently validates it.

If the reviewed ticks exactly match the linked proposal, the plan records `AGENT_SERVICE` attribution and seals the proposal-origin reference into the plan hash.

If the user changes either tick, the plan records `USER_OVERRIDE`. Spotriq never attributes modified parameters back to the external AgentService.

## Commercial state

`ServiceTask.commercialState` remains `NOT_PROVEN` unless later commerce evidence exists. v0.21 deliberately distinguishes:

- invoked;
- hired;
- paid;
- activated.

ERC-8183/x402/B402 may be used in a later milestone only where the real service genuinely supports/needs those semantics.

## Persistence

Migration `0015_service_task_origin_proof.sql` adds durable `service_tasks` records. It does not create fake `activations` and does not repurpose execution evidence into marketplace hiring evidence.

## API

- `POST /v1/job-intents/:jobIntentId/service-tasks`
- `GET /v1/job-intents/:jobIntentId/service-task`
- `GET /v1/service-tasks/:serviceTaskId`
- `POST /v1/service-tasks/:serviceTaskId/reconcile`
- `POST /v1/service-tasks/:serviceTaskId/retry`
- `POST /v1/service-tasks/:serviceTaskId/cancel`

## Non-claims

v0.21 code does not by itself prove that a live third-party service was available or invoked in this development environment. Live origin evidence exists only after a qualifying real service completes the deployed/local flow.
