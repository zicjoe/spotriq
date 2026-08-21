# Spotriq v0.13.0 Implementation Report

## Milestone

**Smart Money Finding → AgentService Compatibility & Ranking**

## Outcome

Completed.

Spotriq now connects real Smart Money Findings to live normalized financial AgentService supply using explicit, deterministic compatibility rules. The implementation preserves the existing trust/readiness boundary: ranking does not create capability claims, performance claims, permission authority, or activation eligibility.

## Implemented

### Shared domain

Added first-class compatibility resources:

- `FindingCompatibilityContext`
- `FindingServiceCompatibilityCheck`
- `FindingServiceMatch`
- `FindingServiceMatchPage`
- match tiers and check states

### Marketplace Supply

Added method version:

```text
marketplace.finding-service-compatibility@1.0.0
```

Added the pure `rankServicesForFinding(...)` engine plus `MarketplaceSupplyReader.matchFinding(...)`.

The live path is:

```text
Finding
→ category-scoped targeted financial supply discovery
→ normalized AgentService candidates
→ hard compatibility exclusions
→ explainable tiering
→ evidence/readiness ordering
→ stable rank
```

Hard exclusions are intentionally conservative:

- wrong category;
- suspended service/identity;
- explicit structured protocol contradiction;
- explicit structured asset contradiction;
- explicit structured pair contradiction.

Missing structured protocol/asset/pair declarations stay `UNKNOWN` and are surfaced as limitations.

### Ranking order

Lexicographic order:

1. compatibility tier;
2. evidence-quality PASS count across canonical identity, observed runtime reachability and Marketplace Test Lab;
3. operational readiness;
4. stable `serviceId`.

No hidden numeric score is emitted.

### Smart Money Check API

Added:

```text
GET /v1/checks/:checkSessionId/findings/:findingId/matches?limit=8
```

The route obtains the Finding from the persisted/in-memory check snapshot before matching. Unknown checks and unknown Finding IDs return explicit 404 errors.

### Smart Money coverage

The `agent_compatibility` handoff is no longer marked unsupported. After financial findings are generated, its source-progress state becomes `COMPLETED` with an explicit note that ranking is computed on demand from the result Finding.

`SmartMoneyCheckCoverage.agentCompatibility` is now `AVAILABLE`.

### Explore UI

The existing `fromFinding` navigation seam is now consumed.

For a live check, Explore renders:

**Best live matches for this finding**

before generic marketplace/reference supply.

Each match shows:

- deterministic rank;
- match tier;
- activation-gated/eligible state;
- category/protocol/asset/pair check states;
- explanation;
- top strengths;
- the existing live service readiness/Test Lab card.

Running readiness inspection or Test Lab triggers a re-rank.

Example/sample Findings do not silently invoke live ranking. Sample services remain explicitly sample data.

## Trust invariants preserved

- Search relevance is not capability proof.
- Operator metadata remains operator-claimed.
- Marketplace Test Lab remains contract-level observation rather than financial-performance proof.
- Missing structured service coverage is UNKNOWN, not automatically false.
- Compatibility is not financial suitability.
- A rank cannot modify `activationEligible`.
- A `LIMITED`, `DEGRADED`, `OFFLINE`, or otherwise non-ready service remains non-activatable.
- Permission authority remains an independent readiness gate.

## Validation

Environment limitations remain unchanged: the uploaded ZIP has no installed workspace dependencies and pnpm cannot be provisioned from npm in this sandbox.

Validation completed here:

- TypeScript syntax transpilation: all modified TS/TSX files clean.
- `tsc --noEmit -p packages/marketplace-supply/tsconfig.json`: PASS using temporary local validation-only workspace/type stubs.
- Marketplace Supply + Test Lab runtime regression suite: **18/18 PASS** after TypeScript transpilation to an isolated temporary runtime.
- Smart Money engine runtime regression suite: **9/9 PASS** after TypeScript transpilation to an isolated temporary runtime.
- `node scripts/verify-foundation.mjs`: PASS with v0.13 compatibility/API/UI markers.

Temporary validation stubs/runtimes are not part of the release ZIP.

## Next milestone

**v0.14.0 — Rebalancing Vertical Handoff / Job Intent**

Convert a real PancakeSwap Rebalancing Finding plus a user-selected compatible AgentService into a structured, reviewable service/job intent carrying:

- exact LP position/pool/token ID context;
- Finding and evidence references;
- requested agent action;
- user-entered constraints/limits;
- selected AgentService identity;
- current readiness/Test Lab state;
- unresolved permission/authority requirements;
- explicit no-execution state.

Do not execute the financial action in v0.14.0. The following milestone should add bounded explicit permission/authority integration before real BSC Testnet activation.
