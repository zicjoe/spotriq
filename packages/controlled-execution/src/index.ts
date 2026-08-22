import { encodeFunctionData, keccak256, toBytes } from "viem";
import type {
  BoundaryApprovalExecutionProof,
  BoundaryApprovalObservation,
  BoundaryApprovalPlan,
  BoundaryFinancialReadiness,
  BoundaryFinancialSessionObservation,
  BoundedPermissionRequest,
  ControlledExecutionProof,
  ControlledRebalancingExecution,
  ExecutionBoundaryPreflight,
  FinancialExecutionBoundary,
  RebalancingExecutionPlan,
  PancakeSwapClPositionSnapshot,
  BscTransactionReceiptSummary,
} from "@spotriq/domain";

export const CONTROLLED_EXECUTION_METHOD = "marketplace.controlled-rebalancing-execution@1.0.0";
export const BOUNDED_APPROVAL_METHOD = "marketplace.boundary-bounded-approval@1.0.0";

export class ControlledExecutionError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_INPUT"
      | "INVALID_STATE"
      | "APPROVAL_REQUIRED"
      | "INSUFFICIENT_BALANCE"
      | "SESSION_INVALID"
      | "EXECUTION_NOT_FOUND"
      | "APPROVAL_PLAN_NOT_FOUND"
      | "STALE_CONTEXT"
      | "CHAIN_EVIDENCE_UNAVAILABLE",
    public readonly retryable = false,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ControlledExecutionError";
  }
}

export interface BoundaryReader {
  get(boundaryId: string): Promise<FinancialExecutionBoundary>;
  authorizeCall(boundaryId: string, stepIndex: number, call: { to: string; data: string; valueRaw?: string }, now?: Date): Promise<{ state: "APPROVED_FOR_BOUNDARY" | "BLOCKED"; exactPlanCall: boolean; correctOrder: boolean }>;
  preflight(boundaryId: string, request: BoundedPermissionRequest, session?: BoundaryFinancialSessionObservation, now?: Date): Promise<ExecutionBoundaryPreflight>;
  consume(boundaryId: string, now?: Date): Promise<FinancialExecutionBoundary>;
}
export interface PlanReader { get(planId: string): Promise<RebalancingExecutionPlan>; }
export interface AuthorityReader {
  getRequest(permissionRequestId: string): Promise<BoundedPermissionRequest>;
  getBoundaryFinancialSessionForBoundary(boundaryId: string): Promise<BoundaryFinancialSessionObservation | undefined>;
  reverifyBoundaryFinancialSession(financialSessionId: string, input?: { revocationTransactionHash?: string }, now?: Date): Promise<BoundaryFinancialSessionObservation>;
  assessBoundaryFinancialReadiness(boundary: FinancialExecutionBoundary, plan: RebalancingExecutionPlan, financialSessionId: string, now?: Date): Promise<BoundaryFinancialReadiness>;
}
export interface ChainReader {
  getTransactionReceipt(hash: string): Promise<BscTransactionReceiptSummary | null>;
}
export interface PositionReader {
  getV3Position(tokenId: string | number | bigint, blockNumber?: string): Promise<PancakeSwapClPositionSnapshot>;
}

export interface SqlQueryResult<Row = Record<string, unknown>> { rows: Row[]; rowCount?: number | null; }
export interface SqlQueryExecutor { query<Row = Record<string, unknown>>(text: string, values?: unknown[]): Promise<SqlQueryResult<Row>>; }

export interface ControlledExecutionStore {
  saveApprovalPlan(plan: BoundaryApprovalPlan): Promise<void>;
  getApprovalPlan(approvalPlanId: string): Promise<BoundaryApprovalPlan | undefined>;
  getApprovalPlanForBoundary(boundaryId: string): Promise<BoundaryApprovalPlan | undefined>;
  saveApprovalObservation(observation: BoundaryApprovalObservation): Promise<void>;
  getApprovalObservationForPlan(approvalPlanId: string): Promise<BoundaryApprovalObservation | undefined>;
  saveExecution(execution: ControlledRebalancingExecution): Promise<void>;
  getExecution(executionId: string): Promise<ControlledRebalancingExecution | undefined>;
  getExecutionForBoundary(boundaryId: string): Promise<ControlledRebalancingExecution | undefined>;
}

