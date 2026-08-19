import { randomUUID } from "node:crypto";
import type { BscChainReader } from "@spotriq/chain";
import type { BscNetwork, EvidenceEnvelope, GridMarketContextSnapshot, GridMarketRegime, GridWalletMarketSnapshot, PancakeSwapClPoolSnapshot } from "@spotriq/domain";
import { createEvidenceEnvelope, DATA_SOURCES, EVIDENCE_METHODS } from "@spotriq/evidence";
import type { PancakeSwapReader } from "@spotriq/protocol-pancakeswap";

export const GRID_MARKET_METHOD = {
  methodId: "grid.market-regime",
  version: "1.0.0",
  name: "PancakeSwap V3 TWAP market-regime context",
  description: "Classifies a supported V3 pool from current price and available 1h/6h/24h onchain TWAP observations. It is market context, not realised volatility or a profitability forecast.",
} as const;

export interface SupportedGridMarket { id: string; label: string; tokenA: string; tokenB: string; feeCandidates: number[]; }

export const DEFAULT_GRID_MARKETS: Record<BscNetwork, SupportedGridMarket[]> = {
  mainnet: [{ id: "bnb-usdt", label: "BNB/USDT", tokenA: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", tokenB: "0x55d398326f99059ff775485246999027b3197955", feeCandidates: [100, 500, 2500, 10000] }],
  testnet: [
    { id: "tbnb-usdc", label: "tBNB/USDC", tokenA: "0xae13d989dac2f0debff460ac112a837c89baa7cd", tokenB: "0x64544969ed7ebf5f083679233325356ebe738930", feeCandidates: [100, 500, 2500, 10000] },
    { id: "tbnb-test-usdt", label: "tBNB/Test USDT", tokenA: "0xae13d989dac2f0debff460ac112a837c89baa7cd", tokenB: "0x337610d27c682e347c9cd60bd4b3b107c9d34ddd", feeCandidates: [100, 500, 2500, 10000] },
  ],
};

export interface GridMarketContextReader {
  getWalletMarketContexts(walletAddress: string, positionPools?: PancakeSwapClPoolSnapshot[]): Promise<GridWalletMarketSnapshot>;
  getPoolContext(poolAddress: string, walletAddress?: string, positionExposure?: boolean): Promise<GridMarketContextSnapshot>;
}

export class GridMarketContextError extends Error {
  constructor(message: string, public readonly retryable = false) { super(message); this.name = "GridMarketContextError"; }
}

function priceNumber(value?: string): number | undefined { const n = value === undefined ? NaN : Number(value); return Number.isFinite(n) && n > 0 ? n : undefined; }
function bps(a: number, b: number): number { return ((a - b) / b) * 10000; }

export function classifyGridRegime(prices: { spot?: number; h1?: number; h6?: number; h24?: number }): { regime: GridMarketRegime; confidence: GridMarketContextSnapshot["confidence"]; dispersionBps?: number } {
  const values = [prices.spot, prices.h1, prices.h6, prices.h24].filter((v): v is number => v !== undefined && Number.isFinite(v) && v > 0);
  if (prices.spot === undefined || prices.h1 === undefined || prices.h6 === undefined || values.length < 3) return { regime: "INSUFFICIENT_HISTORY", confidence: "unavailable" };
  const max = Math.max(...values); const min = Math.min(...values); const mid = (max + min) / 2;
  const dispersionBps = mid > 0 ? ((max - min) / mid) * 10000 : undefined;
  const shortDrift = bps(prices.h1, prices.h6);
  const longDrift = prices.h24 === undefined ? undefined : bps(prices.h6, prices.h24);
  const spotVsH6 = bps(prices.spot, prices.h6);
  const alignedUp = shortDrift >= 120 && spotVsH6 >= 120 && (longDrift === undefined || longDrift >= 50);
  const alignedDown = shortDrift <= -120 && spotVsH6 <= -120 && (longDrift === undefined || longDrift <= -50);
  if (alignedUp) return { regime: "TRENDING_UP", confidence: prices.h24 === undefined ? "medium" : "high", dispersionBps };
  if (alignedDown) return { regime: "TRENDING_DOWN", confidence: prices.h24 === undefined ? "medium" : "high", dispersionBps };
  if ((dispersionBps ?? Infinity) <= 150 && Math.abs(shortDrift) <= 100 && Math.abs(spotVsH6) <= 100) return { regime: "RANGE_LIKE", confidence: prices.h24 === undefined ? "medium" : "high", dispersionBps };
  return { regime: "MIXED", confidence: prices.h24 === undefined ? "medium" : "high", dispersionBps };
}

function isWbnb(network: BscNetwork, address: string): boolean {
  return address.toLowerCase() === (network === "mainnet" ? "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c" : "0xae13d989dac2f0debff460ac112a837c89baa7cd");
}

export function createGridMarketContextEngine(options: { chain: BscChainReader; pancakeSwap: PancakeSwapReader; markets?: SupportedGridMarket[] }): GridMarketContextReader {
  const markets = options.markets ?? DEFAULT_GRID_MARKETS[options.chain.network];

  async function getPoolContext(poolAddress: string, walletAddress?: string, positionExposure = false): Promise<GridMarketContextSnapshot> {
    const pool = await options.pancakeSwap.getV3Pool(poolAddress);
    const windows = await Promise.all([3600, 21600, 86400].map(async (seconds) => {
      try {
        const o = await options.pancakeSwap.observeV3Pool(poolAddress, seconds, pool.blockNumber);
        return { seconds, label: seconds === 3600 ? "1h" : seconds === 21600 ? "6h" : "24h", averageTick: o.averageTick, averagePriceToken0InToken1: o.averagePriceToken0InToken1, state: "AVAILABLE" as const };
      } catch { return { seconds, label: seconds === 3600 ? "1h" : seconds === 21600 ? "6h" : "24h", state: "UNAVAILABLE" as const }; }
    }));
    const available = windows.filter((w) => w.state === "AVAILABLE");
    const h = Object.fromEntries(windows.map((w) => [w.label, priceNumber(w.averagePriceToken0InToken1)]));
    const classified = classifyGridRegime({ spot: priceNumber(pool.currentPriceToken0InToken1), h1: h["1h"], h6: h["6h"], h24: h["24h"] });
    let token0BalanceRaw: string | undefined; let token1BalanceRaw: string | undefined; let nativeBalanceRaw: string | undefined; let walletState: GridMarketContextSnapshot["coverage"]["walletBalances"] = walletAddress ? "FAILED" : "NOT_REQUESTED";
    if (walletAddress) {
      try {
        const balances = await options.chain.getWalletBalances(walletAddress, [pool.token0.address, pool.token1.address]);
        token0BalanceRaw = balances.tokens.find((t) => t.tokenAddress.toLowerCase() === pool.token0.address.toLowerCase())?.balanceRaw;
        token1BalanceRaw = balances.tokens.find((t) => t.tokenAddress.toLowerCase() === pool.token1.address.toLowerCase())?.balanceRaw;
        nativeBalanceRaw = balances.native.balanceRaw;
        walletState = balances.coverage.tokenBalances === "PARTIAL" ? "PARTIAL" : "AVAILABLE";
      } catch { walletState = "FAILED"; }
    }
    const compatible = positionExposure || BigInt(token0BalanceRaw ?? "0") > 0n || BigInt(token1BalanceRaw ?? "0") > 0n || (isWbnb(options.chain.network, pool.token0.address) || isWbnb(options.chain.network, pool.token1.address)) && BigInt(nativeBalanceRaw ?? "0") > 0n;
    const prices = [pool.currentPriceToken0InToken1, ...available.map((w) => w.averagePriceToken0InToken1)].map(priceNumber).filter((v): v is number => v !== undefined);
    const observedAt = pool.observedAt;
    const evidence: EvidenceEnvelope[] = [...pool.evidence];
    evidence.push(createEvidenceEnvelope({ subjectType: "grid-market", subjectId: pool.poolAddress!, metric: "grid.market_regime", value: classified.regime, provenance: "marketplace-derived", source: DATA_SOURCES.SPOTRIQ_DERIVED, observedAt, confidence: classified.confidence, method: EVIDENCE_METHODS.GRID_MARKET_REGIME, methodInputs: windows.filter(w => w.state === "AVAILABLE").map(w => `${w.label}:${w.averageTick}`), chainContext: { chain: "BSC", network: pool.network, chainId: pool.chainId, blockNumber: pool.blockNumber, finality: "LATEST" }, limitation: "TWAP dispersion is not realised volatility and this regime is not a profit forecast." }));
    const pairLabel = `${pool.token0.symbol ?? "token0"}/${pool.token1.symbol ?? "token1"}`;
    return {
      contextId: `gridctx_${randomUUID()}`, protocol: "PancakeSwap", version: "V3", network: pool.network, chainId: pool.chainId, poolAddress: pool.poolAddress!, pairLabel,
      token0: pool.token0, token1: pool.token1, feePips: pool.feePips, currentTick: pool.currentTick, currentPriceToken0InToken1: pool.currentPriceToken0InToken1, liquidityRaw: pool.liquidityRaw,
      windows, twapBandLow: prices.length ? String(Math.min(...prices)) : undefined, twapBandHigh: prices.length ? String(Math.max(...prices)) : undefined, twapDispersionBps: classified.dispersionBps === undefined ? undefined : Number(classified.dispersionBps.toFixed(2)), regime: classified.regime, confidence: classified.confidence,
      walletCompatibility: { token0BalanceRaw, token1BalanceRaw, nativeBalanceRaw, hasAnyCompatibleAsset: compatible, positionExposure }, blockNumber: pool.blockNumber, observedAt, evidence,
      coverage: { poolState: "AVAILABLE", oracleHistory: available.length === 3 ? "AVAILABLE" : available.length >= 2 ? "PARTIAL" : "INSUFFICIENT_HISTORY", walletBalances: walletState },
      limitations: ["Onchain TWAP windows describe average price direction, not historical high/low or realised volatility.", "A range-like classification does not imply grid trading will be profitable or appropriate.", "Capital size and risk preference are not inferred from wallet history."],
    };
  }

  async function getWalletMarketContexts(walletAddress: string, positionPools: PancakeSwapClPoolSnapshot[] = []): Promise<GridWalletMarketSnapshot> {
    const candidates = new Map<string, { pool: PancakeSwapClPoolSnapshot; positionExposure: boolean }>();
    for (const pool of positionPools.filter((p) => p.version === "V3" && p.poolAddress)) candidates.set(pool.poolAddress!.toLowerCase(), { pool, positionExposure: true });
    const failedMarketRefs: string[] = [];
    for (const market of markets) {
      try {
        const pool = await options.pancakeSwap.findBestV3Pool(market.tokenA, market.tokenB, market.feeCandidates);
        if (pool?.poolAddress) candidates.set(pool.poolAddress.toLowerCase(), { pool, positionExposure: candidates.get(pool.poolAddress.toLowerCase())?.positionExposure ?? false });
        else failedMarketRefs.push(`${market.id}:no-v3-pool`);
      } catch { failedMarketRefs.push(`${market.id}:read-failed`); }
    }
    const contexts: GridMarketContextSnapshot[] = [];
    for (const candidate of candidates.values()) {
      try { contexts.push(await getPoolContext(candidate.pool.poolAddress!, walletAddress, candidate.positionExposure)); }
      catch { failedMarketRefs.push(candidate.pool.poolAddress ?? "unknown-pool"); }
    }
    return { walletAddress: walletAddress.toLowerCase(), network: options.chain.network, chainId: options.chain.definition.chainId, observedAt: new Date().toISOString(), contexts, coverage: { configuredMarkets: failedMarketRefs.length === 0 ? "AVAILABLE" : contexts.length ? "PARTIAL" : "FAILED", failedMarketRefs }, limitations: ["Spotriq currently evaluates supported PancakeSwap V3 pools and V3 pools already attached to discovered wallet LP positions.", "TWAP-based regime context is not a recommendation or a volatility estimate."] };
  }
  return { getWalletMarketContexts, getPoolContext };
}
