import { encodeFunctionData, keccak256, toBytes, type Hex } from "viem";
import type {
  BoundedPermissionRequest,
  RebalancingExecutionGuardReport,
  RebalancingExecutionPlan,
  RebalancingExecutionPlanStep,
  RebalancingJobIntent,
} from "@spotriq/domain";
import type { PancakeSwapReader } from "@spotriq/protocol-pancakeswap";
import { guardRebalancingProposal } from "@spotriq/execution-guard";

export const REBALANCING_EXECUTION_PLAN_METHOD = "marketplace.rebalancing-execution-plan@1.0.0";
const QUOTE_TTL_MS = 5 * 60_000;
const MIN_TICK = -887272;
const MAX_TICK = 887272;
const UINT128_MAX = (1n << 128n) - 1n;

const V3_POSITION_MANAGER_ABI = [
  { type: "function", name: "decreaseLiquidity", stateMutability: "payable", inputs: [{ name: "params", type: "tuple", components: [
    { name: "tokenId", type: "uint256" }, { name: "liquidity", type: "uint128" }, { name: "amount0Min", type: "uint256" }, { name: "amount1Min", type: "uint256" }, { name: "deadline", type: "uint256" },
  ] }], outputs: [{ name: "amount0", type: "uint256" }, { name: "amount1", type: "uint256" }] },
  { type: "function", name: "collect", stateMutability: "payable", inputs: [{ name: "params", type: "tuple", components: [
    { name: "tokenId", type: "uint256" }, { name: "recipient", type: "address" }, { name: "amount0Max", type: "uint128" }, { name: "amount1Max", type: "uint128" },
  ] }], outputs: [{ name: "amount0", type: "uint256" }, { name: "amount1", type: "uint256" }] },
  { type: "function", name: "mint", stateMutability: "payable", inputs: [{ name: "params", type: "tuple", components: [
    { name: "token0", type: "address" }, { name: "token1", type: "address" }, { name: "fee", type: "uint24" }, { name: "tickLower", type: "int24" }, { name: "tickUpper", type: "int24" }, { name: "amount0Desired", type: "uint256" }, { name: "amount1Desired", type: "uint256" }, { name: "amount0Min", type: "uint256" }, { name: "amount1Min", type: "uint256" }, { name: "recipient", type: "address" }, { name: "deadline", type: "uint256" },
  ] }], outputs: [{ name: "tokenId", type: "uint256" }, { name: "liquidity", type: "uint128" }, { name: "amount0", type: "uint256" }, { name: "amount1", type: "uint256" }] },
] as const;

export class ExecutionPlanError extends Error {
  constructor(message: string, public readonly code: "INVALID_INPUT" | "INVALID_STATE" | "PLAN_NOT_FOUND" | "QUOTE_FAILED" | "STALE_CONTEXT", public readonly retryable = false, public readonly details?: unknown) {
    super(message); this.name = "ExecutionPlanError";
  }
}

export interface SqlQueryResult<Row = Record<string, unknown>> { rows: Row[]; rowCount?: number | null; }
export interface SqlQueryExecutor { query<Row = Record<string, unknown>>(text: string, values?: unknown[]): Promise<SqlQueryResult<Row>>; }

export interface ExecutionPlanStore {
  save(plan: RebalancingExecutionPlan): Promise<void>;
  get(planId: string): Promise<RebalancingExecutionPlan | undefined>;
  getForJob(jobIntentId: string): Promise<RebalancingExecutionPlan | undefined>;
}

export class MemoryExecutionPlanStore implements ExecutionPlanStore {
  private readonly plans = new Map<string, RebalancingExecutionPlan>();
  async save(plan: RebalancingExecutionPlan): Promise<void> { this.plans.set(plan.planId, structuredClone(plan)); }
  async get(id: string): Promise<RebalancingExecutionPlan | undefined> { const value = this.plans.get(id); return value ? structuredClone(value) : undefined; }
  async getForJob(jobIntentId: string): Promise<RebalancingExecutionPlan | undefined> {
    const values = [...this.plans.values()].filter((v) => v.jobIntentId === jobIntentId).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
    return values[0] ? structuredClone(values[0]) : undefined;
  }
}

