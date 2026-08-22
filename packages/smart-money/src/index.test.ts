import assert from "node:assert/strict";
import test from "node:test";
import type { BscChainReader } from "@spotriq/chain";
import type { EvidenceEnvelope, GridMarketContextSnapshot, PancakeSwapClPositionSnapshot, VenusPoolPositionSnapshot, YieldOpportunitySnapshot } from "@spotriq/domain";
import type { PancakeSwapReader } from "@spotriq/protocol-pancakeswap";
import type { GridMarketContextReader } from "@spotriq/market-context";
import type { VenusReader } from "@spotriq/protocol-venus";
import { createGridFinding, createYieldFinding, createHealthFinding, createRebalancingFinding, createSmartMoneyEngine, MemorySmartMoneyStore } from "./index.js";

const observedAt = "2026-08-19T04:00:00.000Z";
const evidence: EvidenceEnvelope = {
  evidenceId: "ev-range",
  subjectType: "liquidity-position",
  subjectId: "V3:1",
  metric: "liquidity.range_state",
  value: "OUT_OF_RANGE_ABOVE",
  provenance: "marketplace-derived",
  sourceName: "Spotriq Derived",
  sourceId: "spotriq-derived",
  truthLayer: "MARKETPLACE_DERIVED",
  observedAt,
  confidence: "high",
  freshnessAssessment: { metric: "liquidity.range_state", targetAgeSeconds: 30, warnAgeSeconds: 60, hardExpirySeconds: 120, ageSeconds: 0, state: "FRESH" },
  availability: "AVAILABLE",
  chainContext: { chain: "BSC", network: "testnet", chainId: 97, blockNumber: "100", finality: "LATEST" },
};

function makePosition(rangeState: PancakeSwapClPositionSnapshot["rangeState"]): PancakeSwapClPositionSnapshot {
  return {
    protocol: "PancakeSwap",
    version: "V3",
    network: "testnet",
    chainId: 97,
    positionManager: "0x1111111111111111111111111111111111111111",
    tokenId: "1",
    owner: "0x2222222222222222222222222222222222222222",
    pool: {
      protocol: "PancakeSwap",
      version: "V3",
      network: "testnet",
      chainId: 97,
      poolAddress: "0x3333333333333333333333333333333333333333",
      token0: { address: "0x4444444444444444444444444444444444444444", symbol: "BNB", decimals: 18, isNative: false },
      token1: { address: "0x5555555555555555555555555555555555555555", symbol: "USDT", decimals: 18, isNative: false },
      feePips: 2500,
      tickSpacing: 50,
      currentTick: rangeState === "OUT_OF_RANGE_ABOVE" ? 1200 : rangeState === "NEAR_UPPER" ? 990 : 500,
      sqrtPriceX96: "79228162514264337593543950336",
      liquidityRaw: "1000",
      currentPriceToken0InToken1: "620.5",
      blockNumber: "100",
      observedAt,
      evidence: [evidence],
    },
    tickLower: 0,
    tickUpper: 1000,
    liquidityRaw: rangeState === "NO_LIQUIDITY" ? "0" : "500",
    rangeState,
    distanceToLowerTicks: 500,
    distanceToUpperTicks: rangeState === "NEAR_UPPER" ? 10 : 500,
    blockNumber: "100",
    observedAt,
    evidence: [evidence],
    coverage: { ownership: "AVAILABLE", poolState: "AVAILABLE", tokenMetadata: "AVAILABLE", fees: "RECORDED_ONLY", valuation: "NOT_SUPPORTED" },
  };
}

test("rebalancing finding never describes out-of-range as a loss", () => {
  const finding = createRebalancingFinding("check_1", makePosition("OUT_OF_RANGE_ABOVE"), new Date(observedAt), () => "1");
  assert.equal(finding.state, "needs-attention");
  assert.equal(finding.severity, "attention");
  assert.match(finding.headline, /outside its active range/i);
  assert.doesNotMatch(`${finding.headline} ${finding.summary}`, /lost|losing money|loss/i);
  assert.equal(finding.methodVersion, "smart-money.rebalancing-finding@1.0.0");
  assert.deepEqual(finding.evidenceIds, ["ev-range"]);
  assert.equal(finding.subject?.positionManager, "0x1111111111111111111111111111111111111111");
  assert.equal((finding.subject?.token0 as { address?: string } | undefined)?.address, "0x4444444444444444444444444444444444444444");
  assert.equal((finding.subject?.token1 as { decimals?: number } | undefined)?.decimals, 18);
});

