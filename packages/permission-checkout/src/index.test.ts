import assert from "node:assert/strict";
import test from "node:test";
import { createPermissionCheckoutEngine, MemoryPermissionCheckoutStore } from "./index.js";
import type { MarketplaceActivation, MarketplaceServiceRecord, ServiceCategory } from "@spotriq/domain";

const buyer="0x1111111111111111111111111111111111111111";
const pool="0x2222222222222222222222222222222222222222";
const asset="0x3333333333333333333333333333333333333333";

function activation(category:ServiceCategory):MarketplaceActivation{return{
  activationId:`activation:${category}`,hireId:`hire:${category}`,quoteId:`quote:${category}`,serviceId:`svc:${category}`,buyerAddress:buyer,buyerChainId:97,serviceChainId:97,state:"ACTIVE",activationKind:"READ_ONLY_SERVICE_RELATIONSHIP",
  termsSnapshot:{termsVersion:"test",commercialModel:"FREE",serviceType:"READ_ONLY_SERVICE",price:{amount:"0",currency:"FREE"},network:"BSC",chainId:97,paymentRail:"FREE",scope:{summary:"read only",protocols:[category==="yield"||category==="health"?"Venus":"PancakeSwap"],financialAuthorityRequired:false,walletSigningRequired:false},availability:"AVAILABLE",quoteValiditySeconds:60},termsHash:`terms:${category}`,paymentRequired:false,permissionRequired:false,walletSigningAuthorityGranted:false,financialExecutionAuthorityGranted:false,idempotencyKey:`key:${category}`,activatedAt:"2026-09-01T08:00:00.000Z",updatedAt:"2026-09-01T08:00:00.000Z",methodVersion:"test",evidence:[],limitations:[]
};}
function record(category:ServiceCategory,executionMode:"READ_ONLY"|"AUTOMATIC_WITH_LIMITS"="READ_ONLY",ready=false):MarketplaceServiceRecord{return{
  service:{serviceId:`svc:${category}`,agentId:`agent:${category}`,name:`${category} service`,slug:category,category,description:"test",readiness:ready?"READY":"TESTNET_ONLY",permissionIntensity:executionMode==="READ_ONLY"?"read-only":"low",pricing:{model:"FREE",amount:"0",protocolCostsNote:"unknown"},supportedProtocols:[category==="yield"||category==="health"?"Venus":"PancakeSwap"],automationMode:executionMode,evidenceSummary:{marketplaceObserved:"test",testsPassed:1},operator:"Spotriq",erc8004Verified:true,marketplaceActivationEligible:ready},
  permissionProfile:{permissionProfileId:`perm:${category}`,serviceId:`svc:${category}`,protocols:[category==="yield"||category==="health"?"Venus":"PancakeSwap"],assets:[],executionMode,declarationState:"DECLARED",intensity:executionMode==="READ_ONLY"?"read-only":"low",provenance:"marketplace-derived"},
  readiness:{readinessSnapshotId:`ready:${category}`,serviceId:`svc:${category}`,state:ready?"READY":"TESTNET_ONLY",checks:[],checkedAt:"2026-09-01T08:00:00.000Z",reasons:[],methodVersion:"test",limitations:[]},
  offer:{offerId:`offer:${category}`,serviceId:`svc:${category}`,state:"AVAILABLE",source:"marketplace-observed",note:"test"},identity:{} as any,listing:{} as any,capabilityClaims:[],evidence:[],normalizedAt:"2026-09-01T08:00:00.000Z",limitations:[]
};}
function scope(category:ServiceCategory):any{
  if(category==="rebalancing")return{category,positionTokenId:"12490",token0Limit:"1",token1Limit:"2",maxActionsPerDay:4};
  if(category==="grid")return{category,poolAddress:pool,capitalAssetAddress:asset,capitalLimit:"500",perActionLimit:"75",maxActionsPerDay:12};
  if(category==="yield")return{category,assetAddress:asset,allowedMarketAddresses:[pool],capitalLimit:"500",perActionLimit:"100",maxActionsPerDay:4};
  return{category,assetAddress:asset,marketAddresses:[pool],protectiveActions:["REPAY"],interventionCap:"100",triggerHealthFactor:"1.25",maxInterventionsPerDay:2};
}

