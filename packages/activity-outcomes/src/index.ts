import type {
  BoundaryApprovalObservation,
  BoundaryFinancialSessionObservation,
  ControlledRebalancingExecution,
  EvidenceRecord,
  ExecutionActivityEvent,
  ExecutionActivityOutcomeBundle,
  ExecutionOutcomeMetric,
  FinancialExecutionBoundary,
  PancakeSwapClPositionSnapshot,
  RebalancingExecutionOutcome,
  RebalancingExecutionPlan,
  RebalancingJobIntent,
  ActivationActivityEvent,
  ActivationActivityOutcomeBundle,
  ActivationOutcomeMetric,
  ActivationOutcomeSnapshot,
  FinancialExecutionAdapterStateResponseModel,
  MarketplaceActivation,
  PermissionCheckout,
  ScopedPermissionRequest,
  ServiceTask,
  ServiceCategory,
} from "@spotriq/domain";

export const ACTIVITY_OUTCOMES_METHOD = "marketplace.execution-activity-outcomes@1.0.0";
export const ACTIVATION_ACTIVITY_OUTCOMES_METHOD = "marketplace.activation-activity-outcomes@1.0.0";

export class ActivityOutcomesError extends Error {
  constructor(message:string, public readonly code:"EXECUTION_NOT_FOUND"|"EXECUTION_NOT_CONFIRMED"|"OUTCOME_UNAVAILABLE"|"INVALID_INPUT") { super(message); this.name="ActivityOutcomesError"; }
}

export interface ActivityOutcomesDatabase { query<T=unknown>(text:string, values?:unknown[]):Promise<{rows:T[]}>; }

export interface ActivityOutcomesStore {
  replaceActivity(executionId:string, events:ExecutionActivityEvent[]):Promise<void>;
  listActivity(executionId:string):Promise<ExecutionActivityEvent[]>;
  saveOutcome(outcome:RebalancingExecutionOutcome):Promise<void>;
  getOutcome(executionId:string):Promise<RebalancingExecutionOutcome|undefined>;
  replaceEvidence(executionId:string, evidence:EvidenceRecord[]):Promise<void>;
  listEvidence(executionId:string):Promise<EvidenceRecord[]>;
  replaceActivationActivity(activationId:string, events:ActivationActivityEvent[]):Promise<void>;
  listActivationActivity(activationId:string):Promise<ActivationActivityEvent[]>;
  saveActivationOutcome(outcome:ActivationOutcomeSnapshot):Promise<void>;
  getActivationOutcome(activationId:string):Promise<ActivationOutcomeSnapshot|undefined>;
}

export class MemoryActivityOutcomesStore implements ActivityOutcomesStore {
  private activity=new Map<string,ExecutionActivityEvent[]>();
  private outcomes=new Map<string,RebalancingExecutionOutcome>();
  private evidence=new Map<string,EvidenceRecord[]>();
  private activationActivity=new Map<string,ActivationActivityEvent[]>();
  private activationOutcomes=new Map<string,ActivationOutcomeSnapshot>();
  async replaceActivity(id:string,v:ExecutionActivityEvent[]){this.activity.set(id,structuredClone(v));}
  async listActivity(id:string){return structuredClone(this.activity.get(id)??[]);}
  async saveOutcome(v:RebalancingExecutionOutcome){this.outcomes.set(v.executionId,structuredClone(v));}
  async getOutcome(id:string){const v=this.outcomes.get(id);return v?structuredClone(v):undefined;}
  async replaceEvidence(id:string,v:EvidenceRecord[]){this.evidence.set(id,structuredClone(v));}
  async listEvidence(id:string){return structuredClone(this.evidence.get(id)??[]);}
  async replaceActivationActivity(id:string,v:ActivationActivityEvent[]){this.activationActivity.set(id,structuredClone(v));}
  async listActivationActivity(id:string){return structuredClone(this.activationActivity.get(id)??[]);}
  async saveActivationOutcome(v:ActivationOutcomeSnapshot){this.activationOutcomes.set(v.activationId,structuredClone(v));}
  async getActivationOutcome(id:string){const v=this.activationOutcomes.get(id);return v?structuredClone(v):undefined;}
}

