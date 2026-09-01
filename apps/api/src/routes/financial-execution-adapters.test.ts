import test from "node:test";
import assert from "node:assert/strict";
import { registerFinancialExecutionAdapterRoutes } from "./financial-execution-adapters.js";

class FakeApp {
  handlers=new Map<string,(request:any,reply:any)=>Promise<any>>();
  post(path:string,handler:any):void{this.handlers.set(`POST ${path}`,handler);}
  get(path:string,handler:any):void{this.handlers.set(`GET ${path}`,handler);}
}
function replyRecorder(){return{statusCode:200,payload:undefined as any,code(value:number){this.statusCode=value;return this;},send(value:any){this.payload=value;return value;}};}

const adapter={adapterId:"execution-adapter:grid:pancakeswap-v3",category:"grid",protocol:"PancakeSwap",networkPolicy:"BSC_TESTNET_ONLY",state:"IMPLEMENTED",mode:"CATEGORY_GUARDED_CALL",actions:["GRID_SWAP_EXACT_INPUT_SINGLE"],targetPolicy:"exact",argumentGuard:"bounded",staleStatePolicy:"fresh",signerPolicy:"blocked",methodVersion:"test",limitations:[]};
const preflight={preflightId:"pf-1",permissionRequestId:"spr-1",category:"grid",state:"BLOCKED",adapter,executionEligible:false};
const guard={guardReportId:"guard-1",permissionRequestId:"spr-1",category:"grid",state:"BLOCKED",executionEligible:false};

test("financial execution adapter routes expose catalog, preflight, guard and persisted state without a dispatch endpoint",async()=>{
  const app=new FakeApp();
  let preflightInput:any;let guardInput:any;
  const engine={
    listAdapters:()=>[adapter],
    getAdapter:(category:string)=>{assert.equal(category,"grid");return adapter;},
    preflight:async(id:string,input:any)=>{assert.equal(id,"spr-1");preflightInput=input;return preflight;},
    guard:async(id:string,input:any)=>{assert.equal(id,"spr-1");guardInput=input;return guard;},
    getState:async(id:string)=>({permissionRequestId:id,latestPreflight:preflight,latestGuard:guard,generatedAt:new Date().toISOString(),methodVersion:"test",limitations:[]}),
  };
  await registerFinancialExecutionAdapterRoutes(app as any,engine as any);

  const preflightHandler=app.handlers.get("POST /v1/scoped-permission-requests/:permissionRequestId/execution-preflight");assert.ok(preflightHandler);
  const preflightReply=replyRecorder();await preflightHandler!({id:"req-pf",params:{permissionRequestId:"spr-1"},body:{buyerAddress:"0x1111111111111111111111111111111111111111",paid:true,granted:true}},preflightReply);
  assert.deepEqual(preflightInput,{buyerAddress:"0x1111111111111111111111111111111111111111",paid:true,granted:true});
  assert.equal(preflightReply.payload.data.preflight,preflight);

  const guardHandler=app.handlers.get("POST /v1/scoped-permission-requests/:permissionRequestId/execution-guard");assert.ok(guardHandler);
  const guardReply=replyRecorder();const proposal={category:"grid",action:"GRID_SWAP_EXACT_INPUT_SINGLE",amountIn:"1",amountOutMinimumRaw:"1",deadlineUnix:9999999999};await guardHandler!({id:"req-g",params:{permissionRequestId:"spr-1"},body:{buyerAddress:"0x1111111111111111111111111111111111111111",proposal}},guardReply);
  assert.deepEqual(guardInput,{buyerAddress:"0x1111111111111111111111111111111111111111",proposal});
  assert.equal(guardReply.payload.data.report,guard);

  assert.equal([...app.handlers.keys()].some(key=>/dispatch|submit|execute/i.test(key)),false);
});
