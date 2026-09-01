# Spotriq Engineering Status

**Release candidate:** v0.28.0  
**Date:** 2026-09-01  
**State:** My Agents + Switching/Revocation + Marketplace UX Completion implemented; v0.27 externally accepted; local dependency-aware validation and external v0.28 acceptance pending.

## Accepted baseline

Production acceptance is complete through v0.27.

v0.27 proved that all four category Activation journeys can persist truthful technical activity/outcome state while absent transaction/performance evidence remains `Could Not Assess`.

## v0.28 package

`@spotriq/my-agents`

Responsibilities:

- aggregate buyer Activations into active/history portfolio buckets;
- attach live AgentService/readiness/control state;
- attach Permission Checkout / ScopedPermissionRequest state without treating it as commercial state;
- attach Activation Activity + Outcome when available;
- calculate same-category replacement candidates;
- persist idempotent switch records;
- fail closed when an independent reconciled PermissionGrant would be stranded;
- activate replacement before revoking the source relationship.

## Persistence

Migration `0021_my_agents_switching.sql` adds `my_agent_switches` with buyer-scoped idempotency and immutable source/target identity.

Switch history is not a PermissionGrant or financial transaction log.

## API

- `GET /v1/accounts/:address/my-agents`
- `GET /v1/accounts/:address/my-agents/switches`
- `POST /v1/accounts/:address/my-agents/:activationId/switch`
- `POST /v1/accounts/:address/my-agents/:activationId/revoke`

Fastify exposes explicit My Agents errors, including idempotency conflict and active independent PermissionGrant blockers.

## Web

My Agents no longer reads the Figma/sample `ACTIVATIONS`, `PERMISSION_GRANTS` or sample activity data for the active buyer view.

The page loads a live wallet portfolio, shows commercial/authority/runtime/outcome separately, offers only eligible same-category switch candidates and uses the safe My Agents revoke endpoint.

Service Profile / Compare / Try now use live marketplace/Test Lab APIs instead of scripted performance/test results.

## Capability truth

- `myAgentsPortfolioEnabled = true`
- `myAgentsSwitchingEnabled = true`
- `liveMarketplaceProfileCompareTryEnabled = true`

These flags do not imply broad paid switching, mainnet execution or automatic PermissionGrant revocation.

## Verification

Local:

`pnpm --filter @spotriq/api build`

`pnpm check`

Production regressions:

`verify:reference-acceptance → verify:commercial-acceptance → verify:activation-parity → verify:permission-checkout → verify:execution-adapter-parity → verify:activity-outcome-parity`

New v0.28 gate:

`pnpm verify:my-agents`

The v0.28 verifier creates truthful FREE read-only relationships, confirms they appear in the buyer portfolio, persists a same-service switch as BLOCKED, confirms switch history, revokes relationships through the safe My Agents boundary and confirms they move into history.

## Next after acceptance

v0.29 — Smart Money Plans + Compatibility/Conflict Handling.
