import { decodeFunctionData, type Hex } from "viem";
import type {
  BoundedPermissionRequest,
  ExecutionGuardCheck,
  RebalancingExecutionGuardReport,
  RebalancingExecutionProposal,
  RebalancingGuardCallKind,
  RebalancingJobIntent,
} from "@spotriq/domain";

export const REBALANCING_EXECUTION_GUARD_METHOD = "marketplace.rebalancing-calldata-guard@1.0.0";

export class ExecutionGuardError extends Error {
  constructor(message: string, public readonly code: "INVALID_INPUT" | "INVALID_STATE" | "UNSUPPORTED_CALL") {
    super(message);
    this.name = "ExecutionGuardError";
  }
}

const V3_POSITION_MANAGER_ABI = [
  {
    type: "function", name: "decreaseLiquidity", stateMutability: "payable",
    inputs: [{ name: "params", type: "tuple", components: [
      { name: "tokenId", type: "uint256" }, { name: "liquidity", type: "uint128" }, { name: "amount0Min", type: "uint256" }, { name: "amount1Min", type: "uint256" }, { name: "deadline", type: "uint256" },
    ] }], outputs: [{ name: "amount0", type: "uint256" }, { name: "amount1", type: "uint256" }],
  },
  {
    type: "function", name: "collect", stateMutability: "payable",
    inputs: [{ name: "params", type: "tuple", components: [
      { name: "tokenId", type: "uint256" }, { name: "recipient", type: "address" }, { name: "amount0Max", type: "uint128" }, { name: "amount1Max", type: "uint128" },
    ] }], outputs: [{ name: "amount0", type: "uint256" }, { name: "amount1", type: "uint256" }],
  },
  {
    type: "function", name: "increaseLiquidity", stateMutability: "payable",
    inputs: [{ name: "params", type: "tuple", components: [
      { name: "tokenId", type: "uint256" }, { name: "amount0Desired", type: "uint256" }, { name: "amount1Desired", type: "uint256" }, { name: "amount0Min", type: "uint256" }, { name: "amount1Min", type: "uint256" }, { name: "deadline", type: "uint256" },
    ] }], outputs: [{ name: "liquidity", type: "uint128" }, { name: "amount0", type: "uint256" }, { name: "amount1", type: "uint256" }],
  },
  {
    type: "function", name: "mint", stateMutability: "payable",
    inputs: [{ name: "params", type: "tuple", components: [
      { name: "token0", type: "address" }, { name: "token1", type: "address" }, { name: "fee", type: "uint24" }, { name: "tickLower", type: "int24" }, { name: "tickUpper", type: "int24" }, { name: "amount0Desired", type: "uint256" }, { name: "amount1Desired", type: "uint256" }, { name: "amount0Min", type: "uint256" }, { name: "amount1Min", type: "uint256" }, { name: "recipient", type: "address" }, { name: "deadline", type: "uint256" },
    ] }], outputs: [{ name: "tokenId", type: "uint256" }, { name: "liquidity", type: "uint128" }, { name: "amount0", type: "uint256" }, { name: "amount1", type: "uint256" }],
  },
] as const;

