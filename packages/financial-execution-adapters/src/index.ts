import { createHash } from "node:crypto";
import { decodeFunctionResult, encodeFunctionData, parseAbi, parseUnits } from "viem";
import type { Abi } from "viem";
import type { BscChainReader } from "@spotriq/chain";
import type { CommercialEngine } from "@spotriq/commercial";
import type {
  CategoryExecutionGuardReport,
  FinancialExecutionAdapterDescriptor,
  FinancialExecutionAdapterStateResponseModel,
  FinancialExecutionCheck,
  FinancialExecutionPreflight,
  GuardedFinancialCall,
  PermissionCheckoutScope,
  PrepareFinancialExecutionInput,
  ScopedPermissionRequest,
  ServiceCategory,
} from "@spotriq/domain";
import type { MarketplaceSupplyReader } from "@spotriq/marketplace-supply";
import type { PermissionCheckoutEngine } from "@spotriq/permission-checkout";
import type { PancakeSwapReader } from "@spotriq/protocol-pancakeswap";
import type { VenusReader } from "@spotriq/protocol-venus";

export const FINANCIAL_EXECUTION_ADAPTER_METHOD = "marketplace.financial-execution-adapter@1.0.0";
export const PANCAKE_V3_SWAP_ROUTER: Record<"mainnet" | "testnet", string> = {
  mainnet: "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
  testnet: "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
};

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const uint = (value: string | undefined, label: string): bigint => {
  try {
    if (!value || !/^\d+$/.test(value)) throw new Error("not uint");
    return BigInt(value);
  } catch {
    throw new FinancialExecutionAdapterError(`${label} must be an unsigned integer.`, "INVALID_INPUT");
  }
};
const address = (value: string | undefined, label: string): string => {
  if (!value || !ADDRESS.test(value)) throw new FinancialExecutionAdapterError(`${label} must be a valid EVM address.`, "INVALID_INPUT");
  return value.toLowerCase();
};
const amount = (value: string | undefined, label: string): string => {
  const v = value?.trim();
  if (!v || !/^\d+(?:\.\d+)?$/.test(v) || Number(v) <= 0) throw new FinancialExecutionAdapterError(`${label} must be a positive decimal amount.`, "INVALID_INPUT");
  return v;
};
const id = (prefix: string, ...parts: string[]): string => `${prefix}:${createHash("sha256").update(parts.join("\u0000")).digest("hex").slice(0, 32)}`;
const check = (code: string, label: string, state: FinancialExecutionCheck["state"], detail: string, blocking = true): FinancialExecutionCheck => ({ code, label, state, detail, blocking });
const hasFailure = (checks: FinancialExecutionCheck[]) => checks.some((item) => item.blocking && item.state !== "PASS");

const ERC20_ABI = parseAbi([
  "function decimals() view returns (uint8)",
  "function allowance(address owner,address spender) view returns (uint256)",
]);
const VTOKEN_ABI = parseAbi([
  "function underlying() view returns (address)",
  "function getAccountSnapshot(address account) view returns (uint256 errorCode,uint256 vTokenBalance,uint256 borrowBalance,uint256 exchangeRateMantissa)",
  "function mint(uint256 mintAmount) returns (uint256)",
  "function redeemUnderlying(uint256 redeemAmount) returns (uint256)",
  "function repayBorrow(uint256 repayAmount) returns (uint256)",
]);
const GRID_ROUTER_ABI = parseAbi([
  "function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)",
]);
const PANCAKE_V3_FACTORY_ABI = parseAbi([
  "function getPool(address tokenA,address tokenB,uint24 fee) view returns (address pool)",
]);

export class FinancialExecutionAdapterError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_INPUT"
      | "ADAPTER_NOT_FOUND"
      | "WRONG_BUYER"
      | "WRONG_CATEGORY"
      | "INVALID_STATE"
      | "PROTOCOL_READ_FAILED"
      | "TARGET_NOT_ALLOWED"
      | "LIMIT_EXCEEDED",
    public readonly retryable = false,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "FinancialExecutionAdapterError";
  }
}

