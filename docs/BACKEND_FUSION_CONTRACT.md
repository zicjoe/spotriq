# Backend Fusion Contract

Spotriq's frontend is a presentation layer over normalized marketplace resources.

## Frontend dependency direction

UI -> hooks/view models -> repository/API client -> Spotriq API -> domain/integration layers.

Presentation components must not directly query PancakeSwap, Venus, ERC-8004, 8004scan, Altana, Agent Studio, or raw BSC RPC providers.

## Preserved domain separations

- Agent Identity != Listing != Service.
- Permission Profile != Permission Request != Permission Grant.
- Permission != Activation.
- Agent Action != Transaction.
- Transaction success != financial Outcome.
- Finding != Recommendation.
- Smart Money Plan != super-agent.
- Evidence != AI explanation.

## Current prototype seams

- `src/domain/types.ts`
- `src/repositories/marketplaceRepository.ts`
- `src/repositories/apiMarketplaceRepository.ts`
- `src/api/client.ts`
- `src/services/mockRealtime.ts`
- `src/services/sseClient.ts`
- `src/services/walletHandlers.ts`
- `src/mocks/data.ts`

The current UI uses the normalized demo snapshot. The next backend integration should replace repository/service implementations, not redesign product screens.
