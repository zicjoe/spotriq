import assert from "node:assert/strict";
import test from "node:test";
import { encodeFunctionData } from "viem";
import type { BoundedPermissionRequest, RebalancingExecutionProposal, RebalancingJobIntent } from "@spotriq/domain";
import { guardRebalancingProposal } from "./index.js";

const wallet = "0x1111111111111111111111111111111111111111";
const positionManager = "0x2222222222222222222222222222222222222222";
const token0 = "0x3333333333333333333333333333333333333333";
const token1 = "0x4444444444444444444444444444444444444444";
const other = "0x9999999999999999999999999999999999999999";
const deadline = 1787320200n;

const abi = [
  { type: "function", name: "decreaseLiquidity", stateMutability: "payable", inputs: [{ name: "params", type: "tuple", components: [{ name: "tokenId", type: "uint256" }, { name: "liquidity", type: "uint128" }, { name: "amount0Min", type: "uint256" }, { name: "amount1Min", type: "uint256" }, { name: "deadline", type: "uint256" }] }], outputs: [{ name: "amount0", type: "uint256" }, { name: "amount1", type: "uint256" }] },
  { type: "function", name: "collect", stateMutability: "payable", inputs: [{ name: "params", type: "tuple", components: [{ name: "tokenId", type: "uint256" }, { name: "recipient", type: "address" }, { name: "amount0Max", type: "uint128" }, { name: "amount1Max", type: "uint128" }] }], outputs: [{ name: "amount0", type: "uint256" }, { name: "amount1", type: "uint256" }] },
  { type: "function", name: "increaseLiquidity", stateMutability: "payable", inputs: [{ name: "params", type: "tuple", components: [{ name: "tokenId", type: "uint256" }, { name: "amount0Desired", type: "uint256" }, { name: "amount1Desired", type: "uint256" }, { name: "amount0Min", type: "uint256" }, { name: "amount1Min", type: "uint256" }, { name: "deadline", type: "uint256" }] }], outputs: [{ name: "liquidity", type: "uint128" }, { name: "amount0", type: "uint256" }, { name: "amount1", type: "uint256" }] },
  { type: "function", name: "mint", stateMutability: "payable", inputs: [{ name: "params", type: "tuple", components: [{ name: "token0", type: "address" }, { name: "token1", type: "address" }, { name: "fee", type: "uint24" }, { name: "tickLower", type: "int24" }, { name: "tickUpper", type: "int24" }, { name: "amount0Desired", type: "uint256" }, { name: "amount1Desired", type: "uint256" }, { name: "amount0Min", type: "uint256" }, { name: "amount1Min", type: "uint256" }, { name: "recipient", type: "address" }, { name: "deadline", type: "uint256" }] }], outputs: [{ name: "tokenId", type: "uint256" }, { name: "liquidity", type: "uint128" }, { name: "amount0", type: "uint256" }, { name: "amount1", type: "uint256" }] },
] as const;

function intent(): RebalancingJobIntent {
  return {
    jobIntentId: "job-1", state: "AWAITING_AUTHORITY", executionState: "NO_EXECUTION", category: "rebalancing", checkSessionId: "check-1", findingId: "finding-1", walletAddress: wallet, walletControl: "VERIFIED_CONTROL",
    requestedAction: { code: "PREPARE_RANGE_REBALANCE", label: "Prepare rebalance", description: "test" },
    subject: { protocol: "PancakeSwap", version: "V3", network: "testnet", tokenId: "42", positionManager, token0: { address: token0, symbol: "WBNB", decimals: 18, isNative: false }, token1: { address: token1, symbol: "USDT", decimals: 18, isNative: false }, poolAddress: "0x5555555555555555555555555555555555555555", pair: "WBNB/USDT", feePips: 500, tickSpacing: 10, tickLower: -100, tickUpper: 100, currentTick: 150, rangeState: "OUT_OF_RANGE_ABOVE", blockNumber: "123" },
    constraints: { executionMode: "PREPARE_ONLY", maxSlippageBps: 50, maxActionCount: 4, validForMinutes: 30, allowSwapPreparation: true },
    selectedService: { serviceId: "service-1", agentId: "agent-1", name: "Range Agent", operator: "operator", matchId: "match-1", matchRank: 1, matchTier: "EXACT_CONTEXT", readiness: "LIMITED", activationEligible: false, supportedProtocols: ["PancakeSwap"], runtimeEndpoints: [] },
    evidenceReferences: { findingEvidenceIds: [], serviceEvidenceIds: [], readinessEvidenceIds: [] },
    authority: { state: "REQUEST_PREPARED", requiredBeforeExecution: true, permissionProfileId: "perm-1", permissionRequestId: "permission-1", declarationState: "UNDECLARED", walletControl: "VERIFIED_CONTROL", blockers: [] },
    methodVersion: "test", createdAt: "2026-08-21T16:00:00.000Z", updatedAt: "2026-08-21T16:00:00.000Z", expiresAt: "2026-08-21T17:00:00.000Z", limitations: [],
  };
}