for(const category of ["rebalancing","grid","yield","health"] as const){
  test(`${category} checkout is category-specific and cannot turn the read-only reference tier into write authority`,async()=>{
    const a=activation(category),r=record(category);
    const engine=createPermissionCheckoutEngine({store:new MemoryPermissionCheckoutStore(),commercial:{getActivation:async()=>a} as any,marketplace:{getService:async()=>r} as any,now:()=>new Date("2026-09-01T09:00:00.000Z")});
    const checkout=await engine.create(a.activationId,{buyerAddress:buyer,idempotencyKey:`idem:${category}`,approvalMode:"ASK_BEFORE_EXECUTION",validForMinutes:60,scope:scope(category)});
    assert.equal(checkout.category,category); assert.equal(checkout.state,"BLOCKED"); assert.ok(checkout.blockers.some(x=>x.code==="SERVICE_READ_ONLY")); assert.equal(checkout.permissionProfileSnapshot.executionMode,"READ_ONLY");
    assert.ok(checkout.scope.deniedActions.some(x=>x.toLowerCase().includes("arbitrary")));
    const request=await engine.confirm(checkout.checkoutId,{buyerAddress:buyer}); assert.equal(request.state,"BLOCKED"); assert.equal(request.scopeHash,checkout.scopeHash); assert.equal(request.permissionGrantId,undefined);
  });
}

test("checkout idempotency refuses cross-activation reuse",async()=>{
  const a=activation("grid"),r=record("grid"); const store=new MemoryPermissionCheckoutStore(); const engine=createPermissionCheckoutEngine({store,commercial:{getActivation:async(id:string)=>({...a,activationId:id})} as any,marketplace:{getService:async()=>r} as any});
  await engine.create("activation:grid:a",{buyerAddress:buyer,idempotencyKey:"same",approvalMode:"ASK_BEFORE_EXECUTION",validForMinutes:60,scope:scope("grid")});
  await assert.rejects(()=>engine.create("activation:grid:b",{buyerAddress:buyer,idempotencyKey:"same",approvalMode:"ASK_BEFORE_EXECUTION",validForMinutes:60,scope:scope("grid")}),/different Activation/);
});

test("wrong buyer cannot confirm or cancel a checkout",async()=>{
  const a=activation("yield"),r=record("yield"); const engine=createPermissionCheckoutEngine({commercial:{getActivation:async()=>a} as any,marketplace:{getService:async()=>r} as any}); const c=await engine.create(a.activationId,{buyerAddress:buyer,idempotencyKey:"buyer",approvalMode:"ASK_BEFORE_EXECUTION",validForMinutes:60,scope:scope("yield")});
  await assert.rejects(()=>engine.confirm(c.checkoutId,{buyerAddress:"0x4444444444444444444444444444444444444444"}),/Only the checkout buyer/);
  await assert.rejects(()=>engine.cancel(c.checkoutId,{buyerAddress:"0x4444444444444444444444444444444444444444"}),/Only the checkout buyer/);
});

test("checkout idempotency refuses changed scope on the same Activation",async()=>{
  const a=activation("grid"),r=record("grid");const engine=createPermissionCheckoutEngine({commercial:{getActivation:async()=>a} as any,marketplace:{getService:async()=>r} as any});
  await engine.create(a.activationId,{buyerAddress:buyer,idempotencyKey:"same-scope-key",approvalMode:"ASK_BEFORE_EXECUTION",validForMinutes:60,scope:scope("grid")});
  const changed={...scope("grid"),capitalLimit:"999"};
  await assert.rejects(()=>engine.create(a.activationId,{buyerAddress:buyer,idempotencyKey:"same-scope-key",approvalMode:"ASK_BEFORE_EXECUTION",validForMinutes:60,scope:changed}),/different Activation or reviewed scope/);
});

test("getForActivation normalizes an expired checkout instead of returning stale reviewable state",async()=>{
  let current=new Date("2026-09-01T09:00:00.000Z");const a=activation("yield"),r=record("yield");const engine=createPermissionCheckoutEngine({commercial:{getActivation:async()=>a} as any,marketplace:{getService:async()=>r} as any,now:()=>current});
  const created=await engine.create(a.activationId,{buyerAddress:buyer,idempotencyKey:"expiry",approvalMode:"ASK_BEFORE_EXECUTION",validForMinutes:5,scope:scope("yield")});assert.equal(created.state,"BLOCKED");
  current=new Date("2026-09-01T09:06:00.000Z");const fetched=await engine.getForActivation(a.activationId);assert.equal(fetched?.state,"EXPIRED");
});
