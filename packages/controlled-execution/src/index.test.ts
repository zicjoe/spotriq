import test from "node:test";
import assert from "node:assert/strict";
import { keccak256, toBytes } from "viem";
import { createControlledExecutionEngine, MemoryControlledExecutionStore, ControlledExecutionError } from "./index.js";
import type { BoundaryFinancialReadiness, BoundaryFinancialSessionObservation, BoundedPermissionRequest, FinancialExecutionBoundary, RebalancingExecutionPlan } from "@spotriq/domain";

const wallet="0x1111111111111111111111111111111111111111";
const pm="0x2222222222222222222222222222222222222222";
const token0="0x3333333333333333333333333333333333333333";
const token1="0x4444444444444444444444444444444444444444";
const now=new Date("2026-08-22T20:00:00Z");
const future="2026-08-22T21:00:00.000Z";

function plan():RebalancingExecutionPlan{return {planId:"plan-1",jobIntentId:"job-1",permissionRequestId:"perm-1",serviceId:"service-1",walletAddress:wallet,network:"testnet",chainId:97,state:"REVIEWED",targetRange:{tickLower:-50,tickUpper:50,tickSpacing:10,currentTickAtReview:0,state:"USER_REVIEWED",proposedBy:"USER",reviewedAt:now.toISOString(),detail:"ok"},positionSnapshot:{tokenId:"77",owner:wallet,positionManager:pm,token0:{address:token0,symbol:"T0",decimals:18,isNative:false},token1:{address:token1,symbol:"T1",decimals:18,isNative:false},feePips:500,tickLower:-120,tickUpper:120,currentTick:0,tickSpacing:10,liquidityRaw:"1000",recordedTokensOwed0Raw:"0",recordedTokensOwed1Raw:"0",blockNumber:"100",observedAt:now.toISOString()},quote:{quoteId:"q",jobIntentId:"job-1",blockNumber:"100",observedAt:now.toISOString(),expiresAt:future,method:"PANCAKESWAP_V3_ETH_CALL_SIMULATION",liquidityRaw:"1000",expectedDecreaseAmount0Raw:"1000",expectedDecreaseAmount1Raw:"1000",recordedTokensOwed0Raw:"0",recordedTokensOwed1Raw:"0",expectedCollectAmount0Raw:"1000",expectedCollectAmount1Raw:"1000",evidenceState:"OBSERVED",limitations:[]},steps:[0,1,2].map((index)=>({index,kind:index===0?"DECREASE_LIQUIDITY":index===1?"COLLECT":"MINT",label:`step-${index}`,call:{to:pm,data:`0x12${index}0`,valueRaw:"0"},callHash:`0x${String(index+1).repeat(64)}`,decodedSummary:index===2?{amount0DesiredRaw:"900",amount1DesiredRaw:"900"}:{amount0MinRaw:"800",amount1MinRaw:"800"},guard:{reportId:`r-${index}`,proposalId:`p-${index}`,jobIntentId:"job-1",permissionRequestId:"perm-1",serviceId:"service-1",state:"PASS",checks:[],checkedAt:now.toISOString(),methodVersion:"g",argumentGuardSatisfied:true,nonBypassableBoundarySatisfied:true,executionEligible:false,limitations:[]}})) as any,planHash:`0x${"ab".repeat(32)}`,guardState:"PASS",enforcementBoundaryId:"boundary-1",executionEligible:false,createdAt:now.toISOString(),updatedAt:now.toISOString(),expiresAt:future,methodVersion:"p",limitations:[]};}
function request():BoundedPermissionRequest{return {permissionRequestId:"perm-1",jobIntentId:"job-1",serviceId:"service-1",walletAddress:wallet,provider:"ALTANA",network:"testnet",chainId:97,protocol:"PancakeSwap",positionManager:pm,tokenId:"77",callAllowlist:[],spendCaps:[{token:token0,symbol:"T0",decimals:18,limitRaw:"1000",limitDisplay:"0.000000000000001",period:"hour",provenance:"user-proposed"},{token:token1,symbol:"T1",decimals:18,limitRaw:"1000",limitDisplay:"0.000000000000001",period:"hour",provenance:"user-proposed"}],expiresAt:future,expiryUnix:Math.floor(new Date(future).getTime()/1000),status:"CONFIRMED",providerSubmissionState:"RECONCILED",safetyPrerequisites:[],submissionBlockers:[],walletControl:"VERIFIED_CONTROL",scopeProvenance:"marketplace-derived",activationEligible:false,methodVersion:"a",createdAt:now.toISOString(),updatedAt:now.toISOString(),limitations:[]};}
function boundary():FinancialExecutionBoundary{return {boundaryId:"boundary-1",planId:"plan-1",jobIntentId:"job-1",permissionRequestId:"perm-1",serviceId:"service-1",walletAddress:wallet,network:"testnet",state:"SEALED",planHash:plan().planHash,approvedCallHashes:plan().steps.map(x=>x.callHash),approvedStepCount:3,dispatchPolicy:"EXACT_PLAN_CALL_HASH_AND_ORDER",externalAgentRole:"AUTHENTICATED_PROPOSER_ONLY",financialSignerCustody:"BOUNDARY_CONTROLLED_ALTANA_TESTNET_SESSION",financialSessionId:"session-1",signerProvisioned:true,nonBypassable:true,executionEligible:false,sealedAt:now.toISOString(),expiresAt:future,methodVersion:"b",limitations:[]};}
function session():BoundaryFinancialSessionObservation{return {financialSessionId:"session-1",boundaryId:"boundary-1",planId:"plan-1",jobIntentId:"job-1",permissionRequestId:"perm-1",serviceId:"service-1",walletAddress:wallet,network:"testnet",chainId:97,provider:"ALTANA",state:"ACTIVE",custody:"SPOTRIQ_BOUNDARY_EPHEMERAL_CLIENT_SIGNER",sessionPublicKey:`0x04${"33".repeat(64)}`,keyId:`0x${"aa".repeat(32)}`,requestedCalls:[],grantedCalls:[],requestedSpendCaps:[],grantedSpendCaps:[],expiryUnix:Math.floor(new Date(future).getTime()/1000),expiresAt:future,reconciliation:"EXACT_MATCH",reconciliationReasons:[],keystoreAddress:"0x6b8361C29d05D498b1a12B54A37310f94171E94A",onchainValid:true,verifiedAt:now.toISOString(),exactBoundaryScope:true,distinctFromAgentProposalKey:true,externalAgentHasFinancialSigner:false,signerProvisioned:true,executionEligible:false,methodVersion:"s",limitations:[]};}
function readiness(approval=true):BoundaryFinancialReadiness{return {readinessId:"ready-1",boundaryId:"boundary-1",planId:"plan-1",financialSessionId:"session-1",walletAddress:wallet,positionManager:pm,state:approval?"APPROVAL_REQUIRED":"READY_FOR_CONTROLLED_EXECUTION_MILESTONE",assets:[token0,token1].map((token,i)=>({token,symbol:`T${i}`,decimals:18,requiredForMintRaw:"900",currentBalanceRaw:"100",expectedPlanInflowRaw:"1000",projectedBalanceRaw:"1100",allowanceToPositionManagerRaw:approval?(i===0?"10":"0"):"900",balanceState:"PROJECTED_SUFFICIENT",allowanceState:approval?"APPROVAL_REQUIRED":"SUFFICIENT"})),observedBlockNumber:"500",checkedAt:now.toISOString(),sessionOnchainValid:true,exactBoundaryScope:true,freshBoundaryRequired:true,executionEligible:false,limitations:[]};}