export class PostgresActivityOutcomesStore implements ActivityOutcomesStore {
  constructor(private readonly db:ActivityOutcomesDatabase){}
  async replaceActivity(executionId:string,events:ExecutionActivityEvent[]){
    await this.db.query("delete from activity_events where source_type='CONTROLLED_EXECUTION_TIMELINE' and source_id=$1",[executionId]);
    for(const e of events) await this.db.query(`insert into activity_events (activity_event_id,activation_id,event_type,severity,title,description,source_type,source_id,occurred_at,metadata) values ($1,null,$2,$3,$4,$5,'CONTROLLED_EXECUTION_TIMELINE',$6,$7,$8::jsonb)`,[e.activityEventId,e.eventType,e.severity,e.title,e.description,executionId,e.occurredAt,JSON.stringify(e)]);
  }
  async listActivity(executionId:string){const r=await this.db.query<{metadata:ExecutionActivityEvent}>("select metadata from activity_events where source_type='CONTROLLED_EXECUTION_TIMELINE' and source_id=$1 order by occurred_at asc, activity_event_id asc",[executionId]);return r.rows.map(x=>x.metadata);}
  async saveOutcome(v:RebalancingExecutionOutcome){
    await this.db.query(`insert into outcome_windows (outcome_window_id,activation_id,state,started_at,ended_at,attribution_state,methodology_version,controlled_execution_id,job_intent_id,service_id,transaction_hash,metadata) values ($1,null,$2,$3,$4,'EXECUTION_SCOPED',$5,$6,$7,$8,$9,$10::jsonb) on conflict (outcome_window_id) do update set state=excluded.state,ended_at=excluded.ended_at,transaction_hash=excluded.transaction_hash,metadata=excluded.metadata`,[v.outcomeId,v.state,v.startedAt,v.measuredAt,v.methodVersion,v.executionId,v.jobIntentId,v.serviceId,v.transactionHash,JSON.stringify(v)]);
    await this.db.query("delete from outcome_metrics where controlled_execution_id=$1",[v.executionId]);
    for(const m of v.metrics) await this.db.query(`insert into outcome_metrics (outcome_metric_id,outcome_window_id,activation_id,metric,value,unit,attribution,evidence_ids,controlled_execution_id,created_at) values ($1,$2,null,$3,$4::jsonb,$5,$6,$7::jsonb,$8,$9)`,[m.outcomeMetricId,v.outcomeId,m.metric,JSON.stringify(m.value),m.unit??null,m.attribution,JSON.stringify(m.evidenceIds),v.executionId,v.measuredAt]);
  }
  async getOutcome(executionId:string){const r=await this.db.query<{metadata:RebalancingExecutionOutcome}>("select metadata from outcome_windows where controlled_execution_id=$1 order by started_at desc limit 1",[executionId]);return r.rows[0]?.metadata;}
  async replaceEvidence(executionId:string,evidence:EvidenceRecord[]){
    await this.db.query("delete from evidence_records where subject_type='CONTROLLED_EXECUTION' and subject_id=$1 and method_version=$2",[executionId,ACTIVITY_OUTCOMES_METHOD]);
    for(const e of evidence) await this.db.query(`insert into evidence_records (evidence_id,subject_type,subject_id,metric,value,unit,provenance,source_name,observed_at,confidence,method_version,period,sample_size,limitation) values ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,[e.evidenceId,e.subjectType,e.subjectId,e.metric,JSON.stringify(e.value),e.unit??null,e.provenance,e.sourceName,e.observedAt,e.confidence??null,e.methodVersion??null,e.period??null,e.sampleSize??null,e.limitation??null]);
  }
  async listEvidence(executionId:string){const r=await this.db.query<{evidence_id:string;subject_type:string;subject_id:string;metric:string;value:unknown;unit?:string;provenance:EvidenceRecord["provenance"];source_name:string;observed_at:string;confidence?:EvidenceRecord["confidence"];method_version?:string;period?:string;sample_size?:number;limitation?:string}>("select evidence_id,subject_type,subject_id,metric,value,unit,provenance,source_name,observed_at,confidence,method_version,period,sample_size,limitation from evidence_records where subject_type='CONTROLLED_EXECUTION' and subject_id=$1 and method_version=$2 order by observed_at asc,evidence_id asc",[executionId,ACTIVITY_OUTCOMES_METHOD]);return r.rows.map(x=>({evidenceId:x.evidence_id,subjectType:x.subject_type,subjectId:x.subject_id,metric:x.metric,value:typeof x.value==='string'||typeof x.value==='number'?x.value:JSON.stringify(x.value),unit:x.unit,provenance:x.provenance,sourceName:x.source_name,observedAt:x.observed_at,confidence:x.confidence,methodVersion:x.method_version,period:x.period,sampleSize:x.sample_size,limitation:x.limitation}));}
  async replaceActivationActivity(activationId:string,events:ActivationActivityEvent[]){
    await this.db.query("delete from activity_events where activation_id=$1 and source_type like 'ACTIVATION_%'",[activationId]);
    for(const e of events) await this.db.query(`insert into activity_events (activity_event_id,activation_id,event_type,severity,title,description,source_type,source_id,occurred_at,metadata) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,[e.activityEventId,activationId,e.eventType,e.severity,e.title,e.description,`ACTIVATION_${e.sourceType}`,e.sourceId,e.occurredAt,JSON.stringify(e)]);
  }
  async listActivationActivity(activationId:string){const r=await this.db.query<{metadata:ActivationActivityEvent}>("select metadata from activity_events where activation_id=$1 and source_type like 'ACTIVATION_%' order by occurred_at asc,activity_event_id asc",[activationId]);return r.rows.map(x=>x.metadata);}
  async saveActivationOutcome(v:ActivationOutcomeSnapshot){
    await this.db.query(`insert into outcome_windows (outcome_window_id,activation_id,state,started_at,ended_at,attribution_state,methodology_version,service_id,service_task_id,permission_request_id,category,metadata) values ($1,$2,$3,$4,$5,'ACTIVATION_SCOPED',$6,$7,$8,$9,$10,$11::jsonb) on conflict (outcome_window_id) do update set state=excluded.state,ended_at=excluded.ended_at,service_task_id=excluded.service_task_id,permission_request_id=excluded.permission_request_id,category=excluded.category,metadata=excluded.metadata`,[v.outcomeId,v.activationId,v.state,v.startedAt,v.measuredAt,v.methodVersion,v.serviceId,v.serviceTaskId??null,v.permissionRequestId??null,v.category,JSON.stringify(v)]);
    await this.db.query("delete from outcome_metrics where activation_id=$1 and controlled_execution_id is null",[v.activationId]);
    for(const m of v.metrics) await this.db.query(`insert into outcome_metrics (outcome_metric_id,outcome_window_id,activation_id,metric,value,unit,attribution,evidence_ids,created_at) values ($1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb,$9)`,[m.outcomeMetricId,v.outcomeId,v.activationId,m.metric,JSON.stringify(m.value),m.unit??null,m.attribution,JSON.stringify(m.evidenceIds),v.measuredAt]);
  }
  async getActivationOutcome(activationId:string){const r=await this.db.query<{metadata:ActivationOutcomeSnapshot}>("select metadata from outcome_windows where activation_id=$1 and attribution_state='ACTIVATION_SCOPED' order by ended_at desc nulls last limit 1",[activationId]);return r.rows[0]?.metadata;}
}