test("in-range finding is healthy but does not claim portfolio safety", () => {
  const finding = createRebalancingFinding("check_2", makePosition("IN_RANGE"), new Date(observedAt), () => "2");
  assert.equal(finding.state, "healthy");
  assert.equal(finding.severity, "info");
  assert.doesNotMatch(`${finding.headline} ${finding.summary}`, /portfolio.*safe|risk-free/i);
});


function makeVenusPosition(riskState: VenusPoolPositionSnapshot["riskState"]): VenusPoolPositionSnapshot {
  const hasBorrow = riskState !== "NO_BORROW";
  return {
    protocol: "Venus", network: "testnet", chainId: 97, poolKind: "ISOLATED", poolName: "Stablecoins",
    comptroller: "0x6666666666666666666666666666666666666666", oracle: "0x7777777777777777777777777777777777777777",
    walletAddress: "0x2222222222222222222222222222222222222222", protocolLiquidityRaw: riskState === "LIQUIDATABLE" ? "0" : "500000000000000000000",
    protocolShortfallRaw: riskState === "LIQUIDATABLE" ? "100000000000000000000" : "0",
    totalBorrowValueUsd1e18: hasBorrow ? "1000000000000000000000" : "0",
    liquidationAdjustedCollateralUsd1e18: hasBorrow ? (riskState === "WATCH" ? "1300000000000000000000" : riskState === "HIGHER_ATTENTION" ? "1100000000000000000000" : riskState === "LIQUIDATABLE" ? "900000000000000000000" : "1800000000000000000000") : "0",
    healthFactor: hasBorrow ? (riskState === "WATCH" ? "1.3" : riskState === "HIGHER_ATTENTION" ? "1.1" : riskState === "LIQUIDATABLE" ? "0.9" : riskState === "COULD_NOT_ASSESS" ? undefined : "1.8") : undefined,
    riskState,
    markets: [{
      protocol: "Venus", poolKind: "ISOLATED", poolName: "Stablecoins", comptroller: "0x6666666666666666666666666666666666666666",
      vToken: "0x8888888888888888888888888888888888888888", vTokenSymbol: "vUSDT", underlying: { address: "0x9999999999999999999999999999999999999999", symbol: "USDT", decimals: 18, isNative: false },
      collateralEnabled: true, suppliedVTokenRaw: "100", suppliedUnderlyingRaw: "2000000000000000000000", borrowUnderlyingRaw: hasBorrow ? "1000000000000000000000" : "0", exchangeRateMantissa: "20000000000000000000000000000",
      collateralFactorMantissa: "700000000000000000", liquidationThresholdMantissa: "800000000000000000", oraclePriceRaw: "1000000000000000000",
      suppliedValueUsd1e18: "2000000000000000000000", borrowValueUsd1e18: hasBorrow ? "1000000000000000000000" : "0", liquidationAdjustedCollateralUsd1e18: "1600000000000000000000", evidence: [evidence],
    }],
    blockNumber: "100", observedAt, evidence: [evidence],
    coverage: { accountLiquidity: "AVAILABLE", marketPositions: riskState === "COULD_NOT_ASSESS" ? "PARTIAL" : "AVAILABLE", healthFactor: riskState === "COULD_NOT_ASSESS" ? "UNAVAILABLE" : "AVAILABLE" },
    limitations: riskState === "COULD_NOT_ASSESS" ? ["Oracle price unavailable."] : [],
  };
}

