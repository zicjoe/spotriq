import assert from "node:assert/strict";
import test from "node:test";
import { createActivationActivityOutcomesEngine, MemoryActivityOutcomesStore } from "./index.js";

const buyer="0x00000000000000000000000000000000000000aa";
const now="2026-09-01T12:00:00.000Z";
const payloads={
  rebalancing:{capability:"rebalancing",action:"analyze_position",assessment:{rangeState:"IN_RANGE",currentTick:10}},
  grid:{capability:"grid",action:"analyze_market",context:{twapDispersionBps:25},assessment:{regime:"RANGE_LIKE",confidence:"high"}},
  yield:{capability:"yield",action:"scan_opportunities",snapshot:{opportunities:[{currentSupplyApyPercent:"3.5"}]}},
  health:{capability:"health",action:"inspect_health",snapshot:{positions:[{riskState:"WATCH"}]}},
} as const;

for(const category of ["rebalancing","grid","yield","health"] as const){
  test(`activation Activity & Outcomes preserves ${category} technical truth without financial claims`,async()=>{
    const activationId=`activation:${category}`,serviceId=`svc:${category}`,requestId=`request:${category}`,checkoutId=`checkout:${category}`;
    const activation={activationId,hireId:`hire:${category}`,quoteId:`quote:${category}`,serviceId,buyerAddress:buyer,buyerChainId:97,serviceChainId:97,state:"ACTIVE",activationKind:"READ_ONLY_SERVICE_RELATIONSHIP",termsSnapshot:{termsVersion:"1",commercialModel:"FREE",serviceType:"READ_ONLY_SERVICE",price:{amount:"0",currency:"NONE",amountRaw:"0"},network:"BSC",chainId:97,paymentRail:"FREE",scope:{summary:"read only",protocols:[],financialAuthorityRequired:false,walletSigningRequired:false},availability:"AVAILABLE",quoteValiditySeconds:900},termsHash:"0x1",paymentRequired:false,permissionRequired:false,walletSigningAuthorityGranted:false,financialExecutionAuthorityGranted:false,idempotencyKey:`a:${category}`,activatedAt:now,updatedAt:now,methodVersion:"test",evidence:[],limitations:[]} as any;
    const task={serviceTaskId:`task:${category}`,originKind:"ACTIVATION",serviceId,agentId:`agent:${category}`,category,state:"COMPLETED",protocol:"A2A",requestContextHash:"h",requestContext:{originKind:"ACTIVATION",activationId,serviceId,agentId:`agent:${category}`,walletAddress:buyer,category,requestedAction:category==="rebalancing"?"ANALYZE_POSITION":category==="grid"?"ANALYZE_GRID_MARKET":category==="yield"?"SCAN_YIELD_OPPORTUNITIES":"INSPECT_HEALTH",subject:{},expiresAt:now},attempt:1,attempts:[],proposalState:"NONE",result:{state:"STRUCTURED",kind:category==="rebalancing"?"REBALANCING_ANALYSIS":category==="grid"?"GRID_MARKET_CONTEXT":category==="yield"?"YIELD_OPPORTUNITY_SNAPSHOT":"HEALTH_MONITORING_SNAPSHOT",category,action:"read",observedAt:now,payload:payloads[category],evidenceIds:[`e:${category}`],detail:"observed",limitations:[]},originProof:{state:"VERIFIED",serviceId,agentId:`agent:${category}`,runtimeEndpoint:"https://example.com",agentCardUrl:"https://example.com/card",protocol:"A2A",protocolBinding:"JSONRPC",protocolVersion:"1",requestId:"r",messageId:"m",requestContextHash:"h",evidenceIds:[],detail:"verified"},commercialState:"HIRING_PROVEN",activationId,hireId:`hire:${category}`,evidence:[],createdAt:now,updatedAt:now,limitations:[]} as any;
    const checkout={checkoutId,activationId,serviceId,buyerAddress:buyer,category,state:"REQUEST_CREATED",idempotencyKey:"k",scope:{},scopeHash:"0x2",commercialTermsHash:"0x3",permissionProfileSnapshot:{},cost:{},risk:{},blockers:[],provider:"UNASSIGNED",providerSubmissionState:"BLOCKED",permissionRequestId:requestId,reviewSummary:"scope reviewed",createdAt:now,updatedAt:now,expiresAt:"2026-09-01T13:00:00.000Z",methodVersion:"test",limitations:[]} as any;
    const request={permissionRequestId:requestId,checkoutId,activationId,serviceId,buyerAddress:buyer,category,state:"BLOCKED",authorityTier:category==="health"?"PROTECTIVE_WRITE":"BOUNDED_FINANCIAL",provider:"UNASSIGNED",providerSubmissionState:"BLOCKED",scopeSnapshot:{},scopeHash:"0x2",blockers:[{code:"SERVICE_READ_ONLY",label:"Read only",detail:"blocked",blocking:true,provenance:"marketplace-derived"}],reviewedAt:now,updatedAt:now,expiresAt:"2026-09-01T13:00:00.000Z",methodVersion:"test",limitations:[]} as any;
    const executionState={permissionRequestId:requestId,latestPreflight:{preflightId:`pf:${category}`,permissionRequestId:requestId,activationId,serviceId,buyerAddress:buyer,category,adapter:{},state:"BLOCKED",checks:[],permissionGrantSatisfied:false,serviceFinancialReadinessSatisfied:false,activationSatisfied:true,targetScopeSatisfied:true,executionEligible:false,checkedAt:now,methodVersion:"test",limitations:[]},generatedAt:now,methodVersion:"test",limitations:[]} as any;
    const store=new MemoryActivityOutcomesStore();
    const engine=createActivationActivityOutcomesEngine({store,commercial:{getActivation:async()=>activation},tasks:{getForActivation:async()=>task},permissionCheckout:{getForActivation:async()=>checkout,getRequest:async()=>request},executionAdapters:{getState:async()=>executionState}});
    const bundle=await engine.sync(activationId,new Date(now));
    assert.equal(bundle.outcome.transactionObserved,false);
    assert.equal(bundle.outcome.financialOutcome.value,"Could Not Assess");
    assert.equal(bundle.outcome.financialOutcome.state,"COULD_NOT_ASSESS");
    assert.equal(bundle.outcome.technicalObservation.state,"OBSERVED");
    assert.ok(bundle.activity.some(event=>event.eventType==="SERVICE_TASK_OBSERVED"));
    assert.ok(bundle.activity.some(event=>event.eventType==="PERMISSION_REQUEST_BLOCKED"));
    const persisted=await engine.get(activationId);
    assert.equal(persisted.outcome.outcomeId,bundle.outcome.outcomeId);
  });
}