export class MemoryControlledExecutionStore implements ControlledExecutionStore {
  private readonly approvals = new Map<string, BoundaryApprovalPlan>();
  private readonly approvalObservations = new Map<string, BoundaryApprovalObservation>();
  private readonly executions = new Map<string, ControlledRebalancingExecution>();
  async saveApprovalPlan(v: BoundaryApprovalPlan) { this.approvals.set(v.approvalPlanId, structuredClone(v)); }
  async getApprovalPlan(id: string) { const v=this.approvals.get(id); return v?structuredClone(v):undefined; }
  async getApprovalPlanForBoundary(boundaryId: string) { const v=[...this.approvals.values()].filter(x=>x.boundaryId===boundaryId).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0]; return v?structuredClone(v):undefined; }
  async saveApprovalObservation(v: BoundaryApprovalObservation) { this.approvalObservations.set(v.approvalObservationId, structuredClone(v)); }
  async getApprovalObservationForPlan(approvalPlanId: string) { const v=[...this.approvalObservations.values()].filter(x=>x.approvalPlanId===approvalPlanId).sort((a,b)=>b.observedAt.localeCompare(a.observedAt))[0]; return v?structuredClone(v):undefined; }
  async saveExecution(v: ControlledRebalancingExecution) { this.executions.set(v.executionId, structuredClone(v)); }
  async getExecution(id: string) { const v=this.executions.get(id); return v?structuredClone(v):undefined; }
  async getExecutionForBoundary(boundaryId: string) { const v=[...this.executions.values()].filter(x=>x.boundaryId===boundaryId).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0]; return v?structuredClone(v):undefined; }
}

export class PostgresControlledExecutionStore implements ControlledExecutionStore {
  constructor(private readonly database: SqlQueryExecutor) {}
  async saveApprovalPlan(v: BoundaryApprovalPlan) {
    await this.database.query(`insert into boundary_approval_plans (approval_plan_id,boundary_id,plan_id,state,payload,expires_at,created_at,updated_at) values ($1,$2,$3,$4,$5::jsonb,$6,$7,$8) on conflict (approval_plan_id) do update set state=excluded.state,payload=excluded.payload,expires_at=excluded.expires_at,updated_at=excluded.updated_at`,[v.approvalPlanId,v.boundaryId,v.planId,v.state,JSON.stringify(v),v.expiresAt,v.createdAt,v.updatedAt]);
  }
  async getApprovalPlan(id:string){const r=await this.database.query<{payload:BoundaryApprovalPlan}>("select payload from boundary_approval_plans where approval_plan_id=$1",[id]);return r.rows[0]?.payload;}
  async getApprovalPlanForBoundary(boundaryId:string){const r=await this.database.query<{payload:BoundaryApprovalPlan}>("select payload from boundary_approval_plans where boundary_id=$1 order by updated_at desc limit 1",[boundaryId]);return r.rows[0]?.payload;}
  async saveApprovalObservation(v:BoundaryApprovalObservation){await this.database.query(`insert into boundary_approval_observations (approval_observation_id,approval_plan_id,boundary_id,state,transaction_hash,payload,observed_at) values ($1,$2,$3,$4,$5,$6::jsonb,$7) on conflict (approval_observation_id) do update set state=excluded.state,transaction_hash=excluded.transaction_hash,payload=excluded.payload,observed_at=excluded.observed_at`,[v.approvalObservationId,v.approvalPlanId,v.boundaryId,v.state,v.transactionHash??null,JSON.stringify(v),v.observedAt]);}
  async getApprovalObservationForPlan(id:string){const r=await this.database.query<{payload:BoundaryApprovalObservation}>("select payload from boundary_approval_observations where approval_plan_id=$1 order by observed_at desc limit 1",[id]);return r.rows[0]?.payload;}
  async saveExecution(v:ControlledRebalancingExecution){await this.database.query(`insert into controlled_rebalancing_executions (execution_id,boundary_id,plan_id,job_intent_id,state,transaction_hash,payload,created_at,updated_at) values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9) on conflict (execution_id) do update set state=excluded.state,transaction_hash=excluded.transaction_hash,payload=excluded.payload,updated_at=excluded.updated_at`,[v.executionId,v.boundaryId,v.planId,v.jobIntentId,v.state,v.transactionHash??null,JSON.stringify(v),v.createdAt,v.updatedAt]);}
  async getExecution(id:string){const r=await this.database.query<{payload:ControlledRebalancingExecution}>("select payload from controlled_rebalancing_executions where execution_id=$1",[id]);return r.rows[0]?.payload;}
  async getExecutionForBoundary(boundaryId:string){const r=await this.database.query<{payload:ControlledRebalancingExecution}>("select payload from controlled_rebalancing_executions where boundary_id=$1 order by updated_at desc limit 1",[boundaryId]);return r.rows[0]?.payload;}
}