test("Venus shortfall produces an urgent Health finding without predicting liquidation timing", () => {
  const finding = createHealthFinding("check_health", makeVenusPosition("LIQUIDATABLE"), new Date(observedAt), () => "h1");
  assert.equal(finding.category, "health");
  assert.equal(finding.state, "needs-attention");
  assert.equal(finding.severity, "urgent");
  assert.match(finding.summary, /current protocol state/i);
  assert.doesNotMatch(`${finding.headline} ${finding.summary}`, /guaranteed|will be liquidated/i);
});


test("Venus forced-liquidation configuration produces urgent wording even without protocol shortfall", () => {
  const position = makeVenusPosition("LIQUIDATABLE");
  position.protocolShortfallRaw = "0";
  position.markets[0]!.forcedLiquidationEnabled = true;
  const finding = createHealthFinding("check_forced", position, new Date(observedAt), () => "hf");
  assert.equal(finding.state, "needs-attention");
  assert.equal(finding.severity, "urgent");
  assert.match(finding.headline, /forced liquidation/i);
  assert.match(finding.summary, /regardless of normal account liquidity/i);
});

test("incomplete Venus inputs become Could Not Assess, never Healthy", () => {
  const finding = createHealthFinding("check_health2", makeVenusPosition("COULD_NOT_ASSESS"), new Date(observedAt), () => "h2");
  assert.equal(finding.state, "could-not-assess");
  assert.equal(finding.confidence, "low");
  assert.match(finding.summary, /will not label this position Healthy/i);
});


function makeGridContext(regime: GridMarketContextSnapshot["regime"] = "RANGE_LIKE"): GridMarketContextSnapshot {
  return {
    contextId: "gridctx_test", protocol: "PancakeSwap", version: "V3", network: "testnet", chainId: 97,
    poolAddress: "0x3333333333333333333333333333333333333333", pairLabel: "tBNB/USDT",
    token0: { address: "0x4444444444444444444444444444444444444444", symbol: "tBNB", decimals: 18, isNative: false },
    token1: { address: "0x5555555555555555555555555555555555555555", symbol: "USDT", decimals: 18, isNative: false },
    feePips: 2500, currentTick: 500, currentPriceToken0InToken1: "620.5", liquidityRaw: "1000000",
    windows: [
      { seconds: 3600, label: "1h", averageTick: 499, averagePriceToken0InToken1: "620.4", state: "AVAILABLE" },
      { seconds: 21600, label: "6h", averageTick: 498, averagePriceToken0InToken1: "620.2", state: "AVAILABLE" },
      { seconds: 86400, label: "24h", averageTick: 497, averagePriceToken0InToken1: "620.0", state: "AVAILABLE" },
    ],
    twapBandLow: "620", twapBandHigh: "620.5", twapDispersionBps: 8.06, regime, confidence: regime === "INSUFFICIENT_HISTORY" ? "unavailable" : "high",
    walletCompatibility: { token0BalanceRaw: "1000000000000000000", token1BalanceRaw: "0", nativeBalanceRaw: "1000000000000000000", hasAnyCompatibleAsset: true, positionExposure: true },
    blockNumber: "100", observedAt, evidence: [evidence], coverage: { poolState: "AVAILABLE", oracleHistory: regime === "INSUFFICIENT_HISTORY" ? "INSUFFICIENT_HISTORY" : "AVAILABLE", walletBalances: "AVAILABLE" },
    limitations: ["TWAP dispersion is not realised volatility.", "A range-like classification does not imply profitability."],
  };
}

test("Grid finding surfaces range-like context as an opportunity without predicting profit", () => {
  const finding = createGridFinding("check_grid", makeGridContext("RANGE_LIKE"), new Date(observedAt), () => "grid");
  assert.ok(finding);
  assert.equal(finding?.category, "grid");
  assert.equal(finding?.state, "opportunity");
  assert.match(finding?.summary ?? "", /not realised volatility/i);
  assert.doesNotMatch(`${finding?.headline} ${finding?.summary}`, /perfect|guaranteed|will profit|profitable strategy/i);
});

