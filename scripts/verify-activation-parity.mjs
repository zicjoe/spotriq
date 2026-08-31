import process from "node:process";
import { randomUUID } from "node:crypto";

const base=(process.env.SPOTRIQ_ACCEPTANCE_BASE_URL||process.env.PUBLIC_API_BASE_URL||"https://spotriq-production.up.railway.app").replace(/\/$/,"");
const buyer=String(process.env.SPOTRIQ_ACCEPTANCE_BUYER_ADDRESS||"").trim().toLowerCase();
if(!/^0x[0-9a-f]{40}$/.test(buyer))throw new Error("Set SPOTRIQ_ACCEPTANCE_BUYER_ADDRESS to the BSC wallet used for v0.24 acceptance.");
const buyerChainId=Number(process.env.SPOTRIQ_ACCEPTANCE_BUYER_CHAIN_ID||"97");
if(buyerChainId!==56&&buyerChainId!==97)throw new Error("SPOTRIQ_ACCEPTANCE_BUYER_CHAIN_ID must be 56 or 97.");

async function json(path,init){
  const response=await fetch(`${base}${path}`,{...init,headers:{accept:"application/json",...(init?.body?{"content-type":"application/json"}:{}),...(init?.headers||{})}});
  const body=await response.json().catch(()=>undefined);
  if(!response.ok)throw new Error(`${path} returned HTTP ${response.status}: ${JSON.stringify(body)}`);
  return body?.data;
}

let tokenId=String(process.env.SPOTRIQ_ACCEPTANCE_RANGEKEEPER_TOKEN_ID||"").trim();
let poolAddress=String(process.env.SPOTRIQ_ACCEPTANCE_GRID_POOL_ADDRESS||"").trim().toLowerCase();
if(!tokenId||!poolAddress){
  try{
    const positions=(await json(`/v1/wallets/${encodeURIComponent(buyer)}/pancakeswap/positions?max=20`))?.snapshot?.positions??[];
    const v3=positions.find((item)=>item?.version==="V3"&&item?.tokenId&&item?.pool?.poolAddress);
    if(!tokenId&&v3?.tokenId)tokenId=String(v3.tokenId);
    if(!poolAddress&&v3?.pool?.poolAddress)poolAddress=String(v3.pool.poolAddress).toLowerCase();
  }catch(error){
    console.warn(`WARN: automatic PancakeSwap acceptance-context discovery was unavailable: ${error instanceof Error?error.message:String(error)}`);
  }
}
if(!/^\d+$/.test(tokenId))throw new Error("Set SPOTRIQ_ACCEPTANCE_RANGEKEEPER_TOKEN_ID to a real readable BSC Testnet PancakeSwap V3 position tokenId (or use a buyer wallet that owns one so the verifier can discover it).");
if(!/^0x[0-9a-f]{40}$/.test(poolAddress))throw new Error("Set SPOTRIQ_ACCEPTANCE_GRID_POOL_ADDRESS to a real readable BSC Testnet PancakeSwap V3 pool address (or use a buyer wallet with a V3 position so the verifier can discover it).");

const services=[
  {slug:"rangekeeper",category:"rebalancing",capability:"ANALYZE_POSITION",input:{tokenId}},
  {slug:"gridpilot",category:"grid",capability:"ANALYZE_GRID_MARKET",input:{poolAddress,capitalAsset:"acceptance-context",capitalAmount:"descriptive-only"}},
  {slug:"yieldpilot",category:"yield",capability:"SCAN_YIELD_OPPORTUNITIES",input:{}},
  {slug:"venusguard",category:"health",capability:"INSPECT_HEALTH",input:{}},
];

