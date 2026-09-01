import test from "node:test";
import assert from "node:assert/strict";
import { createOperatorWorkspaceEngine, MemoryOperatorWorkspaceStore } from "./index.js";

const owner="0x1111111111111111111111111111111111111111";
const serviceId="svc:erc8004:97:7:grid";
const registry:any={
  getAgent:async()=>({discoveryId:"erc8004:97:7",identity:{chainId:97,agentId:"7"}}),
  verifyIdentity:async()=>({state:"VERIFIED",ownerAddress:owner,checkedAt:new Date().toISOString(),registryAddress:"0x0000000000000000000000000000000000000001",registrationMetadataState:"UNAVAILABLE",evidence:[],limitations:[]}),
};
const marketplace:any={
  getService:async()=>({identity:{identity:{chainId:97,agentId:"7"}},service:{serviceId},readiness:{state:"TESTNET_ONLY"}}),
  getTests:async()=>({serviceId,state:"PASS",runs:[]}),
  runTests:async()=>({tests:{serviceId,state:"PASS",runs:[]},readiness:{state:"TESTNET_ONLY"}}),
};

test("signed session + canonical owner claim is required before declarations",async()=>{
  const engine=createOperatorWorkspaceEngine({store:new MemoryOperatorWorkspaceStore(),registry,marketplace,recoverAddress:async()=>owner,now:()=>new Date("2026-09-01T12:00:00Z")});
  const challenge=await engine.createChallenge(owner);
  const {session}=await engine.verifyChallenge({challengeId:challenge.challengeId,signature:`0x${"11".repeat(65)}`});
  await engine.claimAgent(session,{chainId:97,agentId:"7"});
  const d=await engine.upsertDeclaration(session,{chainId:97,agentId:"7",serviceId,category:"grid",name:"Grid Agent",shortDescription:"Grid service",runtimeEndpoints:[{name:"A2A",endpoint:"https://agent.example/a2a",interactionKind:"A2A"}],commercial:{commercialModel:"FREE",paymentRail:"FREE",availability:"AVAILABLE",termsVersion:"1"},permission:{intensity:"read-only",executionMode:"READ_ONLY",protocols:["PancakeSwap"],assets:[],walletSigningRequired:false,financialAuthorityRequired:false}});
  assert.equal(d.lifecycleState,"DRAFT");
  const submitted=await engine.transition(session,d.declarationId,"SUBMITTED");
  assert.equal(submitted.lifecycleState,"SUBMITTED");
  assert.equal(await engine.resolvePublishedOffer(serviceId),undefined);
  const active=await engine.transition(session,d.declarationId,"ACTIVE");
  assert.equal(active.lifecycleState,"ACTIVE");
  const offer=await engine.resolvePublishedOffer(serviceId);
  assert.equal(offer?.state,"AVAILABLE");
  assert.equal(offer?.terms?.paymentRail,"FREE");
});

test("canonical owner mismatch fails closed",async()=>{
  const engine=createOperatorWorkspaceEngine({registry:{...registry,verifyIdentity:async()=>({state:"VERIFIED",ownerAddress:"0x2222222222222222222222222222222222222222"})} as any,marketplace,recoverAddress:async()=>owner});
  const challenge=await engine.createChallenge(owner);const {session}=await engine.verifyChallenge({challengeId:challenge.challengeId,signature:`0x${"11".repeat(65)}`});
  await assert.rejects(()=>engine.claimAgent(session,{chainId:97,agentId:"7"}),/Canonical ERC-8004 ownership/);
});