function permission(): BoundedPermissionRequest {
  return {
    permissionRequestId: "permission-1", jobIntentId: "job-1", serviceId: "service-1", walletAddress: wallet, provider: "ALTANA", network: "testnet", chainId: 97, protocol: "PancakeSwap", positionManager, tokenId: "42",
    callAllowlist: ["decreaseLiquidity((uint256,uint128,uint256,uint256,uint256))", "collect((uint256,address,uint128,uint128))", "increaseLiquidity((uint256,uint256,uint256,uint256,uint256,uint256))", "mint((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256))"].map((signature) => ({ to: positionManager, signature, label: signature, provenance: "marketplace-derived" as const })),
    spendCaps: [{ token: token0, symbol: "WBNB", limitDisplay: "1", limitRaw: "1000000000000000000", decimals: 18, period: "day", provenance: "user-proposed" }, { token: token1, symbol: "USDT", limitDisplay: "100", limitRaw: "100000000000000000000", decimals: 18, period: "day", provenance: "user-proposed" }],
    expiresAt: "2026-08-21T17:00:00.000Z", expiryUnix: 1787322000, status: "READY", providerSubmissionState: "SAFETY_PREREQUISITES_REQUIRED", safetyPrerequisites: [], submissionBlockers: [], walletControl: "VERIFIED_CONTROL", scopeProvenance: "marketplace-derived", activationEligible: false, methodVersion: "test", createdAt: "2026-08-21T16:00:00.000Z", updatedAt: "2026-08-21T16:00:00.000Z", limitations: [],
  };
}

function proposal(data: `0x${string}`, to = positionManager): RebalancingExecutionProposal {
  return { proposalId: "proposal-1", jobIntentId: "job-1", permissionRequestId: "permission-1", serviceId: "service-1", call: { to, data, valueRaw: "0" }, proposedAt: "2026-08-21T16:05:00.000Z" };
}

test("collect passes only for the exact LP token and user recipient, while execution remains disabled", () => {
  const data = encodeFunctionData({ abi, functionName: "collect", args: [{ tokenId: 42n, recipient: wallet, amount0Max: 2n ** 128n - 1n, amount1Max: 2n ** 128n - 1n }] });
  const report = guardRebalancingProposal({ intent: intent(), request: permission(), proposal: proposal(data) });
  assert.equal(report.state, "PASS");
  assert.equal(report.argumentGuardSatisfied, true);
  assert.equal(report.nonBypassableBoundarySatisfied, false);
  assert.equal(report.executionEligible, false);
});

test("collect to any other recipient is blocked", () => {
  const data = encodeFunctionData({ abi, functionName: "collect", args: [{ tokenId: 42n, recipient: other, amount0Max: 100n, amount1Max: 100n }] });
  const report = guardRebalancingProposal({ intent: intent(), request: permission(), proposal: proposal(data) });
  assert.equal(report.state, "BLOCKED");
  assert.equal(report.checks.find((item) => item.code === "RECIPIENT")?.state, "FAIL");
});

test("increaseLiquidity passes when amounts, slippage, NFT and deadline remain inside reviewed bounds", () => {
  const desired0 = 500000000000000000n;
  const desired1 = 50000000000000000000n;
  const data = encodeFunctionData({ abi, functionName: "increaseLiquidity", args: [{ tokenId: 42n, amount0Desired: desired0, amount1Desired: desired1, amount0Min: desired0 * 9950n / 10000n, amount1Min: desired1 * 9950n / 10000n, deadline }] });
  const report = guardRebalancingProposal({ intent: intent(), request: permission(), proposal: proposal(data) });
  assert.equal(report.state, "PASS");
  assert.equal(report.checks.find((item) => item.code === "TOKEN0_CAP")?.state, "PASS");
  assert.equal(report.checks.find((item) => item.code === "TOKEN1_SLIPPAGE")?.state, "PASS");
});

test("increaseLiquidity over the reviewed spend cap is blocked", () => {
  const data = encodeFunctionData({ abi, functionName: "increaseLiquidity", args: [{ tokenId: 42n, amount0Desired: 2000000000000000000n, amount1Desired: 1n, amount0Min: 1990000000000000000n, amount1Min: 1n, deadline }] });
  const report = guardRebalancingProposal({ intent: intent(), request: permission(), proposal: proposal(data) });
  assert.equal(report.state, "BLOCKED");
  assert.equal(report.checks.find((item) => item.code === "TOKEN0_CAP")?.state, "FAIL");
});

test("decreaseLiquidity remains inconclusive until Spotriq has an independent expected-output quote", () => {
  const data = encodeFunctionData({ abi, functionName: "decreaseLiquidity", args: [{ tokenId: 42n, liquidity: 100n, amount0Min: 1n, amount1Min: 1n, deadline }] });
  const report = guardRebalancingProposal({ intent: intent(), request: permission(), proposal: proposal(data) });
  assert.equal(report.state, "INCONCLUSIVE");
  assert.equal(report.checks.find((item) => item.code === "DECREASE_QUOTE")?.state, "INCONCLUSIVE");
});

test("mint remains inconclusive until the replacement range is itself user-reviewed", () => {
  const desired0 = 500000000000000000n;
  const desired1 = 50000000000000000000n;
  const data = encodeFunctionData({ abi, functionName: "mint", args: [{ token0, token1, fee: 500, tickLower: 140, tickUpper: 180, amount0Desired: desired0, amount1Desired: desired1, amount0Min: desired0 * 9950n / 10000n, amount1Min: desired1 * 9950n / 10000n, recipient: wallet, deadline }] });
  const report = guardRebalancingProposal({ intent: intent(), request: permission(), proposal: proposal(data) });
  assert.equal(report.state, "INCONCLUSIVE");
  assert.equal(report.checks.find((item) => item.code === "TARGET_RANGE_REVIEW")?.state, "INCONCLUSIVE");
});

test("a different Position Manager target is blocked even with otherwise valid calldata", () => {
  const data = encodeFunctionData({ abi, functionName: "collect", args: [{ tokenId: 42n, recipient: wallet, amount0Max: 100n, amount1Max: 100n }] });
  const report = guardRebalancingProposal({ intent: intent(), request: permission(), proposal: proposal(data, other) });
  assert.equal(report.state, "BLOCKED");
  assert.equal(report.checks.find((item) => item.code === "TARGET")?.state, "FAIL");
});
