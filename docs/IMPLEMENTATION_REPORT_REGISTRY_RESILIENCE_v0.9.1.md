# Spotriq v0.9.1 — Registry Discovery Resilience Hotfix

## Issue
The Explore page used 8004scan semantic search for its automatic initial registry load. A semantic-search upstream failure therefore made the entire live registry section appear unavailable even when the standard `/agents` endpoint was healthy.

## Fix
- Initial Explore registry load now uses the standard paginated `/agents` endpoint for BSC Mainnet.
- Semantic search is used only after an explicit user search.
- If semantic search returns an index-unavailable error, the backend automatically falls back to the standard indexed keyword search.
- Default upstream timeout increased from 7.5s to 15s.
- Sample/reference services remain available independently of upstream registry status.

## Product invariant
Live ERC-8004 identity discovery remains External indexed evidence and does not imply Spotriq service readiness or financial capability verification.