function fixture(initialApproval=true,effects=true){
  let b=boundary(); let currentReadiness=readiness(initialApproval); let consumed=0;
  const boundaries={get:async()=>structuredClone(b),authorizeCall:async()=>({state:"APPROVED_FOR_BOUNDARY" as const,exactPlanCall:true,correctOrder:true}),preflight:async()=>({preflightId:"pf",boundaryId:b.boundaryId,planId:b.planId,state:"PASS_EXECUTION_DISABLED" as const,checks:[],checkedAt:now.toISOString(),financialGrantRequired:false,financialSessionId:"session-1",signerProvisioned:true,executionEligible:false as const,limitations:[]}),consume:async()=>{consumed++;b={...b,state:"CONSUMED"};return structuredClone(b);}};
  const authority={getRequest:async()=>request(),getBoundaryFinancialSessionForBoundary:async()=>session(),reverifyBoundaryFinancialSession:async()=>session(),assessBoundaryFinancialReadiness:async()=>structuredClone(currentReadiness)};
  const topicUint=(value:string|number|bigint)=>`0x${BigInt(value).toString(16).padStart(64,"0")}`;
  const topicAddress=(value:string)=>`0x${value.toLowerCase().replace(/^0x/,"").padStart(64,"0")}`;
  const logs=effects?[
    {address:pm,topics:[keccak256(toBytes("DecreaseLiquidity(uint256,uint128,uint256,uint256)")),topicUint(77)],data:"0x",logIndex:0},
    {address:pm,topics:[keccak256(toBytes("Collect(uint256,address,uint256,uint256)")),topicUint(77)],data:"0x",logIndex:1},
    {address:pm,topics:[keccak256(toBytes("Transfer(address,address,uint256)")),`0x${"0".repeat(64)}`,topicAddress(wallet),topicUint(88)],data:"0x",logIndex:2},
  ]:[];
  const chain={getTransactionReceipt:async(hash:string)=>({network:"testnet" as const,chainId:97,transactionHash:hash,blockNumber:"501",blockHash:`0x${"11".repeat(32)}`,status:"SUCCESS" as const,gasUsedRaw:"123",logs})};
  const pancakeSwap={getV3Position:async(tokenId:string|number|bigint)=>{const minted=BigInt(tokenId)===88n;return {protocol:"PancakeSwap" as const,version:"V3" as const,network:"testnet" as const,chainId:97,positionManager:pm,tokenId:minted?"88":"77",owner:wallet,pool:{protocol:"PancakeSwap" as const,version:"V3" as const,network:"testnet" as const,chainId:97,poolAddress:"0x5555555555555555555555555555555555555555",token0:{address:token0,decimals:18,isNative:false},token1:{address:token1,decimals:18,isNative:false},feePips:500,tickSpacing:10,currentTick:0,sqrtPriceX96:"1",liquidityRaw:"1",blockNumber:"501",observedAt:now.toISOString(),evidence:[]},tickLower:minted?-50:-120,tickUpper:minted?50:120,liquidityRaw:minted?"900":"0",rangeState:"IN_RANGE" as const,recordedTokensOwed0Raw:"0",recordedTokensOwed1Raw:"0",blockNumber:"501",observedAt:now.toISOString(),evidence:[],coverage:{ownership:"AVAILABLE" as const,poolState:"AVAILABLE" as const,tokenMetadata:"AVAILABLE" as const,fees:"RECORDED_ONLY" as const,valuation:"NOT_SUPPORTED" as const}};}};
  const engine=createControlledExecutionEngine({store:new MemoryControlledExecutionStore(),boundaries,plans:{get:async()=>plan()},authority,chain,pancakeSwap});
  return{engine,setReadiness:(v:BoundaryFinancialReadiness)=>{currentReadiness=v;},consumed:()=>consumed};
}

