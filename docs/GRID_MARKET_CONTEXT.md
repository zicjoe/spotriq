# Spotriq Grid Trading Market-Context Foundation

## Purpose

Provide decision context for the Grid Trading category without predicting profit or inferring user intent.

## Truth flow

PancakeSwap V3 pool state → onchain oracle cumulative ticks → 1h/6h/24h TWAP averages → versioned Spotriq regime calculation → wallet-compatibility gate → Smart Money Grid finding.

## Regimes

- `RANGE_LIKE` — available average-price windows remain inside Spotriq's versioned dispersion/drift limits.
- `TRENDING_UP` / `TRENDING_DOWN` — directional divergence across required windows.
- `MIXED` — sufficient history but no range-like or aligned-trend classification.
- `INSUFFICIENT_HISTORY` — required oracle windows are unavailable.

These are deterministic marketplace-derived context labels. They are not trading advice.

## Evidence semantics

Current pool tick/liquidity/price are sourced from PancakeSwap protocol state. The Grid regime is Marketplace Derived and stores its calculation method/version and input oracle windows. Freshness follows the `grid.market_regime` policy.

## Wallet relevance

A Smart Money Grid finding is only emitted when the wallet has compatible pair assets, native BNB/tBNB for WBNB exposure, or an already-discovered position in that V3 pool. Spotriq does not infer capital size, risk tolerance, desired grid range, stop loss, or take profit.

## Limitations

- TWAP dispersion is not realised volatility.
- Spot + TWAP averages do not provide historical high/low.
- Range-like does not mean profitable or appropriate.
- Default supported market discovery is best-effort and validates pool existence onchain.
- Pools without sufficient V3 oracle history become `INSUFFICIENT_HISTORY` rather than guessed.
