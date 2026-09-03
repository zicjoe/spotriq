# Spotriq Production Adoption Analytics

Spotriq v0.39 adds a deliberately small, privacy-bounded measurement layer for real launch/adoption feedback.

## Locked truth boundary

**Domain facts remain authoritative. Analytics describe usage; analytics are not financial truth.**

Browser telemetry may record only an allow-listed interaction vocabulary such as `HOME_VIEWED`, `EXPLORE_VIEWED`, `SERVICE_PROFILE_VIEWED`, `SERVICE_COMPARE_VIEWED`, `PERMISSION_CHECKOUT_VIEWED`, `MY_AGENTS_VIEWED`, and `AGENT_ADVANTAGE_VIEWED`.

Completed lifecycle stages such as Quote, Hire, Activation, Permission, transaction, outcome and Agent Advantage are counted from the existing deterministic PostgreSQL domain tables. A browser event cannot manufacture one of those states.

## Privacy

- Raw wallet addresses are rejected from browser analytics fields.
- Browser session IDs are SHA-256 hashed server-side before persistence.
- Arbitrary metadata blobs are not accepted.
- Comments are bounded and reject control/bidirectional spoofing characters.
- Acceptance traffic is marked `ACCEPTANCE` and excluded from `PRODUCT` adoption totals.
- The private report requires the existing `SPOTRIQ_ADMIN_DIAGNOSTICS_TOKEN` boundary.

## Feedback

Contextual feedback is separate from deterministic actions. A feedback failure must never block Hire, Activation, Permission, switch, revoke, runtime, outcome or Agent Advantage state.

Supported feedback contexts include Smart Money Check, matching, profile evaluation, Permission Checkout, Activation, Agent Advantage, switch/revoke and Operator Workspace.

## Report

`GET /v1/admin/adoption-analytics` exposes bounded date/category reporting for:

- product interaction counts;
- Smart Money Check/finding/recommendation progression;
- Quote/Hire/Activation/Permission progression;
- runtime/transaction/outcome progression;
- Agent Advantage measurement coverage;
- operator/supply/Test Lab/Agent Studio posture;
- contextual feedback counts/reasons.

The report includes explicit authority flags set to `false` for financial truth, readiness, payment, permission, execution, outcome and Agent Advantage.

Spotriq intentionally does **not** report a wallet-connect conversion metric yet because the backend does not have a deterministic server-observed wallet-connect fact. That metric should not be guessed from page activity.

## Production baseline

After deployment, an authenticated operator can run:

`pnpm capture:adoption-baseline`

This writes `artifacts/spotriq-v0.39-adoption-baseline.json`, which remains ignored by Git by default. The artifact is a private production measurement snapshot, not evidence of financial performance.

Privacy note: raw wallet values are rejected from browser telemetry.