test("bounded approval plan never uses unlimited allowance and zero-first resets an existing allowance",async()=>{const {engine}=fixture(true);const {plan:p}=await engine.prepareApprovalPlan("boundary-1",now);assert.equal(p.state,"REVIEW_REQUIRED");assert.equal(p.calls.length,3);assert.equal(p.calls[0]?.phase,"RESET");assert.equal(p.calls[0]?.approvalAmountRaw,"0");assert.equal(p.calls[1]?.approvalAmountRaw,"900");assert.equal(p.calls[2]?.approvalAmountRaw,"900");assert.ok(p.calls.every(c=>c.approvalAmountRaw!==((1n<<256n)-1n).toString()));});

test("approval observation requires explicit review and independently refreshed allowance state",async()=>{const f=fixture(true);const {plan:p}=await f.engine.prepareApprovalPlan("boundary-1",now);await assert.rejects(()=>f.engine.observeApproval(p.approvalPlanId,{callsId:"0x12",status:"CONFIRMED"},now),(e:any)=>e instanceof ControlledExecutionError&&e.code==="INVALID_STATE");const reviewed=await f.engine.reviewApprovalPlan(p.approvalPlanId,now);assert.equal(reviewed.state,"REVIEWED");f.setReadiness(readiness(false));const result=await f.engine.observeApproval(p.approvalPlanId,{callsId:"0x12",status:"CONFIRMED"},now);assert.equal(result.observation.allowancesSatisfied,true);assert.equal(result.plan.state,"CONFIRMED");});

