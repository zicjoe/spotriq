# Spotriq v0.41.0 — External Agent Buyer Interpretation + Production Explore UX

## Why this milestone exists

Production testing of v0.40 confirmed that Spotriq could discover a broader BSC/8004scan supply universe, but a buyer still had to interpret registry IDs, listing states, endpoint declarations and qualification details to understand whether an agent was useful. The synthetic legacy cards were visually clearer, but their metrics were not appropriate for live supply.

## What changed

- Normal production Explore no longer renders legacy synthetic service cards.
- Synthetic cards remain available only in explicit demo/development mode via `?demo=samples` and are labelled `Synthetic data`.
- Real MarketplaceServiceRecord cards reuse the clearer visual hierarchy without inventing performance data.
- Buyer cards lead with service purpose, why Spotriq shows it, use-now status, onchain identity, runtime-test state, authority and pricing.
- `What Spotriq verified` and `Still unknown` remain explicit.
- Raw ERC-8004 identity, qualification stage, declared machine interfaces, readiness gaps and external reputation remain under `View technical evidence`.
- Explore separates `Ready to use`, `Being evaluated`, and `BSC agent discoveries`.
- Discovery-only identity cards explicitly state that a registry identity is not itself a hireable AgentService.

## Truth boundaries

No universal trust score, profitability score or synthetic performance metric is introduced. External reputation stays External. Registry metadata stays operator supplied. Marketplace Test Lab remains separate runtime evidence. Financial outcome remains separate from runtime success.

`AgentIdentity ≠ AgentService`

`Search relevance ≠ Capability proof`

`External reputation ≠ Spotriq trust score`

`AI explains. Deterministic systems decide.`

## Migration

None.

## Validation

`pnpm verify:buyer-agent-ux`

plus the existing production preflight and full repository gates.
