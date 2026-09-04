# Spotriq Project State

**Current implementation release:** v0.40.0  
**Implementation status:** v0.40.0 Marketplace Supply Discovery + Qualification implemented from production evidence that agent supply depth/quality was the primary adoption bottleneck; v0.39 remains the accepted analytics baseline.  
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
- **v0.39 ✅** Production Analytics + Adoption Feedback Loop.

## Current architecture

- `apps/web` — marketplace UX plus contextual adoption feedback and hidden admin analytics view (`?admin=analytics`).
- `apps/api` — Fastify API including privacy-bounded analytics ingestion and bearer-protected adoption reporting.
- `apps/worker` — maintenance queue consumer; financial Smart Money jobs remain `API_INLINE`.
- PostgreSQL migrations `0001`–`0031`.
- `@spotriq/adoption-analytics` — privacy-bounded interaction/feedback ingestion plus deterministic domain-funnel reporting.
- Production-testing wallet hotfix — self-managed EIP-6963 multi-injected-provider discovery plus EIP-1193 fallback provides wallet selection without a hosted wallet-service dependency while preserving Spotriq's separate permission/execution authority model. A provider locator plus one-way account fingerprint is retained locally so refresh can reconcile with non-interactive `eth_accounts`; a non-announcing injected-provider fallback is fingerprint-checked and fails closed on mismatch.
- Production-testing core-runtime hotfix — activation-bound read-only tasks automatically refresh stale Marketplace Test Lab evidence before invocation and explicit reruns create a fresh retry attempt instead of replaying a stale failed/completed task.
- Production-testing BSC Mainnet read-only core — Smart Money Check can explicitly observe supported real BSC Mainnet state on chain 56, while BSC Testnet chain 97 remains the financial authority/execution sandbox. First-party FREE read-only Offers declare observation support on both 56 and 97; an immutable Quote freezes the selected observation chain. ERC-8004 identity chain is evidence and remains separate from service observation chain. Mainnet read-only Activations grant no wallet signing, PermissionGrant, transaction submission, or financial execution authority.

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
- Wallet connection is now a real app-level production session, but `Connect Wallet ≠ PermissionGrant ≠ Activation ≠ Execution`; it requires no hosted wallet-service project ID. On mobile, the relay-free path is a compatible wallet app's built-in dapp browser.

## Current validation state

Authoritative local gates:

`pnpm preflight:production-testing → pnpm check`

The preflight includes foundation, wallet architecture, strengthened wallet-session lifecycle and core-runtime-flow verification before web/API builds.

The v0.39 acceptance gates have passed. Continue to use `pnpm verify:adoption-analytics` after relevant production changes and capture private baselines only from real deployed state.

## Evidence-driven v0.40 milestone

Production testing showed buyer flows working while external agent supply was shallow and low-confidence. v0.40 updates Spotriq to the current 8004scan API, uses multi-query semantic discovery against the BSC agent universe, captures machine-callable service declarations when indexed, and introduces a deterministic qualification funnel. Search relevance and external reputation remain discovery signals only; canonical identity, runtime tests, readiness and authority are independent gates.

## Current phase after v0.39 acceptance

Run Spotriq with real user/operator cohorts and capture a production baseline. The next product milestone should be chosen from measured conversion, reliability, supply and feedback evidence rather than invented in advance. Mainnet financial execution remains a separately approved program only.

### Production-testing Smart Money completion hotfix

The production scan completion path is hardened against missed/buffered SSE terminal events. The web scan view now uses a lightweight `/v1/checks/:checkSessionId/status` watchdog roughly every 0.9 seconds while SSE remains the low-latency path. The API SSE route also reconciles persisted events/session state every second so process-local subscriptions are not a single point of failure. Independent normalized portfolio child writes are persisted concurrently and the terminal compatibility/session finalization avoids redundant session/finding round-trips. The final UI stage is labelled `Preparing findings & agent matches` because actual Finding → AgentService ranking remains on-demand after financial findings exist.