test("controlled execution refuses to prepare while exact token approval is still required",async()=>{const {engine}=fixture(true);await assert.rejects(()=>engine.prepareExecution("boundary-1",now),(e:any)=>e instanceof ControlledExecutionError&&e.code==="APPROVAL_REQUIRED");});

test("controlled execution becomes one short-lived exact dispatch only after fresh checks",async()=>{const {engine}=fixture(false);const {execution}=await engine.prepareExecution("boundary-1",now);assert.equal(execution.state,"READY_TO_DISPATCH");assert.equal(execution.executionEligible,true);assert.equal(execution.calls.length,3);assert.deepEqual(execution.calls.map(x=>x.callHash),plan().steps.map(x=>x.callHash));});

test("provider failure records a failed attempt and does not consume the sealed boundary",async()=>{const f=fixture(false);const {execution}=await f.engine.prepareExecution("boundary-1",now);const failed=await f.engine.observeExecution(execution.executionId,{callsId:"0x12",status:"FAILED"},now);assert.equal(failed.state,"FAILED");assert.equal(f.consumed(),0);});

test("successful BSC receipt confirms execution and consumes the boundary exactly once",async()=>{const f=fixture(false);const {execution}=await f.engine.prepareExecution("boundary-1",now);const tx=`0x${"99".repeat(32)}`;const confirmed=await f.engine.observeExecution(execution.executionId,{callsId:"0x12",status:"CONFIRMED",transactionHash:tx},now);assert.equal(confirmed.state,"CONFIRMED");assert.equal(confirmed.receipt?.status,"SUCCESS");assert.equal(confirmed.oldPositionLiquidityRawAfter,"0");assert.equal(confirmed.executionEligible,false);assert.equal(f.consumed(),1);const again=await f.engine.observeExecution(execution.executionId,{callsId:"0x12",status:"CONFIRMED",transactionHash:tx},now);assert.equal(again.state,"CONFIRMED");assert.equal(f.consumed(),1);});

test("a confirmed controlled execution is terminal and cannot be prepared again from the consumed boundary",async()=>{
  const f=fixture(false);
  const {execution}=await f.engine.prepareExecution("boundary-1",now);
  const tx=`0x${"88".repeat(32)}`;
  const confirmed=await f.engine.observeExecution(execution.executionId,{callsId:"0x34",status:"CONFIRMED",transactionHash:tx},now);
  assert.equal(confirmed.state,"CONFIRMED");
  await assert.rejects(()=>f.engine.prepareExecution("boundary-1",now),(e:any)=>e instanceof ControlledExecutionError&&e.code==="INVALID_STATE");
  assert.equal(f.consumed(),1);
});


test("a successful unrelated receipt cannot consume the boundary or complete the reviewed execution",async()=>{
  const f=fixture(false,false);
  const {execution}=await f.engine.prepareExecution("boundary-1",now);
  const tx=`0x${"77".repeat(32)}`;
  const observed=await f.engine.observeExecution(execution.executionId,{callsId:"0x56",status:"CONFIRMED",transactionHash:tx},now);
  assert.equal(observed.receipt?.status,"SUCCESS");
  assert.equal(observed.state,"BLOCKED");
  assert.equal(observed.mintedPositionVerified,false);
  assert.equal(f.consumed(),0);
});