export class PostgresExecutionPlanStore implements ExecutionPlanStore {
  constructor(private readonly database: SqlQueryExecutor) {}
  async save(plan: RebalancingExecutionPlan): Promise<void> {
    await this.database.query(
      `insert into rebalancing_execution_plans (plan_id, job_intent_id, permission_request_id, service_id, state, plan_hash, payload, expires_at, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10)
       on conflict (plan_id) do update set state=excluded.state, plan_hash=excluded.plan_hash, payload=excluded.payload, expires_at=excluded.expires_at, updated_at=excluded.updated_at`,
      [plan.planId, plan.jobIntentId, plan.permissionRequestId, plan.serviceId, plan.state, plan.planHash, JSON.stringify(plan), plan.expiresAt, plan.createdAt, plan.updatedAt],
    );
  }
  async get(planId: string): Promise<RebalancingExecutionPlan | undefined> {
    const result = await this.database.query<{ payload: RebalancingExecutionPlan }>("select payload from rebalancing_execution_plans where plan_id=$1", [planId]);
    return result.rows[0]?.payload;
  }
  async getForJob(jobIntentId: string): Promise<RebalancingExecutionPlan | undefined> {
    const result = await this.database.query<{ payload: RebalancingExecutionPlan }>("select payload from rebalancing_execution_plans where job_intent_id=$1 order by updated_at desc limit 1", [jobIntentId]);
    return result.rows[0]?.payload;
  }
}

export interface PrepareExecutionPlanInput { targetTickLower: number; targetTickUpper: number; }
export interface ExecutionPlanEngine {
  prepare(job: RebalancingJobIntent, request: BoundedPermissionRequest, input: PrepareExecutionPlanInput, now?: Date): Promise<RebalancingExecutionPlan>;
  review(planId: string, job: RebalancingJobIntent, request: BoundedPermissionRequest, now?: Date): Promise<RebalancingExecutionPlan>;
  get(planId: string): Promise<RebalancingExecutionPlan>;
  getForJob(jobIntentId: string): Promise<RebalancingExecutionPlan | undefined>;
  linkBoundary(planId: string, boundaryId: string, now?: Date): Promise<RebalancingExecutionPlan>;
}

function floorByBps(value: bigint, bps: number): bigint { return value * BigInt(10_000 - bps) / 10_000n; }
function planId(jobIntentId: string): string { return `plan:rebalancing:${encodeURIComponent(jobIntentId)}`; }
function quoteId(jobIntentId: string, block: string): string { return `quote:rebalancing:${encodeURIComponent(jobIntentId)}:${block}`; }
function hash(value: string): string { return keccak256(toBytes(value)); }
function callHash(to: string, data: string, valueRaw: string): string { return hash(`${to.toLowerCase()}|${data.toLowerCase()}|${valueRaw}`); }
function canonicalPlanHash(plan: Omit<RebalancingExecutionPlan, "planHash" | "steps">, steps: Array<Pick<RebalancingExecutionPlanStep,"index"|"kind"|"callHash">>): string {
  return hash(JSON.stringify({ jobIntentId: plan.jobIntentId, permissionRequestId: plan.permissionRequestId, serviceId: plan.serviceId, walletAddress: plan.walletAddress.toLowerCase(), targetRange: plan.targetRange, proposalOrigin: plan.proposalOrigin, quote: { quoteId: plan.quote.quoteId, blockNumber: plan.quote.blockNumber, expectedDecreaseAmount0Raw: plan.quote.expectedDecreaseAmount0Raw, expectedDecreaseAmount1Raw: plan.quote.expectedDecreaseAmount1Raw, expectedCollectAmount0Raw: plan.quote.expectedCollectAmount0Raw, expectedCollectAmount1Raw: plan.quote.expectedCollectAmount1Raw }, steps }));
}
function assertRange(lower: number, upper: number, spacing: number, currentTick: number): void {
  if (![lower, upper, spacing, currentTick].every(Number.isInteger)) throw new ExecutionPlanError("Replacement ticks and tick spacing must be integers.", "INVALID_INPUT");
  if (spacing <= 0 || lower < MIN_TICK || upper > MAX_TICK || lower >= upper) throw new ExecutionPlanError("Replacement range is outside PancakeSwap V3 tick bounds or is not ordered.", "INVALID_INPUT");
  if (lower % spacing !== 0 || upper % spacing !== 0) throw new ExecutionPlanError(`Replacement ticks must align to observed tick spacing ${spacing}.`, "INVALID_INPUT");
  if (currentTick < lower || currentTick >= upper) throw new ExecutionPlanError("The reviewed replacement range must contain the currently observed pool tick.", "INVALID_INPUT");
}
function assertJobRequest(job: RebalancingJobIntent, request: BoundedPermissionRequest): void {
  if (job.category !== "rebalancing" || job.subject.version !== "V3" || job.state !== "AWAITING_AUTHORITY" || job.executionState !== "NO_EXECUTION") throw new ExecutionPlanError("Only a confirmed V3 Rebalancing Job Intent with NO_EXECUTION can produce an execution plan.", "INVALID_STATE");
  if (request.jobIntentId !== job.jobIntentId || request.serviceId !== job.selectedService.serviceId || request.walletAddress.toLowerCase() !== job.walletAddress.toLowerCase()) throw new ExecutionPlanError("Permission request does not belong to the reviewed Job Intent.", "INVALID_INPUT");
  if (!job.subject.positionManager || !job.subject.token0?.address || !job.subject.token1?.address || job.subject.feePips === undefined || !job.subject.tickSpacing) throw new ExecutionPlanError("Exact V3 contract/token/fee/tick-spacing context is required.", "INVALID_INPUT");
  if (!job.serviceTask || job.serviceTask.state !== "COMPLETED" || job.serviceTask.originProofState !== "VERIFIED" || job.serviceTask.proposalState !== "STRUCTURED" || !job.serviceTask.proposalId || !job.serviceTask.proposalHash || !job.serviceTask.requestContextHash) throw new ExecutionPlanError("Execution planning requires the verified structured AgentService task proposal that was linked before Job Intent confirmation.", "INVALID_STATE");
}

