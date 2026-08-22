import test from "node:test";
import assert from "node:assert/strict";
import type { BoundaryFinancialSessionObservation, BoundedPermissionRequest, FinancialExecutionBoundary, PancakeSwapClPositionSnapshot, RebalancingExecutionPlan } from "@spotriq/domain";
import type { PancakeSwapReader } from "@spotriq/protocol-pancakeswap";
import { createExecutionBoundaryEngine, MemoryExecutionBoundaryStore } from "./index.js";
const wallet="0x1111111111111111111111111111111111111111",pm="0x2222222222222222222222222222222222222222",token0="0x3333333333333333333333333333333333333333",token1="0x4444444444444444444444444444444444444444",pool="0x5555555555555555555555555555555555555555";
function request():BoundedPermissionRequest{return {permissionRequestId:"perm-1",jobIntentId:"job-1",serviceId:"service-1",walletAddress:wallet,provider:"ALTANA",network:"testnet",chainId:97,protocol:"PancakeSwap",positionManager:pm,tokenId:"77",callAllowlist:[],spendCaps:[],expiresAt:new Date(Date.now()+600000).toISOString(),expiryUnix:Math.floor(Date.now()/1000)+600,status:"READY",providerSubmissionState:"SAFETY_PREREQUISITES_REQUIRED",safetyPrerequisites:[{code:"TRUSTED_AGENT_SESSION_KEY",state:"SATISFIED",blocking:false,label:"key",detail:"ok",provenance:"marketplace-derived"},{code:"ARGUMENT_LEVEL_EXECUTION_GUARD",state:"SATISFIED",blocking:false,label:"guard",detail:"ok",provenance:"marketplace-derived"},{code:"NON_BYPASSABLE_FINANCIAL_EXECUTION_BOUNDARY",state:"REQUIRED",blocking:true,label:"boundary",detail:"needed",provenance:"marketplace-derived"}],trustedAgentBinding:{bindingId:"b1",serviceId:"service-1",agentId:"agent-1",state:"VERIFIED",interactionKind:"A2A",runtimeEndpoint:"https://a.example",agentCardUrl:"https://a.example/.well-known/agent-card.json",extensionUri:"urn:spotriq:authority-binding:v1",signatureScheme:"EIP191_SECP256K1",sessionPublicKey:"0x04aa",observedAt:new Date().toISOString(),evidenceIds:[],methodVersion:"x",detail:"ok",limitations:[]},submissionBlockers:[],walletControl:"VERIFIED_CONTROL",scopeProvenance:"marketplace-derived",activationEligible:false,methodVersion:"a",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),limitations:[]};}
function position():PancakeSwapClPositionSnapshot{return {protocol:"PancakeSwap",version:"V3",network:"testnet",chainId:97,positionManager:pm,tokenId:"77",owner:wallet,pool:{protocol:"PancakeSwap",version:"V3",network:"testnet",chainId:97,poolAddress:pool,token0:{address:token0,decimals:18,isNative:false},token1:{address:token1,decimals:18,isNative:false},feePips:500,tickSpacing:10,currentTick:0,sqrtPriceX96:"1",liquidityRaw:"1",blockNumber:"102",observedAt:new Date().toISOString(),evidence:[]},tickLower:-120,tickUpper:120,liquidityRaw:"1000",rangeState:"IN_RANGE",recordedTokensOwed0Raw:"0",recordedTokensOwed1Raw:"0",blockNumber:"102",observedAt:new Date().toISOString(),evidence:[],coverage:{ownership:"AVAILABLE",poolState:"AVAILABLE",tokenMetadata:"AVAILABLE",fees:"RECORDED_ONLY",valuation:"NOT_SUPPORTED"}};}
function plan():RebalancingExecutionPlan{const exp=new Date(Date.now()+600000).toISOString();return {planId:"plan-1",jobIntentId:"job-1",permissionRequestId:"perm-1",serviceId:"service-1",walletAddress:wallet,network:"testnet",chainId:97,state:"REVIEWED",targetRange:{tickLower:-50,tickUpper:50,tickSpacing:10,currentTickAtReview:0,state:"USER_REVIEWED",proposedBy:"USER",reviewedAt:new Date().toISOString(),detail:"ok"},positionSnapshot:{tokenId:"77",owner:wallet,positionManager:pm,poolAddress:pool,token0:{address:token0,decimals:18,isNative:false},token1:{address:token1,decimals:18,isNative:false},feePips:500,tickLower:-120,tickUpper:120,currentTick:0,tickSpacing:10,liquidityRaw:"1000",recordedTokensOwed0Raw:"0",recordedTokensOwed1Raw:"0",blockNumber:"101",observedAt:new Date().toISOString()},quote:{quoteId:"q",jobIntentId:"job-1",blockNumber:"101",observedAt:new Date().toISOString(),expiresAt:exp,method:"PANCAKESWAP_V3_ETH_CALL_SIMULATION",liquidityRaw:"1000",expectedDecreaseAmount0Raw:"1000",expectedDecreaseAmount1Raw:"1000",recordedTokensOwed0Raw:"0",recordedTokensOwed1Raw:"0",expectedCollectAmount0Raw:"1000",expectedCollectAmount1Raw:"1000",evidenceState:"OBSERVED",limitations:[]},steps:[{index:0,kind:"DECREASE_LIQUIDITY",label:"d",call:{to:pm,data:"0x1234",valueRaw:"0"},callHash:"0xd7d2d2f48f0c847d8270fd4ed1d514cce306783f8778347784e068a26b7f3e5d",decodedSummary:{amount0MinRaw:"900",amount1MinRaw:"900"},guard:{reportId:"r",proposalId:"p",jobIntentId:"job-1",permissionRequestId:"perm-1",serviceId:"service-1",state:"PASS",checks:[],checkedAt:new Date().toISOString(),methodVersion:"g",argumentGuardSatisfied:true,nonBypassableBoundarySatisfied:false,executionEligible:false,limitations:[]}}],planHash:"0xabc",guardState:"PASS",executionEligible:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),expiresAt:exp,methodVersion:"p",limitations:[]};}
function reader():PancakeSwapReader{return {getV3Position:async()=>position(),quoteV3DecreaseLiquidity:async()=>({protocol:"PancakeSwap",version:"V3",network:"testnet",chainId:97,positionManager:pm,tokenId:"77",owner:wallet,liquidityRaw:"1000",expectedAmount0Raw:"1000",expectedAmount1Raw:"1000",recordedTokensOwed0Raw:"0",recordedTokensOwed1Raw:"0",blockNumber:"102",observedAt:new Date().toISOString(),quoteMethod:"ETH_CALL_SIMULATION",limitations:[]})} as unknown as PancakeSwapReader;}

