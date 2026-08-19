# Spotriq v0.9.2 — Live Registry Visibility Hotfix

## Problem
The v0.9.1 backend successfully returned live BSC ERC-8004 identities, but Explore filtered the live section to identities that already carried a recognized Spotriq financial-category metadata hint. When the indexed result set contained real identities without those hints, the UI showed an empty state even though `/v1/agents` was healthy and returning data.

## Fix
- The **All** category now renders every live ERC-8004 identity returned by the registry API.
- Rebalancing/Grid/Yield/Health category tabs continue to filter by operator-supplied metadata hints, because those tabs represent an explicit financial-category filter.
- Cards without a recognized financial hint remain visible and explicitly explain that registry discovery is broader than marketplace readiness.
- Explore now shows total live identities returned and how many carry recognized financial metadata hints.
- The live-source label no longer incorrectly describes every result set as semantic discovery.

## Product boundary preserved
A visible ERC-8004 identity is still only a discovered identity. Missing category hints do not invalidate the identity, and the presence of a hint does not establish tested financial capability, readiness, safety, performance, or activation eligibility.

## Persistence and migrations
No schema change. Migration 0007 remains current.
