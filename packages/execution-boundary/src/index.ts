import { keccak256, toBytes } from "viem";
import type {
  BoundedPermissionRequest,
  BoundaryFinancialSessionObservation,
  ExecutionBoundaryDecision,
  ExecutionBoundaryPreflight,
  FinancialExecutionBoundary,
  RebalancingExecutionPlan,
} from "@spotriq/domain";
import type { PancakeSwapReader } from "@spotriq/protocol-pancakeswap";

export const FINANCIAL_EXECUTION_BOUNDARY_METHOD = "marketplace.financial-execution-boundary@1.1.0";

export class ExecutionBoundaryError extends Error {
  constructor(message: string, public readonly code: "INVALID_INPUT" | "INVALID_STATE" | "BOUNDARY_NOT_FOUND" | "STALE_CONTEXT", public readonly retryable = false, public readonly details?: unknown) {
    super(message); this.name = "ExecutionBoundaryError";
  }
}

export interface SqlQueryResult<Row = Record<string, unknown>> { rows: Row[]; rowCount?: number | null; }
export interface SqlQueryExecutor { query<Row = Record<string, unknown>>(text: string, values?: unknown[]): Promise<SqlQueryResult<Row>>; }
export interface ExecutionPlanReader { get(planId: string): Promise<RebalancingExecutionPlan>; }

export interface ExecutionBoundaryStore {
  save(boundary: FinancialExecutionBoundary): Promise<void>;
  get(boundaryId: string): Promise<FinancialExecutionBoundary | undefined>;
  getForPlan(planId: string): Promise<FinancialExecutionBoundary | undefined>;
}
export class MemoryExecutionBoundaryStore implements ExecutionBoundaryStore {
  private readonly rows = new Map<string, FinancialExecutionBoundary>();
  async save(v: FinancialExecutionBoundary): Promise<void> { this.rows.set(v.boundaryId, structuredClone(v)); }
  async get(id: string): Promise<FinancialExecutionBoundary | undefined> { const v=this.rows.get(id); return v?structuredClone(v):undefined; }
  async getForPlan(planId: string): Promise<FinancialExecutionBoundary | undefined> { const v=[...this.rows.values()].filter(x=>x.planId===planId).sort((a,b)=>b.sealedAt.localeCompare(a.sealedAt))[0]; return v?structuredClone(v):undefined; }
}
export class PostgresExecutionBoundaryStore implements ExecutionBoundaryStore {
  constructor(private readonly database: SqlQueryExecutor) {}
  async save(boundary: FinancialExecutionBoundary): Promise<void> {
    await this.database.query(`insert into financial_execution_boundaries (boundary_id, plan_id, job_intent_id, permission_request_id, service_id, state, plan_hash, payload, expires_at, sealed_at, updated_at)
      values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$10)
      on conflict (boundary_id) do update set state=excluded.state, plan_hash=excluded.plan_hash, payload=excluded.payload, expires_at=excluded.expires_at, updated_at=excluded.updated_at`,
      [boundary.boundaryId,boundary.planId,boundary.jobIntentId,boundary.permissionRequestId,boundary.serviceId,boundary.state,boundary.planHash,JSON.stringify(boundary),boundary.expiresAt,boundary.sealedAt]);
  }
  async get(id: string): Promise<FinancialExecutionBoundary|undefined> { const r=await this.database.query<{payload:FinancialExecutionBoundary}>("select payload from financial_execution_boundaries where boundary_id=$1",[id]); return r.rows[0]?.payload; }
  async getForPlan(planId: string): Promise<FinancialExecutionBoundary|undefined> { const r=await this.database.query<{payload:FinancialExecutionBoundary}>("select payload from financial_execution_boundaries where plan_id=$1 order by sealed_at desc limit 1",[planId]); return r.rows[0]?.payload; }
}

export interface ExecutionBoundaryEngine {
  seal(plan: RebalancingExecutionPlan, request: BoundedPermissionRequest, now?: Date): Promise<FinancialExecutionBoundary>;
  get(boundaryId: string): Promise<FinancialExecutionBoundary>;
  getForPlan(planId: string): Promise<FinancialExecutionBoundary|undefined>;
  authorizeCall(boundaryId: string, stepIndex: number, call: {to:string;data:string;valueRaw?:string}, now?: Date): Promise<ExecutionBoundaryDecision>;
  linkFinancialSession(boundaryId: string, session: BoundaryFinancialSessionObservation, now?: Date): Promise<FinancialExecutionBoundary>;
  consume(boundaryId: string, now?: Date): Promise<FinancialExecutionBoundary>;
  preflight(boundaryId: string, request: BoundedPermissionRequest, session?: BoundaryFinancialSessionObservation, now?: Date): Promise<ExecutionBoundaryPreflight>;
}

