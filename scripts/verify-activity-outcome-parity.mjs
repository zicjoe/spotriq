import process from "node:process";
import { randomUUID } from "node:crypto";

const base=(process.env.SPOTRIQ_ACCEPTANCE_BASE_URL||process.env.PUBLIC_API_BASE_URL||"https://spotriq-production.up.railway.app").replace(/\/$/,"");
const buyer=String(process.env.SPOTRIQ_ACCEPTANCE_BUYER_ADDRESS||"").trim().toLowerCase();
if(!/^0x[0-9a-f]{40}$/.test(buyer))throw new Error("Set SPOTRIQ_ACCEPTANCE_BUYER_ADDRESS to the BSC Testnet wallet used for acceptance.");
if(Number(process.env.SPOTRIQ_ACCEPTANCE_BUYER_CHAIN_ID||"97")!==97)throw new Error("v0.27 Activity + Outcome parity acceptance is BSC Testnet-only. Set SPOTRIQ_ACCEPTANCE_BUYER_CHAIN_ID=97.");
async function json(path,init){const response=await fetch(`${base}${path}`,{...init,headers:{accept:"application/json",...(init?.body?{"content-type":"application/json"}:{}),...(init?.headers||{})}});const body=await response.json().catch(()=>undefined);if(!response.ok)throw new Error(`${path} returned HTTP ${response.status}: ${JSON.stringify(body)}`);return body?.data;}

let tokenId=String(process.env.SPOTRIQ_ACCEPTANCE_RANGEKEEPER_TOKEN_ID||"").trim();
let poolAddress=String(process.env.SPOTRIQ_ACCEPTANCE_GRID_POOL_ADDRESS||"").trim().toLowerCase();
let gridAsset=String(process.env.SPOTRIQ_ACCEPTANCE_AUTHORITY_ASSET_ADDRESS||"").trim().toLowerCase();
try{
  if(tokenId){const position=(await json(`/v1/protocols/pancakeswap/positions/v3/${encodeURIComponent(tokenId)}`))?.position;if(!poolAddress&&position?.pool?.poolAddress)poolAddress=String(position.pool.poolAddress).toLowerCase();if(!gridAsset&&position?.pool?.token0?.address)gridAsset=String(position.pool.token0.address).toLowerCase();}
  if(!tokenId||!poolAddress||!gridAsset){const positions=(await json(`/v1/wallets/${encodeURIComponent(buyer)}/pancakeswap/positions?max=20`))?.snapshot?.positions??[];const v3=positions.find(item=>item?.version==="V3"&&item?.tokenId&&item?.pool?.poolAddress&&item?.pool?.token0?.address);if(!tokenId&&v3?.tokenId)tokenId=String(v3.tokenId);if(!poolAddress&&v3?.pool?.poolAddress)poolAddress=String(v3.pool.poolAddress).toLowerCase();if(!gridAsset&&v3?.pool?.token0?.address)gridAsset=String(v3.pool.token0.address).toLowerCase();}
}catch(error){console.warn(`WARN: automatic PancakeSwap acceptance-context discovery was unavailable: ${error instanceof Error?error.message:String(error)}`);}
if(!/^\d+$/.test(tokenId))throw new Error("Set SPOTRIQ_ACCEPTANCE_RANGEKEEPER_TOKEN_ID to a readable BSC Testnet PancakeSwap V3 position tokenId.");
if(!/^0x[0-9a-f]{40}$/.test(poolAddress))throw new Error("Set SPOTRIQ_ACCEPTANCE_GRID_POOL_ADDRESS to a readable BSC Testnet PancakeSwap V3 pool.");
if(!/^0x[0-9a-f]{40}$/.test(gridAsset))throw new Error("Could not derive the Grid authority asset from the selected PancakeSwap V3 position.");