export interface ActivityExecutionReader { getExecution(id:string):Promise<ControlledRebalancingExecution>; getApprovalPlanForBoundary(id:string):Promise<{approvalPlanId:string;state:string}|undefined>; getApprovalObservationForPlan(id:string):Promise<BoundaryApprovalObservation|undefined>; }
export interface ActivityJobReader { get(id:string):Promise<RebalancingJobIntent>; }
export interface ActivityPlanReader { get(id:string):Promise<RebalancingExecutionPlan>; }
export interface ActivityBoundaryReader { get(id:string):Promise<FinancialExecutionBoundary>; }
export interface ActivityAuthorityReader { getBoundaryFinancialSession(id:string):Promise<BoundaryFinancialSessionObservation>; }
export interface ActivityPancakeReader { getV3Position(tokenId:string|number|bigint,blockNumber?:string):Promise<PancakeSwapClPositionSnapshot>; }

function evId(executionId:string,kind:string){return `activity:${encodeURIComponent(executionId)}:${kind}`;}
function evidenceId(executionId:string,metric:string){return `evidence:execution:${encodeURIComponent(executionId)}:${metric}`;}
function metricId(executionId:string,metric:string){return `outcome-metric:${encodeURIComponent(executionId)}:${metric}`;}
function formatNative(raw:string,decimals=18){const n=BigInt(raw);const base=10n**BigInt(decimals);const whole=n/base;const frac=(n%base).toString().padStart(decimals,"0").replace(/0+$/,'');return frac?`${whole}.${frac}`:whole.toString();}
function evidence(executionId:string,metric:string,value:string|number,observedAt:string,provenance:EvidenceRecord["provenance"],sourceName:string,unit?:string,limitation?:string):EvidenceRecord{return{evidenceId:evidenceId(executionId,metric),subjectType:"CONTROLLED_EXECUTION",subjectId:executionId,metric,value,unit,provenance,sourceName,observedAt,confidence:"high",methodVersion:ACTIVITY_OUTCOMES_METHOD,limitation};}
function metric(executionId:string,name:string,value:string|number,attribution:ExecutionOutcomeMetric["attribution"],provenance:ExecutionOutcomeMetric["provenance"],evidenceIds:string[],unit?:string,limitation?:string):ExecutionOutcomeMetric{return{outcomeMetricId:metricId(executionId,name),executionId,metric:name,value,unit,attribution,provenance,evidenceIds,limitation};}

export interface ActivityOutcomesEngine {
  sync(executionId:string,now?:Date):Promise<ExecutionActivityOutcomeBundle>;
  get(executionId:string):Promise<ExecutionActivityOutcomeBundle>;
}

