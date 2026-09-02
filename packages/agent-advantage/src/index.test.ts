import assert from "node:assert/strict";
import test from "node:test";
import type { ActivationActivityOutcomeBundle, ActivationOutcomeMetric } from "@spotriq/domain";
import { createAgentAdvantageEngine, MemoryAgentAdvantageStore } from "./index.js";

const at="2026-09-02T10:00:00.000Z";
function bundle(input?:{technical?:"OBSERVED"|"FAILED"|"NOT_OBSERVED";transactionObserved?:boolean;financialState?:"COULD_NOT_ASSESS"|"INSUFFICIENT_HISTORY"|"MEASURED";metrics?:ActivationOutcomeMetric[];activationState?:"ACTIVE"|"REVOKED"}):ActivationActivityOutcomeBundle{
  const technical=input?.technical??"OBSERVED";
  const financialState=input?.financialState??"COULD_NOT_ASSESS";
  return {
    activation:{activationId:"act:1",hireId:"hire:1",quoteId:"quote:1",offerId:"offer:1",serviceId:"svc:reference:gridpilot",buyerAddress:"0x1111111111111111111111111111111111111111",serviceChainId:97,state:input?.activationState??"ACTIVE",activationKind:"READ_ONLY_SERVICE_RELATIONSHIP",termsSnapshot:{commercialModel:"FREE",paymentRail:"FREE",currency:"FREE",amount:"0",serviceType:"READ_ONLY_SERVICE",chainId:97,scope:{financialAuthorityRequired:false,walletSigningRequired:false}},activatedAt:"2026-09-01T10:00:00.000Z",createdAt:"2026-09-01T10:00:00.000Z",updatedAt:input?.activationState==="REVOKED"?"2026-09-01T14:00:00.000Z":"2026-09-02T09:00:00.000Z",methodVersion:"commercial@1",evidence:[],limitations:[]} as never,
    serviceTask:{serviceTaskId:"task:1",serviceId:"svc:reference:gridpilot",activationId:"act:1",buyerAddress:"0x1111111111111111111111111111111111111111",category:"grid",action:"ANALYZE_GRID_MARKET",state:technical==="FAILED"?"FAILED":"COMPLETED",attempt:1,request:{},result:technical==="OBSERVED"?{state:"STRUCTURED",action:"ANALYZE_GRID_MARKET",kind:"GRID_MARKET_CONTEXT",detail:"Grid context observed.",evidenceIds:["e:runtime"],observedAt:"2026-09-02T09:30:00.000Z",payload:{}}:{state:"FAILED",action:"ANALYZE_GRID_MARKET",detail:"Runtime failed.",evidenceIds:[]},originProof:{state:"VERIFIED",evidenceIds:["e:origin"],limitations:[]},createdAt:"2026-09-02T09:29:00.000Z",updatedAt:"2026-09-02T09:30:00.000Z",methodVersion:"task@1",limitations:[]} as never,
    activity:[],
    outcome:{outcomeId:"outcome:act:1",activationId:"act:1",serviceId:"svc:reference:gridpilot",buyerAddress:"0x1111111111111111111111111111111111111111",category:"grid",state:technical==="FAILED"?"FAILED":"OBSERVATION_ONLY",transactionObserved:input?.transactionObserved??false,technicalObservation:{state:technical,detail:"technical"},financialOutcome:{state:financialState,value:financialState==="MEASURED"?"Measured outcome":"Could Not Assess",detail:"financial detail"},metrics:input?.metrics??[],evidenceIds:["e:outcome"],startedAt:"2026-09-01T10:00:00.000Z",measuredAt:at,methodVersion:"activity@1",limitations:[]},
    syncedAt:at,methodVersion:"activity@1",limitations:[],
  } as ActivationActivityOutcomeBundle;
}
function engineFor(value:ActivationActivityOutcomeBundle){return createAgentAdvantageEngine({store:new MemoryAgentAdvantageStore(),activityOutcomes:{sync:async()=>structuredClone(value),get:async()=>structuredClone(value)},now:()=>new Date(at)});}

test("read-only runtime contribution does not become financial Agent Advantage",async()=>{
  const report=await engineFor(bundle()).measure("act:1");
  assert.equal(report.serviceContribution.state,"OBSERVED");
  assert.equal(report.transactionEvidence.observed,false);
  assert.equal(report.financialOutcome.state,"COULD_NOT_ASSESS");
  assert.equal(report.agentAdvantage.state,"COULD_NOT_ASSESS");
  assert.equal(report.agentAdvantage.value,"Could Not Assess");
  assert.equal(report.state,"PARTIAL_EVIDENCE");
});

test("transaction success alone never becomes Agent Advantage",async()=>{
  const report=await engineFor(bundle({transactionObserved:true,financialState:"MEASURED"})).measure("act:1");
  assert.equal(report.transactionEvidence.observed,true);
  assert.equal(report.financialOutcome.state,"MEASURED");
  assert.equal(report.agentAdvantage.state,"COULD_NOT_ASSESS");
  assert.match(report.agentAdvantage.detail,/Transaction or outcome success alone is not Agent Advantage/i);
});

test("an advantage-shaped metric without evidence is rejected as insufficient",async()=>{
  const metric={outcomeMetricId:"m:1",activationId:"act:1",metric:"agent_advantage_bps",value:42,unit:"bps",attribution:"DERIVED",provenance:"marketplace-derived",evidenceIds:[]} as ActivationOutcomeMetric;
  const report=await engineFor(bundle({transactionObserved:true,financialState:"MEASURED",metrics:[metric]})).measure("act:1");
  assert.equal(report.agentAdvantage.state,"COULD_NOT_ASSESS");
});

test("explicit standardized advantage metric requires transaction and evidence before MEASURED",async()=>{
  const metric={outcomeMetricId:"m:adv",activationId:"act:1",metric:"agent_advantage_bps",value:42,unit:"bps",attribution:"DERIVED",provenance:"marketplace-derived",evidenceIds:["e:before","e:after"]} as ActivationOutcomeMetric;
  const report=await engineFor(bundle({transactionObserved:true,financialState:"MEASURED",metrics:[metric]})).measure("act:1");
  assert.equal(report.agentAdvantage.state,"MEASURED");
  assert.equal(report.agentAdvantage.value,"42 bps");
  assert.deepEqual(report.agentAdvantage.evidenceIds,["e:before","e:after"]);
});

test("insufficient history remains explicit",async()=>{
  const report=await engineFor(bundle({transactionObserved:true,financialState:"INSUFFICIENT_HISTORY"})).measure("act:1");
  assert.equal(report.agentAdvantage.state,"INSUFFICIENT_HISTORY");
  assert.equal(report.agentAdvantage.value,"Insufficient History");
});

test("same source facts are idempotent instead of manufacturing new report history",async()=>{
  const store=new MemoryAgentAdvantageStore(); const value=bundle();
  const engine=createAgentAdvantageEngine({store,activityOutcomes:{sync:async()=>structuredClone(value),get:async()=>structuredClone(value)},now:()=>new Date(at)});
  const first=await engine.measure("act:1"),second=await engine.measure("act:1");
  assert.equal(first.reportId,second.reportId);
  assert.equal((await engine.listForActivation("act:1")).length,1);
});

test("revoked relationship closes its explicit measurement window at revocation",async()=>{
  const report=await engineFor(bundle({activationState:"REVOKED"})).measure("act:1");
  assert.equal(report.window.basis,"ACTIVATION_TO_REVOCATION");
  assert.equal(report.window.endedAt,"2026-09-01T14:00:00.000Z");
  assert.equal(report.window.durationSeconds,14400);
});