const ADAPTERS: Record<ServiceCategory, FinancialExecutionAdapterDescriptor> = {
  rebalancing: {
    adapterId: "execution-adapter:rebalancing:v3-boundary",
    category: "rebalancing",
    protocol: "PancakeSwap",
    networkPolicy: "BSC_TESTNET_ONLY",
    state: "IMPLEMENTED",
    mode: "LEGACY_REBALANCING_BOUNDARY",
    actions: ["REBALANCING_EXISTING_BOUNDARY"],
    targetPolicy: "Exact PancakeSwap V3 PositionManager and LP token ID are inherited from the sealed Rebalancing JobIntent/ExecutionBoundary.",
    argumentGuard: "Existing calldata decoder checks exact position, recipient, token pair, fee tier, reviewed ticks, amount/slippage constraints and deadline before boundary authorization.",
    staleStatePolicy: "ExecutionPlan/Boundary preflight re-reads the exact LP and invalidates stale position state before controlled dispatch.",
    signerPolicy: "Only a boundary-controlled Altana financial session may sign; the external AgentService never receives the financial signer.",
    methodVersion: FINANCIAL_EXECUTION_ADAPTER_METHOD,
    limitations: ["Rebalancing remains on the existing v0.16–v0.20 guarded execution stack; v0.26 does not duplicate it."],
  },
  grid: {
    adapterId: "execution-adapter:grid:pancakeswap-v3",
    category: "grid",
    protocol: "PancakeSwap",
    networkPolicy: "BSC_TESTNET_ONLY",
    state: "IMPLEMENTED",
    mode: "CATEGORY_GUARDED_CALL",
    actions: ["GRID_SWAP_EXACT_INPUT_SINGLE"],
    targetPolicy: "Only the canonical PancakeSwap V3 SwapRouter and the exact reviewed V3 pool token pair/fee tier are allowed.",
    argumentGuard: "Token-in must equal the reviewed capital asset; token-out is the other token in the reviewed pool; recipient is the buyer; amount and deadline are bounded by the immutable scope.",
    staleStatePolicy: "The reviewed pool is re-read from BSC immediately before call preparation; pool/token/fee mismatch blocks.",
    signerPolicy: "A reconciled PermissionGrant is mandatory. v0.26 prepares/guards calls but does not provision a category signer or submit transactions for current read-only services.",
    methodVersion: FINANCIAL_EXECUTION_ADAPTER_METHOD,
    limitations: ["One exact-input V3 swap is modeled. Multi-hop, multicall, Permit2, arbitrary routers and unlimited approvals are excluded."],
  },
  yield: {
    adapterId: "execution-adapter:yield:venus-vtoken",
    category: "yield",
    protocol: "Venus",
    networkPolicy: "BSC_TESTNET_ONLY",
    state: "IMPLEMENTED",
    mode: "CATEGORY_GUARDED_CALL",
    actions: ["YIELD_SUPPLY", "YIELD_WITHDRAW"],
    targetPolicy: "Only an explicitly reviewed Venus vToken whose underlying exactly matches the reviewed asset is allowed.",
    argumentGuard: "Supply/withdraw amount must fit both the per-action and total allocation caps; borrowing and arbitrary token transfer are not modeled.",
    staleStatePolicy: "vToken underlying/account state and current BSC block are re-read immediately before call preparation.",
    signerPolicy: "A reconciled PermissionGrant is mandatory; v0.26 does not grant one to current read-only YieldPilot.",
    methodVersion: FINANCIAL_EXECUTION_ADAPTER_METHOD,
    limitations: ["Native-asset Venus supply is not enabled; this adapter models ERC-20 vToken mint/redeemUnderlying only."],
  },
  health: {
    adapterId: "execution-adapter:health:venus-protective-write",
    category: "health",
    protocol: "Venus",
    networkPolicy: "BSC_TESTNET_ONLY",
    state: "IMPLEMENTED",
    mode: "CATEGORY_GUARDED_CALL",
    actions: ["HEALTH_REPAY", "HEALTH_ADD_COLLATERAL"],
    targetPolicy: "Only an explicitly reviewed Venus vToken/underlying may receive a protective repay or add-collateral call.",
    argumentGuard: "Action must be explicitly reviewed; amount must be within the intervention cap; protective writes are allowed only when observed health is at or below the reviewed trigger.",
    staleStatePolicy: "Venus wallet risk state is re-read immediately before call preparation; unavailable/conflicting health evidence blocks.",
    signerPolicy: "A reconciled PermissionGrant is mandatory; current VenusGuard remains read-only and receives no financial signer.",
    methodVersion: FINANCIAL_EXECUTION_ADAPTER_METHOD,
    limitations: ["Borrow and collateral-withdraw functions are deliberately absent. ADD_COLLATERAL requires the selected market already to be collateral-enabled."],
  },
};

export function getFinancialExecutionAdapterDescriptor(category: ServiceCategory): FinancialExecutionAdapterDescriptor {
  return structuredClone(ADAPTERS[category]);
}
export function listFinancialExecutionAdapterDescriptors(): FinancialExecutionAdapterDescriptor[] {
  return (Object.keys(ADAPTERS) as ServiceCategory[]).map(getFinancialExecutionAdapterDescriptor);
}

