# Implementation Report — Smart Money Check Core + Rebalancing Finding Engine

Version: 0.5.0

## Implemented
- Added `@spotriq/smart-money` domain engine.
- Added deterministic Rebalancing finding method `smart-money.rebalancing-finding@1.0.0`.
- Added live check lifecycle and source progress states.
- Added memory persistence for zero-setup local development.
- Added PostgreSQL persistence adapter selected automatically when `DATABASE_URL` exists.
- Added migration `0003_smart_money_rebalancing.sql`.
- Added persisted check events and SSE-ready event replay/streaming.
- Added `POST /v1/checks`.
- Added `GET /v1/checks/:checkSessionId`.
- Added `GET /v1/checks/:checkSessionId/findings`.
- Added JSON/SSE `GET /v1/checks/:checkSessionId/events`.
- Wired Smart Money Check address input to the real API.
- Replaced the fake connect-wallet handler with a real EIP-1193 browser-wallet boundary when a compatible wallet is installed.
- Retained the explicitly labelled Example Portfolio flow for the full four-category judge/demo scenario.
- Added Vite development proxy for `/v1` and `/health`.
- Added production-aware API URL handling to SSE.
- Added bounded live coverage and partial-state UI.
- Added deterministic tests for out-of-range wording, healthy wording, source coverage and check events.

## Architectural invariants preserved
- Smart Money Check is read-only.
- Finding is separate from Recommendation.
- Evidence is separate from AI explanation.
- Missing/unsupported sources remain explicit.
- Out-of-range does not imply loss.
- Healthy supported LP state does not imply portfolio safety.
- Live data and Example Portfolio sample data are clearly separated.

## Database
Railway PostgreSQL can now be connected by supplying `DATABASE_URL` and running `pnpm db:migrate`. The application requires no code change when moving from memory to PostgreSQL persistence.

## Validation performed in the packaging environment
- Structural verifier passed.
- Shared domain package passed TypeScript typecheck.
- Smart Money package passed an isolated TypeScript validation harness using workspace interface stubs because the packaging environment cannot access npm to install the full dependency graph.
- Full authoritative `pnpm check` must be run on the user's local machine after `pnpm install`.

## Known limitations
- API-process execution is used for checks in this milestone. Queue/worker execution comes later when Redis/BullMQ is introduced.
- V3 wallet discovery is live; Infinity CL wallet-wide discovery remains unsupported without an indexed event source.
- Venus, market-regime and recommendation sources remain `NOT_SUPPORTED` in the live check.
- Wallet-wide ERC-20 token discovery is not yet enabled.
- No USD LP valuation, complete fee accrual, historical time-in-range or profitability is fabricated.

## Next recommended milestone
Venus Adapter + Health Factor Monitoring foundation, so Smart Money Check gains a second real financial category and can stop being Rebalancing-only on live wallets.
