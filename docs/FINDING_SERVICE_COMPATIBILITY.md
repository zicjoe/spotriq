# Finding → AgentService Compatibility & Ranking

Release: **v0.13.0**

Method: `marketplace.finding-service-compatibility@1.0.0`

## Purpose

Spotriq now connects the demand side of the marketplace (a real Smart Money `Finding`) to the supply side (normalized live `AgentService` candidates). The output is a deterministic compatibility ranking, not a recommendation score, trust score, profitability forecast, or activation decision.

## API

```text
GET /v1/checks/:checkSessionId/findings/:findingId/matches?limit=8
```

The API reloads the Finding from the named Smart Money Check so a caller cannot submit arbitrary ranking context through the match endpoint.

## Finding context

The matcher consumes only structured Finding fields already produced by Spotriq:

- required financial category;
- protocol when present;
- asset symbol/address when present;
- pair when present;
- network, Finding state and severity as explanatory context.

It does not mine free-form Finding prose to invent hard constraints.

## Compatibility rules

1. **Category** is a hard requirement.
2. **Protocol** becomes a hard requirement only when both the Finding and service expose structured protocol data. Explicit contradiction excludes the service. Missing service protocol data remains `UNKNOWN`.
3. **Asset** and **pair** follow the same evidence rule: structured contradiction can exclude; missing structured coverage remains `UNKNOWN`.
4. A suspended service/identity is excluded from usable matches.
5. Canonical identity, observed runtime reachability and Marketplace Test Lab PASS results increase evidence quality for ordering.
6. Existing operational readiness is a secondary ordering signal.
7. Stable `serviceId` is the final tie break.

## Match tiers

- `EXACT_CONTEXT` — all available structured context constraints that can be evaluated pass, with no required context left unknown.
- `CONTEXT_COMPATIBLE` — at least one structured context dimension passes, but other required context remains unknown because the service does not publish it yet.
- `CATEGORY_ONLY` — the financial category matches, but no additional structured context dimension can currently be confirmed.

A lower tier can still be a legitimate candidate. It simply has less structured evidence for this specific Finding.

## Evidence and readiness

Compatibility results expose individual checks for:

- category;
- protocol;
- asset;
- pair;
- canonical ERC-8004 identity;
- observed runtime reachability;
- Marketplace Test Lab;
- permission profile.

The ranking deliberately has **no opaque numeric score**.

A candidate can rank first while still returning:

```text
activationEligible: false
readiness: LIMITED
```

That is expected. Compatibility does not grant authority and does not bypass readiness.

## UI handoff

Live Smart Money Finding actions already navigate with `fromFinding`. Explore now consumes that value and loads **Best live matches for this finding** before generic supply.

Sample/reference services remain visually separate. If live matching returns zero candidates, Spotriq shows an honest zero-match state rather than substituting sample cards.

After canonical readiness inspection or a Marketplace Test Lab run, Explore re-runs the compatibility query so stronger observed evidence can change ordering legitimately.

## Non-claims

A high rank does not mean:

- profitable;
- safest;
- best for the user;
- guaranteed to execute correctly;
- authorized;
- activation-ready;
- proven historical performer.

It means the normalized service is more compatible with the structured Finding context under Spotriq's current deterministic method.