test("Grid finding becomes Could Not Assess when required oracle history is unavailable", () => {
  const finding = createGridFinding("check_grid2", makeGridContext("INSUFFICIENT_HISTORY"), new Date(observedAt), () => "grid2");
  assert.equal(finding?.state, "could-not-assess");
  assert.equal(finding?.confidence, "low");
});

test("Smart Money Check keeps partial financial coverage explicit while enabling the on-demand AgentService compatibility handoff", async () => {
  const chain = {
    network: "testnet" as const,
    definition: { network: "testnet" as const, chainId: 97 as const, nativeSymbol: "tBNB" as const, explorerUrl: "https://testnet.bscscan.com", defaultRpcUrls: ["https://a", "https://b"] as [string, string] },
    rpcMode: "configured" as const,
    getStatus: async () => { throw new Error("not used"); },
    getHealth: async () => ({ name: "bsc", state: "ok" as const }),
    getBlockNumber: async () => "100",
    getBlock: async () => { throw new Error("not used"); },
    getTransaction: async () => null,
    getTransactionReceipt: async () => null,
    getNativeBalance: async () => { throw new Error("not used"); },
    getErc20Balance: async () => { throw new Error("not used"); },
    getWalletBalances: async (walletAddress: string) => ({
      walletAddress, chain: "BSC" as const, network: "testnet" as const, chainId: 97, blockNumber: "100", observedAt,
      native: { assetType: "native" as const, chain: "BSC" as const, network: "testnet" as const, chainId: 97, symbol: "tBNB" as const, decimals: 18 as const, balanceRaw: "1000000000000000000", balanceFormatted: "1", walletAddress, blockNumber: "100", observedAt, evidence },
      tokens: [], coverage: { nativeBalance: "AVAILABLE" as const, tokenBalances: "NOT_REQUESTED" as const, failedTokenAddresses: [] },
    }),
    callContract: async () => { throw new Error("not used"); },
    callContractFrom: async () => { throw new Error("not used"); },
  } satisfies BscChainReader;

  const pancake = {
    getStatus: () => { throw new Error("not used"); },
    getV3Pool: async () => makePosition("IN_RANGE").pool,
    findBestV3Pool: async () => makePosition("IN_RANGE").pool,
    observeV3Pool: async (_poolAddress: string, secondsAgo: number) => ({ poolAddress: "0x3333333333333333333333333333333333333333", secondsAgo, averageTick: 500, averagePriceToken0InToken1: "620.5", blockNumber: "100", observedAt }),
    getV3Position: async () => makePosition("OUT_OF_RANGE_ABOVE"),
    getInfinityClPosition: async () => makePosition("IN_RANGE"),
    getPosition: async () => makePosition("OUT_OF_RANGE_ABOVE"),
    getWalletPositions: async (walletAddress: string) => ({ walletAddress, network: "testnet" as const, chainId: 97, blockNumber: "100", observedAt, positions: [makePosition("OUT_OF_RANGE_ABOVE")], coverage: { v3Discovery: "AVAILABLE" as const, infinityClDiscovery: "TOKEN_ID_REQUIRED" as const, failedV3PositionRefs: [], truncated: false, maxPositions: 50 } }),
    quoteV3DecreaseLiquidity: async () => { throw new Error("not used"); },
  } satisfies PancakeSwapReader;

  const venus = {
    getStatus: async () => { throw new Error("not used"); },
    getWalletPositions: async (walletAddress: string) => ({ walletAddress, network: "testnet" as const, chainId: 97, blockNumber: "100", observedAt, contracts: { network: "testnet" as const, protocolShareReserve: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", corePoolComptroller: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", poolRegistry: "0xcccccccccccccccccccccccccccccccccccccccc" }, positions: [makeVenusPosition("WATCH")], coverage: { corePool: "AVAILABLE" as const, isolatedPools: "AVAILABLE" as const, failedComptrollers: [] } }),
    getYieldOpportunities: async (walletAddress: string) => ({ walletAddress, network: "testnet" as const, chainId: 97, blockNumber: "100", observedAt, opportunities: [], coverage: { venusMarkets: "AVAILABLE" as const, pancakeSwapYieldContext: "NOT_AVAILABLE" as const, failedMarketRefs: [], truncated: false }, limitations: [] }),
  } satisfies VenusReader;

  const marketContext: GridMarketContextReader = {
    getWalletMarketContexts: async (walletAddress: string) => ({ walletAddress, network: "testnet", chainId: 97, observedAt, contexts: [makeGridContext("RANGE_LIKE")], coverage: { configuredMarkets: "AVAILABLE", failedMarketRefs: [] }, limitations: [] }),
    getPoolContext: async () => makeGridContext("RANGE_LIKE"),
  };

  const engine = createSmartMoneyEngine({ chain, pancakeSwap: pancake, venus, marketContext, store: new MemorySmartMoneyStore(), now: () => new Date(observedAt), idFactory: (() => { let i = 0; return () => String(++i); })() });
  const session = await engine.startCheck({ walletAddress: "0x2222222222222222222222222222222222222222" });
  const result = await engine.runCheck(session.checkSessionId);
  assert.equal(result.session.state, "PARTIAL");
  assert.equal(result.findings.length, 3);
  assert.equal(result.findings[0]?.state, "needs-attention");
  assert.equal(result.session.coverage?.venusPositions, "AVAILABLE");
  assert.equal(result.session.sourceProgress?.find((item) => item.key === "pancakeswap_positions")?.state, "PARTIAL");
  assert.equal(result.session.sourceProgress?.find((item) => item.key === "venus_positions")?.state, "COMPLETED");
  assert.equal(result.session.sourceProgress?.find((item) => item.key === "yield_opportunities")?.state, "COMPLETED");
  assert.equal(result.session.sourceProgress?.find((item) => item.key === "market_context")?.state, "COMPLETED");
  assert.equal(result.session.sourceProgress?.find((item) => item.key === "agent_compatibility")?.state, "COMPLETED");
  assert.equal(result.session.coverage?.agentCompatibility, "AVAILABLE");
  assert.ok(result.findings.some((finding) => finding.category === "health" && finding.state === "needs-attention"));
  assert.ok(result.findings.some((finding) => finding.category === "grid" && finding.state === "opportunity"));
  const events = await engine.listEvents(session.checkSessionId);
  assert.ok(events.some((event) => event.type === "finding.created"));
  assert.equal(events.at(-1)?.type, "check.completed");
});