const APPROVE_ABI = [{ type:"function", name:"approve", stateMutability:"nonpayable", inputs:[{name:"spender",type:"address"},{name:"amount",type:"uint256"}], outputs:[{name:"",type:"bool"}] }] as const;
const TRANSFER_TOPIC = keccak256(toBytes("Transfer(address,address,uint256)"));
const DECREASE_LIQUIDITY_TOPIC = keccak256(toBytes("DecreaseLiquidity(uint256,uint128,uint256,uint256)"));
const COLLECT_TOPIC = keccak256(toBytes("Collect(uint256,address,uint256,uint256)"));
const ZERO_ADDRESS_TOPIC = `0x${"0".repeat(64)}`;

function hashCall(to:string,data:string,valueRaw:string):string { return keccak256(toBytes(`${to.toLowerCase()}|${data.toLowerCase()}|${valueRaw}`)); }
function approvalId(boundaryId:string,readinessId:string){return `approval:${encodeURIComponent(boundaryId)}:${encodeURIComponent(readinessId)}`;}
function executionId(boundaryId:string,planHash:string){return `execution:rebalancing:${encodeURIComponent(boundaryId)}:${planHash.slice(2,18)}`;}
function observationId(planId:string,callsId:string){return `approval-observation:${encodeURIComponent(planId)}:${callsId.replace(/^0x/,"").slice(0,16)}`;}
function minDate(...values:string[]):string { return new Date(Math.min(...values.map(v=>new Date(v).getTime()))).toISOString(); }
function validHex(value:string){return /^0x[0-9a-fA-F]+$/.test(value);}
function validHash(value:string|undefined){return !value || /^0x[0-9a-fA-F]{64}$/.test(value);}
function topicAddress(address:string){return `0x${address.toLowerCase().replace(/^0x/,"").padStart(64,"0")}`;}
function topicUint(value:string|number|bigint){return `0x${BigInt(value).toString(16).padStart(64,"0")}`;}

function assertProof(proof:{callsId:string;status:string;transactionHash?:string}){
  if(!validHex(proof.callsId)) throw new ControlledExecutionError("Altana callsId must be hexadecimal.","INVALID_INPUT");
  if(!validHash(proof.transactionHash)) throw new ControlledExecutionError("transactionHash must be a 32-byte EVM transaction hash.","INVALID_INPUT");
}

export interface ControlledExecutionEngine {
  prepareApprovalPlan(boundaryId:string,now?:Date):Promise<{plan:BoundaryApprovalPlan;readiness:BoundaryFinancialReadiness}>;
  reviewApprovalPlan(approvalPlanId:string,now?:Date):Promise<BoundaryApprovalPlan>;
  getApprovalPlan(approvalPlanId:string):Promise<BoundaryApprovalPlan>;
  getApprovalPlanForBoundary(boundaryId:string):Promise<BoundaryApprovalPlan|undefined>;
  observeApproval(approvalPlanId:string,proof:BoundaryApprovalExecutionProof,now?:Date):Promise<{observation:BoundaryApprovalObservation;readiness:BoundaryFinancialReadiness;plan:BoundaryApprovalPlan}>;
  getApprovalObservationForPlan(approvalPlanId:string):Promise<BoundaryApprovalObservation|undefined>;
  prepareExecution(boundaryId:string,now?:Date):Promise<{execution:ControlledRebalancingExecution;readiness:BoundaryFinancialReadiness;preflight:ExecutionBoundaryPreflight;session:BoundaryFinancialSessionObservation}>;
  getExecution(executionId:string):Promise<ControlledRebalancingExecution>;
  getExecutionForBoundary(boundaryId:string):Promise<ControlledRebalancingExecution|undefined>;
  observeExecution(executionId:string,proof:ControlledExecutionProof,now?:Date):Promise<ControlledRebalancingExecution>;
  reconcileExecution(executionId:string,now?:Date):Promise<ControlledRebalancingExecution>;
}