test("seals only exact reviewed plan hashes and never provisions a signer",async()=>{const p=plan();const engine=createExecutionBoundaryEngine({store:new MemoryExecutionBoundaryStore(),plans:{get:async()=>p},pancakeSwap:reader()});const b=await engine.seal(p,request());assert.equal(b.nonBypassable,true);assert.equal(b.externalAgentRole,"AUTHENTICATED_PROPOSER_ONLY");assert.equal(b.financialSignerCustody,"BOUNDARY_CONTROLLED_NOT_PROVISIONED");assert.equal(b.executionEligible,false);});

test("boundary rejects calldata that differs from the sealed plan",async()=>{const p=plan();const engine=createExecutionBoundaryEngine({plans:{get:async()=>p},pancakeSwap:reader()});const b=await engine.seal(p,request());const decision=await engine.authorizeCall(b.boundaryId,0,{to:pm,data:"0xbeef",valueRaw:"0"});assert.equal(decision.state,"BLOCKED");assert.equal(decision.executionEligible,false);});

test("fresh LP state can pass preflight while financial authority remains required",async()=>{const p=plan();const engine=createExecutionBoundaryEngine({plans:{get:async()=>p},pancakeSwap:reader()});const b=await engine.seal(p,request());const result=await engine.preflight(b.boundaryId,request());assert.equal(result.state,"PASS_AUTHORITY_REQUIRED");assert.equal(result.signerProvisioned,false);assert.equal(result.financialGrantRequired,true);});