let venusMarket=String(process.env.SPOTRIQ_ACCEPTANCE_VENUS_MARKET_ADDRESS||"").trim().toLowerCase();
let venusAsset=String(process.env.SPOTRIQ_ACCEPTANCE_VENUS_ASSET_ADDRESS||"").trim().toLowerCase();
if(!venusMarket||!venusAsset){try{const markets=(await json("/v1/protocols/venus/markets"))?.snapshot?.markets??[];const candidate=markets.find(m=>m?.vToken&&/^0x[0-9a-fA-F]{40}$/.test(m.vToken)&&m?.underlying?.address&&/^0x[0-9a-fA-F]{40}$/.test(m.underlying.address)&&m.underlying.address.toLowerCase()!=="0x0000000000000000000000000000000000000000");if(!venusMarket&&candidate?.vToken)venusMarket=String(candidate.vToken).toLowerCase();if(!venusAsset&&candidate?.underlying?.address)venusAsset=String(candidate.underlying.address).toLowerCase();}catch(error){console.warn(`WARN: Venus market catalog discovery was unavailable: ${error instanceof Error?error.message:String(error)}`);}}
if(!/^0x[0-9a-f]{40}$/.test(venusMarket)||!/^0x[0-9a-f]{40}$/.test(venusAsset))throw new Error("Could not derive a live BSC Testnet Venus ERC-20 market/underlying pair.");

const specs=[
  {slug:"rangekeeper",category:"rebalancing",task:{tokenId},scope:{category:"rebalancing",positionTokenId:tokenId,token0Limit:"1",token1Limit:"1",maxActionsPerDay:4},proposal:{category:"rebalancing",action:"REBALANCING_EXISTING_BOUNDARY"},metric:"range_state"},
  {slug:"gridpilot",category:"grid",task:{poolAddress,capitalAsset:gridAsset,capitalAmount:"1"},scope:{category:"grid",poolAddress,capitalAssetAddress:gridAsset,capitalLimit:"10",perActionLimit:"2",maxActionsPerDay:12},proposal:{category:"grid",action:"GRID_SWAP_EXACT_INPUT_SINGLE",amountIn:"1",amountOutMinimumRaw:"1",deadlineUnix:Math.floor(Date.now()/1000)+600},metric:"grid_regime"},
  {slug:"yieldpilot",category:"yield",task:{},scope:{category:"yield",assetAddress:venusAsset,allowedMarketAddresses:[venusMarket],capitalLimit:"10",perActionLimit:"2",maxActionsPerDay:4},proposal:{category:"yield",action:"YIELD_SUPPLY",marketAddress:venusMarket,amount:"1"},metric:"yield_opportunity_count"},
  {slug:"venusguard",category:"health",task:{},scope:{category:"health",assetAddress:venusAsset,marketAddresses:[venusMarket],protectiveActions:["REPAY"],interventionCap:"2",triggerHealthFactor:"1.25",maxInterventionsPerDay:2},proposal:{category:"health",action:"HEALTH_REPAY",marketAddress:venusMarket,amount:"1"},metric:"venus_pool_position_count"},
];

