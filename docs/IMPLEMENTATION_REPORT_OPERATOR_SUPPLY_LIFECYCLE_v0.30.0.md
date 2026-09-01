# Spotriq v0.30.0 — Operator Supply Lifecycle + Workspace

## Purpose
v0.30 gives ERC-8004 agent operators a real management surface without allowing operator assertions to become marketplace truth.

## Security boundary
Operator writes require a one-time EIP-191 wallet challenge, an expiring server-side session whose bearer token is stored only as a hash in PostgreSQL, and canonical ERC-8004 owner verification matching the authenticated wallet. Public addresses alone are not authentication.

## Lifecycle
`DRAFT → SUBMITTED → ACTIVE / PAUSED / SUSPENDED → RETIRED` is persisted separately from marketplace readiness. Operators may make their own service less available, but cannot force `READY`, edit Marketplace Observed Test Lab evidence, fabricate payment, PermissionGrant, execution, or outcomes.

## Persistence
Migration `0023_operator_supply_lifecycle.sql` adds challenges, sessions, canonical claims, service declarations, and Operator Supplied evidence.

## API
- `POST /v1/operator/auth/challenge`
- `POST /v1/operator/auth/verify`
- `GET /v1/operator/workspace`
- `POST /v1/operator/claims`
- `PUT /v1/operator/services`
- `POST /v1/operator/services/:declarationId/transition`
- `POST /v1/operator/evidence`
- `POST /v1/operator/services/:serviceId/test-lab`

## Evidence doctrine
Operator declarations and submissions remain `operator-claimed`. Marketplace Test Lab results remain Marketplace Observed. Canonical ERC-8004 verification remains chain evidence. These axes are not merged into a universal score.