function lower(value: string): string { return value.toLowerCase(); }
function check(code: string, label: string, state: ExecutionGuardCheck["state"], detail: string): ExecutionGuardCheck { return { code, label, state, detail }; }
function tokenLimit(request: BoundedPermissionRequest, address?: string): bigint | undefined {
  if (!address) return undefined;
  const scope = request.spendCaps.find((item) => lower(item.token) === lower(address));
  return scope ? BigInt(scope.limitRaw) : undefined;
}
function slippageFloor(desired: bigint, bps: number): bigint {
  return desired * BigInt(10_000 - bps) / 10_000n;
}
function deadlineCheck(deadline: bigint, intent: RebalancingJobIntent, request: BoundedPermissionRequest): ExecutionGuardCheck {
  const upper = Math.min(Math.floor(new Date(intent.expiresAt).getTime() / 1000), request.expiryUnix);
  return deadline > 0n && deadline <= BigInt(upper)
    ? check("DEADLINE", "Deadline", "PASS", `Calldata deadline ${deadline} is within the reviewed job/permission expiry ${upper}.`)
    : check("DEADLINE", "Deadline", "FAIL", `Calldata deadline ${deadline} exceeds or invalidates the reviewed expiry ${upper}.`);
}
function amountChecks(
  desired0: bigint, desired1: bigint, min0: bigint, min1: bigint,
  intent: RebalancingJobIntent, request: BoundedPermissionRequest,
): ExecutionGuardCheck[] {
  const cap0 = tokenLimit(request, intent.subject.token0?.address);
  const cap1 = tokenLimit(request, intent.subject.token1?.address);
  const checks: ExecutionGuardCheck[] = [];
  checks.push(cap0 !== undefined && desired0 <= cap0
    ? check("TOKEN0_CAP", "Token0 cap", "PASS", `Desired token0 amount ${desired0} is within the reviewed cap ${cap0}.`)
    : check("TOKEN0_CAP", "Token0 cap", "FAIL", `Desired token0 amount ${desired0} exceeds or lacks the reviewed token0 cap.`));
  checks.push(cap1 !== undefined && desired1 <= cap1
    ? check("TOKEN1_CAP", "Token1 cap", "PASS", `Desired token1 amount ${desired1} is within the reviewed cap ${cap1}.`)
    : check("TOKEN1_CAP", "Token1 cap", "FAIL", `Desired token1 amount ${desired1} exceeds or lacks the reviewed token1 cap.`));
  const floor0 = slippageFloor(desired0, intent.constraints.maxSlippageBps);
  const floor1 = slippageFloor(desired1, intent.constraints.maxSlippageBps);
  checks.push(min0 >= floor0 && min0 <= desired0
    ? check("TOKEN0_SLIPPAGE", "Token0 minimum", "PASS", `amount0Min ${min0} respects the reviewed ${intent.constraints.maxSlippageBps} bps slippage ceiling for desired amount ${desired0}.`)
    : check("TOKEN0_SLIPPAGE", "Token0 minimum", "FAIL", `amount0Min ${min0} is outside the allowed range ${floor0}..${desired0}.`));
  checks.push(min1 >= floor1 && min1 <= desired1
    ? check("TOKEN1_SLIPPAGE", "Token1 minimum", "PASS", `amount1Min ${min1} respects the reviewed ${intent.constraints.maxSlippageBps} bps slippage ceiling for desired amount ${desired1}.`)
    : check("TOKEN1_SLIPPAGE", "Token1 minimum", "FAIL", `amount1Min ${min1} is outside the allowed range ${floor1}..${desired1}.`));
  return checks;
}

