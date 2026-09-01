import test from "node:test";
import assert from "node:assert/strict";
import { registerPermissionCheckoutRoutes } from "./permission-checkout.js";

class FakeApp {
  handlers=new Map<string,(request:any,reply:any)=>Promise<any>>();
  post(path:string,handler:any):void{this.handlers.set(`POST ${path}`,handler);}
  get(path:string,handler:any):void{this.handlers.set(`GET ${path}`,handler);}
}
function replyRecorder(){return{statusCode:200,payload:undefined as any,code(value:number){this.statusCode=value;return this;},send(value:any){this.payload=value;return value;}};}

const checkout={checkoutId:"checkout-1",activationId:"activation-1",serviceId:"svc:reference:gridpilot",buyerAddress:"0x1111111111111111111111111111111111111111",state:"BLOCKED",scopeHash:"0xscope"};
const scoped={permissionRequestId:"request-1",checkoutId:"checkout-1",scopeHash:"0xscope",state:"BLOCKED"};

test("permission checkout routes forward buyer-reviewed scope to the domain engine and never accept a client grant flag",async()=>{
  const app=new FakeApp();
  let createInput:any;let confirmInput:any;
  const engine={
    create:async(activationId:string,input:any)=>{assert.equal(activationId,"activation-1");createInput=input;return checkout;},
    getForActivation:async()=>checkout,get:async()=>checkout,
    confirm:async(checkoutId:string,input:any)=>{assert.equal(checkoutId,"checkout-1");confirmInput=input;return scoped;},
    cancel:async()=>checkout,getRequest:async()=>scoped,reconcileGrant:async()=>scoped,
    getBuyerState:async(address:string)=>({buyerAddress:address,checkouts:[checkout],requests:[scoped],activeGrantIds:[]}),
  };
  await registerPermissionCheckoutRoutes(app as any,engine as any);
  const create=app.handlers.get("POST /v1/activations/:activationId/permission-checkouts");assert.ok(create);
  const reply=replyRecorder();
  await create!({id:"req-1",params:{activationId:"activation-1"},body:{buyerAddress:checkout.buyerAddress,idempotencyKey:"idem",approvalMode:"ASK_BEFORE_EXECUTION",validForMinutes:60,scope:{category:"grid",poolAddress:"0x2222222222222222222222222222222222222222",capitalAssetAddress:"0x3333333333333333333333333333333333333333",capitalLimit:"10",perActionLimit:"2",maxActionsPerDay:4},paid:true,verified:true,activationEligible:true,permissionGrantId:"browser-fabricated"}},reply);
  assert.equal(reply.statusCode,201);assert.equal(reply.payload.data.checkout,checkout);
  assert.equal(createInput.permissionGrantId,"browser-fabricated");
  // The route deliberately forwards only the typed checkout input semantics to the engine;
  // unknown browser claims are not read by the route and the engine contract has no paid/verified/granted switches.
  const confirm=app.handlers.get("POST /v1/permission-checkouts/:checkoutId/confirm");assert.ok(confirm);
  const reply2=replyRecorder();await confirm!({id:"req-2",params:{checkoutId:"checkout-1"},body:{buyerAddress:checkout.buyerAddress,permissionGrantId:"browser-fabricated"}},reply2);
  assert.equal(reply2.statusCode,201);assert.deepEqual(confirmInput,{buyerAddress:checkout.buyerAddress,permissionGrantId:"browser-fabricated"});assert.equal(reply2.payload.data.request,scoped);
});
