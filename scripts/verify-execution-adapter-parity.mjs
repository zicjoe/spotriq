import process from "node:process";
import { randomUUID } from "node:crypto";

const base=(process.env.SPOTRIQ_ACCEPTANCE_BASE_URL||process.env.PUBLIC_API_BASE_URL||"https://spotriq-production.up.railway.app").replace(/\/$/,"");
const buyer=String(process.env.SPOTRIQ_ACCEPTANCE_BUYER_ADDRESS||"").trim().toLowerCase();
if(!/^0x[0-9a-f]{40}$/.test(buyer))throw new Error("Set SPOTRIQ_ACCEPTANCE_BUYER_ADDRESS to the BSC Testnet wallet used for acceptance.");
if(Number(process.env.SPOTRIQ_ACCEPTANCE_BUYER_CHAIN_ID||"97")!==97)throw new Error("v0.26 execution-adapter acceptance is BSC Testnet-only. Set SPOTRIQ_ACCEPTANCE_BUYER_CHAIN_ID=97.");
async function json(path,init){const response=await fetch(`${base}${path}`,{...init,headers:{accept:"application/json",...(init?.body?{"content-type":"application/json"}:{}),...(init?.headers||{})}});const body=await response.json().catch(()=>undefined);if(!response.ok)throw new Error(`${path} returned HTTP ${response.status}: ${JSON.stringify(body)}`);return body?.data;}

const catalog=(await json("/v1/execution-adapters"))?.adapters??[];
if(catalog.length!==4)throw new Error(`Expected four execution adapters; received ${catalog.length}.`);
for(const category of ["rebalancing","grid","yield","health"]){const adapter=catalog.find(a=>a.category===category);if(!adapter||adapter.state!=="IMPLEMENTED"||adapter.networkPolicy!=="BSC_TESTNET_ONLY")throw new Error(`${category}: execution adapter is missing or not testnet-implemented.`);}

let tokenId=String(process.env.SPOTRIQ_ACCEPTANCE_RANGEKEEPER_TOKEN_ID||"").trim();
let poolAddress=String(process.env.SPOTRIQ_ACCEPTANCE_GRID_POOL_ADDRESS||"").trim().toLowerCase();
let gridAsset=String(process.env.SPOTRIQ_ACCEPTANCE_AUTHORITY_ASSET_ADDRESS||"").trim().toLowerCase();
if(!tokenId||!poolAddress||!gridAsset){
 try{
  if(tokenId){
   const position=(await json(`/v1/protocols/pancakeswap/positions/v3/${encodeURIComponent(tokenId)}`))?.position;
   if(!poolAddress&&position?.pool?.poolAddress)poolAddress=String(position.pool.poolAddress).toLowerCase();
   if(!gridAsset&&position?.pool?.token0?.address)gridAsset=String(position.pool.token0.address).toLowerCase();
  }
  if(!tokenId||!poolAddress||!gridAsset){
   const positions=(await json(`/v1/wallets/${encodeURIComponent(buyer)}/pancakeswap/positions?max=20`))?.snapshot?.positions??[];
   const v3=positions.find(item=>item?.version==="V3"&&item?.tokenId&&item?.pool?.poolAddress&&item?.pool?.token0?.address);
   if(!tokenId&&v3?.tokenId)tokenId=String(v3.tokenId);
   if(!poolAddress&&v3?.pool?.poolAddress)poolAddress=String(v3.pool.poolAddress).toLowerCase();
   if(!gridAsset&&v3?.pool?.token0?.address)gridAsset=String(v3.pool.token0.address).toLowerCase();
  }
 }catch(error){
  console.warn(`WARN: automatic v0.26 PancakeSwap acceptance-context discovery was unavailable: ${error instanceof Error?error.message:String(error)}`);
 }
}
if(!/^\d+$/.test(tokenId))throw new Error("Set SPOTRIQ_ACCEPTANCE_RANGEKEEPER_TOKEN_ID to a readable BSC Testnet PancakeSwap V3 position tokenId.");
if(!/^0x[0-9a-f]{40}$/.test(poolAddress))throw new Error("Set SPOTRIQ_ACCEPTANCE_GRID_POOL_ADDRESS to a readable BSC Testnet PancakeSwap V3 pool.");
if(!/^0x[0-9a-f]{40}$/.test(gridAsset))throw new Error("Set SPOTRIQ_ACCEPTANCE_AUTHORITY_ASSET_ADDRESS to a token in the reviewed Grid pool.");

