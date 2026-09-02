import assert from "node:assert/strict";
import test from "node:test";
import { createOperationalHealthEngine, createWorkerHeartbeat, MemoryOperationalHealthStore, RequestMetricsTracker } from "./index.js";

const now = new Date("2026-09-02T12:00:00.000Z");
const chain = {
  network:"testnet", definition:{network:"testnet",chainId:97,nativeSymbol:"tBNB",explorerUrl:"https://testnet.bscscan.com",defaultRpcUrls:[]}, rpcMode:"configured",
  async getStatus(){return{network:"testnet",expectedChainId:97,rpcMode:"configured",latestBlockNumber:"123",activeRpcUrl:"https://user:secret@rpc.example/path?apiKey=secret",endpoints:[{url:"https://user:secret@rpc.example/path?apiKey=secret",role:"primary",state:"ok",latencyMs:25}]};},
} as never;
const marketplace = {
  async getTests(serviceId:string){return{serviceId,coverage:"PASS",latestRunId:`run:${serviceId}`,tests:[{testId:"t",code:"ENDPOINT_REACHABILITY",label:"reach",state:"PASS",requiredForReadiness:true,detail:"ok",observedAt:"2026-09-02T11:50:00.000Z"}],evidence:[],observedAt:"2026-09-02T11:50:00.000Z",methodVersion:"test@1",note:"ok",limitations:[]};},
} as never;
const payment=async()=>({rails:[{rail:"ERC8183",reconciliationMode:"ONCHAIN_JOB_ESCROW",state:"AVAILABLE",settlementDispatchEnabled:false,requirements:[],limitations:[]},{rail:"X402",reconciliationMode:"ONCHAIN_ERC20_SETTLEMENT",state:"AVAILABLE",settlementDispatchEnabled:false,requirements:[],limitations:[]},{rail:"B402",reconciliationMode:"ONCHAIN_ERC20_SETTLEMENT",state:"AVAILABLE",settlementDispatchEnabled:false,requirements:[],limitations:[]}],checkedAt:now.toISOString(),limitations:[]}) as never;
const studio=async()=>({integration:"BNB Agent Studio",mode:"NORMALIZED_ADAPTER",supportedNetworks:["bsc-testnet","bsc-mainnet"],supportedProtocols:["A2A"],supportedDeploymentTargets:["bnb"],operatorImportRequiresSignedSession:true,operatorImportRequiresCanonicalOwner:true,studioCliDispatchEnabled:false,marketplaceReadinessOverrideEnabled:false,paymentOrExecutionDispatchEnabled:false,checkedAt:now.toISOString(),methodVersion:"studio@1",limitations:[]}) as never;

function make(store=new MemoryOperationalHealthStore(), metrics=new RequestMetricsTracker(()=>now)){
  return createOperationalHealthEngine({release:"0.35.0",chain,marketplace,referenceServiceIds:["svc:reference:rangekeeper"],databaseHealth:async()=>({name:"postgres",state:"ok",latencyMs:3}),paymentRailsStatus:payment,agentStudioStatus:studio,store,requestMetrics:metrics,now:()=>now});
}

test("healthy operational snapshot remains separate from readiness/payment/permission authority",async()=>{
  const snapshot=await make().current();
  assert.equal(snapshot.platformState,"OPERATIONAL");
  assert.equal(snapshot.marketplaceState,"OPERATIONAL");
  assert.equal(snapshot.operationalOnly,true);
  assert.equal(snapshot.marketplaceReadinessAuthority,false);
  assert.equal(snapshot.paymentAuthority,false);
  assert.equal(snapshot.permissionAuthority,false);
  assert.equal(snapshot.executionAuthority,false);
  assert.equal(snapshot.outcomeAuthority,false);
  assert.deepEqual(new Set(snapshot.components.map(x=>x.code)),new Set(["API","DATABASE","BSC_RPC","MARKETPLACE_TEST_LAB","AGENT_RUNTIME","PAYMENT_RAILS","AGENT_STUDIO","WORKER_JOBS"]));
});