export interface FinancialExecutionAssessmentStore {
  savePreflight(value: FinancialExecutionPreflight): Promise<void>;
  saveGuard(value: CategoryExecutionGuardReport): Promise<void>;
  getLatestPreflight(permissionRequestId: string): Promise<FinancialExecutionPreflight | undefined>;
  getLatestGuard(permissionRequestId: string): Promise<CategoryExecutionGuardReport | undefined>;
}
export class MemoryFinancialExecutionAssessmentStore implements FinancialExecutionAssessmentStore {
  private readonly preflights = new Map<string, FinancialExecutionPreflight>();
  private readonly guards = new Map<string, CategoryExecutionGuardReport>();
  async savePreflight(value: FinancialExecutionPreflight) { this.preflights.set(value.permissionRequestId, structuredClone(value)); }
  async saveGuard(value: CategoryExecutionGuardReport) { this.guards.set(value.permissionRequestId, structuredClone(value)); }
  async getLatestPreflight(idValue: string) { const v = this.preflights.get(idValue); return v ? structuredClone(v) : undefined; }
  async getLatestGuard(idValue: string) { const v = this.guards.get(idValue); return v ? structuredClone(v) : undefined; }
}
export interface SqlQueryResult<Row = Record<string, unknown>> { rows: Row[]; rowCount?: number | null; }
export interface SqlQueryExecutor { query<Row = Record<string, unknown>>(text: string, values?: unknown[]): Promise<SqlQueryResult<Row>>; }
export class PostgresFinancialExecutionAssessmentStore implements FinancialExecutionAssessmentStore {
  constructor(private readonly db: SqlQueryExecutor) {}
  async savePreflight(v: FinancialExecutionPreflight) { await this.db.query(`insert into financial_execution_adapter_assessments (assessment_id,permission_request_id,kind,state,payload,created_at) values ($1,$2,'PREFLIGHT',$3,$4::jsonb,$5) on conflict (assessment_id) do update set state=excluded.state,payload=excluded.payload`, [v.preflightId, v.permissionRequestId, v.state, JSON.stringify(v), v.checkedAt]); }
  async saveGuard(v: CategoryExecutionGuardReport) { await this.db.query(`insert into financial_execution_adapter_assessments (assessment_id,permission_request_id,kind,state,payload,created_at) values ($1,$2,'GUARD',$3,$4::jsonb,$5) on conflict (assessment_id) do update set state=excluded.state,payload=excluded.payload`, [v.guardReportId, v.permissionRequestId, v.state, JSON.stringify(v), v.guardedAt]); }
  async getLatestPreflight(permissionRequestId: string) { return (await this.db.query<{payload: FinancialExecutionPreflight}>("select payload from financial_execution_adapter_assessments where permission_request_id=$1 and kind='PREFLIGHT' order by created_at desc limit 1", [permissionRequestId])).rows[0]?.payload; }
  async getLatestGuard(permissionRequestId: string) { return (await this.db.query<{payload: CategoryExecutionGuardReport}>("select payload from financial_execution_adapter_assessments where permission_request_id=$1 and kind='GUARD' order by created_at desc limit 1", [permissionRequestId])).rows[0]?.payload; }
}

async function readContract<T>(chain: BscChainReader, target: string, abi: Abi, functionName: string, args: readonly unknown[] = [], blockNumber?: string): Promise<{result:T;blockNumber:string}> {
  try {
    // This helper intentionally accepts a runtime-selected read function. Using the broad
    // Abi type keeps viem's dynamic contract-call boundary typed without collapsing the
    // whole argument object to `never` (which breaks under viem 2.47's stricter generics).
    const data = encodeFunctionData({ abi, functionName, args });
    const call = await chain.callContract(target, data, blockNumber);
    const result = decodeFunctionResult({ abi, functionName, data: call.data as `0x${string}` }) as T;
    return { result, blockNumber: call.blockNumber };
  } catch (error) {
    throw new FinancialExecutionAdapterError(`Could not read ${functionName} from ${target}.`, "PROTOCOL_READ_FAILED", true, error);
  }
}

function scopeLimit(scope: PermissionCheckoutScope, code: "CAPITAL" | "SINGLE_ACTION" | "INTERVENTION"): string | undefined {
  return scope.limits.find((item) => item.code === code)?.value;
}
function withinDisplayLimit(value: string, limitValue: string | undefined): boolean {
  if (!limitValue) return false;
  const requested = Number(value), limit = Number(limitValue);
  return Number.isFinite(requested) && Number.isFinite(limit) && requested > 0 && requested <= limit;
}
function targetScopeSatisfied(request: ScopedPermissionRequest): boolean {
  const scope = request.scopeSnapshot;
  if (scope.category === "rebalancing") return Boolean(scope.target.positionTokenId);
  if (scope.category === "grid") return Boolean(scope.target.poolAddress && scope.target.assetAddresses.length === 1);
  return scope.target.assetAddresses.length === 1 && scope.target.marketAddresses.length > 0;
}