function makeProposal(job: RebalancingJobIntent, request: BoundedPermissionRequest, index: number, call: {to:string;data:string;valueRaw:string}) {
  return { proposalId: `proposal:${planId(job.jobIntentId)}:${index}`, jobIntentId: job.jobIntentId, permissionRequestId: request.permissionRequestId, serviceId: job.selectedService.serviceId, call, proposedAt: new Date().toISOString() };
}

export function createExecutionPlanEngine(options: { store?: ExecutionPlanStore; pancakeSwap: PancakeSwapReader }): ExecutionPlanEngine {
  const store = options.store ?? new MemoryExecutionPlanStore();
  const pancake = options.pancakeSwap;

  async function prepareInternal(job: RebalancingJobIntent, request: BoundedPermissionRequest, input: PrepareExecutionPlanInput, now: Date, reviewed: boolean): Promise<RebalancingExecutionPlan> {
    assertJobRequest(job, request);
    const position = await pancake.getV3Position(job.subject.tokenId);
    if (position.owner.toLowerCase() !== job.walletAddress.toLowerCase()) throw new ExecutionPlanError("The Job Intent wallet no longer owns the observed LP NFT.", "STALE_CONTEXT");
    if (position.positionManager.toLowerCase() !== job.subject.positionManager!.toLowerCase() || position.pool.token0.address.toLowerCase() !== job.subject.token0!.address.toLowerCase() || position.pool.token1.address.toLowerCase() !== job.subject.token1!.address.toLowerCase() || position.pool.feePips !== job.subject.feePips) throw new ExecutionPlanError("The live V3 position no longer matches the Job Intent contract/token/fee context.", "STALE_CONTEXT");
    assertRange(input.targetTickLower, input.targetTickUpper, position.pool.tickSpacing, position.pool.currentTick);
    if (BigInt(position.liquidityRaw) <= 0n) throw new ExecutionPlanError("The current position has no liquidity to rebalance.", "STALE_CONTEXT");

    const upperUnix = Math.min(Math.floor(new Date(job.expiresAt).getTime()/1000), request.expiryUnix, Math.floor(now.getTime()/1000)+600);
    let quoted;
    try {
      quoted = await pancake.quoteV3DecreaseLiquidity({ tokenId: position.tokenId, owner: job.walletAddress, liquidityRaw: position.liquidityRaw, blockNumber: position.blockNumber, deadlineUnix: upperUnix });
    } catch (cause) {
      throw new ExecutionPlanError("Spotriq could not obtain an independent onchain decrease-liquidity simulation; execution plan creation is blocked.", "QUOTE_FAILED", true, cause instanceof Error ? cause.message : cause);
    }
    const decrease0 = BigInt(quoted.expectedAmount0Raw), decrease1 = BigInt(quoted.expectedAmount1Raw);
    const owed0 = BigInt(quoted.recordedTokensOwed0Raw || "0"), owed1 = BigInt(quoted.recordedTokensOwed1Raw || "0");
    const collect0 = decrease0 + owed0, collect1 = decrease1 + owed1;
    if (collect0 <= 0n && collect1 <= 0n) throw new ExecutionPlanError("The independent quote produced no collectible token output.", "QUOTE_FAILED");
    const minDecrease0 = floorByBps(decrease0, job.constraints.maxSlippageBps), minDecrease1 = floorByBps(decrease1, job.constraints.maxSlippageBps);
    const minMint0 = floorByBps(collect0, job.constraints.maxSlippageBps), minMint1 = floorByBps(collect1, job.constraints.maxSlippageBps);
    const to = job.subject.positionManager!;
    const tokenIdValue = BigInt(job.subject.tokenId);
    const calls = [
      { kind: "DECREASE_LIQUIDITY" as const, label: "Remove current-range liquidity", data: encodeFunctionData({ abi: V3_POSITION_MANAGER_ABI, functionName: "decreaseLiquidity", args: [{ tokenId: tokenIdValue, liquidity: BigInt(position.liquidityRaw), amount0Min: minDecrease0, amount1Min: minDecrease1, deadline: BigInt(upperUnix) }] } as never), summary: { tokenId: job.subject.tokenId, liquidityRaw: position.liquidityRaw, amount0MinRaw: minDecrease0.toString(), amount1MinRaw: minDecrease1.toString(), deadlineUnix: upperUnix } },
      { kind: "COLLECT" as const, label: "Collect withdrawn tokens and recorded fees", data: encodeFunctionData({ abi: V3_POSITION_MANAGER_ABI, functionName: "collect", args: [{ tokenId: tokenIdValue, recipient: job.walletAddress as `0x${string}`, amount0Max: UINT128_MAX, amount1Max: UINT128_MAX }] } as never), summary: { tokenId: job.subject.tokenId, recipient: job.walletAddress, amount0MaxRaw: UINT128_MAX.toString(), amount1MaxRaw: UINT128_MAX.toString() } },
      { kind: "MINT" as const, label: "Mint replacement reviewed-range position", data: encodeFunctionData({ abi: V3_POSITION_MANAGER_ABI, functionName: "mint", args: [{ token0: job.subject.token0!.address as `0x${string}`, token1: job.subject.token1!.address as `0x${string}`, fee: job.subject.feePips!, tickLower: input.targetTickLower, tickUpper: input.targetTickUpper, amount0Desired: collect0, amount1Desired: collect1, amount0Min: minMint0, amount1Min: minMint1, recipient: job.walletAddress as `0x${string}`, deadline: BigInt(upperUnix) }] } as never), summary: { token0: job.subject.token0!.address, token1: job.subject.token1!.address, feePips: job.subject.feePips!, tickLower: input.targetTickLower, tickUpper: input.targetTickUpper, amount0DesiredRaw: collect0.toString(), amount1DesiredRaw: collect1.toString(), amount0MinRaw: minMint0.toString(), amount1MinRaw: minMint1.toString(), recipient: job.walletAddress, deadlineUnix: upperUnix } },
    ];
    if (calls.length > job.constraints.maxActionCount) throw new ExecutionPlanError(`Execution plan requires ${calls.length} steps but Job Intent permits at most ${job.constraints.maxActionCount}.`, "INVALID_STATE");
    const createdAt = now.toISOString();
    const quoteExpires = new Date(Math.min(new Date(job.expiresAt).getTime(), new Date(request.expiresAt).getTime(), now.getTime()+QUOTE_TTL_MS)).toISOString();
    const proposalAccepted = job.serviceTask?.proposedTickLower === input.targetTickLower && job.serviceTask?.proposedTickUpper === input.targetTickUpper;
    const proposalOrigin = job.serviceTask?.proposalId && job.serviceTask?.proposalHash && job.serviceTask?.requestContextHash ? {
      serviceTaskId: job.serviceTask.serviceTaskId,
      proposalId: job.serviceTask.proposalId,
      proposalHash: job.serviceTask.proposalHash,
      requestContextHash: job.serviceTask.requestContextHash,
      attribution: proposalAccepted ? "AGENT_SERVICE" as const : "USER_OVERRIDE" as const,
    } : undefined;
    const targetRange = { tickLower: input.targetTickLower, tickUpper: input.targetTickUpper, tickSpacing: position.pool.tickSpacing, currentTickAtReview: position.pool.currentTick, state: reviewed ? "USER_REVIEWED" as const : "PROPOSED" as const, proposedBy: proposalAccepted ? "AGENT_SERVICE" as const : "USER" as const, reviewedAt: reviewed ? createdAt : undefined, detail: proposalAccepted ? (reviewed ? "The user explicitly accepted the verified AgentService-proposed replacement range after Spotriq refreshed the V3 position and quote." : "Verified AgentService-proposed replacement range awaiting explicit user execution-plan review.") : (reviewed ? "The user explicitly overrode the AgentService proposal and confirmed this replacement range after Spotriq refreshed the V3 position and quote." : "User override of the AgentService-proposed range awaiting explicit execution-plan review.") };
    const quote = { quoteId: quoteId(job.jobIntentId, position.blockNumber), jobIntentId: job.jobIntentId, blockNumber: position.blockNumber, observedAt: quoted.observedAt, expiresAt: quoteExpires, method: "PANCAKESWAP_V3_ETH_CALL_SIMULATION" as const, liquidityRaw: position.liquidityRaw, expectedDecreaseAmount0Raw: decrease0.toString(), expectedDecreaseAmount1Raw: decrease1.toString(), recordedTokensOwed0Raw: owed0.toString(), recordedTokensOwed1Raw: owed1.toString(), expectedCollectAmount0Raw: collect0.toString(), expectedCollectAmount1Raw: collect1.toString(), evidenceState: "OBSERVED" as const, limitations: [...quoted.limitations, "Expected collect amounts add the position's recorded tokensOwed values to simulated decrease outputs; fees may continue accruing before execution."] };
    const base = {
      planId: planId(job.jobIntentId), jobIntentId: job.jobIntentId, permissionRequestId: request.permissionRequestId, serviceId: job.selectedService.serviceId, walletAddress: job.walletAddress, network: job.subject.network, chainId: (job.subject.network === "mainnet" ? 56 : 97) as 56|97, state: reviewed ? "REVIEWED" as const : "REVIEWABLE" as const, targetRange, proposalOrigin,
      positionSnapshot: { tokenId: position.tokenId, owner: position.owner, positionManager: position.positionManager, poolAddress: position.pool.poolAddress, token0: position.pool.token0, token1: position.pool.token1, feePips: position.pool.feePips, tickLower: position.tickLower, tickUpper: position.tickUpper, currentTick: position.pool.currentTick, tickSpacing: position.pool.tickSpacing, liquidityRaw: position.liquidityRaw, recordedTokensOwed0Raw: position.recordedTokensOwed0Raw ?? "0", recordedTokensOwed1Raw: position.recordedTokensOwed1Raw ?? "0", blockNumber: position.blockNumber, observedAt: position.observedAt },
      quote, guardState: "INCONCLUSIVE" as const, executionEligible: false as const, createdAt, updatedAt: createdAt, expiresAt: quoteExpires, methodVersion: REBALANCING_EXECUTION_PLAN_METHOD,
      limitations: ["The execution plan is deterministic from one reviewed Job Intent, its verified AgentService task proposal, one live V3 position snapshot, one independent eth_call simulation, and one user-reviewed replacement range.", "No transaction is signed or submitted by this plan.", "The external AgentService is an authenticated proposer only. It will not receive the future financial signing key.", proposalAccepted ? "The reviewed replacement ticks exactly match the linked AgentService proposal and retain AGENT_SERVICE attribution." : "The reviewed replacement ticks differ from the linked AgentService proposal and are explicitly attributed as USER_OVERRIDE rather than to the agent.", "A fresh boundary preflight must revalidate LP ownership/state and output floors before any future signing.", ...(job.constraints.allowSwapPreparation ? ["Swap preparation was allowed by the Job Intent, but v0.17 intentionally creates no router swap step. The plan only reuses the tokens expected from the existing position."] : [])],
    };
    const skeleton = { ...base, planHash: "0x" as string, steps: [] as RebalancingExecutionPlanStep[] } satisfies RebalancingExecutionPlan;
    const steps: RebalancingExecutionPlanStep[] = calls.map((item, index) => {
      const call = { to, data: item.data as Hex, valueRaw: "0" };
      const proposal = makeProposal(job, request, index, call);
      const guard = guardRebalancingProposal({ intent: job, request, proposal, executionPlan: skeleton, now });
      return { index, kind: item.kind, label: item.label, call, callHash: callHash(call.to, call.data, call.valueRaw), decodedSummary: item.summary as unknown as Record<string, string | number | boolean>, guard };
    });
    // Re-run guards with the complete reviewed plan so quote/range evidence is visible.
    let plan: RebalancingExecutionPlan = { ...base, planHash: "0x", steps };
    const guardedSteps = steps.map((step, index) => {
      const proposal = makeProposal(job, request, index, step.call);
      const guard: RebalancingExecutionGuardReport = guardRebalancingProposal({ intent: job, request, proposal, executionPlan: plan, now });
      return { ...step, guard };
    });
    const guardState = guardedSteps.some((step) => step.guard.state === "BLOCKED") ? "BLOCKED" : guardedSteps.some((step) => step.guard.state === "INCONCLUSIVE") ? "INCONCLUSIVE" : "PASS";
    const hashInput = { ...base, guardState };
    const pHash = canonicalPlanHash(hashInput as Omit<RebalancingExecutionPlan,"planHash"|"steps">, guardedSteps.map(({index,kind,callHash}) => ({index,kind,callHash})));
    plan = { ...base, guardState, planHash: pHash, steps: guardedSteps };
    await store.save(plan);
    return plan;
  }

  return {
    async prepare(job, request, input, now = new Date()) { return prepareInternal(job, request, input, now, false); },
    async review(id, job, request, now = new Date()) {
      const existing = await store.get(id); if (!existing) throw new ExecutionPlanError(`Execution plan ${id} was not found.`, "PLAN_NOT_FOUND");
      if (existing.state === "REVIEWED" && existing.guardState === "PASS") return existing;
      if (existing.state !== "REVIEWABLE") throw new ExecutionPlanError("Only a REVIEWABLE execution plan can be confirmed.", "INVALID_STATE");
      if (existing.jobIntentId !== job.jobIntentId || existing.permissionRequestId !== request.permissionRequestId) throw new ExecutionPlanError("Execution plan does not belong to the supplied Job Intent/PermissionRequest.", "INVALID_INPUT");
      // Refresh live position + eth_call quote at the moment the user confirms the range.
      return prepareInternal(job, request, { targetTickLower: existing.targetRange.tickLower, targetTickUpper: existing.targetRange.tickUpper }, now, true);
    },
    async get(id) { const plan = await store.get(id); if (!plan) throw new ExecutionPlanError(`Execution plan ${id} was not found.`, "PLAN_NOT_FOUND"); return plan; },
    async getForJob(jobIntentId) { return store.getForJob(jobIntentId); },
    async linkBoundary(id, boundaryId, now = new Date()) { const plan = await store.get(id); if (!plan) throw new ExecutionPlanError(`Execution plan ${id} was not found.`, "PLAN_NOT_FOUND"); if (plan.state !== "REVIEWED" || plan.guardState !== "PASS") throw new ExecutionPlanError("Only a reviewed PASS plan can link an execution boundary.", "INVALID_STATE"); const next = { ...plan, enforcementBoundaryId: boundaryId, updatedAt: now.toISOString() }; await store.save(next); return next; },
  };
}