test("Yield finding keeps current APY separate from realised or guaranteed return", () => {
  const opportunity: YieldOpportunitySnapshot = {
    opportunityId: "venus:pool:vtoken:wallet", protocol: "Venus", network: "testnet", chainId: 97, poolKind: "CORE", poolName: "Core Pool", comptroller: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", vToken: "0xcccccccccccccccccccccccccccccccccccccccc",
    underlying: { address: "0xdddddddddddddddddddddddddddddddddddddddd", symbol: "USDT", decimals: 18, isNative: false }, walletBalanceRaw: "2750000000000000000000", walletBalanceFormatted: "2750", existingSupplyUnderlyingRaw: "0", existingSupplyFormatted: "0", currentSupplyRatePerBlockRaw: "1000000", currentSupplyApyPercent: "4.25", currentRateType: "CURRENT_PROTOCOL_APY", blockNumber: "100", observedAt, evidence: [evidence],
    coverage: { walletBalance: "AVAILABLE", existingSupply: "AVAILABLE", currentRate: "AVAILABLE", incentives: "NOT_SUPPORTED", estimatedNet: "NOT_SUPPORTED", realisedYield: "NOT_SUPPORTED" }, limitations: [],
  };
  const finding = createYieldFinding("check_yield", [opportunity], new Date(observedAt), () => "yield");
  assert.ok(finding);
  assert.equal(finding?.category, "yield");
  assert.equal(finding?.state, "opportunity");
  assert.match(finding?.summary ?? "", /current base supply APY/i);
  assert.match(finding?.summary ?? "", /does not mean the funds should be supplied/i);
  assert.doesNotMatch(`${finding?.headline} ${finding?.summary}`, /guaranteed|guarantee future|realised return of/i);
});
