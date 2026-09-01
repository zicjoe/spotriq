import test from "node:test";
import assert from "node:assert/strict";
import { createSmartMoneyPlanEngine, MemorySmartMoneyPlanStore } from "./index.js";

const now = new Date("2026-09-01T12:00:00.000Z");
const findings:any[]=[
 {findingId:"f-grid",checkSessionId:"check-1",category:"grid",state:"opportunity",severity:"opportunity",headline:"Grid",summary:"",confidence:"high",freshness:"now",primaryAction:{label:""},targetRoute:"explore",keyValues:[],whatCouldAgentDo:"Analyze grid market",subject:{protocol:"PancakeSwap",assetAddress:"0x1111111111111111111111111111111111111111"},expiresAt:new Date(now.getTime()+60000).toISOString()},
 {findingId:"f-yield",checkSessionId:"check-1",category:"yield",state:"opportunity",severity:"opportunity",headline:"Yield",summary:"",confidence:"high",freshness:"now",primaryAction:{label:""},targetRoute:"explore",keyValues:[],whatCouldAgentDo:"Analyze yield",subject:{protocol:"Venus",assetAddress:"0x1111111111111111111111111111111111111111"},expiresAt:new Date(now.getTime()+60000).toISOString()},
];
const service=(finding:any)=>({matchId:`m-${finding.findingId}`,findingId:finding.findingId,serviceId:`svc-${finding.category}`,rank:1,tier:"EXACT_CONTEXT",activationEligible:false,service:{service:{serviceId:`svc-${finding.category}`,name:`${finding.category} agent`,category:finding.category},readiness:{state:"TESTNET_ONLY"},offer:{terms:{chainId:97}}},checks:[],strengths:[],limitations:[],explanation:""});

test("plan composes specialists but keeps shared capital as an explicit warning",async()=>{
 const engine=createSmartMoneyPlanEngine({
  store:new MemorySmartMoneyPlanStore(),now:()=>now,
  smartMoney:{getCheck:async()=>({session:{checkSessionId:"check-1",walletAddress:"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},portfolio:{chainId:97},findings}),} as any,
  marketplace:{matchFinding:async(f:any)=>({matches:[service(f)]})} as any,
  myAgents:{getPortfolio:async()=>({active:[],history:[],switches:[]})} as any,
 });
 const plan=await engine.create({checkSessionId:"check-1",buyerAddress:"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",idempotencyKey:"k1"});
 assert.equal(plan.state,"REVIEWABLE");
 assert.equal(plan.members.length,2);
 assert.equal(plan.executionMode,"NO_SHARED_EXECUTION");
 assert.ok(plan.conflictReport.conflicts.some(x=>x.code==="ASSET_OVERLAP"&&x.severity==="WARN"));
 assert.equal(plan.conflictReport.blockingCount,0);
});

test("same idempotency key cannot be reused for different finding composition",async()=>{
 const store=new MemorySmartMoneyPlanStore();
 const engine=createSmartMoneyPlanEngine({store,now:()=>now,smartMoney:{getCheck:async()=>({session:{checkSessionId:"check-1",walletAddress:"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},portfolio:{chainId:97},findings})} as any,marketplace:{matchFinding:async(f:any)=>({matches:[service(f)]})} as any,myAgents:{getPortfolio:async()=>({active:[],history:[],switches:[]})} as any});
 await engine.create({checkSessionId:"check-1",buyerAddress:"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",findingIds:["f-grid"],idempotencyKey:"same"});
 await assert.rejects(()=>engine.create({checkSessionId:"check-1",buyerAddress:"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",findingIds:["f-yield"],idempotencyKey:"same"}),/idempotency key/i);
});