export function guardRebalancingProposal(args: {
  intent: RebalancingJobIntent;
  request: BoundedPermissionRequest;
  proposal: RebalancingExecutionProposal;
  now?: Date;
}): RebalancingExecutionGuardReport {
  const { intent, request, proposal } = args;
  const now = args.now ?? new Date();
  if (intent.category !== "rebalancing" || intent.subject.version !== "V3" || intent.executionState !== "NO_EXECUTION") throw new ExecutionGuardError("Only a V3 Rebalancing Job Intent with NO_EXECUTION can be checked.", "INVALID_STATE");
  if (request.jobIntentId !== intent.jobIntentId || request.permissionRequestId !== proposal.permissionRequestId || proposal.jobIntentId !== intent.jobIntentId || proposal.serviceId !== intent.selectedService.serviceId) {
    throw new ExecutionGuardError("Proposal, permission request, and Job Intent do not belong to the same reviewed service/job.", "INVALID_INPUT");
  }
  const checks: ExecutionGuardCheck[] = [];
  const expectedTarget = intent.subject.positionManager?.toLowerCase();
  const actualTarget = proposal.call.to.toLowerCase();
  checks.push(expectedTarget && actualTarget === expectedTarget
    ? check("TARGET", "Position Manager target", "PASS", "Call targets the exact PancakeSwap V3 Position Manager captured in the Job Intent.")
    : check("TARGET", "Position Manager target", "FAIL", "Call target does not match the Job Intent Position Manager."));
  const value = BigInt(proposal.call.valueRaw ?? "0");
  checks.push(value === 0n
    ? check("NATIVE_VALUE", "Native value", "PASS", "No native BNB value is attached to the guarded call.")
    : check("NATIVE_VALUE", "Native value", "FAIL", "Spotriq v0.16 does not permit native-value forwarding in a guarded V3 proposal."));

  let decodedFunction: string | undefined;
  let callKind: RebalancingGuardCallKind | undefined;
  try {
    const decoded = decodeFunctionData({ abi: V3_POSITION_MANAGER_ABI, data: proposal.call.data as Hex });
    decodedFunction = decoded.functionName;
    const params = (decoded.args?.[0] ?? {}) as any;
    if (decoded.functionName === "collect") {
      callKind = "COLLECT";
      checks.push(BigInt(params.tokenId) === BigInt(intent.subject.tokenId)
        ? check("TOKEN_ID", "LP token ID", "PASS", "Collect references the exact LP NFT from the Job Intent.")
        : check("TOKEN_ID", "LP token ID", "FAIL", "Collect references a different LP token ID."));
      checks.push(lower(String(params.recipient)) === lower(intent.walletAddress)
        ? check("RECIPIENT", "Collect recipient", "PASS", "Collected tokens/fees return directly to the Job Intent wallet.")
        : check("RECIPIENT", "Collect recipient", "FAIL", "Collect recipient is not the Job Intent wallet."));
    } else if (decoded.functionName === "increaseLiquidity") {
      callKind = "INCREASE_LIQUIDITY";
      checks.push(BigInt(params.tokenId) === BigInt(intent.subject.tokenId)
        ? check("TOKEN_ID", "LP token ID", "PASS", "Increase-liquidity references the exact LP NFT from the Job Intent.")
        : check("TOKEN_ID", "LP token ID", "FAIL", "Increase-liquidity references a different LP token ID."));
      checks.push(...amountChecks(BigInt(params.amount0Desired), BigInt(params.amount1Desired), BigInt(params.amount0Min), BigInt(params.amount1Min), intent, request));
      checks.push(deadlineCheck(BigInt(params.deadline), intent, request));
    } else if (decoded.functionName === "decreaseLiquidity") {
      callKind = "DECREASE_LIQUIDITY";
      checks.push(BigInt(params.tokenId) === BigInt(intent.subject.tokenId)
        ? check("TOKEN_ID", "LP token ID", "PASS", "Decrease-liquidity references the exact LP NFT from the Job Intent.")
        : check("TOKEN_ID", "LP token ID", "FAIL", "Decrease-liquidity references a different LP token ID."));
      checks.push(BigInt(params.liquidity) > 0n
        ? check("LIQUIDITY", "Liquidity amount", "PASS", "Decrease-liquidity requests a positive liquidity amount.")
        : check("LIQUIDITY", "Liquidity amount", "FAIL", "Decrease-liquidity amount must be positive."));
      checks.push(deadlineCheck(BigInt(params.deadline), intent, request));
      checks.push(check("DECREASE_QUOTE", "Decrease-liquidity quote", "INCONCLUSIVE", "The Job Intent does not yet contain an independent expected token-out quote, so Spotriq cannot prove amount0Min/amount1Min represent the reviewed slippage ceiling."));
    } else if (decoded.functionName === "mint") {
      callKind = "MINT";
      checks.push(lower(String(params.token0)) === lower(intent.subject.token0?.address ?? "") && lower(String(params.token1)) === lower(intent.subject.token1?.address ?? "")
        ? check("TOKEN_PAIR", "Mint token pair", "PASS", "Mint uses the exact token0/token1 addresses observed for the LP.")
        : check("TOKEN_PAIR", "Mint token pair", "FAIL", "Mint token pair differs from the observed LP."));
      checks.push(intent.subject.feePips !== undefined && Number(params.fee) === intent.subject.feePips
        ? check("POOL_FEE", "Pool fee", "PASS", "Mint uses the observed PancakeSwap V3 fee tier.")
        : check("POOL_FEE", "Pool fee", "FAIL", "Mint fee tier is unknown or differs from the observed pool."));
      checks.push(lower(String(params.recipient)) === lower(intent.walletAddress)
        ? check("RECIPIENT", "Mint recipient", "PASS", "Replacement LP NFT is minted directly to the Job Intent wallet.")
        : check("RECIPIENT", "Mint recipient", "FAIL", "Replacement LP NFT recipient is not the Job Intent wallet."));
      const spacing = intent.subject.tickSpacing;
      checks.push(spacing && Number(params.tickLower) % spacing === 0 && Number(params.tickUpper) % spacing === 0 && Number(params.tickLower) < Number(params.tickUpper)
        ? check("TICK_ALIGNMENT", "Target tick alignment", "PASS", `Proposed ticks are ordered and aligned to observed tick spacing ${spacing}.`)
        : check("TICK_ALIGNMENT", "Target tick alignment", "FAIL", "Proposed ticks are invalid or cannot be verified against observed tick spacing."));
      checks.push(...amountChecks(BigInt(params.amount0Desired), BigInt(params.amount1Desired), BigInt(params.amount0Min), BigInt(params.amount1Min), intent, request));
      checks.push(deadlineCheck(BigInt(params.deadline), intent, request));
      checks.push(check("TARGET_RANGE_REVIEW", "Target range review", "INCONCLUSIVE", "The v0.14 Job Intent captured the current range but not a user-reviewed replacement range. Spotriq therefore refuses to treat mint calldata as fully approved even when its structural arguments are otherwise valid."));
    } else {
      throw new ExecutionGuardError(`Unsupported V3 function ${decoded.functionName}.`, "UNSUPPORTED_CALL");
    }
  } catch (error) {
    if (error instanceof ExecutionGuardError) throw error;
    checks.push(check("CALLDATA_DECODE", "Calldata decode", "FAIL", `Call data could not be decoded as an allowed PancakeSwap V3 Position Manager function: ${error instanceof Error ? error.message : String(error)}`));
  }

  const hasFail = checks.some((item) => item.state === "FAIL");
  const hasInconclusive = checks.some((item) => item.state === "INCONCLUSIVE");
  const state: RebalancingExecutionGuardReport["state"] = hasFail ? "BLOCKED" : hasInconclusive ? "INCONCLUSIVE" : "PASS";
  return {
    reportId: `execution-guard:${proposal.proposalId}`,
    proposalId: proposal.proposalId,
    jobIntentId: intent.jobIntentId,
    permissionRequestId: request.permissionRequestId,
    serviceId: intent.selectedService.serviceId,
    state,
    callKind,
    decodedFunction,
    checks,
    checkedAt: now.toISOString(),
    methodVersion: REBALANCING_EXECUTION_GUARD_METHOD,
    argumentGuardSatisfied: state === "PASS",
    nonBypassableBoundarySatisfied: false,
    executionEligible: false,
    limitations: [
      "This report validates one proposed calldata payload against the reviewed Job Intent and PermissionRequest. It does not submit or simulate a transaction.",
      "The external AgentService would hold the Altana session key. An off-chain Spotriq checker cannot stop that key from bypassing Spotriq and calling an allowed selector directly, so financial execution remains blocked until a non-bypassable execution boundary is introduced.",
      "A full range rebalance is normally a multi-step plan. v0.16 validates individual V3 calls and deliberately does not reinterpret the v0.14 PREPARE_ONLY maxActionCount as financial execution authority.",
    ],
  };
}
