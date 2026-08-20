# Spotriq v0.10.0 Implementation Report

## Milestone
Agent Service + Marketplace Listing/Readiness Engine

## Outcome
Spotriq can now transform supported-category ERC-8004 discoveries into normalized, explicitly non-activatable financial service candidates while preserving the product's identity/listing/service/offer/permission/readiness boundaries.

## Added
- `@spotriq/marketplace-supply`
- distinct marketplace listing/service/offer/permission/readiness/capability-claim domain types
- deterministic normalization and readiness methods
- memory and PostgreSQL supply stores
- migration `0008_marketplace_service_readiness.sql`
- marketplace supply/readiness API routes
- frontend supply repository
- Explore normalized live candidate surface
- readiness inspection action
- compatibility projection for the older Figma `MarketplaceRepository` seam
- evidence methods `marketplace.agent-service-normalization@1.0.0` and `marketplace.service-readiness@1.0.0`

## Safety/product-integrity decisions
- No ERC-8004 identity is treated as a ready financial service merely because it exists.
- No external reputation value becomes a Spotriq trust score.
- No financial-category claim is treated as marketplace-tested capability.
- No pricing is inferred from registry prose.
- No permission intensity/spend scope is inferred from registry prose.
- A2A/MCP declaration is only a runtime candidate; reachability/behaviour remains untested.
- `READY`/activation eligibility is intentionally unavailable until explicit permission profiles and Marketplace Test Lab evidence exist.

## Readiness gates
- BSC network
- canonical ERC-8004 identity
- active metadata declaration
- machine-callable A2A/MCP endpoint
- explicit permission profile
- marketplace tests

## Validation performed in build environment
- release structural verifier passed
- 103 TypeScript/TSX files syntax-transpiled with zero errors
- core domain + marketplace-supply semantic TypeScript validation passed
- 6 deterministic marketplace-supply/readiness tests passed
- package-manifest version audit: 16/16 on v0.10.0

The authoritative full workspace `pnpm check` must still be run in the user's installed Windows dependency environment.

## Next
Marketplace Test Lab + Service Readiness Verification. The next release should create Marketplace Observed evidence from safe endpoint/protocol contract tests and should not perform uncontrolled fund-moving actions during readiness verification.
