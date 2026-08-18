# Spotriq Figma Export Audit

## Source
Original source of truth: `Spotriq(1).zip` exported from Figma Make.

## What Figma generated well
- Strong dark financial visual direction.
- Consumer top navigation and mobile bottom navigation.
- Home, Explore, Smart Money Check, four category services, Agent Profile, Compare, Try Agent, Permission Checkout, My Agents, Smart Money Plans, Authority/Activity/Outcomes views.
- Distinct category metrics for Rebalancing, Grid, Yield and Health.
- Evidence provenance language and explicit sample-data labelling.
- Permission-first UX and post-activation views.
- Responsive utility styling and reusable visual primitives inside the generated application.

## Gaps found in the raw export
1. The exported code still used the temporary `AgentMarket` name.
2. The Home hero still used “Put the right BSC agent to work for your money.”
3. Spotriq metadata/title/descriptor updates were absent.
4. The project was not a complete standalone Vite app: no `index.html`, `src/main.tsx`, `tsconfig.json`, or useful dev/typecheck scripts.
5. Almost the entire product lived in one ~163 KB `App.tsx`.
6. Domain types and sample marketplace data lived directly inside `App.tsx`.
7. Smart Money Check, Try Agent, and Checkout used component-level `setTimeout()` simulations.
8. Wallet actions were UI-local rather than behind a wallet boundary.
9. No mock repository/API seam existed for replacement by the real Spotriq backend.
10. No SSE client boundary existed for future Smart Money Check / activation / test streams.
11. Footer referenced an Operator Workspace, but no functional Operator route/page existed.
12. The raw export did not contain the real backend, BSC integrations, protocol adapters, Agent Studio agents, Altana grants, ERC-8004 ingestion, or database. It was a frontend prototype, as expected.

## Corrections made in this replacement
- Locked product brand to **Spotriq**.
- Locked descriptor to **BSC financial-agent marketplace**.
- Updated the hero to **“Know what your money needs. Spot the right agent for it.”**
- Centralized brand and footer configuration.
- Added product metadata and standalone Vite entry files.
- Added explicit domain resource types and kept permission/activation/transaction/outcome concepts separate.
- Moved mock data out of the presentation file.
- Added a `MarketplaceRepository` seam plus mock and real-API repository implementations.
- Moved timer-driven prototype behaviour behind mock realtime services.
- Added an SSE client boundary for future event streams.
- Added a wallet-handler boundary for future wagmi/viem/Altana integration.
- Added a functional Spotriq Operator Workspace route so footer operator links are no longer dead.
- Added implementation documentation and backend-fusion notes.

## Deliberately not claimed as complete yet
- Real backend API.
- PostgreSQL.
- Real BSC wallet connection.
- Real PancakeSwap/Venus data.
- Real ERC-8004/8004scan discovery.
- Real Altana permissions.
- Real Agent Studio agents.
- Real blockchain transactions.
- Production authentication.
- Complete decomposition of the still-large presentation `App.tsx`.
- Exhaustive live loading/partial/stale/error behaviour from real providers.

These belong to the upcoming engineering milestones rather than being falsely simulated as production functionality.
