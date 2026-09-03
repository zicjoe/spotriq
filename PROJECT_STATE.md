# Spotriq Project State

**Current implementation release:** v0.39.0  
**Implementation status:** Production Analytics + Adoption Feedback Loop implemented as an acceptance candidate; v0.38 is externally accepted; dependency-aware local/Railway/live v0.39 acceptance pending.  
**Last state update:** 2026-09-03  
**Repository role:** concise present-state map; current repository remains implementation truth.

## Product position

Spotriq is a **BSC financial-agent marketplace**. It helps a wallet understand financial needs, discover and evaluate specialist AgentServices, hire/activate them, review scoped authority, observe runtime/execution state, measure only defensible outcomes, understand those outcomes, and decide whether to continue, switch, revoke or compose independent specialists into a reviewable plan.

Locked separations remain:

`Payment ≠ Permission ≠ Activation ≠ Execution ≠ Outcome`

`Service contribution ≠ Transaction ≠ Financial outcome ≠ Agent Advantage`

`Operational health ≠ marketplace readiness ≠ trust ≠ payment ≠ permission ≠ execution ≠ outcome`

`Production scalability ≠ financial authority ≠ mainnet execution approval`

`Agent Studio deployment ≠ canonical identity ≠ readiness ≠ payment ≠ permission ≠ execution ≠ outcome`

`Plan ≠ Super-agent`

**AI explains. Deterministic systems decide.**

## Externally accepted baseline

- **v0.22 ✅** Four reference runtimes + Test Lab + canonical BSC Testnet ERC-8004 acceptance.
- **v0.23 ✅** Commercial FREE Offer → Quote → Hire → Activation.
- **v0.24 ✅** Four-category runtime/control parity.
- **v0.25 ✅** Permission Checkout parity.
- **v0.26 ✅** Four-category execution-adapter parity.
- **v0.27 ✅** Activity + Outcome parity.
- **v0.28 ✅** My Agents + switching/revocation + marketplace UX.
- **v0.29 ✅** Smart Money Plans + deterministic conflict handling.
- **v0.30 ✅** Operator Workspace + canonical owner gating.
- **v0.31 ✅** ERC-8183/x402/B402 paid reconciliation.
- **v0.32 ✅** BNB Agent Studio normalized integration.
- **v0.33 ✅** Grounded AI Explanation Layer.
- **v0.34 ✅** Agent Advantage Measurement + Report.
- **v0.35 ✅** Observability + Marketplace/System Health.
- **v0.36 ✅** Security + Failure Injection Hardening.
- **v0.37 ✅** Production Hardening + Scale Readiness.
- **v0.38 ✅** Ecosystem Adoption + Judge/Public Launch Readiness.

## Current architecture

- `apps/web` — marketplace UX plus contextual adoption feedback and hidden admin analytics view (`?admin=analytics`).
- `apps/api` — Fastify API including privacy-bounded analytics ingestion and bearer-protected adoption reporting.
- `apps/worker` — maintenance queue consumer; financial Smart Money jobs remain `API_INLINE`.
- PostgreSQL migrations `0001`–`0031`.
- `@spotriq/adoption-analytics` — privacy-bounded interaction/feedback ingestion plus deterministic domain-funnel reporting.

## Current v0.39 implementation truth

v0.39 measures what real users/operators do without turning analytics into product truth:

- allow-listed product interaction events only;
- browser session IDs are hashed server-side;
- raw wallet addresses and arbitrary metadata are rejected from telemetry;
- Quote/Hire/Activation/Permission/transaction/outcome/Agent Advantage counts come from deterministic domain tables;
- `ACCEPTANCE` traffic is excluded from `PRODUCT` adoption totals;
- private date/category report and export require admin diagnostics authentication;
- contextual feedback remains downstream of deterministic actions and cannot block or mutate them;
- Agent Advantage coverage is measured without inferring financial benefit;
- no wallet-connect conversion is fabricated until there is a deterministic server-observed connection fact;
- BSC Mainnet financial execution remains unapproved.

## Current validation state

Authoritative local gate:

`pnpm --filter @spotriq/api build → pnpm check`

After migration/deployment, run accepted regressions through v0.38 and then `pnpm verify:adoption-analytics`.

Do not record v0.39 externally accepted until those gates pass.

## Roadmap after v0.39 acceptance

Run Spotriq with real user/operator cohorts and capture a production baseline. The next product milestone should be chosen from measured conversion, reliability, supply and feedback evidence rather than invented in advance. Mainnet financial execution remains a separately approved program only.
