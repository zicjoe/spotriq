# Spotriq Source of Truth

Current release: **v0.8.0**

This ZIP supersedes Spotriq v0.7.0.

Implemented live data categories:
1. Rebalancing — PancakeSwap V3/Infinity CL current-state foundation and V3 wallet discovery.
2. Health Factor Monitoring — Venus Core/Isolated Pool health state.
3. Yield Optimisation — wallet-relevant Venus base supply-rate opportunities with strict rate provenance.
4. Grid Trading — wallet-relevant PancakeSwap V3 spot + onchain 1h/6h/24h TWAP market context with deterministic regime classification.

All four required financial categories now have real data foundations. Grid TWAP dispersion is explicitly not labelled as realised volatility or a profit forecast.

Next operational step: connect Railway PostgreSQL and run all migrations for durable Smart Money history/evidence.
Next engineering milestone after persistence: ERC-8004 + 8004scan agent registry/discovery and normalized Agent Service listings.