export function createActivityOutcomesEngine(options:{store?:ActivityOutcomesStore;executions:ActivityExecutionReader;jobs:ActivityJobReader;plans:ActivityPlanReader;boundaries:ActivityBoundaryReader;authority:ActivityAuthorityReader;pancakeSwap:ActivityPancakeReader}):ActivityOutcomesEngine{
  const store=options.store??new MemoryActivityOutcomesStore();
  async function build(executionId:string,now:Date,persist:boolean):Promise<ExecutionActivityOutcomeBundle>{
    const execution=await options.executions.getExecution(executionId);
    const [job,plan,boundary,session]=await Promise.all([options.jobs.get(execution.jobIntentId),options.plans.get(execution.planId),options.boundaries.get(execution.boundaryId),options.authority.getBoundaryFinancialSession(execution.financialSessionId)]);
    const approvalPlan=await options.executions.getApprovalPlanForBoundary(execution.boundaryId);
    const approvalObservation=approvalPlan?await options.executions.getApprovalObservationForPlan(approvalPlan.approvalPlanId):undefined;
    const evidenceRecords:EvidenceRecord[]=[];
    const events:ExecutionActivityEvent[]=[];
    const push=(kind:ExecutionActivityEvent["eventType"],severity:ExecutionActivityEvent["severity"],title:string,description:string,occurredAt:string,sourceType:ExecutionActivityEvent["sourceType"],sourceId:string,extra:{transactionHash?:string;blockNumber?:string;evidenceIds?:string[];metadata?:Record<string,string|number|boolean>}={})=>events.push({activityEventId:evId(executionId,kind),executionId,jobIntentId:execution.jobIntentId,serviceId:execution.serviceId,walletAddress:execution.walletAddress,network:"testnet",chainId:97,eventType:kind,severity,title,description,occurredAt,provenance:"marketplace-observed",sourceType,sourceId,transactionHash:extra.transactionHash,blockNumber:extra.blockNumber,evidenceIds:extra.evidenceIds??[],metadata:extra.metadata??{}});

    push("JOB_INTENT_CONFIRMED","info","Rebalancing job reviewed",`Job ${job.jobIntentId} was explicitly reviewed for PancakeSwap V3 position ${job.subject.tokenId}.`,job.updatedAt,"JOB_INTENT",job.jobIntentId,{metadata:{oldTokenId:job.subject.tokenId}});
    if(session.state==="ACTIVE") push("BOUNDARY_AUTHORITY_ACTIVE","info","Boundary financial authority verified","The boundary-controlled Altana session reconciled to the reviewed scope and was valid in Keystore.",session.verifiedAt,"BOUNDARY_FINANCIAL_SESSION",session.financialSessionId,{transactionHash:session.transactionHash,blockNumber:session.verifiedBlockNumber});
    if(approvalObservation?.state==="CONFIRMED") push("APPROVALS_CONFIRMED","info","Exact token approvals verified","Spotriq independently re-read the reviewed Position Manager allowances after the wallet-admin approval action.",approvalObservation.observedAt,"APPROVAL_PLAN",approvalObservation.approvalPlanId,{transactionHash:approvalObservation.transactionHash,blockNumber:approvalObservation.receipt?.blockNumber});
    push("EXECUTION_PREPARED","info","Exact execution prepared",`One-shot dispatch prepared for ${execution.calls.length} sealed call${execution.calls.length===1?'':'s'} in reviewed order.`,execution.createdAt,"CONTROLLED_EXECUTION",execution.executionId,{metadata:{callCount:execution.calls.length}});
    if(execution.providerCallsId||execution.transactionHash) push("EXECUTION_SUBMITTED","info","Execution submitted",execution.transactionHash?`Altana submitted the exact reviewed batch as ${execution.transactionHash}.`:`Altana accepted controlled call set ${execution.providerCallsId}.`,execution.updatedAt,"CONTROLLED_EXECUTION",execution.executionId,{transactionHash:execution.transactionHash});

    let outcome:RebalancingExecutionOutcome|undefined;
    if(execution.state==="CONFIRMED"&&execution.receipt&&execution.transactionHash&&execution.mintedPositionTokenId){
      const receipt=execution.receipt;
      const replacement=await options.pancakeSwap.getV3Position(execution.mintedPositionTokenId,receipt.blockNumber);
      const txEvidence=evidence(executionId,"transaction.receipt_status","SUCCESS",execution.updatedAt,"marketplace-observed","BNB Smart Chain JSON-RPC",undefined,"Receipt success is necessary but Spotriq separately reconciles reviewed Rebalancing effects before completion.");
      const gasUsed=evidence(executionId,"transaction.gas_used",receipt.gasUsedRaw,execution.updatedAt,"marketplace-observed","BNB Smart Chain JSON-RPC","gas");
      const replacementEvidence=evidence(executionId,"rebalancing.replacement_position",JSON.stringify({tokenId:replacement.tokenId,owner:replacement.owner,tickLower:replacement.tickLower,tickUpper:replacement.tickUpper,liquidityRaw:replacement.liquidityRaw,rangeState:replacement.rangeState,blockNumber:replacement.blockNumber}),replacement.observedAt,"marketplace-observed","PancakeSwap","snapshot","Observed at the confirmed execution receipt block; this is execution-result evidence, not long-horizon strategy performance.");
      evidenceRecords.push(txEvidence,gasUsed,replacementEvidence);
      let gasCostRaw:string|undefined,gasCostFormatted:string|undefined,gasCostEvidence:EvidenceRecord|undefined;
      if(receipt.effectiveGasPriceRaw){gasCostRaw=(BigInt(receipt.gasUsedRaw)*BigInt(receipt.effectiveGasPriceRaw)).toString();gasCostFormatted=formatNative(gasCostRaw);gasCostEvidence=evidence(executionId,"transaction.gas_cost_native",gasCostRaw,execution.updatedAt,"marketplace-derived","Spotriq Derived","wei","Derived as receipt gasUsed × effectiveGasPrice; no USD conversion is claimed.");evidenceRecords.push(gasCostEvidence);}
      push("EXECUTION_CONFIRMED","success","BSC Testnet execution confirmed","The transaction receipt succeeded and Spotriq reconciled the exact reviewed decrease, collect and replacement mint effects.",execution.updatedAt,"BSC_RECEIPT",receipt.transactionHash,{transactionHash:receipt.transactionHash,blockNumber:receipt.blockNumber,evidenceIds:[txEvidence.evidenceId,gasUsed.evidenceId,...(gasCostEvidence?[gasCostEvidence.evidenceId]:[])]});
      push("REPLACEMENT_POSITION_VERIFIED","success","Replacement LP position verified",`Replacement NFT ${replacement.tokenId} matches the reviewed pair, fee tier and tick range with ${replacement.liquidityRaw} liquidity.`,replacement.observedAt,"PANCAKESWAP_POSITION",replacement.tokenId,{transactionHash:receipt.transactionHash,blockNumber:replacement.blockNumber,evidenceIds:[replacementEvidence.evidenceId],metadata:{tickLower:replacement.tickLower,tickUpper:replacement.tickUpper,currentTick:replacement.pool.currentTick,rangeState:replacement.rangeState,liquidityRaw:replacement.liquidityRaw}});
      if(boundary.state==="CONSUMED") push("BOUNDARY_CONSUMED","success","Execution boundary consumed","The exact sealed financial boundary was consumed after the independently reconciled execution, preventing replay.",execution.updatedAt,"FINANCIAL_EXECUTION_BOUNDARY",boundary.boundaryId,{transactionHash:receipt.transactionHash});
      if(job.state==="COMPLETED"&&job.executionState==="CONTROLLED_TESTNET_EXECUTED") push("JOB_INTENT_COMPLETED","success","Rebalancing job completed","The Job Intent reached completed only after independently reconciled BSC Testnet execution evidence.",job.updatedAt,"JOB_INTENT",job.jobIntentId,{transactionHash:receipt.transactionHash});
      if(session.state==="REVOKED") push("FINANCIAL_SESSION_REVOKED","success","Financial session revoked","Altana Keystore no longer validates the boundary financial session.",session.verifiedAt,"BOUNDARY_FINANCIAL_SESSION",session.financialSessionId,{transactionHash:session.revocationTransactionHash,blockNumber:session.verifiedBlockNumber});
      const mids={receipt:txEvidence.evidenceId,gas:gasUsed.evidenceId,replacement:replacementEvidence.evidenceId,gasCost:gasCostEvidence?.evidenceId};
      const metrics:ExecutionOutcomeMetric[]=[
        metric(executionId,"transaction_status","SUCCESS","DIRECT","marketplace-observed",[mids.receipt]),
        metric(executionId,"gas_used",receipt.gasUsedRaw,"DIRECT","marketplace-observed",[mids.gas],"gas"),
        metric(executionId,"old_position_liquidity_after",execution.oldPositionLiquidityRawAfter??"0","OBSERVED","marketplace-observed",[mids.receipt],"raw liquidity"),
        metric(executionId,"replacement_position_token_id",replacement.tokenId,"OBSERVED","marketplace-observed",[mids.replacement]),
        metric(executionId,"replacement_position_liquidity",replacement.liquidityRaw,"OBSERVED","marketplace-observed",[mids.replacement],"raw liquidity"),
        metric(executionId,"replacement_range_state",replacement.rangeState,"OBSERVED","marketplace-observed",[mids.replacement]),
        metric(executionId,"replacement_range_width_ticks",replacement.tickUpper-replacement.tickLower,"DERIVED","marketplace-derived",[mids.replacement],"ticks"),
      ];
      if(receipt.effectiveGasPriceRaw) metrics.push(metric(executionId,"effective_gas_price",receipt.effectiveGasPriceRaw,"DIRECT","marketplace-observed",[mids.gas],"wei/gas"));
      if(gasCostRaw&&mids.gasCost) metrics.push(metric(executionId,"gas_cost_native",gasCostRaw,"DERIVED","marketplace-derived",[mids.gasCost],"wei","No USD or economic-performance conversion is claimed."));
      outcome={outcomeId:`outcome:rebalancing:${encodeURIComponent(executionId)}`,executionId,jobIntentId:execution.jobIntentId,serviceId:execution.serviceId,walletAddress:execution.walletAddress,network:"testnet",chainId:97,state:"COLLECTING",transactionHash:execution.transactionHash,receiptBlockNumber:receipt.blockNumber,oldPositionTokenId:plan.positionSnapshot.tokenId,replacementPositionTokenId:replacement.tokenId,replacementPosition:replacement,gasUsedRaw:receipt.gasUsedRaw,effectiveGasPriceRaw:receipt.effectiveGasPriceRaw,gasCostNativeRaw:gasCostRaw,gasCostNativeFormatted:gasCostFormatted,gasAsset:"tBNB",startedAt:execution.updatedAt,measuredAt:now.toISOString(),metrics,evidenceIds:evidenceRecords.map(x=>x.evidenceId),performanceMeasurement:{state:"INSUFFICIENT_HISTORY",detail:"Immediate execution outcome is measured, but time-in-range, fee accrual, PnL, drawdown and strategy advantage require later observations and a defensible measurement window."},limitations:["This outcome proves the reviewed Rebalancing effects and immediate post-transaction LP state on BSC Testnet. It does not prove profitability or strategy quality.","Gas cost is reported in native testnet units only. No USD valuation is fabricated without a versioned price source.","PancakeSwap V3 recorded fee-growth/realised-return accounting across the replacement position is not yet measured; performance remains insufficient-history."],methodVersion:ACTIVITY_OUTCOMES_METHOD};
    } else if(execution.state==="BLOCKED") push("EXECUTION_BLOCKED","warning","Execution evidence blocked",execution.postStateDetail??"The transaction/provider evidence did not reconcile to the reviewed Rebalancing effects.",execution.updatedAt,"CONTROLLED_EXECUTION",execution.executionId,{transactionHash:execution.transactionHash,blockNumber:execution.receipt?.blockNumber});
    else if(execution.state==="FAILED") push("EXECUTION_FAILED","error","Controlled execution failed",execution.postStateDetail??"The controlled BSC Testnet execution failed or reverted.",execution.updatedAt,"CONTROLLED_EXECUTION",execution.executionId,{transactionHash:execution.transactionHash,blockNumber:execution.receipt?.blockNumber});

    events.sort((a,b)=>a.occurredAt.localeCompare(b.occurredAt)||a.activityEventId.localeCompare(b.activityEventId));
    if(persist){await store.replaceActivity(executionId,events);await store.replaceEvidence(executionId,evidenceRecords);if(outcome)await store.saveOutcome(outcome);}
    return{execution,activity:events,outcome,evidence:evidenceRecords,syncedAt:now.toISOString(),limitations:["Activity is execution-scoped marketplace evidence, not proof that the selected external AgentService was actually hired/invoked as proposal origin.","Immediate outcome metrics are deliberately limited to independently observed or directly derived execution facts. Profitability, fees earned and Agent Advantage claims require additional measurement windows."]};
  }
  return{async sync(id,now=new Date()){return build(id,now,true);},async get(id){const execution=await options.executions.getExecution(id);const activity=await store.listActivity(id),outcome=await store.getOutcome(id),evidenceRecords=await store.listEvidence(id);if(activity.length||outcome||evidenceRecords.length)return{execution,activity,outcome,evidence:evidenceRecords,syncedAt:new Date().toISOString(),limitations:["This view returns the latest persisted Activity & Outcomes evidence. Use sync to refresh permission/revocation and post-position observations.","Marketplace agent activation remains unproven until a real task/hiring/proposal-origin path is implemented."]};return build(id,new Date(),false);}};
}

