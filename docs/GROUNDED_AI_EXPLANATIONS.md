# Grounded AI Explanations

Spotriq v0.33 adds a strictly downstream explanation layer. Deterministic Spotriq resources remain authoritative for financial truth, evidence, readiness, compatibility, payment, permissions, execution and outcomes.

## Boundary

`Deterministic facts → grounding packet → optional model explanation → citation validation → persisted explanation`

AI output never writes back into the resources that produced the grounding packet.

Supported subjects are `FINDING`, `SERVICE`, `ACTIVATION`, `SMART_MONEY_PLAN` and `PERMISSION_REQUEST`.

Every packet contains stable fact IDs, provenance, source labels, observation times, method/evidence references and limitations where available. Every generated claim must cite packet fact IDs. Unknown citations or unsupported numeric/address claims cause the provider response to be rejected and replaced by a deterministic cited fallback.

The provider receives no arbitrary user prompt, web-search capability, tool callback or write-capable function. External AI is optional; without `OPENAI_API_KEY`, the same API returns deterministic cited explanations.

## API

- `GET /v1/explanations/status`
- `POST /v1/explanations/grounding`
- `POST /v1/explanations`
- `GET /v1/explanations/:explanationId`

## Configuration

- `OPENAI_API_KEY` — optional server-side provider credential.
- `SPOTRIQ_EXPLANATION_MODEL` — defaults to `gpt-5.6-luna`.
- `SPOTRIQ_EXPLANATION_TIMEOUT_MS` — defaults to `12000`.

The API key is never sent to the browser or persisted in explanation records.

## Safety truth

`AI explanation ≠ evidence`

`AI explanation ≠ readiness`

`AI explanation ≠ PermissionGrant`

`AI explanation ≠ execution authorization`

`AI explanation ≠ financial outcome`
