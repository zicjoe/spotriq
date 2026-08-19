import assert from "node:assert/strict";
import test from "node:test";
import type { BscChainReader } from "@spotriq/chain";
import type { EvidenceEnvelope, PancakeSwapClPositionSnapshot } from "@spotriq/domain";
import type { PancakeSwapReader } from "@spotriq/protocol-pancakeswap";
import { createRebalancingFinding, createSmartMoneyEngine, MemorySmartMoneyStore } from "./index.js";

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
});

test("in-range finding is healthy but does not claim portfolio safety", () => {
  const finding = createRebalancingFinding("check_2", makePosition("IN_RANGE"), new Date(observedAt), () => "2");
  assert.equal(finding.state, "healthy");
  assert.equal(finding.severity, "info");
  assert.doesNotMatch(`${finding.headline} ${finding.summary}`, /portfolio.*safe|risk-free/i);
});

test("Smart Money Check runs as PARTIAL while unsupported sources stay explicit", async () => {
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
  } satisfies BscChainReader;

  const pancake = {
    getStatus: () => { throw new Error("not used"); },
    getV3Position: async () => makePosition("OUT_OF_RANGE_ABOVE"),
    getInfinityClPosition: async () => makePosition("IN_RANGE"),
    getPosition: async () => makePosition("OUT_OF_RANGE_ABOVE"),
    getWalletPositions: async (walletAddress: string) => ({ walletAddress, network: "testnet" as const, chainId: 97, blockNumber: "100", observedAt, positions: [makePosition("OUT_OF_RANGE_ABOVE")], coverage: { v3Discovery: "AVAILABLE" as const, infinityClDiscovery: "TOKEN_ID_REQUIRED" as const, failedV3PositionRefs: [], truncated: false, maxPositions: 50 } }),
  } satisfies PancakeSwapReader;

  const engine = createSmartMoneyEngine({ chain, pancakeSwap: pancake, store: new MemorySmartMoneyStore(), now: () => new Date(observedAt), idFactory: (() => { let i = 0; return () => String(++i); })() });
  const session = await engine.startCheck({ walletAddress: "0x2222222222222222222222222222222222222222" });
  const result = await engine.runCheck(session.checkSessionId);
  assert.equal(result.session.state, "PARTIAL");
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0]?.state, "needs-attention");
  assert.equal(result.session.coverage?.venusPositions, "NOT_SUPPORTED");
  assert.equal(result.session.sourceProgress?.find((item) => item.key === "pancakeswap_positions")?.state, "PARTIAL");
  const events = await engine.listEvents(session.checkSessionId);
  assert.ok(events.some((event) => event.type === "finding.created"));
  assert.equal(events.at(-1)?.type, "check.completed");
});