function hashCall(to:string,data:string,valueRaw:string):string { return keccak256(toBytes(`${to.toLowerCase()}|${data.toLowerCase()}|${valueRaw}`)); }
function boundaryId(planId:string):string { return `boundary:rebalancing:${encodeURIComponent(planId)}`; }
function check(code:string,label:string,state:"PASS"|"FAIL"|"REQUIRED",detail:string){return{code,label,state,detail};}

export function createExecutionBoundaryEngine(options:{store?:ExecutionBoundaryStore; plans:ExecutionPlanReader; pancakeSwap:PancakeSwapReader}):ExecutionBoundaryEngine {
  const store=options.store??new MemoryExecutionBoundaryStore();
  const plans=options.plans;
  const pancake=options.pancakeSwap;
  return {
    async seal(plan,request,now=new Date()) {
      if (plan.state!=="REVIEWED" || plan.guardState!=="PASS") throw new ExecutionBoundaryError("Only a user-reviewed execution plan whose every step passed the argument guard can be sealed.","INVALID_STATE");
      if (plan.permissionRequestId!==request.permissionRequestId || plan.jobIntentId!==request.jobIntentId || plan.serviceId!==request.serviceId) throw new ExecutionBoundaryError("Execution plan and PermissionRequest do not belong to the same job/service.","INVALID_INPUT");
      if (new Date(plan.expiresAt).getTime()<=now.getTime()) throw new ExecutionBoundaryError("Execution plan is stale and cannot be sealed.","STALE_CONTEXT");
      const trusted=request.safetyPrerequisites.find(x=>x.code==="TRUSTED_AGENT_SESSION_KEY");
      if (trusted?.state!=="SATISFIED" || request.trustedAgentBinding?.state!=="VERIFIED") throw new ExecutionBoundaryError("The selected AgentService must first prove its trusted proposal/session public key.","INVALID_STATE");
      const boundary:FinancialExecutionBoundary={
        boundaryId:boundaryId(plan.planId),planId:plan.planId,jobIntentId:plan.jobIntentId,permissionRequestId:request.permissionRequestId,serviceId:plan.serviceId,walletAddress:plan.walletAddress,network:plan.network,state:"SEALED",planHash:plan.planHash,approvedCallHashes:plan.steps.map(s=>s.callHash),approvedStepCount:plan.steps.length,dispatchPolicy:"EXACT_PLAN_CALL_HASH_AND_ORDER",externalAgentRole:"AUTHENTICATED_PROPOSER_ONLY",financialSignerCustody:"BOUNDARY_CONTROLLED_NOT_PROVISIONED",signerProvisioned:false,nonBypassable:true,executionEligible:false,sealedAt:now.toISOString(),expiresAt:plan.expiresAt,methodVersion:FINANCIAL_EXECUTION_BOUNDARY_METHOD,
        limitations:["The external AgentService can authenticate proposals but cannot access the future financial signing key.","Only the exact reviewed plan call hashes, in order, can reach the boundary dispatch interface.","v0.17 deliberately does not provision a financial signer or submit transactions; v0.18 must bind an Altana BSC Testnet financial session to this boundary, not to the external service key directly."],
      };
      await store.save(boundary); return boundary;
    },
    async get(id){const b=await store.get(id);if(!b)throw new ExecutionBoundaryError(`Execution boundary ${id} was not found.`,"BOUNDARY_NOT_FOUND");return b;},
    async getForPlan(id){return store.getForPlan(id);},
    async authorizeCall(id,stepIndex,call,now=new Date()){
      const b=await store.get(id);if(!b)throw new ExecutionBoundaryError(`Execution boundary ${id} was not found.`,"BOUNDARY_NOT_FOUND");
      const p=await plans.get(b.planId);
      const expected=p.steps[stepIndex];
      const actualHash=hashCall(call.to,call.data,call.valueRaw??"0");
      const exact=Boolean(expected)&&expected.callHash===actualHash;
      const correctOrder=stepIndex>=0&&stepIndex<b.approvedStepCount;
      const live=b.state==="SEALED"&&new Date(b.expiresAt).getTime()>now.getTime();
      const approved=live&&exact&&correctOrder;
      return {boundaryId:b.boundaryId,planId:b.planId,stepIndex,callHash:actualHash,state:approved?"APPROVED_FOR_BOUNDARY":"BLOCKED",exactPlanCall:exact,correctOrder,signerProvisioned:b.signerProvisioned,financialSessionId:b.financialSessionId,executionEligible:false,checkedAt:now.toISOString(),detail:approved?(b.signerProvisioned?"Call exactly matches the sealed plan. A boundary-controlled financial session is provisioned, but v0.18 still exposes no transaction submission endpoint.":"Call exactly matches the sealed plan at this step. No financial signer is provisioned."):"Call does not exactly match the live sealed execution plan or the boundary is stale."};
    },
    async linkFinancialSession(id,session,now=new Date()){
      const b=await store.get(id);if(!b)throw new ExecutionBoundaryError(`Execution boundary ${id} was not found.`,"BOUNDARY_NOT_FOUND");
      if(session.boundaryId!==b.boundaryId||session.planId!==b.planId||session.permissionRequestId!==b.permissionRequestId||session.state!=="ACTIVE"||!session.onchainValid||!session.exactBoundaryScope||!session.distinctFromAgentProposalKey) throw new ExecutionBoundaryError("Only an ACTIVE exact-scope boundary financial session can be linked to this execution boundary.","INVALID_INPUT");
      const next:FinancialExecutionBoundary={...b,financialSignerCustody:"BOUNDARY_CONTROLLED_ALTANA_TESTNET_SESSION",financialSessionId:session.financialSessionId,signerProvisioned:true,executionEligible:false,methodVersion:FINANCIAL_EXECUTION_BOUNDARY_METHOD,limitations:[...b.limitations.filter(x=>!x.includes("does not provision a financial signer")&&!x.includes("v0.18 must bind")),"v0.18 linked a boundary-controlled Altana BSC Testnet financial session whose exact scope and Keystore validity were independently verified. No transaction submission endpoint exists yet."]}; await store.save(next); return next;
    },
    async consume(id,now=new Date()){
      const b=await store.get(id);if(!b)throw new ExecutionBoundaryError(`Execution boundary ${id} was not found.`,"BOUNDARY_NOT_FOUND");
      if(b.state==="CONSUMED") return b;
      if(b.state!=="SEALED") throw new ExecutionBoundaryError(`Only a SEALED execution boundary can be consumed, not ${b.state}.`,"INVALID_STATE");
      const next:FinancialExecutionBoundary={...b,state:"CONSUMED",executionEligible:false,limitations:[...b.limitations,`The sealed boundary was consumed after one confirmed controlled execution at ${now.toISOString()}; the reviewed plan cannot be replayed through Spotriq.`]};
      await store.save(next);return next;
    },
    async preflight(id,request,session,now=new Date()){
      const b=await store.get(id);if(!b)throw new ExecutionBoundaryError(`Execution boundary ${id} was not found.`,"BOUNDARY_NOT_FOUND");
      const p=await plans.get(b.planId); const checks=[] as ExecutionBoundaryPreflight["checks"];
      const live=new Date(b.expiresAt).getTime()>now.getTime()&&new Date(request.expiresAt).getTime()>now.getTime();
      checks.push(live?check("EXPIRY","Plan/permission expiry","PASS","Boundary, execution plan, and PermissionRequest remain inside their reviewed time window."):check("EXPIRY","Plan/permission expiry","FAIL","Boundary, plan, or PermissionRequest has expired."));
      let pos;
      try{pos=await pancake.getV3Position(p.positionSnapshot.tokenId);}catch(cause){checks.push(check("POSITION_READ","Fresh LP state","FAIL",`Could not refresh V3 position: ${cause instanceof Error?cause.message:String(cause)}`));}
      let observedBlock:string|undefined;
      if(pos){
        observedBlock=pos.blockNumber;
        checks.push(pos.owner.toLowerCase()===p.walletAddress.toLowerCase()?check("OWNER","LP ownership","PASS","The reviewed wallet still owns the exact LP NFT."):check("OWNER","LP ownership","FAIL","LP ownership changed since plan review."));
        checks.push(pos.positionManager.toLowerCase()===p.positionSnapshot.positionManager.toLowerCase()&&pos.pool.token0.address.toLowerCase()===p.positionSnapshot.token0.address.toLowerCase()&&pos.pool.token1.address.toLowerCase()===p.positionSnapshot.token1.address.toLowerCase()&&pos.pool.feePips===p.positionSnapshot.feePips?check("POSITION_IDENTITY","LP contract/pool identity","PASS","Position Manager, token pair and fee tier still match the reviewed plan."):check("POSITION_IDENTITY","LP contract/pool identity","FAIL","Position contract/pool identity changed."));
        checks.push(pos.tickLower===p.positionSnapshot.tickLower&&pos.tickUpper===p.positionSnapshot.tickUpper&&pos.liquidityRaw===p.positionSnapshot.liquidityRaw?check("POSITION_STATE","LP liquidity/range","PASS","Current liquidity and existing range still match the reviewed plan snapshot."):check("POSITION_STATE","LP liquidity/range","FAIL","Current liquidity or existing range changed; plan must be rebuilt."));
        checks.push(pos.pool.currentTick>=p.targetRange.tickLower&&pos.pool.currentTick<p.targetRange.tickUpper?check("TARGET_RANGE","Replacement range relevance","PASS","The current pool tick remains inside the user-reviewed replacement range."):check("TARGET_RANGE","Replacement range relevance","FAIL","Current price moved outside the reviewed replacement range; plan must be rebuilt."));
        try{
          const fresh=await pancake.quoteV3DecreaseLiquidity({tokenId:pos.tokenId,owner:p.walletAddress,liquidityRaw:pos.liquidityRaw,blockNumber:pos.blockNumber,deadlineUnix:Math.min(request.expiryUnix,Math.floor(new Date(p.expiresAt).getTime()/1000))});
          const decrease=p.steps.find(s=>s.kind==="DECREASE_LIQUIDITY");
          const min0=BigInt(String(decrease?.decodedSummary.amount0MinRaw??"0")),min1=BigInt(String(decrease?.decodedSummary.amount1MinRaw??"0"));
          checks.push(BigInt(fresh.expectedAmount0Raw)>=min0&&BigInt(fresh.expectedAmount1Raw)>=min1?check("FRESH_QUOTE","Fresh expected outputs","PASS","A fresh owner-context eth_call simulation still clears the reviewed minimum output floors."):check("FRESH_QUOTE","Fresh expected outputs","FAIL","Fresh simulated outputs fell below the reviewed minimums; plan must be rebuilt."));
        }catch(cause){checks.push(check("FRESH_QUOTE","Fresh expected outputs","FAIL",`Fresh decrease-liquidity simulation failed: ${cause instanceof Error?cause.message:String(cause)}`));}
      }
      const activeSession=Boolean(session&&session.financialSessionId===b.financialSessionId&&session.state==="ACTIVE"&&session.onchainValid&&session.exactBoundaryScope&&session.expiryUnix>Math.floor(now.getTime()/1000));
      checks.push(activeSession?check("FINANCIAL_GRANT","Boundary financial signer","PASS","The linked Altana BSC Testnet boundary session is exact-scope, currently valid in Keystore, and distinct from the external AgentService proposal key."):check("FINANCIAL_GRANT","Boundary financial signer","REQUIRED","No currently valid exact-scope boundary-controlled Altana financial session is linked. The external AgentService key is intentionally never used as the financial signer."));
      const failed=checks.some(c=>c.state==="FAIL");
      return {preflightId:`preflight:${b.boundaryId}:${now.getTime()}`,boundaryId:b.boundaryId,planId:b.planId,state:failed?"BLOCKED":!live?"STALE":activeSession?"PASS_EXECUTION_DISABLED":"PASS_AUTHORITY_REQUIRED",checks,observedBlockNumber:observedBlock,checkedAt:now.toISOString(),financialGrantRequired:!activeSession,financialSessionId:activeSession?session!.financialSessionId:undefined,signerProvisioned:activeSession,executionEligible:false,limitations:["Preflight performs no transaction and cannot move assets.",activeSession?"PASS_EXECUTION_DISABLED means the sealed plan and boundary-controlled financial authority are currently valid, but v0.18 intentionally exposes no transaction-submission endpoint.":"PASS_AUTHORITY_REQUIRED means the sealed plan remains structurally enforceable and fresh, but a valid boundary financial session is still required."]};
    },
  };
}
