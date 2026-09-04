# Spotriq v0.40.0 — Marketplace Supply Discovery + Qualification

Production testing showed that Spotriq's core buyer lifecycle worked but external financial-agent supply quality/depth was the limiting factor. v0.40 is therefore evidence-driven supply work.

## Changes

- Current 8004scan API: `https://api.8004scan.io/api/v1`.
- Current semantic endpoint: `/agents/search/semantic`.
- Multi-query semantic recall for rebalancing, grid, yield and health categories.
- Indexed service declarations are retained when supplied by 8004scan, improving machine-callable detection.
- Deterministic supply qualification separates discovery, financial candidacy, canonical identity, machine-callability, Marketplace Test Lab and Spotriq qualification.
- External reputation/activity may prioritize investigation but never becomes a trust, safety or profitability score.
- Explore exposes the upstream indexed universe total (when supplied), deduped candidates, financial candidates and machine-callable candidates.

## Locked boundaries

`AgentIdentity ≠ AgentService`

`Search relevance ≠ Capability proof`

`External reputation ≠ Spotriq trust score`

`Runtime tested ≠ financially safe/profitable`

Mainnet financial execution remains disabled.
