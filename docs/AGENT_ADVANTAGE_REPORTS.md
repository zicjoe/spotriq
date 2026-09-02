# Agent Advantage Reports

Spotriq v0.34 adds deterministic measurement/reporting downstream of Activation Activity & Outcomes.

## Truth model

`Service contribution ≠ Transaction ≠ Financial outcome ≠ Agent Advantage`

A read-only runtime can prove that an AgentService delivered an accepted structured observation. It cannot prove a financial action happened. A confirmed transaction can prove execution happened. It cannot by itself prove that the user benefited financially.

Agent Advantage remains `Could Not Assess` unless Spotriq has the attribution/history/comparison evidence required by a standardized evidence-backed advantage metric. The current four first-party read-only services therefore normally produce an observed service contribution while financial outcome and Agent Advantage remain `Could Not Assess`.

## Measurement window

Every report has an explicit window:

- active relationship: Activation start → deterministic reconciliation time;
- revoked relationship: Activation start → relationship revocation.

Unchanged source facts reuse the same fingerprint/report instead of manufacturing history simply because a report was requested twice.

## API

- `GET /v1/agent-advantage/status`
- `POST /v1/activations/:activationId/advantage-reports/sync`
- `GET /v1/activations/:activationId/advantage-reports/latest`
- `GET /v1/activations/:activationId/advantage-reports`
- `GET /v1/accounts/:address/advantage-reports`

## Persistence

Migration `0027_agent_advantage_reports.sql` stores immutable report payloads keyed by a source fingerprint per Activation.

## Safety boundaries

- service contribution never upgrades payment, PermissionGrant, execution or outcome state;
- transaction success never becomes financial advantage automatically;
- a generally measured financial outcome is still not Agent Advantage without an explicit standardized evidence-backed advantage metric;
- `Could Not Assess` is a first-class result, not an error;
- reports are deterministic and are not an AI-generated financial score or investment recommendation.