export interface ActivationActivityCommercialReader { getActivation(id:string):Promise<MarketplaceActivation>; }
export interface ActivationActivityTaskReader { getForActivation(id:string):Promise<ServiceTask|undefined>; }
export interface ActivationActivityPermissionReader { getForActivation(id:string):Promise<PermissionCheckout|undefined>; getRequest(id:string):Promise<ScopedPermissionRequest>; }
export interface ActivationActivityExecutionReader { getState(permissionRequestId:string):Promise<FinancialExecutionAdapterStateResponseModel>; }

export interface ActivationActivityOutcomesEngine {
  sync(activationId:string,now?:Date):Promise<ActivationActivityOutcomeBundle>;
  get(activationId:string):Promise<ActivationActivityOutcomeBundle>;
}

function activationEventId(activationId:string,kind:string,sourceId:string){return `activity:activation:${encodeURIComponent(activationId)}:${kind}:${encodeURIComponent(sourceId)}`;}
function activationMetricId(activationId:string,metricName:string){return `outcome-metric:activation:${encodeURIComponent(activationId)}:${metricName}`;}
function record(value:unknown):Record<string,unknown>|undefined{return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:undefined;}
function array(value:unknown):unknown[]{return Array.isArray(value)?value:[];}
function scalar(value:unknown):string|number|boolean|undefined{return typeof value==="string"||typeof value==="number"||typeof value==="boolean"?value:undefined;}
function nested(value:unknown,...keys:string[]):unknown{let current:unknown=value;for(const key of keys){current=record(current)?.[key];if(current===undefined)return undefined;}return current;}