test("missing platform dependency configuration degrades aggregate health rather than reporting fully operational",async()=>{
  const engine=createOperationalHealthEngine({release:"0.35.0",chain,marketplace,referenceServiceIds:["svc:reference:rangekeeper"],databaseHealth:async()=>({name:"postgres",state:"not_configured"}),paymentRailsStatus:payment,agentStudioStatus:studio,now:()=>now});
  const snapshot=await engine.current();
  assert.equal(snapshot.components.find(x=>x.code==="DATABASE")?.state,"NOT_CONFIGURED");
  assert.equal(snapshot.platformState,"DEGRADED");
});

test("public projection redacts endpoint diagnostics and credentials",async()=>{
  const snapshot=await make().publicCurrent();
  assert.equal(snapshot.visibility,"PUBLIC");
  assert.ok(snapshot.components.every(component=>!("diagnostics" in component)));
  assert.equal(JSON.stringify(snapshot).includes("user:secret"),false);
  assert.equal(JSON.stringify(snapshot).includes("apiKey=secret"),false);
  assert.equal(JSON.stringify(snapshot).includes("rpc.example"),false);
});

test("elevated API 5xx rate degrades platform health without mutating marketplace truth",async()=>{
  const metrics=new RequestMetricsTracker(()=>now);
  for(let i=0;i<18;i++)metrics.observe(200,10);
  metrics.observe(500,20); metrics.observe(503,20);
  const snapshot=await make(new MemoryOperationalHealthStore(),metrics).current();
  assert.equal(snapshot.components.find(x=>x.code==="API")?.state,"DEGRADED");
  assert.equal(snapshot.platformState,"DEGRADED");
  assert.equal(snapshot.marketplaceReadinessAuthority,false);
});

test("stale Test Lab evidence degrades marketplace/runtime observability without inventing a readiness transition",async()=>{
  const staleMarketplace={async getTests(serviceId:string){return{serviceId,coverage:"PASS",tests:[{testId:"t",code:"ENDPOINT_REACHABILITY",label:"reach",state:"PASS",requiredForReadiness:true,detail:"historical",observedAt:"2026-08-30T00:00:00.000Z"}],evidence:[],observedAt:"2026-08-30T00:00:00.000Z",methodVersion:"test@1",note:"historical",limitations:[]};}} as never;
  const engine=createOperationalHealthEngine({release:"0.35.0",chain,marketplace:staleMarketplace,referenceServiceIds:["svc:reference:rangekeeper"],databaseHealth:async()=>({name:"postgres",state:"ok"}),paymentRailsStatus:payment,agentStudioStatus:studio,now:()=>now});
  const snapshot=await engine.current();
  assert.equal(snapshot.marketplaceState,"DEGRADED");
  assert.equal(snapshot.components.find(x=>x.code==="MARKETPLACE_TEST_LAB")?.freshness?.state,"STALE");
  assert.equal(snapshot.marketplaceReadinessAuthority,false);
});

test("worker heartbeat persistence has freshness semantics but no job-success authority",async()=>{
  const store=new MemoryOperationalHealthStore(); const engine=make(store);
  await engine.saveWorkerHeartbeat(createWorkerHeartbeat({workerId:"worker:test",version:"0.35.0",environment:"production",network:"testnet",databaseState:"ok",redisConfigured:false,jobsEnabled:false,jobExecutionMode:"API_INLINE",processUptimeSeconds:42,observedAt:"2026-09-02T11:59:30.000Z"}));
  const snapshot=await engine.current();
  const worker=snapshot.components.find(x=>x.code==="WORKER_JOBS");
  assert.equal(worker?.state,"OK");
  assert.match(worker?.limitations.join(" ")??"",/does not prove any individual financial job succeeded/i);
});

test("sync persists immutable health samples and history",async()=>{
  const store=new MemoryOperationalHealthStore();const engine=make(store);
  const snapshot=await engine.sync();const history=await engine.history();
  assert.equal(history.snapshots[0]?.snapshotId,snapshot.snapshotId);
  assert.equal(history.methodVersion,"marketplace.operational-health@1.0.0");
});