for(const spec of services){
  const serviceId=`svc:reference:${spec.slug}`;
  // Refresh the Test Lab observation because v0.24 task-origin attribution deliberately
  // requires fresh category-capable runtime evidence instead of trusting stale acceptance.
  const tests=(await json(`/v1/services/${encodeURIComponent(serviceId)}/tests`,{method:"POST"}))?.tests;
  if(tests?.coverage!=="PASS")throw new Error(`${serviceId}: fresh Marketplace Test Lab coverage is ${tests?.coverage??"missing"}.`);

  const offer=(await json(`/v1/services/${encodeURIComponent(serviceId)}/offers`))?.offers?.[0];
  if(!offer?.terms||offer.terms.commercialModel!=="FREE"||offer.terms.serviceType!=="READ_ONLY_SERVICE")throw new Error(`${serviceId}: FREE read-only Offer missing.`);
  const nonce=randomUUID();
  const quote=(await json("/v1/quotes",{method:"POST",body:JSON.stringify({serviceId,offerId:offer.offerId,buyerAddress:buyer,buyerChainId,idempotencyKey:`v024:quote:${serviceId}:${nonce}`})}))?.quote;
  const hire=(await json("/v1/hires",{method:"POST",body:JSON.stringify({quoteId:quote?.quoteId,buyerAddress:buyer,idempotencyKey:`v024:hire:${serviceId}:${nonce}`})}))?.hire;
  const activation=(await json(`/v1/hires/${encodeURIComponent(hire?.hireId)}/activate`,{method:"POST",body:JSON.stringify({buyerAddress:buyer,idempotencyKey:`v024:activation:${serviceId}:${nonce}`})}))?.activation;
  if(activation?.state!=="ACTIVE"||activation.walletSigningAuthorityGranted||activation.financialExecutionAuthorityGranted)throw new Error(`${serviceId}: expected ACTIVE read-only Activation with no financial authority.`);

  const control=(await json(`/v1/activations/${encodeURIComponent(activation.activationId)}/control`))?.control;
  if(control?.category!==spec.category||control?.controlTier!=="READ_ONLY"||control?.runtimeCapability?.code!==spec.capability)throw new Error(`${serviceId}: category-specific Activation control mismatch.`);
  if(control.permissions?.walletSigningAuthorityGranted||control.permissions?.financialExecutionAuthorityGranted||control.permissions?.financialWrite?.length)throw new Error(`${serviceId}: read-only control fabricated financial authority.`);

  const task=(await json(`/v1/activations/${encodeURIComponent(activation.activationId)}/service-tasks`,{method:"POST",body:JSON.stringify({buyerAddress:buyer,...spec.input})}))?.task;
  if(task?.originKind!=="ACTIVATION"||task?.category!==spec.category||task?.state!=="COMPLETED"||task?.originProof?.state!=="VERIFIED"||task?.result?.state!=="STRUCTURED")throw new Error(`${serviceId}: activation-bound task did not produce a verified structured ${spec.category} observation: ${JSON.stringify({state:task?.state,origin:task?.originProof?.state,result:task?.result?.state})}`);

  const runtime=(await json(`/v1/activations/${encodeURIComponent(activation.activationId)}/runtime-state`))?.state;
  if(runtime?.observationState!=="OBSERVED")throw new Error(`${serviceId}: runtime observation state is ${runtime?.observationState??"missing"}.`);
  if(runtime?.outcome?.state==="MEASURED")throw new Error(`${serviceId}: read-only runtime observation must not be promoted into a measured financial outcome.`);
  if(spec.category==="health"&&runtime?.monitoring?.state!=="SNAPSHOT_OBSERVED")throw new Error(`${serviceId}: expected a genuine health monitoring snapshot state.`);

  const revoked=(await json(`/v1/activations/${encodeURIComponent(activation.activationId)}/revoke`,{method:"POST",body:JSON.stringify({buyerAddress:buyer})}))?.activation;
  if(revoked?.state!=="REVOKED")throw new Error(`${serviceId}: marketplace relationship revocation failed.`);
  const revokedRuntime=(await json(`/v1/activations/${encodeURIComponent(activation.activationId)}/runtime-state`))?.state;
  if(revokedRuntime?.observationState!=="REVOKED")throw new Error(`${serviceId}: runtime state did not reflect relationship revocation.`);
  console.log(`PASS ${serviceId}: Activation control → ${spec.category} runtime observation → truthful outcome state → revocation.`);
}

console.log("PASS: Spotriq v0.24 four-category read-only activation/runtime parity contract passed for all four reference services.");