export interface FinancialExecutionAdapterEngine {
  listAdapters(): FinancialExecutionAdapterDescriptor[];
  getAdapter(category: ServiceCategory): FinancialExecutionAdapterDescriptor;
  preflight(permissionRequestId: string, input: { buyerAddress: string }): Promise<FinancialExecutionPreflight>;
  guard(permissionRequestId: string, input: { buyerAddress: string; proposal: PrepareFinancialExecutionInput }): Promise<CategoryExecutionGuardReport>;
  getState(permissionRequestId: string): Promise<FinancialExecutionAdapterStateResponseModel>;
}

export function createFinancialExecutionAdapterEngine(options: {
  chain: BscChainReader;
  pancakeSwap: PancakeSwapReader;
  venus: VenusReader;
  commercial: CommercialEngine;
  marketplace: MarketplaceSupplyReader;
  permissionCheckout: PermissionCheckoutEngine;
  store?: FinancialExecutionAssessmentStore;
  now?: () => Date;
}): FinancialExecutionAdapterEngine {
  const store = options.store ?? new MemoryFinancialExecutionAssessmentStore();
  const now = options.now ?? (() => new Date());

  async function preflight(permissionRequestId: string, input: {buyerAddress:string}): Promise<FinancialExecutionPreflight> {
    const request = await options.permissionCheckout.getRequest(permissionRequestId);
    const buyer = address(input.buyerAddress, "buyerAddress");
    if (request.buyerAddress !== buyer) throw new FinancialExecutionAdapterError("Only the permission-request buyer can run its execution preflight.", "WRONG_BUYER");
    const [activation, record] = await Promise.all([options.commercial.getActivation(request.activationId), options.marketplace.getService(request.serviceId)]);
    const adapter = getFinancialExecutionAdapterDescriptor(request.category);
    const at = now();
    const checks: FinancialExecutionCheck[] = [];
    checks.push(check("ADAPTER", "Category execution adapter", adapter.state === "IMPLEMENTED" ? "PASS" : "FAIL", adapter.state === "IMPLEMENTED" ? `${request.category} has a deterministic v0.26 execution adapter.` : `${request.category} execution adapter is unavailable.`));
    checks.push(check("NETWORK", "BSC Testnet execution policy", options.chain.definition.chainId === 97 && activation.serviceChainId === 97 ? "PASS" : "FAIL", options.chain.definition.chainId === 97 && activation.serviceChainId === 97 ? "Execution assessment is bound to BSC Testnet chainId 97." : `Financial execution remains testnet-only; API chain=${options.chain.definition.chainId}, service chain=${activation.serviceChainId}.`));
    const activationOk = activation.state === "ACTIVE" && activation.buyerAddress === buyer && activation.serviceId === request.serviceId;
    checks.push(check("ACTIVATION", "Active service relationship", activationOk ? "PASS" : "FAIL", activationOk ? "The request remains bound to the buyer's ACTIVE MarketplaceActivation." : "The linked MarketplaceActivation is not active or does not match this buyer/service."));
    const requestOk = request.state !== "CANCELLED" && request.state !== "EXPIRED" && Date.parse(request.expiresAt) > at.getTime();
    checks.push(check("REQUEST_STATE", "Scoped permission request", requestOk ? "PASS" : "FAIL", requestOk ? `ScopedPermissionRequest is ${request.state} and unexpired.` : `ScopedPermissionRequest is ${request.state} or expired.`));
    const serviceReady = record.permissionProfile.executionMode === "AUTOMATIC_WITH_LIMITS" && record.service.marketplaceActivationEligible === true && record.readiness.state === "READY";
    checks.push(check("SERVICE_FINANCIAL_READINESS", "Service financial readiness", serviceReady ? "PASS" : "FAIL", serviceReady ? "Service declares bounded automatic financial execution and financial readiness is READY." : `Service remains ${record.permissionProfile.executionMode} / ${record.readiness.state}; read-only/commercial readiness cannot be upgraded by the adapter.`));
    const grantOk = request.state === "GRANT_RECONCILED" && Boolean(request.permissionGrantId);
    checks.push(check("PERMISSION_GRANT", "Reconciled PermissionGrant", grantOk ? "PASS" : "FAIL", grantOk ? `PermissionGrant ${request.permissionGrantId} is linked by the scoped request.` : "No independently reconciled PermissionGrant is linked. A reviewed scope alone cannot execute."));
    const targetOk = targetScopeSatisfied(request);
    checks.push(check("TARGET_SCOPE", "Exact protocol target scope", targetOk ? "PASS" : "FAIL", targetOk ? "The immutable scope identifies the exact position/pool/market target required by this adapter." : "The reviewed scope does not contain an exact executable target. Add an explicit market/pool/position before financial execution can be assessed."));
    let observedBlockNumber: string | undefined;
    try { observedBlockNumber = await options.chain.getBlockNumber(); checks.push(check("FRESH_CHAIN", "Fresh BSC state", "PASS", `BSC block ${observedBlockNumber} was observed during preflight.`)); }
    catch { checks.push(check("FRESH_CHAIN", "Fresh BSC state", "INCONCLUSIVE", "Current BSC block could not be read; stale-state protection cannot pass.")); }
    const state: FinancialExecutionPreflight["state"] = hasFailure(checks) ? "BLOCKED" : "READY_FOR_GUARD";
    const result: FinancialExecutionPreflight = {
      preflightId: id("execution-preflight", request.permissionRequestId, at.toISOString()), permissionRequestId: request.permissionRequestId, activationId: request.activationId, serviceId: request.serviceId, buyerAddress: buyer, category: request.category, adapter, state, checks, observedBlockNumber, permissionGrantId: request.permissionGrantId, permissionGrantSatisfied: grantOk, serviceFinancialReadinessSatisfied: serviceReady, activationSatisfied: activationOk, targetScopeSatisfied: targetOk, executionEligible: false, checkedAt: at.toISOString(), methodVersion: FINANCIAL_EXECUTION_ADAPTER_METHOD,
      limitations: ["Preflight ≠ PermissionGrant ≠ transaction submission ≠ outcome.", "v0.26 fails closed: even READY_FOR_GUARD only permits deterministic call preparation/argument validation. Category signer provisioning and dispatch remain separately gated."]
    };
    await store.savePreflight(result);
    return result;
  }

  async function buildGridCall(request: ScopedPermissionRequest, proposal: Extract<PrepareFinancialExecutionInput,{category:"grid"}>, at: Date): Promise<{call:GuardedFinancialCall;checks:FinancialExecutionCheck[]}> {
    const scope = request.scopeSnapshot;
    const poolAddress = address(scope.target.poolAddress, "reviewed poolAddress");
    const pool = await options.pancakeSwap.getV3Pool(poolAddress);
    const capitalAsset = address(scope.target.assetAddresses[0], "reviewed capital asset");
    const t0 = pool.token0.address.toLowerCase(), t1 = pool.token1.address.toLowerCase();
    const factoryAddress = options.pancakeSwap.getStatus().contracts.v3Factory.toLowerCase();
    const canonicalPoolRead = await readContract<`0x${string}`>(options.chain, factoryAddress, PANCAKE_V3_FACTORY_ABI, "getPool", [t0, t1, pool.feePips], pool.blockNumber);
    const canonicalPool = address(canonicalPoolRead.result, "canonical PancakeSwap V3 pool");
    if (canonicalPool !== poolAddress) throw new FinancialExecutionAdapterError("Reviewed Grid pool is not the canonical PancakeSwap V3 factory pool for its token pair and fee tier.", "TARGET_NOT_ALLOWED");
    if (capitalAsset !== t0 && capitalAsset !== t1) throw new FinancialExecutionAdapterError("Reviewed grid capital asset is not a token in the reviewed pool.", "TARGET_NOT_ALLOWED");
    const tokenIn = capitalAsset, tokenOut = capitalAsset === t0 ? t1 : t0;
    const token = capitalAsset === t0 ? pool.token0 : pool.token1;
    if (token.decimals === undefined) throw new FinancialExecutionAdapterError("Grid capital token decimals are unavailable.", "PROTOCOL_READ_FAILED", true);
    const displayAmount = amount(proposal.amountIn, "amountIn");
    const checks: FinancialExecutionCheck[] = [];
    const withinSingle = withinDisplayLimit(displayAmount, scopeLimit(scope,"SINGLE_ACTION"));
    const withinCapital = withinDisplayLimit(displayAmount, scopeLimit(scope,"CAPITAL"));
    checks.push(check("GRID_AMOUNT", "Grid action amount", withinSingle && withinCapital ? "PASS" : "FAIL", withinSingle && withinCapital ? "Swap input fits the reviewed per-action and total capital limits." : "Swap input exceeds the reviewed grid per-action or capital limit."));
    const deadlineOk = Number.isInteger(proposal.deadlineUnix) && proposal.deadlineUnix > Math.floor(at.getTime()/1000) && proposal.deadlineUnix <= Math.min(Math.floor(Date.parse(scope.expiresAt)/1000), Math.floor(at.getTime()/1000)+1800);
    checks.push(check("DEADLINE", "Grid call deadline", deadlineOk ? "PASS" : "FAIL", deadlineOk ? "Deadline is future, short-lived and no later than the permission scope expiry." : "Deadline must be within 30 minutes and no later than scope expiry."));
    const minOut = uint(proposal.amountOutMinimumRaw,"amountOutMinimumRaw");
    checks.push(check("MIN_OUTPUT", "Non-zero minimum output", minOut > 0n ? "PASS" : "FAIL", minOut > 0n ? "A non-zero minimum output is encoded." : "Zero minimum output is prohibited."));
    if (hasFailure(checks)) throw new FinancialExecutionAdapterError("Grid proposal violates reviewed limits.", "LIMIT_EXCEEDED", false, checks);
    const amountInRaw = parseUnits(displayAmount, token.decimals);
    const sqrt = uint(proposal.sqrtPriceLimitX96 ?? "0", "sqrtPriceLimitX96");
    const params = { tokenIn: tokenIn as `0x${string}`, tokenOut: tokenOut as `0x${string}`, fee: pool.feePips, recipient: request.buyerAddress as `0x${string}`, deadline: BigInt(proposal.deadlineUnix), amountIn: amountInRaw, amountOutMinimum: minOut, sqrtPriceLimitX96: sqrt };
    const data = encodeFunctionData({ abi: GRID_ROUTER_ABI, functionName: "exactInputSingle", args: [params] });
    return { call: { to: PANCAKE_V3_SWAP_ROUTER.testnet.toLowerCase(), data, valueRaw: "0", functionName: "exactInputSingle", decodedArguments: { tokenIn, tokenOut, fee: pool.feePips, recipient: request.buyerAddress, deadlineUnix: proposal.deadlineUnix, amountInRaw: amountInRaw.toString(), amountOutMinimumRaw: minOut.toString(), sqrtPriceLimitX96: sqrt.toString(), poolAddress } }, checks };
  }

  async function vTokenUnderlying(marketAddress: string, blockNumber?: string): Promise<{underlying:string;decimals:number;blockNumber:string}> {
    const market = address(marketAddress, "marketAddress");
    const underlyingRead = await readContract<`0x${string}`>(options.chain, market, VTOKEN_ABI, "underlying", [], blockNumber);
    const underlying = address(underlyingRead.result, "Venus underlying");
    const decimalsRead = await readContract<number>(options.chain, underlying, ERC20_ABI, "decimals", [], underlyingRead.blockNumber);
    return { underlying, decimals: Number(decimalsRead.result), blockNumber: decimalsRead.blockNumber };
  }

  async function buildYieldCall(request: ScopedPermissionRequest, proposal: Extract<PrepareFinancialExecutionInput,{category:"yield"}>): Promise<{call:GuardedFinancialCall;checks:FinancialExecutionCheck[]}> {
    const scope=request.scopeSnapshot, market=address(proposal.marketAddress,"marketAddress");
    if(!scope.target.marketAddresses.map(x=>x.toLowerCase()).includes(market))throw new FinancialExecutionAdapterError("Venus market is not in the reviewed yield allowlist.","TARGET_NOT_ALLOWED");
    const meta=await vTokenUnderlying(market); const reviewedAsset=address(scope.target.assetAddresses[0],"reviewed asset");
    const opportunities=await options.venus.getYieldOpportunities(request.buyerAddress);
    const canonicalMarket=opportunities.opportunities.find(item=>item.vToken.toLowerCase()===market&&item.underlying.address.toLowerCase()===reviewedAsset);
    const checks:FinancialExecutionCheck[]=[
      check("VENUS_MARKET","Canonical Venus market",canonicalMarket?"PASS":"FAIL",canonicalMarket?"The reviewed vToken/underlying pair was independently rediscovered through Spotriq's Venus market adapter.":"The reviewed vToken/underlying pair is not currently rediscoverable as a supported Venus wallet-relevant market."),
      check("UNDERLYING","Venus underlying asset",meta.underlying===reviewedAsset?"PASS":"FAIL",meta.underlying===reviewedAsset?"vToken underlying exactly matches the reviewed asset.":"vToken underlying differs from the reviewed asset."),
    ];
    const displayAmount=amount(proposal.amount,"amount"); const withinSingle=withinDisplayLimit(displayAmount,scopeLimit(scope,"SINGLE_ACTION")),withinCapital=withinDisplayLimit(displayAmount,scopeLimit(scope,"CAPITAL"));
    checks.push(check("YIELD_AMOUNT","Yield action amount",withinSingle&&withinCapital?"PASS":"FAIL",withinSingle&&withinCapital?"Amount fits reviewed per-action and allocation limits.":"Amount exceeds reviewed yield limits."));
    if(hasFailure(checks))throw new FinancialExecutionAdapterError("Yield proposal violates reviewed scope.","LIMIT_EXCEEDED",false,checks);
    const raw=parseUnits(displayAmount,meta.decimals); const functionName=proposal.action==="YIELD_SUPPLY"?"mint":"redeemUnderlying"; const data=encodeFunctionData({abi:VTOKEN_ABI,functionName:functionName as "mint"|"redeemUnderlying",args:[raw]});
    return{call:{to:market,data,valueRaw:"0",functionName,decodedArguments:{marketAddress:market,underlying:meta.underlying,amountRaw:raw.toString(),amount:displayAmount}},checks};
  }

  async function buildHealthCall(request: ScopedPermissionRequest, proposal: Extract<PrepareFinancialExecutionInput,{category:"health"}>): Promise<{call:GuardedFinancialCall;checks:FinancialExecutionCheck[]}> {
    const scope=request.scopeSnapshot,market=address(proposal.marketAddress,"marketAddress"); if(!scope.target.marketAddresses.map(x=>x.toLowerCase()).includes(market))throw new FinancialExecutionAdapterError("Venus market is not in the reviewed protective-write allowlist.","TARGET_NOT_ALLOWED");
    const meta=await vTokenUnderlying(market); const reviewedAsset=address(scope.target.assetAddresses[0],"reviewed protective asset"); const protective=Array.isArray(scope.categoryContext.protectiveActions)?scope.categoryContext.protectiveActions.map(String):[];
    const expectedAction=proposal.action==="HEALTH_REPAY"?"REPAY":"ADD_COLLATERAL"; const checks:FinancialExecutionCheck[]=[
      check("PROTECTIVE_ACTION","Reviewed protective action",protective.includes(expectedAction)?"PASS":"FAIL",protective.includes(expectedAction)?`${expectedAction} is explicitly reviewed.`:`${expectedAction} is not in the reviewed protective actions.`),
      check("UNDERLYING","Venus underlying asset",meta.underlying===reviewedAsset?"PASS":"FAIL",meta.underlying===reviewedAsset?"vToken underlying exactly matches the reviewed protective asset.":"vToken underlying differs from the reviewed protective asset."),
    ];
    const displayAmount=amount(proposal.amount,"amount"); const within=withinDisplayLimit(displayAmount,scopeLimit(scope,"INTERVENTION")); checks.push(check("INTERVENTION_CAP","Protective intervention cap",within?"PASS":"FAIL",within?"Action amount fits the reviewed intervention cap.":"Action amount exceeds the reviewed protective intervention cap."));
    const snapshot=await options.venus.getWalletPositions(request.buyerAddress); const marketPosition=snapshot.positions.flatMap(p=>p.markets.map(m=>({pool:p,market:m}))).find(x=>x.market.vToken.toLowerCase()===market); const trigger=Number(scope.limits.find(x=>x.code==="HEALTH_TRIGGER")?.value??NaN); const hf=marketPosition?.pool.healthFactor===undefined?undefined:Number(marketPosition.pool.healthFactor); const healthOk=hf!==undefined&&Number.isFinite(trigger)&&hf<=trigger;
    checks.push(check("HEALTH_TRIGGER","Protective health trigger",healthOk?"PASS":"FAIL",hf===undefined?"Current health factor is unavailable; protective execution must fail closed.":healthOk?`Observed health factor ${hf} is at/below reviewed trigger ${trigger}.`:`Observed health factor ${hf} is above trigger ${trigger}; intervention is not authorized now.`));
    if(proposal.action==="HEALTH_ADD_COLLATERAL")checks.push(check("COLLATERAL_MARKET","Existing collateral-enabled market",marketPosition?.market.collateralEnabled?"PASS":"FAIL",marketPosition?.market.collateralEnabled?"Selected market is already collateral-enabled for this wallet.":"ADD_COLLATERAL is blocked because the selected market is not observed as collateral-enabled."));
    if(hasFailure(checks))throw new FinancialExecutionAdapterError("Protective-write proposal violates reviewed scope or current health state.","LIMIT_EXCEEDED",false,checks);
    const raw=parseUnits(displayAmount,meta.decimals); const functionName=proposal.action==="HEALTH_REPAY"?"repayBorrow":"mint"; const data=encodeFunctionData({abi:VTOKEN_ABI,functionName:functionName as "repayBorrow"|"mint",args:[raw]});
    return{call:{to:market,data,valueRaw:"0",functionName,decodedArguments:{marketAddress:market,underlying:meta.underlying,amountRaw:raw.toString(),amount:displayAmount,observedHealthFactor:hf??"unavailable",triggerHealthFactor:trigger}},checks};
  }

  async function guard(permissionRequestId:string,input:{buyerAddress:string;proposal:PrepareFinancialExecutionInput}):Promise<CategoryExecutionGuardReport>{
    const request=await options.permissionCheckout.getRequest(permissionRequestId),buyer=address(input.buyerAddress,"buyerAddress"); if(request.buyerAddress!==buyer)throw new FinancialExecutionAdapterError("Only the permission-request buyer can guard an execution proposal.","WRONG_BUYER"); if(input.proposal.category!==request.category)throw new FinancialExecutionAdapterError("Execution proposal category does not match the ScopedPermissionRequest.","WRONG_CATEGORY");
    const at=now(),pf=await preflight(permissionRequestId,{buyerAddress:buyer}); const commonChecks=[...pf.checks];
    if(request.category==="rebalancing"){
      const report:CategoryExecutionGuardReport={guardReportId:id("execution-guard",request.permissionRequestId,at.toISOString()),permissionRequestId:request.permissionRequestId,activationId:request.activationId,serviceId:request.serviceId,buyerAddress:buyer,category:request.category,action:"REBALANCING_EXISTING_BOUNDARY",state:"LEGACY_BOUNDARY_REQUIRED",preflight:pf,checks:commonChecks,exactTargetSatisfied:pf.targetScopeSatisfied,argumentLimitsSatisfied:false,staleStateSatisfied:Boolean(pf.observedBlockNumber),permissionGrantSatisfied:pf.permissionGrantSatisfied,executionEligible:false,guardedAt:at.toISOString(),methodVersion:FINANCIAL_EXECUTION_ADAPTER_METHOD,limitations:["Use the existing Rebalancing ExecutionPlan → FinancialExecutionBoundary → controlled-execution endpoints for actual V3 calldata guarding and dispatch."]}; await store.saveGuard(report); return report;
    }
    if(pf.state!=="READY_FOR_GUARD"){
      const report:CategoryExecutionGuardReport={guardReportId:id("execution-guard",request.permissionRequestId,at.toISOString()),permissionRequestId:request.permissionRequestId,activationId:request.activationId,serviceId:request.serviceId,buyerAddress:buyer,category:request.category,action:input.proposal.action,state:"BLOCKED",preflight:pf,checks:commonChecks,exactTargetSatisfied:pf.targetScopeSatisfied,argumentLimitsSatisfied:false,staleStateSatisfied:Boolean(pf.observedBlockNumber),permissionGrantSatisfied:pf.permissionGrantSatisfied,executionEligible:false,guardedAt:at.toISOString(),methodVersion:FINANCIAL_EXECUTION_ADAPTER_METHOD,limitations:["Call preparation is prohibited while deterministic preflight blockers remain."]}; await store.saveGuard(report); return report;
    }
    let built:{call:GuardedFinancialCall;checks:FinancialExecutionCheck[]};
    if(request.category==="grid")built=await buildGridCall(request,input.proposal as Extract<PrepareFinancialExecutionInput,{category:"grid"}>,at);
    else if(request.category==="yield")built=await buildYieldCall(request,input.proposal as Extract<PrepareFinancialExecutionInput,{category:"yield"}>);
    else built=await buildHealthCall(request,input.proposal as Extract<PrepareFinancialExecutionInput,{category:"health"}>);
    const checks=[...commonChecks,...built.checks]; const report:CategoryExecutionGuardReport={guardReportId:id("execution-guard",request.permissionRequestId,at.toISOString()),permissionRequestId:request.permissionRequestId,activationId:request.activationId,serviceId:request.serviceId,buyerAddress:buyer,category:request.category,action:input.proposal.action,state:hasFailure(checks)?"BLOCKED":"PASS_BUT_EXECUTION_BLOCKED",preflight:pf,call:hasFailure(checks)?undefined:built.call,checks,exactTargetSatisfied:!hasFailure(built.checks.filter(x=>x.code==="UNDERLYING"||x.code==="PROTECTIVE_ACTION")),argumentLimitsSatisfied:!hasFailure(built.checks),staleStateSatisfied:Boolean(pf.observedBlockNumber),permissionGrantSatisfied:pf.permissionGrantSatisfied,executionEligible:false,guardedAt:at.toISOString(),methodVersion:FINANCIAL_EXECUTION_ADAPTER_METHOD,limitations:["A PASS_BUT_EXECUTION_BLOCKED report proves exact target/argument preparation only. It does not submit, sign or claim a transaction occurred.","Category dispatch remains disabled until a non-bypassable signer/boundary implementation consumes the reconciled grant for this exact call."]}; await store.saveGuard(report); return report;
  }

  async function getState(permissionRequestId:string):Promise<FinancialExecutionAdapterStateResponseModel>{const [latestPreflight,latestGuard]=await Promise.all([store.getLatestPreflight(permissionRequestId),store.getLatestGuard(permissionRequestId)]);return{permissionRequestId,latestPreflight,latestGuard,generatedAt:now().toISOString(),methodVersion:FINANCIAL_EXECUTION_ADAPTER_METHOD,limitations:["Execution adapter state reports deterministic assessment/guard artifacts only. It is not transaction or outcome evidence."]};}
  return{listAdapters:listFinancialExecutionAdapterDescriptors,getAdapter:getFinancialExecutionAdapterDescriptor,preflight,guard,getState};
}