function categoryObservationMetrics(activationId:string,category:ServiceCategory,task:ServiceTask|undefined):ActivationOutcomeMetric[]{
  const metrics:ActivationOutcomeMetric[]=[];
  const add=(name:string,value:unknown,limitation?:string,attribution:ActivationOutcomeMetric["attribution"]="OBSERVED")=>{const v=scalar(value);if(v===undefined)return;metrics.push({outcomeMetricId:activationMetricId(activationId,name),activationId,metric:name,value:v,attribution,provenance:attribution==="DERIVED"?"marketplace-derived":"marketplace-observed",evidenceIds:task?.result.evidenceIds??[],limitation});};
  if(!task)return metrics;
  add("service_task_state",task.state,"Task state is operational evidence, not financial performance.","DIRECT");
  add("service_task_result_state",task.result.state,"Structured runtime output remains distinct from execution and outcome.","DIRECT");
  const payload=task.result.payload;
  if(category==="rebalancing"){
    add("range_state",nested(payload,"assessment","rangeState"),"Current position range state only; no rebalance or profitability is inferred.");
    add("current_tick",nested(payload,"assessment","currentTick"),"Current PancakeSwap position observation only.");
  } else if(category==="grid"){
    add("grid_regime",nested(payload,"assessment","regime"),"TWAP-derived regime is descriptive and is not a PnL or future-price forecast.");
    add("grid_confidence",nested(payload,"assessment","confidence"),"Confidence describes market-context coverage, not expected returns.");
    add("twap_dispersion_bps",nested(payload,"context","twapDispersionBps"),"TWAP dispersion is not realised volatility or trading performance.");
  } else if(category==="yield"){
    const opportunities=array(nested(payload,"snapshot","opportunities"));
    metrics.push({outcomeMetricId:activationMetricId(activationId,"yield_opportunity_count"),activationId,metric:"yield_opportunity_count",value:opportunities.length,unit:"markets",attribution:"DERIVED",provenance:"marketplace-derived",evidenceIds:task.result.evidenceIds,limitation:"Opportunity count and current protocol APY observations are not realised yield."});
    const apys=opportunities.map(x=>nested(x,"currentSupplyApyPercent")).filter((x):x is string=>typeof x==="string"&&x.length>0).map(Number).filter(Number.isFinite);
    if(apys.length)add("highest_current_supply_apy_percent",Math.max(...apys),"Current Venus base supply APY is a protocol-rate observation, not realised return.","DERIVED");
  } else {
    const positions=array(nested(payload,"snapshot","positions"));
    metrics.push({outcomeMetricId:activationMetricId(activationId,"venus_pool_position_count"),activationId,metric:"venus_pool_position_count",value:positions.length,unit:"pools",attribution:"DERIVED",provenance:"marketplace-derived",evidenceIds:task.result.evidenceIds,limitation:"Position count is monitoring context, not evidence that a protective action occurred."});
    const risks=positions.map(x=>nested(x,"riskState")).filter((x):x is string=>typeof x==="string");
    if(risks.length)add("highest_observed_risk_state",risks.join(","),"Observed Venus risk states are current monitoring evidence; no intervention is inferred.","DERIVED");
  }
  return metrics;
}

