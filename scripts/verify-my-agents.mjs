import process from "node:process";
import { randomUUID } from "node:crypto";

const base=(process.env.SPOTRIQ_ACCEPTANCE_BASE_URL||process.env.PUBLIC_API_BASE_URL||"https://spotriq-production.up.railway.app").replace(/\/$/,"");
const buyer=String(process.env.SPOTRIQ_ACCEPTANCE_BUYER_ADDRESS||"").trim().toLowerCase();
if(!/^0x[0-9a-f]{40}$/.test(buyer))throw new Error("Set SPOTRIQ_ACCEPTANCE_BUYER_ADDRESS to the BSC Testnet wallet used for acceptance.");
if(Number(process.env.SPOTRIQ_ACCEPTANCE_BUYER_CHAIN_ID||"97")!==97)throw new Error("v0.28 My Agents acceptance is BSC Testnet-only. Set SPOTRIQ_ACCEPTANCE_BUYER_CHAIN_ID=97.");
async function json(path,init){const response=await fetch(`${base}${path}`,{...init,headers:{accept:"application/json",...(init?.body?{"content-type":"application/json"}:{}),...(init?.headers||{})}});const body=await response.json().catch(()=>undefined);if(!response.ok)throw new Error(`${path} returned HTTP ${response.status}: ${JSON.stringify(body)}`);return body?.data;}

const services=["rangekeeper","gridpilot","yieldpilot","venusguard"].map(slug=>`svc:reference:${slug}`);
const activations=[];
for(const serviceId of services){
  const nonce=randomUUID();
  const detail=(await json(`/v1/services/${encodeURIComponent(serviceId)}`))?.record;
  if(detail?.service?.serviceId!==serviceId)throw new Error(`${serviceId}: live service profile unavailable.`);
  const tests=(await json(`/v1/services/${encodeURIComponent(serviceId)}/tests`,{method:"POST"}))?.tests;
  if(tests?.coverage!=="PASS")throw new Error(`${serviceId}: live Marketplace Test Lab did not PASS.`);
  const offer=(await json(`/v1/services/${encodeURIComponent(serviceId)}/offers`))?.offers?.[0];
  const quote=(await json("/v1/quotes",{method:"POST",body:JSON.stringify({serviceId,offerId:offer?.offerId,buyerAddress:buyer,buyerChainId:97,idempotencyKey:`v028:q:${serviceId}:${nonce}`})}))?.quote;
  const hire=(await json("/v1/hires",{method:"POST",body:JSON.stringify({quoteId:quote?.quoteId,buyerAddress:buyer,idempotencyKey:`v028:h:${serviceId}:${nonce}`})}))?.hire;
  const activation=(await json(`/v1/hires/${encodeURIComponent(hire?.hireId)}/activate`,{method:"POST",body:JSON.stringify({buyerAddress:buyer,idempotencyKey:`v028:a:${serviceId}:${nonce}`})}))?.activation;
  if(activation?.state!=="ACTIVE")throw new Error(`${serviceId}: FREE read-only Activation missing.`);
  activations.push(activation);
}

let portfolio=(await json(`/v1/accounts/${encodeURIComponent(buyer)}/my-agents`))?.portfolio;
for(const activation of activations){
  const item=portfolio?.active?.find(x=>x?.activation?.activationId===activation.activationId);
  if(!item)throw new Error(`${activation.serviceId}: ACTIVE relationship missing from live My Agents portfolio.`);
  if(item.hasReconciledPermissionGrant!==false)throw new Error(`${activation.serviceId}: My Agents fabricated a PermissionGrant.`);
  if(item.activityOutcome?.outcome?.financialOutcome?.value && item.activityOutcome.outcome.financialOutcome.value!=="Could Not Assess")throw new Error(`${activation.serviceId}: My Agents surfaced an unsupported financial outcome.`);
}

// Persist a same-service switch as BLOCKED; this proves switching cannot fake a no-op state change.
const source=activations[0];
const sameService=(await json(`/v1/accounts/${encodeURIComponent(buyer)}/my-agents/${encodeURIComponent(source.activationId)}/switch`,{method:"POST",body:JSON.stringify({targetServiceId:source.serviceId,idempotencyKey:`v028:same:${randomUUID()}`})}))?.switch;
if(sameService?.state!=="BLOCKED"||!sameService?.blockers?.length)throw new Error("Same-service switch must persist as BLOCKED rather than mutating Activation state.");
const switches=(await json(`/v1/accounts/${encodeURIComponent(buyer)}/my-agents/switches`))?.switches??[];
if(!switches.some(x=>x.switchId===sameService.switchId))throw new Error("Blocked switch history did not persist.");

for(const activation of activations){
  const revoked=(await json(`/v1/accounts/${encodeURIComponent(buyer)}/my-agents/${encodeURIComponent(activation.activationId)}/revoke`,{method:"POST",body:JSON.stringify({buyerAddress:buyer})}))?.activation;
  if(revoked?.state!=="REVOKED")throw new Error(`${activation.serviceId}: My Agents relationship revocation did not persist.`);
}
portfolio=(await json(`/v1/accounts/${encodeURIComponent(buyer)}/my-agents`))?.portfolio;
for(const activation of activations){
  if(portfolio?.active?.some(x=>x?.activation?.activationId===activation.activationId))throw new Error(`${activation.serviceId}: revoked relationship still appears active.`);
  if(!portfolio?.history?.some(x=>x?.activation?.activationId===activation.activationId))throw new Error(`${activation.serviceId}: revoked relationship missing from history.`);
}
console.log("PASS: Spotriq v0.28 My Agents + switching/revocation + live marketplace UX acceptance contract passed without merging commercial, permission, runtime or outcome state.");
