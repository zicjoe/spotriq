import process from "node:process";
import { randomUUID } from "node:crypto";

const base=(process.env.SPOTRIQ_ACCEPTANCE_BASE_URL||process.env.PUBLIC_API_BASE_URL||"https://spotriq-production.up.railway.app").replace(/\/$/,"");
const fallbackBuyer=String(process.env.SPOTRIQ_ACCEPTANCE_BUYER_ADDRESS||"").trim().toLowerCase();
const explicitPlanWallet=String(process.env.SPOTRIQ_ACCEPTANCE_PLAN_WALLET_ADDRESS||"").trim().toLowerCase();
const rangeTokenId=String(process.env.SPOTRIQ_ACCEPTANCE_RANGEKEEPER_TOKEN_ID||"").trim();
const requestedCheckId=String(process.env.SPOTRIQ_ACCEPTANCE_CHECK_SESSION_ID||"").trim();

async function json(path,init){
  const response=await fetch(`${base}${path}`,{...init,headers:{accept:"application/json",...(init?.body?{"content-type":"application/json"}:{}),...(init?.headers||{})}});
  const body=await response.json().catch(()=>undefined);
  if(!response.ok)throw new Error(`${path} returned HTTP ${response.status}: ${JSON.stringify(body)}`);
  return body?.data;
}

function validAddress(value){return /^0x[0-9a-f]{40}$/.test(value);}

let checkId=requestedCheckId;
let check;
let planWallet=explicitPlanWallet;

if(checkId){
  check=await json(`/v1/checks/${encodeURIComponent(checkId)}`);
  const checkWallet=String(check?.session?.walletAddress||"").trim().toLowerCase();
  if(!planWallet&&validAddress(checkWallet))planWallet=checkWallet;
}

if(!planWallet&&/^\d+$/.test(rangeTokenId)){
  const positionData=await json(`/v1/protocols/pancakeswap/positions/v3/${encodeURIComponent(rangeTokenId)}`);
  const owner=String(positionData?.position?.owner||"").trim().toLowerCase();
  if(validAddress(owner))planWallet=owner;
}

if(!planWallet)planWallet=fallbackBuyer;
if(!validAddress(planWallet))throw new Error("Set SPOTRIQ_ACCEPTANCE_PLAN_WALLET_ADDRESS (or SPOTRIQ_ACCEPTANCE_BUYER_ADDRESS), provide SPOTRIQ_ACCEPTANCE_CHECK_SESSION_ID, or keep SPOTRIQ_ACCEPTANCE_RANGEKEEPER_TOKEN_ID set so Spotriq can derive a live BSC Testnet wallet with a supported finding.");

if(!checkId){
  const started=await json("/v1/checks",{method:"POST",body:JSON.stringify({walletAddress:planWallet,walletControl:"WATCH_ONLY"})});
  checkId=started?.session?.checkSessionId;
  if(!checkId)throw new Error("Smart Money Check did not return checkSessionId.");
  for(let i=0;i<45;i++){
    await new Promise(r=>setTimeout(r,2000));
    check=await json(`/v1/checks/${encodeURIComponent(checkId)}`);
    if(["COMPLETED","PARTIAL","FAILED"].includes(check?.session?.state))break;
  }
}

if(!check)check=await json(`/v1/checks/${encodeURIComponent(checkId)}`);
const checkWallet=String(check?.session?.walletAddress||"").trim().toLowerCase();
if(validAddress(checkWallet)&&checkWallet!==planWallet){
  throw new Error(`Smart Money Check ${checkId} belongs to ${checkWallet}, not plan wallet ${planWallet}. Use the check wallet as SPOTRIQ_ACCEPTANCE_PLAN_WALLET_ADDRESS or omit that variable.`);
}

const findings=check?.findings??[];
if(!findings.length)throw new Error(`Smart Money Check ${checkId} produced no supported findings for ${planWallet}. Use SPOTRIQ_ACCEPTANCE_PLAN_WALLET_ADDRESS or SPOTRIQ_ACCEPTANCE_CHECK_SESSION_ID for a live check with at least one supported finding; Spotriq will not fabricate plan inputs.`);

const nonce=randomUUID();
const created=(await json(`/v1/checks/${encodeURIComponent(checkId)}/plans`,{method:"POST",body:JSON.stringify({buyerAddress:planWallet,findingIds:findings.map(x=>x.findingId),idempotencyKey:`v029:${nonce}`})}))?.plan;
if(!created?.planId||created.checkSessionId!==checkId||created.buyerAddress!==planWallet)throw new Error("Plan creation did not persist the check/buyer context.");
if(created.executionMode!=="NO_SHARED_EXECUTION"||created.authorityMode!=="INDEPENDENT_PER_SERVICE"||created.activationMode!=="INDEPENDENT_PER_SERVICE")throw new Error("Plan collapsed independent service authority/execution into a super-agent abstraction.");
if(!created.conflictReport||!Array.isArray(created.conflictReport.conflicts))throw new Error("Plan compatibility/conflict report is missing.");
if(created.members.some(m=>!m.findingId||!m.serviceId||!m.matchId))throw new Error("Plan member lost finding/service compatibility provenance.");
const reread=(await json(`/v1/plans/${encodeURIComponent(created.planId)}`))?.plan;
if(reread?.compositionHash!==created.compositionHash)throw new Error("Persisted plan composition changed after creation.");
const retry=(await json(`/v1/checks/${encodeURIComponent(checkId)}/plans`,{method:"POST",body:JSON.stringify({buyerAddress:planWallet,findingIds:findings.map(x=>x.findingId),idempotencyKey:created.idempotencyKey})}))?.plan;
if(retry?.planId!==created.planId||retry?.compositionHash!==created.compositionHash)throw new Error("Exact plan retry was not idempotent.");
const buyerPlans=(await json(`/v1/accounts/${encodeURIComponent(planWallet)}/plans`))?.state?.plans??[];
if(!buyerPlans.some(p=>p.planId===created.planId))throw new Error("Buyer plan history did not persist the created plan.");
console.log(`PASS: ${created.planId} composed ${created.members.length} specialist member(s) from ${findings.length} live finding(s); conflict state ${created.conflictReport.state}.`);
console.log(`PASS: Smart Money Plan acceptance used live watch-only wallet ${planWallet} from ${requestedCheckId?"the supplied check session":explicitPlanWallet?"SPOTRIQ_ACCEPTANCE_PLAN_WALLET_ADDRESS":/^\d+$/.test(rangeTokenId)?`PancakeSwap V3 position ${rangeTokenId}`:"SPOTRIQ_ACCEPTANCE_BUYER_ADDRESS"}.`);
console.log("PASS: Spotriq v0.29 Smart Money Plans + compatibility/conflict contract passed without creating a shared signer, PermissionGrant, Activation or execution session.");