export function createActivationActivityOutcomesEngine(options:{store?:ActivityOutcomesStore;commercial:ActivationActivityCommercialReader;tasks:ActivationActivityTaskReader;permissionCheckout:ActivationActivityPermissionReader;executionAdapters:ActivationActivityExecutionReader}):ActivationActivityOutcomesEngine{
  const store=options.store??new MemoryActivityOutcomesStore();
  async function source(activationId:string){
    const activation=await options.commercial.getActivation(activationId);
    const [serviceTask,permissionCheckout]=await Promise.all([options.tasks.getForActivation(activationId),options.permissionCheckout.getForActivation(activationId)]);
    const permissionRequest=permissionCheckout?.permissionRequestId?await options.permissionCheckout.getRequest(permissionCheckout.permissionRequestId):undefined;
    const executionState=permissionRequest?await options.executionAdapters.getState(permissionRequest.permissionRequestId):undefined;
    return{activation,serviceTask,permissionCheckout,permissionRequest,executionState};
  }
  async function build(activationId:string,at:Date,persist:boolean):Promise<ActivationActivityOutcomeBundle>{
    const {activation,serviceTask,permissionCheckout,permissionRequest,executionState}=await source(activationId);
    const category=(serviceTask?.category??permissionRequest?.category) as ServiceCategory|undefined;
    if(!category)throw new ActivityOutcomesError("Activation category cannot be determined until a category ServiceTask or Permission Checkout exists.","OUTCOME_UNAVAILABLE");
    const events:ActivationActivityEvent[]=[];
    const push=(eventType:ActivationActivityEvent["eventType"],severity:ActivationActivityEvent["severity"],title:string,description:string,occurredAt:string,sourceType:ActivationActivityEvent["sourceType"],sourceId:string,evidenceIds:string[]=[],metadata:Record<string,string|number|boolean>={})=>events.push({activityEventId:activationEventId(activationId,eventType,sourceId),activationId,serviceId:activation.serviceId,buyerAddress:activation.buyerAddress,category,eventType,severity,title,description,occurredAt,provenance:"marketplace-observed",sourceType,sourceId,evidenceIds,metadata});
    push("ACTIVATION_STARTED","success","Service relationship activated","Spotriq activated the reviewed marketplace service relationship. Activation remains distinct from financial authority and execution.",activation.activatedAt,"MARKETPLACE_ACTIVATION",activation.activationId,activation.evidence.map(x=>x.evidenceId),{readOnly:activation.activationKind==="READ_ONLY_SERVICE_RELATIONSHIP"});
    if(serviceTask){
      push("SERVICE_TASK_STARTED","info","Activation-bound task invoked",`${serviceTask.category} runtime task ${serviceTask.serviceTaskId} was invoked through the attributed AgentService runtime.`,serviceTask.createdAt,"SERVICE_TASK",serviceTask.serviceTaskId,serviceTask.originProof.evidenceIds,{attempt:serviceTask.attempt});
      if(serviceTask.state==="COMPLETED"&&serviceTask.result.state==="STRUCTURED")push("SERVICE_TASK_OBSERVED","success","Structured runtime observation recorded",serviceTask.result.detail,serviceTask.result.observedAt??serviceTask.updatedAt,"SERVICE_TASK",serviceTask.serviceTaskId,serviceTask.result.evidenceIds,{resultKind:serviceTask.result.kind??serviceTask.result.action});
      else if(["FAILED","TIMED_OUT","ORIGIN_PROOF_FAILED","READINESS_BLOCKED"].includes(serviceTask.state))push("SERVICE_TASK_FAILED","error","Runtime observation failed",serviceTask.result.detail||`ServiceTask ended ${serviceTask.state}.`,serviceTask.updatedAt,"SERVICE_TASK",serviceTask.serviceTaskId,serviceTask.originProof.evidenceIds,{taskState:serviceTask.state});
    }
    if(permissionCheckout)push("PERMISSION_SCOPE_REVIEWED","info","Financial authority scope reviewed",permissionCheckout.reviewSummary,permissionCheckout.updatedAt,"PERMISSION_CHECKOUT",permissionCheckout.checkoutId,[],{checkoutState:permissionCheckout.state});
    if(permissionRequest){
      if(permissionRequest.state==="GRANT_RECONCILED")push("PERMISSION_GRANT_RECONCILED","success","PermissionGrant independently reconciled","The reviewed scope links to an independently reconciled PermissionGrant. This still does not prove execution occurred.",permissionRequest.updatedAt,"SCOPED_PERMISSION_REQUEST",permissionRequest.permissionRequestId,[],{requestState:permissionRequest.state});
      else push("PERMISSION_REQUEST_BLOCKED","warning","Financial authority remains blocked",permissionRequest.blockers.map(x=>x.label).join("; ")||`ScopedPermissionRequest is ${permissionRequest.state}.`,permissionRequest.updatedAt,"SCOPED_PERMISSION_REQUEST",permissionRequest.permissionRequestId,[],{requestState:permissionRequest.state});
    }
    const pf=executionState?.latestPreflight,guard=executionState?.latestGuard;
    if(pf)push(pf.state==="READY_FOR_GUARD"?"EXECUTION_PREFLIGHT_READY":"EXECUTION_PREFLIGHT_BLOCKED",pf.state==="READY_FOR_GUARD"?"info":"warning",pf.state==="READY_FOR_GUARD"?"Execution preflight reached guard stage":"Execution preflight blocked",pf.checks.filter(x=>x.blocking&&x.state!=="PASS").map(x=>x.detail).join(" ")||`Preflight state: ${pf.state}.`,pf.checkedAt,"FINANCIAL_EXECUTION_PREFLIGHT",pf.preflightId,[],{preflightState:pf.state,executionEligible:pf.executionEligible});
    if(guard)push(guard.state==="PASS_BUT_EXECUTION_BLOCKED"?"EXECUTION_GUARD_PREPARED":"EXECUTION_GUARD_BLOCKED",guard.state==="PASS_BUT_EXECUTION_BLOCKED"?"info":"warning",guard.state==="PASS_BUT_EXECUTION_BLOCKED"?"Exact guarded call prepared; dispatch disabled":"Execution guard blocked",guard.limitations[0]??`Guard state: ${guard.state}.`,guard.guardedAt,"FINANCIAL_EXECUTION_GUARD",guard.guardReportId,[],{guardState:guard.state,executionEligible:guard.executionEligible});
    if(activation.state==="REVOKED")push("ACTIVATION_REVOKED","warning","Marketplace relationship revoked","The marketplace service relationship was revoked. This does not silently claim an independent financial PermissionGrant was revoked.",activation.updatedAt,"MARKETPLACE_ACTIVATION",activation.activationId,activation.evidence.map(x=>x.evidenceId));
    events.sort((a,b)=>a.occurredAt.localeCompare(b.occurredAt)||a.activityEventId.localeCompare(b.activityEventId));

    let state:ActivationOutcomeSnapshot["state"]="NOT_STARTED";
    if(serviceTask&&["FAILED","TIMED_OUT","ORIGIN_PROOF_FAILED","READINESS_BLOCKED"].includes(serviceTask.state))state="FAILED";
    else if(guard?.state==="PASS_BUT_EXECUTION_BLOCKED")state="EXECUTION_PREPARED_NOT_DISPATCHED";
    else if(guard||pf?.state==="BLOCKED"||permissionRequest?.state==="BLOCKED")state="EXECUTION_BLOCKED";
    else if(serviceTask?.result.state==="STRUCTURED")state="OBSERVATION_ONLY";
    if(activation.state==="REVOKED")state="REVOKED";
    const technicalState:ActivationOutcomeSnapshot["technicalObservation"]["state"]=serviceTask?.result.state==="STRUCTURED"?"OBSERVED":serviceTask&&["FAILED","TIMED_OUT","ORIGIN_PROOF_FAILED","READINESS_BLOCKED"].includes(serviceTask.state)?"FAILED":"NOT_OBSERVED";
    const metrics=categoryObservationMetrics(activationId,category,serviceTask);
    if(permissionRequest)metrics.push({outcomeMetricId:activationMetricId(activationId,"permission_request_state"),activationId,metric:"permission_request_state",value:permissionRequest.state,attribution:"DIRECT",provenance:"marketplace-observed",evidenceIds:[],limitation:"Permission state is authority evidence, not transaction or performance evidence."});
    if(pf)metrics.push({outcomeMetricId:activationMetricId(activationId,"execution_preflight_state"),activationId,metric:"execution_preflight_state",value:pf.state,attribution:"DIRECT",provenance:"marketplace-observed",evidenceIds:[],limitation:"Preflight status is a deterministic readiness assessment, not a transaction."});
    if(guard)metrics.push({outcomeMetricId:activationMetricId(activationId,"execution_guard_state"),activationId,metric:"execution_guard_state",value:guard.state,attribution:"DIRECT",provenance:"marketplace-observed",evidenceIds:[],limitation:"A guarded call is not a submitted or confirmed transaction."});
    const evidenceIds=[...new Set([...(activation.evidence??[]).map(x=>x.evidenceId),...(serviceTask?.originProof.evidenceIds??[]),...(serviceTask?.result.evidenceIds??[])])];
    const outcome:ActivationOutcomeSnapshot={outcomeId:`outcome:activation:${encodeURIComponent(activationId)}`,activationId,serviceId:activation.serviceId,buyerAddress:activation.buyerAddress,category,state,serviceTaskId:serviceTask?.serviceTaskId,permissionRequestId:permissionRequest?.permissionRequestId,executionPreflightId:pf?.preflightId,executionGuardReportId:guard?.guardReportId,transactionObserved:false,technicalObservation:{state:technicalState,detail:technicalState==="OBSERVED"?`A structured ${category} runtime observation exists.`:technicalState==="FAILED"?"The latest activation-bound runtime task did not produce an accepted structured observation.":"No structured activation-bound runtime observation exists yet."},financialOutcome:{state:"COULD_NOT_ASSESS",value:"Could Not Assess",detail:guard?.state==="PASS_BUT_EXECUTION_BLOCKED"?"Exact guarded calldata may have been prepared, but category dispatch is disabled and no transaction evidence exists. Financial outcome therefore cannot be assessed.":"No independently reconciled financial transaction is attributed to this Activation, so PnL, realised yield, fill quality, protective effect and Agent Advantage cannot be assessed."},metrics,evidenceIds,startedAt:activation.activatedAt,measuredAt:at.toISOString(),methodVersion:ACTIVATION_ACTIVITY_OUTCOMES_METHOD,limitations:["Technical observation success is not financial outcome success.",category==="grid"?"Grid fills, slippage, realised PnL and drawdown require independently observed transactions and a defensible measurement window.":category==="yield"?"Current APY is not realised yield; realised return requires position, cash-flow and time-window evidence.":category==="health"?"A health snapshot does not prove a protective intervention or avoided liquidation; protective effects require transaction and before/after risk evidence.":"Read-only range analysis does not prove a rebalance. Existing controlled Rebalancing execution outcomes remain separately evidenced through the v0.20 execution-scoped pipeline.","Missing outcome evidence is represented as Could Not Assess rather than inferred from runtime success."]};
    if(persist){await store.replaceActivationActivity(activationId,events);await store.saveActivationOutcome(outcome);}
    return{activation,serviceTask,permissionCheckout,permissionRequest,executionState,activity:events,outcome,syncedAt:at.toISOString(),methodVersion:ACTIVATION_ACTIVITY_OUTCOMES_METHOD,limitations:["This Activation-scoped view reconciles marketplace relationship, runtime, authority-review and execution-assessment evidence across all four categories.","It does not manufacture a transaction, financial outcome, profitability claim or Agent Advantage score when those facts are absent."]};
  }
  return{
    sync:(id,at=new Date())=>build(id,at,true),
    async get(id){const current=await source(id);const activity=await store.listActivationActivity(id),outcome=await store.getActivationOutcome(id);if(activity.length&&outcome)return{...current,activity,outcome,syncedAt:new Date().toISOString(),methodVersion:ACTIVATION_ACTIVITY_OUTCOMES_METHOD,limitations:["This view returns the latest persisted Activation Activity & Outcomes reconciliation. Use sync to refresh source state.","Could Not Assess is intentional when financial transaction/outcome evidence does not exist."]};return build(id,new Date(),false);}
  };
}
