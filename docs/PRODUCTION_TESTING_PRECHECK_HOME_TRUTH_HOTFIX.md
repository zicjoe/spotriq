# Spotriq v0.39.0 — Production Testing Pre-check Truth/UX Hotfix

## Status

Applied after v0.39 acceptance and before the first manual production-testing pass. This is not a new feature milestone and does not approve BSC Mainnet financial execution.

## Corrected pre-test defects

- Removed a hard-coded demo wallet from the global production navigation.
- Removed the demo-derived My Agents count from the global navigation.
- Removed dead search/notification controls from the global header and replaced the misleading wallet fixture with a real navigation action to Smart Money Check.
- Rewrote homepage authority/revocation copy so Marketplace Activation, PermissionGrant and revocation remain separate.
- Rewrote homepage activity/evidence copy so missing transaction/outcome evidence stays explicit.
- Removed the top-level banner implying the entire production homepage is synthetic.
- Removed static sample Smart Money Plan pricing/activation cards from the production homepage; the homepage now directs users to persisted live Smart Money Plans.
- Updated the public adoption manifest to report v0.39 as accepted and adoption measurement as active.
- Normalized canonical status files to the accepted v0.39 state.

## Regression guard

`pnpm verify` now fails if production navigation reintroduces the hard-coded demo wallet/demo activation count or if the homepage loses the locked Activation/PermissionGrant/revocation/evidence wording.

## Unchanged boundaries

- BSC Mainnet financial execution remains unapproved.
- Analytics remain non-authoritative.
- Marketplace relationship revocation remains separate from independent PermissionGrant revocation.
- No new roadmap milestone was created.