function activeFinancialSession(boundary: FinancialExecutionBoundary): BoundaryFinancialSessionObservation {
  return {
    financialSessionId: "financial-session-1", boundaryId: boundary.boundaryId, planId: boundary.planId, jobIntentId: boundary.jobIntentId,
    permissionRequestId: boundary.permissionRequestId, serviceId: boundary.serviceId, walletAddress: boundary.walletAddress, network: "testnet", chainId: 97,
    provider: "ALTANA", state: "ACTIVE", custody: "SPOTRIQ_BOUNDARY_EPHEMERAL_CLIENT_SIGNER", sessionPublicKey: `0x04${"33".repeat(64)}`,
    keyId: `0x${"aa".repeat(32)}`, transactionHash: `0x${"bb".repeat(32)}`, requestedCalls: [], grantedCalls: [], requestedSpendCaps: [], grantedSpendCaps: [],
    expiryUnix: Math.floor(Date.now() / 1000) + 600, expiresAt: new Date(Date.now() + 600000).toISOString(), reconciliation: "EXACT_MATCH", reconciliationReasons: [],
    keystoreAddress: "0x6b8361C29d05D498b1a12B54A37310f94171E94A", onchainValid: true, verifiedAt: new Date().toISOString(), verifiedBlockNumber: "700",
    exactBoundaryScope: true, distinctFromAgentProposalKey: true, externalAgentHasFinancialSigner: false, signerProvisioned: true, executionEligible: false,
    methodVersion: "test", limitations: [],
  };
}

test("linking an exact active Altana financial session provisions the boundary signer but still cannot execute", async () => {
  const p = plan();
  const store = new MemoryExecutionBoundaryStore();
  const engine = createExecutionBoundaryEngine({ store, plans: { get: async () => p }, pancakeSwap: reader() });
  const sealed = await engine.seal(p, request());
  const session = activeFinancialSession(sealed);
  const linked = await engine.linkFinancialSession(sealed.boundaryId, session);
  assert.equal(linked.financialSignerCustody, "BOUNDARY_CONTROLLED_ALTANA_TESTNET_SESSION");
  assert.equal(linked.financialSessionId, session.financialSessionId);
  assert.equal(linked.signerProvisioned, true);
  assert.equal(linked.executionEligible, false);
  const preflight = await engine.preflight(linked.boundaryId, request(), session);
  assert.equal(preflight.state, "PASS_EXECUTION_DISABLED");
  assert.equal(preflight.financialGrantRequired, false);
  assert.equal(preflight.signerProvisioned, true);
  assert.equal(preflight.executionEligible, false);
});

test("a consumed financial execution boundary is terminal and blocks replay", async () => {
  const p = plan();
  const store = new MemoryExecutionBoundaryStore();
  const engine = createExecutionBoundaryEngine({ store, plans: { get: async () => p }, pancakeSwap: reader() });
  const sealed = await engine.seal(p, request());
  const consumed = await engine.consume(sealed.boundaryId);
  assert.equal(consumed.state, "CONSUMED");
  const again = await engine.consume(sealed.boundaryId);
  assert.equal(again.state, "CONSUMED");
  const exactStep = p.steps[0]!;
  const decision = await engine.authorizeCall(sealed.boundaryId, 0, exactStep.call);
  assert.equal(decision.state, "BLOCKED");
  assert.equal(decision.executionEligible, false);
});