export function createControlledExecutionEngine(options:{store?:ControlledExecutionStore;boundaries:BoundaryReader;plans:PlanReader;authority:AuthorityReader;chain:ChainReader;pancakeSwap:PositionReader}):ControlledExecutionEngine {
  const store=options.store??new MemoryControlledExecutionStore();
  const {boundaries,plans,authority,chain,pancakeSwap}=options;

  async function context(boundaryId:string,now:Date){
    const boundary=await boundaries.get(boundaryId);
    if(boundary.network!=="testnet"||boundary.state!=="SEALED"||!boundary.signerProvisioned||!boundary.financialSessionId) throw new ControlledExecutionError("Controlled execution requires a live SEALED BSC Testnet boundary with a provisioned boundary financial session.","INVALID_STATE");
    if(new Date(boundary.expiresAt).getTime()<=now.getTime()) throw new ControlledExecutionError("The execution boundary expired. Rebuild the reviewed plan.","STALE_CONTEXT");
    const plan=await plans.get(boundary.planId);
    const request=await authority.getRequest(boundary.permissionRequestId);
    const existing=await authority.getBoundaryFinancialSessionForBoundary(boundary.boundaryId);
    if(!existing||existing.financialSessionId!==boundary.financialSessionId) throw new ControlledExecutionError("The boundary financial session is missing or no longer linked.","SESSION_INVALID");
    const session=await authority.reverifyBoundaryFinancialSession(existing.financialSessionId,{},now);
    if(session.state!=="ACTIVE"||!session.onchainValid||!session.exactBoundaryScope||!session.signerProvisioned) throw new ControlledExecutionError("The boundary financial session is no longer active, exact-scope and valid in Altana Keystore.","SESSION_INVALID");
    const readiness=await authority.assessBoundaryFinancialReadiness(boundary,plan,session.financialSessionId,now);
    return {boundary,plan,request,session,readiness};
  }

  async function postExecution(execution:ControlledRebalancingExecution,receipt:BscTransactionReceiptSummary,now:Date){
    const plan=await plans.get(execution.planId);
    let oldLiquidity:string|undefined;
    let mintedTokenId:string|undefined;
    let mintedVerified=false;
    const details:string[]=[];
    const positionManager=plan.positionSnapshot.positionManager.toLowerCase();
    const oldTokenTopic=topicUint(plan.positionSnapshot.tokenId).toLowerCase();
    const managerLogs=(receipt.logs??[]).filter(log=>log.address.toLowerCase()===positionManager);
    const decreaseSeen=managerLogs.some(log=>log.topics[0]?.toLowerCase()===DECREASE_LIQUIDITY_TOPIC.toLowerCase()&&log.topics[1]?.toLowerCase()===oldTokenTopic);
    const collectSeen=managerLogs.some(log=>log.topics[0]?.toLowerCase()===COLLECT_TOPIC.toLowerCase()&&log.topics[1]?.toLowerCase()===oldTokenTopic);
    details.push(decreaseSeen?"The confirmed transaction emitted DecreaseLiquidity for the exact reviewed old LP NFT.":"The confirmed transaction did not expose DecreaseLiquidity evidence for the exact reviewed old LP NFT.");
    details.push(collectSeen?"The confirmed transaction emitted Collect for the exact reviewed old LP NFT.":"The confirmed transaction did not expose Collect evidence for the exact reviewed old LP NFT.");
    try{
      const old=await pancakeSwap.getV3Position(plan.positionSnapshot.tokenId,receipt.blockNumber);
      oldLiquidity=old.liquidityRaw;
      details.push(old.liquidityRaw==="0"?"The original LP NFT has zero remaining liquidity at the confirmed receipt block.":`The original LP NFT still reports ${old.liquidityRaw} liquidity at the confirmed receipt block.`);
    }catch(cause){details.push(`Spotriq could not re-read the original LP NFT after execution: ${cause instanceof Error?cause.message:String(cause)}`);}
    const walletTopic=topicAddress(execution.walletAddress);
    const transfer=managerLogs.find(log=>log.topics[0]?.toLowerCase()===TRANSFER_TOPIC.toLowerCase()&&log.topics[1]?.toLowerCase()===ZERO_ADDRESS_TOPIC&&log.topics[2]?.toLowerCase()===walletTopic&&Boolean(log.topics[3]));
    if(transfer?.topics[3]){
      try{
        mintedTokenId=BigInt(transfer.topics[3]).toString();
        const minted=await pancakeSwap.getV3Position(mintedTokenId,receipt.blockNumber);
        mintedVerified=minted.owner.toLowerCase()===execution.walletAddress.toLowerCase()&&minted.pool.token0.address.toLowerCase()===plan.positionSnapshot.token0.address.toLowerCase()&&minted.pool.token1.address.toLowerCase()===plan.positionSnapshot.token1.address.toLowerCase()&&minted.pool.feePips===plan.positionSnapshot.feePips&&minted.tickLower===plan.targetRange.tickLower&&minted.tickUpper===plan.targetRange.tickUpper&&BigInt(minted.liquidityRaw)>0n;
        details.push(mintedVerified?`Minted replacement LP NFT ${mintedTokenId} matches the reviewed token pair, fee tier, target ticks and wallet owner.`:`Minted NFT ${mintedTokenId} was observed but its reviewed position context did not fully reconcile.`);
      }catch(cause){details.push(`A Position Manager mint Transfer log was observed, but Spotriq could not verify the replacement NFT: ${cause instanceof Error?cause.message:String(cause)}`);}
    }else details.push("No replacement Position Manager NFT mint Transfer log could be identified in the receipt.");
    const effectsReconciled=decreaseSeen&&collectSeen&&oldLiquidity==="0"&&mintedVerified;
    if(!effectsReconciled){
      return {...execution,state:"BLOCKED" as const,receipt,transactionHash:receipt.transactionHash,mintedPositionTokenId:mintedTokenId,oldPositionLiquidityRawAfter:oldLiquidity,mintedPositionVerified:mintedVerified,postStateDetail:details.join(" "),executionEligible:false,updatedAt:now.toISOString(),limitations:[...execution.limitations,"BSC receipt success alone is insufficient for Spotriq completion. The same receipt must expose the reviewed old-NFT decrease/collect effects and a replacement mint that reconciles to the reviewed range before the boundary can be consumed."]};
    }
    const consumed=await boundaries.consume(execution.boundaryId,now);
    if(consumed.state!=="CONSUMED") throw new ControlledExecutionError("The execution boundary could not be consumed after confirmed execution.","INVALID_STATE");
    return {...execution,state:"CONFIRMED" as const,receipt,transactionHash:receipt.transactionHash,mintedPositionTokenId:mintedTokenId,oldPositionLiquidityRawAfter:oldLiquidity,mintedPositionVerified:mintedVerified,postStateDetail:details.join(" "),executionEligible:false,updatedAt:now.toISOString(),limitations:[...execution.limitations,"The sealed boundary is CONSUMED only after one independently receipt-confirmed dispatch whose old-NFT decrease/collect and replacement-mint effects reconcile to the reviewed plan.","Receipt/post-state reconciliation proves the reviewed Rebalancing effects occurred in the same BSC Testnet transaction; detailed realised value/performance accounting remains Activity & Outcomes work."]};
  }

  return {
    async prepareApprovalPlan(boundaryId,now=new Date()){
      const {boundary,plan,session,readiness}=await context(boundaryId,now);
      if(readiness.state==="INSUFFICIENT_BALANCE") throw new ControlledExecutionError("Projected post-collect balances are insufficient for the reviewed replacement mint.","INSUFFICIENT_BALANCE");
      if(readiness.state==="SESSION_INVALID"||readiness.state==="STALE") throw new ControlledExecutionError("Financial readiness is stale or the boundary session is invalid.","SESSION_INVALID");
      const calls:BoundaryApprovalPlan["calls"]=[];
      let index=0;
      for(const asset of readiness.assets){
        if(asset.allowanceState!=="APPROVAL_REQUIRED") continue;
        const current=BigInt(asset.allowanceToPositionManagerRaw),required=BigInt(asset.requiredForMintRaw);
        if(current>0n){
          const data=encodeFunctionData({abi:APPROVE_ABI,functionName:"approve",args:[readiness.positionManager as `0x${string}`,0n]});
          calls.push({index:index++,token:asset.token,symbol:asset.symbol,spender:readiness.positionManager,phase:"RESET",currentAllowanceRaw:current.toString(),requiredAllowanceRaw:required.toString(),approvalAmountRaw:"0",call:{to:asset.token,data,valueRaw:"0"},callHash:hashCall(asset.token,data,"0")});
        }
        const data=encodeFunctionData({abi:APPROVE_ABI,functionName:"approve",args:[readiness.positionManager as `0x${string}`,required]});
        calls.push({index:index++,token:asset.token,symbol:asset.symbol,spender:readiness.positionManager,phase:"SET_EXACT",currentAllowanceRaw:current.toString(),requiredAllowanceRaw:required.toString(),approvalAmountRaw:required.toString(),call:{to:asset.token,data,valueRaw:"0"},callHash:hashCall(asset.token,data,"0")});
      }
      const created=now.toISOString(),expiresAt=minDate(boundary.expiresAt,plan.expiresAt,session.expiresAt,new Date(now.getTime()+10*60_000).toISOString());
      const value:BoundaryApprovalPlan={approvalPlanId:approvalId(boundary.boundaryId,readiness.readinessId),boundaryId:boundary.boundaryId,planId:plan.planId,financialSessionId:session.financialSessionId,readinessId:readiness.readinessId,walletAddress:boundary.walletAddress,network:"testnet",chainId:97,positionManager:readiness.positionManager,state:calls.length?"REVIEW_REQUIRED":"NOT_REQUIRED",calls,createdAt:created,updatedAt:created,expiresAt,executionEligible:false,methodVersion:BOUNDED_APPROVAL_METHOD,limitations:["Approval calls are performed only through the wallet-admin/passkey path, never by the external AgentService or boundary financial session.","Spotriq sets only the exact allowance required by the reviewed replacement mint. It never requests unlimited uint256 allowance.","When an existing non-zero allowance is insufficient, Spotriq resets it to zero before setting the exact reviewed amount for compatibility with zero-first ERC-20 tokens."]};
      await store.saveApprovalPlan(value); return {plan:value,readiness};
    },
    async reviewApprovalPlan(id,now=new Date()){
      const value=await store.getApprovalPlan(id);if(!value)throw new ControlledExecutionError(`Approval plan ${id} was not found.`,"APPROVAL_PLAN_NOT_FOUND");
      if(value.state==="NOT_REQUIRED"||value.state==="CONFIRMED") return value;
      if(value.state!=="REVIEW_REQUIRED") throw new ControlledExecutionError("Only a REVIEW_REQUIRED approval plan can be explicitly reviewed.","INVALID_STATE");
      if(new Date(value.expiresAt).getTime()<=now.getTime()) {const stale={...value,state:"STALE" as const,updatedAt:now.toISOString()};await store.saveApprovalPlan(stale);throw new ControlledExecutionError("The approval plan expired. Refresh financial readiness and prepare a fresh exact approval plan.","STALE_CONTEXT");}
      const next={...value,state:"REVIEWED" as const,reviewedAt:now.toISOString(),updatedAt:now.toISOString()};await store.saveApprovalPlan(next);return next;
    },
    async getApprovalPlan(id){const v=await store.getApprovalPlan(id);if(!v)throw new ControlledExecutionError(`Approval plan ${id} was not found.`,"APPROVAL_PLAN_NOT_FOUND");return v;},
    async getApprovalPlanForBoundary(id){return store.getApprovalPlanForBoundary(id);},
    async observeApproval(id,proof,now=new Date()){
      assertProof(proof);const approval=await store.getApprovalPlan(id);if(!approval)throw new ControlledExecutionError(`Approval plan ${id} was not found.`,"APPROVAL_PLAN_NOT_FOUND");
      if(approval.state!=="REVIEWED"&&approval.state!=="CONFIRMED")throw new ControlledExecutionError("Approval execution can only be recorded for an explicitly REVIEWED exact-allowance plan.","INVALID_STATE");
      const boundary=await boundaries.get(approval.boundaryId);const plan=await plans.get(approval.planId);const session=await authority.getBoundaryFinancialSessionForBoundary(boundary.boundaryId);if(!session)throw new ControlledExecutionError("Boundary financial session is missing.","SESSION_INVALID");
      let receipt:BscTransactionReceiptSummary|undefined;let state:BoundaryApprovalObservation["state"]=proof.status==="FAILED"?"FAILED":"PENDING";
      if(proof.transactionHash){const observed=await chain.getTransactionReceipt(proof.transactionHash);if(observed)receipt=observed; if(receipt?.status==="REVERTED")state="FAILED";}
      const readiness=await authority.assessBoundaryFinancialReadiness(boundary,plan,session.financialSessionId,now);
      const allowancesSatisfied=readiness.assets.every(a=>a.allowanceState==="SUFFICIENT");
      if(proof.status==="CONFIRMED"&&allowancesSatisfied&&(!proof.transactionHash||receipt?.status==="SUCCESS")) state="CONFIRMED";
      else if(proof.status==="CONFIRMED"&&proof.transactionHash&&!receipt) state="UNVERIFIED";
      const observation:BoundaryApprovalObservation={approvalObservationId:observationId(approval.approvalPlanId,proof.callsId),approvalPlanId:approval.approvalPlanId,boundaryId:approval.boundaryId,walletAddress:approval.walletAddress,provider:"ALTANA",providerStatus:proof.status,callsId:proof.callsId,transactionHash:proof.transactionHash,receipt,state,refreshedReadinessId:readiness.readinessId,allowancesSatisfied,observedAt:now.toISOString(),methodVersion:BOUNDED_APPROVAL_METHOD,limitations:["A provider CONFIRMED result is not enough by itself: Spotriq independently re-reads the ERC-20 allowances after the wallet-admin action.","If Altana does not surface a transaction hash, the refreshed onchain allowance state remains the authoritative readiness evidence."]};
      const nextPlan={...approval,state:state==="CONFIRMED"?"CONFIRMED" as const:state==="FAILED"?"FAILED" as const:approval.state,updatedAt:now.toISOString()};await store.saveApprovalPlan(nextPlan);await store.saveApprovalObservation(observation);return{observation,readiness,plan:nextPlan};
    },
    async getApprovalObservationForPlan(id){return store.getApprovalObservationForPlan(id);},
    async prepareExecution(boundaryId,now=new Date()){
      const existing=await store.getExecutionForBoundary(boundaryId);
      if(existing?.state==="CONFIRMED") throw new ControlledExecutionError("This sealed boundary has already completed its one controlled execution. Retrieve the confirmed execution instead of preparing a replay.","INVALID_STATE");
      const {boundary,plan,request,session,readiness}=await context(boundaryId,now);
      if(readiness.state==="APPROVAL_REQUIRED")throw new ControlledExecutionError("Exact ERC-20 approval is required before controlled execution can be prepared.","APPROVAL_REQUIRED");
      if(readiness.state==="INSUFFICIENT_BALANCE")throw new ControlledExecutionError("Projected post-collect balance is insufficient for the reviewed mint.","INSUFFICIENT_BALANCE");
      if(readiness.state!=="READY_FOR_CONTROLLED_EXECUTION_MILESTONE")throw new ControlledExecutionError(`Financial readiness is ${readiness.state}; controlled execution cannot be prepared.`,"INVALID_STATE");
      const preflight=await boundaries.preflight(boundary.boundaryId,request,session,now);if(preflight.state!=="PASS_EXECUTION_DISABLED")throw new ControlledExecutionError(`Fresh execution-boundary preflight is ${preflight.state}.`,"STALE_CONTEXT",false,preflight);
      for(const step of plan.steps){const decision=await boundaries.authorizeCall(boundary.boundaryId,step.index,step.call,now);if(decision.state!=="APPROVED_FOR_BOUNDARY"||!decision.exactPlanCall||!decision.correctOrder)throw new ControlledExecutionError(`Execution step ${step.index} failed exact sealed-boundary authorization.`,"INVALID_STATE",false,decision);}
      const created=now.toISOString(),expiresAt=minDate(boundary.expiresAt,plan.expiresAt,session.expiresAt,new Date(now.getTime()+5*60_000).toISOString());
      const value:ControlledRebalancingExecution={executionId:executionId(boundary.boundaryId,plan.planHash),boundaryId:boundary.boundaryId,planId:plan.planId,planHash:plan.planHash,jobIntentId:plan.jobIntentId,permissionRequestId:request.permissionRequestId,financialSessionId:session.financialSessionId,serviceId:plan.serviceId,walletAddress:boundary.walletAddress,network:"testnet",chainId:97,state:"READY_TO_DISPATCH",calls:plan.steps.map(s=>({index:s.index,kind:s.kind,to:s.call.to,data:s.call.data,valueRaw:s.call.valueRaw,callHash:s.callHash})),preflightId:preflight.preflightId,readinessId:readiness.readinessId,sessionVerifiedAt:session.verifiedAt,createdAt:created,updatedAt:created,expiresAt,executionEligible:true,methodVersion:CONTROLLED_EXECUTION_METHOD,limitations:["This dispatch is valid only for the exact sealed call hashes in the exact reviewed order and only until the short dispatch expiry.","The external AgentService never receives the boundary financial signer. It can propose work but cannot submit wallet-moving calls.","The browser must still possess the exact ephemeral Altana Session object created for this boundary. If that signer was lost on reload, Spotriq requires a fresh bounded financial session rather than reconstructing private key material."]};await store.saveExecution(value);return{execution:value,readiness,preflight,session};
    },
    async getExecution(id){const v=await store.getExecution(id);if(!v)throw new ControlledExecutionError(`Controlled execution ${id} was not found.`,"EXECUTION_NOT_FOUND");return v;},
    async getExecutionForBoundary(id){return store.getExecutionForBoundary(id);},
    async observeExecution(id,proof,now=new Date()){
      assertProof(proof);const existing=await store.getExecution(id);if(!existing)throw new ControlledExecutionError(`Controlled execution ${id} was not found.`,"EXECUTION_NOT_FOUND");
      if(existing.state==="CONFIRMED")return existing;if(existing.state!=="READY_TO_DISPATCH"&&existing.state!=="SUBMITTED")throw new ControlledExecutionError(`Controlled execution cannot accept provider evidence from ${existing.state}.`,"INVALID_STATE");
      if(new Date(existing.expiresAt).getTime()<=now.getTime()&&proof.status!=="CONFIRMED"){const stale={...existing,state:"STALE" as const,providerCallsId:proof.callsId,providerStatus:proof.status,transactionHash:proof.transactionHash,executionEligible:false,updatedAt:now.toISOString()};await store.saveExecution(stale);return stale;}
      if(proof.status==="FAILED"){const failed={...existing,state:"FAILED" as const,providerCallsId:proof.callsId,providerStatus:proof.status,transactionHash:proof.transactionHash,executionEligible:false,updatedAt:now.toISOString()};await store.saveExecution(failed);return failed;}
      let next: ControlledRebalancingExecution={...existing,state:"SUBMITTED",providerCallsId:proof.callsId,providerStatus:proof.status,transactionHash:proof.transactionHash,executionEligible:false,updatedAt:now.toISOString()};
      if(proof.status==="CONFIRMED"&&proof.transactionHash){const receipt=await chain.getTransactionReceipt(proof.transactionHash);if(receipt?.status==="REVERTED")next={...next,state:"FAILED" as const,receipt,postStateDetail:"BSC Testnet receipt reverted the controlled execution batch."};else if(receipt?.status==="SUCCESS")next=await postExecution(next,receipt,now);}
      await store.saveExecution(next);return next;
    },
    async reconcileExecution(id,now=new Date()){
      const existing=await store.getExecution(id);if(!existing)throw new ControlledExecutionError(`Controlled execution ${id} was not found.`,"EXECUTION_NOT_FOUND");if(existing.state==="CONFIRMED"||existing.state==="FAILED")return existing;if(!existing.transactionHash)return existing;
      const receipt=await chain.getTransactionReceipt(existing.transactionHash);if(!receipt)return existing;let next:ControlledRebalancingExecution;if(receipt.status==="REVERTED")next={...existing,state:"FAILED",receipt,executionEligible:false,updatedAt:now.toISOString(),postStateDetail:"BSC Testnet receipt reverted the controlled execution batch."};else next=await postExecution(existing,receipt,now);await store.saveExecution(next);return next;
    },
  };
}