for(const spec of specs){
  const serviceId=`svc:reference:${spec.slug}`,nonce=randomUUID();
  const tests=(await json(`/v1/services/${encodeURIComponent(serviceId)}/tests`,{method:"POST"}))?.tests;if(tests?.coverage!=="PASS")throw new Error(`${serviceId}: fresh Marketplace Test Lab PASS is required.`);
  const offer=(await json(`/v1/services/${encodeURIComponent(serviceId)}/offers`))?.offers?.[0];
  const quote=(await json("/v1/quotes",{method:"POST",body:JSON.stringify({serviceId,offerId:offer?.offerId,buyerAddress:buyer,buyerChainId:97,idempotencyKey:`v027:q:${serviceId}:${nonce}`})}))?.quote;
  const hire=(await json("/v1/hires",{method:"POST",body:JSON.stringify({quoteId:quote?.quoteId,buyerAddress:buyer,idempotencyKey:`v027:h:${serviceId}:${nonce}`})}))?.hire;
  const activation=(await json(`/v1/hires/${encodeURIComponent(hire?.hireId)}/activate`,{method:"POST",body:JSON.stringify({buyerAddress:buyer,idempotencyKey:`v027:a:${serviceId}:${nonce}`})}))?.activation;
  const task=(await json(`/v1/activations/${encodeURIComponent(activation?.activationId)}/service-tasks`,{method:"POST",body:JSON.stringify({buyerAddress:buyer,...spec.task})}))?.task;
  if(task?.state!=="COMPLETED"||task?.result?.state!=="STRUCTURED")throw new Error(`${serviceId}: structured category runtime observation missing.`);
  const checkout=(await json(`/v1/activations/${encodeURIComponent(activation.activationId)}/permission-checkouts`,{method:"POST",body:JSON.stringify({buyerAddress:buyer,idempotencyKey:`v027:pc:${serviceId}:${nonce}`,approvalMode:"ASK_BEFORE_EXECUTION",validForMinutes:60,scope:spec.scope})}))?.checkout;
  const request=(await json(`/v1/permission-checkouts/${encodeURIComponent(checkout?.checkoutId)}/confirm`,{method:"POST",body:JSON.stringify({buyerAddress:buyer})}))?.request;
  const preflight=(await json(`/v1/scoped-permission-requests/${encodeURIComponent(request?.permissionRequestId)}/execution-preflight`,{method:"POST",body:JSON.stringify({buyerAddress:buyer})}))?.preflight;
  if(preflight?.state!=="BLOCKED")throw new Error(`${serviceId}: current read-only service should remain execution-blocked.`);
  const guard=(await json(`/v1/scoped-permission-requests/${encodeURIComponent(request.permissionRequestId)}/execution-guard`,{method:"POST",body:JSON.stringify({buyerAddress:buyer,proposal:spec.proposal})}))?.report;
  if(!guard?.guardReportId)throw new Error(`${serviceId}: execution guard assessment missing.`);

  const bundle=(await json(`/v1/activations/${encodeURIComponent(activation.activationId)}/activity-outcomes/sync`,{method:"POST"}))?.bundle;
  if(bundle?.outcome?.transactionObserved!==false)throw new Error(`${serviceId}: v0.27 must not fabricate transaction evidence.`);
  if(bundle?.outcome?.financialOutcome?.value!=="Could Not Assess"||bundle?.outcome?.financialOutcome?.state!=="COULD_NOT_ASSESS")throw new Error(`${serviceId}: missing financial outcome must be explicit Could Not Assess.`);
  if(!bundle?.activity?.some(e=>e.eventType==="SERVICE_TASK_OBSERVED")||!bundle.activity.some(e=>e.eventType==="PERMISSION_REQUEST_BLOCKED")||!bundle.activity.some(e=>e.eventType==="EXECUTION_PREFLIGHT_BLOCKED"))throw new Error(`${serviceId}: activation activity timeline is incomplete.`);
  if(!bundle?.outcome?.metrics?.some(m=>m.metric===spec.metric))throw new Error(`${serviceId}: category technical outcome metric ${spec.metric} missing.`);
  const persisted=(await json(`/v1/activations/${encodeURIComponent(activation.activationId)}/activity-outcomes`))?.bundle;
  if(persisted?.outcome?.outcomeId!==bundle.outcome.outcomeId||persisted?.activity?.length!==bundle.activity.length)throw new Error(`${serviceId}: Activation Activity & Outcomes did not persist coherently.`);
  await json(`/v1/activations/${encodeURIComponent(activation.activationId)}/revoke`,{method:"POST",body:JSON.stringify({buyerAddress:buyer})});
  const revoked=(await json(`/v1/activations/${encodeURIComponent(activation.activationId)}/activity-outcomes/sync`,{method:"POST"}))?.bundle;
  if(revoked?.outcome?.state!=="REVOKED"||!revoked?.activity?.some(e=>e.eventType==="ACTIVATION_REVOKED"))throw new Error(`${serviceId}: revocation was not reconciled into Activity & Outcomes.`);
  console.log(`PASS ${serviceId}: runtime + authority review + execution assessment → persisted category activity/outcome → financial outcome Could Not Assess → revocation.`);
}
console.log("PASS: Spotriq v0.27 four-category Activity + Outcome parity contract passed without converting technical observations into financial-performance claims.");