let venusMarket=String(process.env.SPOTRIQ_ACCEPTANCE_VENUS_MARKET_ADDRESS||"").trim().toLowerCase();
let venusAsset=String(process.env.SPOTRIQ_ACCEPTANCE_VENUS_ASSET_ADDRESS||"").trim().toLowerCase();
if(!venusMarket||!venusAsset){
 try{
  const markets=(await json("/v1/protocols/venus/markets"))?.snapshot?.markets??[];
  const candidate=markets.find(m=>m?.vToken&&/^0x[0-9a-fA-F]{40}$/.test(m.vToken)&&m?.underlying?.address&&/^0x[0-9a-fA-F]{40}$/.test(m.underlying.address)&&m.underlying.address.toLowerCase()!=="0x0000000000000000000000000000000000000000");
  if(!venusMarket&&candidate?.vToken)venusMarket=String(candidate.vToken).toLowerCase();
  if(!venusAsset&&candidate?.underlying?.address)venusAsset=String(candidate.underlying.address).toLowerCase();
 }catch(error){
  console.warn(`WARN: wallet-independent Venus market discovery was unavailable: ${error instanceof Error?error.message:String(error)}`);
 }
}
if(!venusMarket||!venusAsset){
 try{
  const opportunities=(await json(`/v1/wallets/${encodeURIComponent(buyer)}/venus/yield-opportunities`))?.snapshot?.opportunities??[];
  const candidate=opportunities.find(o=>o?.vToken&&o?.underlying?.address&&/^0x[0-9a-fA-F]{40}$/.test(o.underlying.address));
  if(!venusMarket&&candidate?.vToken)venusMarket=String(candidate.vToken).toLowerCase();
  if(!venusAsset&&candidate?.underlying?.address)venusAsset=String(candidate.underlying.address).toLowerCase();
 }catch{}
}
if(!/^0x[0-9a-f]{40}$/.test(venusMarket)||!/^0x[0-9a-f]{40}$/.test(venusAsset))throw new Error("Could not derive a live BSC Testnet Venus ERC-20 market. You may set SPOTRIQ_ACCEPTANCE_VENUS_MARKET_ADDRESS and SPOTRIQ_ACCEPTANCE_VENUS_ASSET_ADDRESS explicitly, but the verifier now prefers Spotriq's wallet-independent Venus market catalog.");

const services=[
 {slug:"rangekeeper",category:"rebalancing",scope:{category:"rebalancing",positionTokenId:tokenId,token0Limit:"1",token1Limit:"1",maxActionsPerDay:4},proposal:{category:"rebalancing",action:"REBALANCING_EXISTING_BOUNDARY"}},
 {slug:"gridpilot",category:"grid",scope:{category:"grid",poolAddress,capitalAssetAddress:gridAsset,capitalLimit:"10",perActionLimit:"2",maxActionsPerDay:12},proposal:{category:"grid",action:"GRID_SWAP_EXACT_INPUT_SINGLE",amountIn:"1",amountOutMinimumRaw:"1",deadlineUnix:Math.floor(Date.now()/1000)+600}},
 {slug:"yieldpilot",category:"yield",scope:{category:"yield",assetAddress:venusAsset,allowedMarketAddresses:[venusMarket],capitalLimit:"10",perActionLimit:"2",maxActionsPerDay:4},proposal:{category:"yield",action:"YIELD_SUPPLY",marketAddress:venusMarket,amount:"1"}},
 {slug:"venusguard",category:"health",scope:{category:"health",assetAddress:venusAsset,marketAddresses:[venusMarket],protectiveActions:["REPAY"],interventionCap:"2",triggerHealthFactor:"1.25",maxInterventionsPerDay:2},proposal:{category:"health",action:"HEALTH_REPAY",marketAddress:venusMarket,amount:"1"}},
];

for(const spec of services){
 const serviceId=`svc:reference:${spec.slug}`,nonce=randomUUID();
 const offer=(await json(`/v1/services/${encodeURIComponent(serviceId)}/offers`))?.offers?.[0];
 const quote=(await json("/v1/quotes",{method:"POST",body:JSON.stringify({serviceId,offerId:offer?.offerId,buyerAddress:buyer,buyerChainId:97,idempotencyKey:`v026:q:${serviceId}:${nonce}`})}))?.quote;
 const hire=(await json("/v1/hires",{method:"POST",body:JSON.stringify({quoteId:quote?.quoteId,buyerAddress:buyer,idempotencyKey:`v026:h:${serviceId}:${nonce}`})}))?.hire;
 const activation=(await json(`/v1/hires/${encodeURIComponent(hire?.hireId)}/activate`,{method:"POST",body:JSON.stringify({buyerAddress:buyer,idempotencyKey:`v026:a:${serviceId}:${nonce}`})}))?.activation;
 const checkout=(await json(`/v1/activations/${encodeURIComponent(activation?.activationId)}/permission-checkouts`,{method:"POST",body:JSON.stringify({buyerAddress:buyer,idempotencyKey:`v026:pc:${serviceId}:${nonce}`,approvalMode:"ASK_BEFORE_EXECUTION",validForMinutes:60,scope:spec.scope})}))?.checkout;
 const request=(await json(`/v1/permission-checkouts/${encodeURIComponent(checkout?.checkoutId)}/confirm`,{method:"POST",body:JSON.stringify({buyerAddress:buyer})}))?.request;
 const preflight=(await json(`/v1/scoped-permission-requests/${encodeURIComponent(request?.permissionRequestId)}/execution-preflight`,{method:"POST",body:JSON.stringify({buyerAddress:buyer})}))?.preflight;
 if(preflight?.adapter?.state!=="IMPLEMENTED"||preflight?.category!==spec.category)throw new Error(`${serviceId}: category adapter was not selected.`);
 if(preflight?.state!=="BLOCKED"||preflight?.executionEligible!==false)throw new Error(`${serviceId}: current read-only service must fail closed at v0.26 preflight.`);
 const checks=new Map((preflight?.checks??[]).map(c=>[c.code,c.state]));
 if(checks.get("ADAPTER")!=="PASS"||checks.get("SERVICE_FINANCIAL_READINESS")!=="FAIL"||checks.get("PERMISSION_GRANT")!=="FAIL")throw new Error(`${serviceId}: expected adapter PASS plus service/grant blockers; got ${JSON.stringify(Object.fromEntries(checks))}.`);
 if(checks.get("TARGET_SCOPE")!=="PASS")throw new Error(`${serviceId}: acceptance supplied a real exact target but TARGET_SCOPE did not pass.`);
 const guard=(await json(`/v1/scoped-permission-requests/${encodeURIComponent(request.permissionRequestId)}/execution-guard`,{method:"POST",body:JSON.stringify({buyerAddress:buyer,proposal:spec.proposal})}))?.report;
 if(spec.category==="rebalancing"){if(guard?.state!=="LEGACY_BOUNDARY_REQUIRED")throw new Error(`${serviceId}: Rebalancing must delegate to the existing sealed boundary stack.`);}else{if(guard?.state!=="BLOCKED"||guard?.call)throw new Error(`${serviceId}: blocked current service must not receive prepared calldata.`);}
 const persisted=(await json(`/v1/scoped-permission-requests/${encodeURIComponent(request.permissionRequestId)}/execution-state`))?.state;
 if(persisted?.latestPreflight?.preflightId!==preflight.preflightId||persisted?.latestGuard?.guardReportId!==guard.guardReportId)throw new Error(`${serviceId}: preflight/guard assessment did not persist.`);
 console.log(`PASS ${serviceId}: adapter implemented → exact target scoped → preflight blocked on real service/grant gates → no financial dispatch fabricated.`);
}
console.log("PASS: Spotriq v0.26 four-category financial execution-adapter parity contract passed without granting or submitting unauthorized transactions.");
