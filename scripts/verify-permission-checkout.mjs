import process from "node:process";
import { randomUUID } from "node:crypto";

const base=(process.env.SPOTRIQ_ACCEPTANCE_BASE_URL||process.env.PUBLIC_API_BASE_URL||"https://spotriq-production.up.railway.app").replace(/\/$/,"");
const buyer=String(process.env.SPOTRIQ_ACCEPTANCE_BUYER_ADDRESS||"").trim().toLowerCase();
if(!/^0x[0-9a-f]{40}$/.test(buyer))throw new Error("Set SPOTRIQ_ACCEPTANCE_BUYER_ADDRESS to the BSC wallet used for v0.25 acceptance.");
const buyerChainId=Number(process.env.SPOTRIQ_ACCEPTANCE_BUYER_CHAIN_ID||"97");
if(buyerChainId!==97)throw new Error("v0.25 financial-authority acceptance is testnet-first. Set SPOTRIQ_ACCEPTANCE_BUYER_CHAIN_ID=97.");

async function json(path,init){
  const response=await fetch(`${base}${path}`,{...init,headers:{accept:"application/json",...(init?.body?{"content-type":"application/json"}:{}),...(init?.headers||{})}});
  const body=await response.json().catch(()=>undefined);
  if(!response.ok)throw new Error(`${path} returned HTTP ${response.status}: ${JSON.stringify(body)}`);
  return body?.data;
}

let tokenId=String(process.env.SPOTRIQ_ACCEPTANCE_RANGEKEEPER_TOKEN_ID||"").trim();
let poolAddress=String(process.env.SPOTRIQ_ACCEPTANCE_GRID_POOL_ADDRESS||"").trim().toLowerCase();
let authorityAsset=String(process.env.SPOTRIQ_ACCEPTANCE_AUTHORITY_ASSET_ADDRESS||"").trim().toLowerCase();
if(!tokenId||!poolAddress||!authorityAsset){
  try{
    if(tokenId){
      const position=(await json(`/v1/protocols/pancakeswap/positions/v3/${encodeURIComponent(tokenId)}`))?.position;
      if(!poolAddress&&position?.pool?.poolAddress)poolAddress=String(position.pool.poolAddress).toLowerCase();
      if(!authorityAsset&&position?.pool?.token0?.address)authorityAsset=String(position.pool.token0.address).toLowerCase();
    }
    if(!tokenId||!poolAddress||!authorityAsset){
      const positions=(await json(`/v1/wallets/${encodeURIComponent(buyer)}/pancakeswap/positions?max=20`))?.snapshot?.positions??[];
      const v3=positions.find((item)=>item?.version==="V3"&&item?.tokenId&&item?.pool?.poolAddress&&item?.pool?.token0?.address);
      if(!tokenId&&v3?.tokenId)tokenId=String(v3.tokenId);
      if(!poolAddress&&v3?.pool?.poolAddress)poolAddress=String(v3.pool.poolAddress).toLowerCase();
      if(!authorityAsset&&v3?.pool?.token0?.address)authorityAsset=String(v3.pool.token0.address).toLowerCase();
    }
  }catch(error){
    console.warn(`WARN: automatic v0.25 acceptance-context discovery was unavailable: ${error instanceof Error?error.message:String(error)}`);
  }
}
if(!/^\d+$/.test(tokenId))throw new Error("Set SPOTRIQ_ACCEPTANCE_RANGEKEEPER_TOKEN_ID to a real readable BSC Testnet PancakeSwap V3 position tokenId.");
if(!/^0x[0-9a-f]{40}$/.test(poolAddress))throw new Error("Set SPOTRIQ_ACCEPTANCE_GRID_POOL_ADDRESS to a real readable BSC Testnet PancakeSwap V3 pool address.");
if(!/^0x[0-9a-f]{40}$/.test(authorityAsset))throw new Error("Set SPOTRIQ_ACCEPTANCE_AUTHORITY_ASSET_ADDRESS to a real BSC Testnet token address, or supply a readable RangeKeeper tokenId so the verifier can derive token0.");

const services=[
  {slug:"rangekeeper",category:"rebalancing",scope:{category:"rebalancing",positionTokenId:tokenId,token0Limit:"1",token1Limit:"1",maxActionsPerDay:4},required:"REBALANCING_JOB_INTENT_REQUIRED"},
  {slug:"gridpilot",category:"grid",scope:{category:"grid",poolAddress,capitalAssetAddress:authorityAsset,capitalLimit:"10",perActionLimit:"2",maxActionsPerDay:12},required:"GRID_EXECUTION_ADAPTER_REQUIRED"},
  {slug:"yieldpilot",category:"yield",scope:{category:"yield",assetAddress:authorityAsset,allowedMarketAddresses:[],capitalLimit:"10",perActionLimit:"2",maxActionsPerDay:4},required:"YIELD_EXECUTION_ADAPTER_REQUIRED"},
  {slug:"venusguard",category:"health",scope:{category:"health",assetAddress:authorityAsset,marketAddresses:[],protectiveActions:["REPAY"],interventionCap:"2",triggerHealthFactor:"1.25",maxInterventionsPerDay:2},required:"HEALTH_PROTECTIVE_WRITE_ADAPTER_REQUIRED"},
];

for(const spec of services){
  const serviceId=`svc:reference:${spec.slug}`;
  const offer=(await json(`/v1/services/${encodeURIComponent(serviceId)}/offers`))?.offers?.[0];
  if(!offer?.terms||offer.terms.commercialModel!=="FREE"||offer.terms.serviceType!=="READ_ONLY_SERVICE")throw new Error(`${serviceId}: FREE read-only Offer missing.`);
  const nonce=randomUUID();
  const quote=(await json("/v1/quotes",{method:"POST",body:JSON.stringify({serviceId,offerId:offer.offerId,buyerAddress:buyer,buyerChainId,idempotencyKey:`v025:quote:${serviceId}:${nonce}`})}))?.quote;
  const hire=(await json("/v1/hires",{method:"POST",body:JSON.stringify({quoteId:quote?.quoteId,buyerAddress:buyer,idempotencyKey:`v025:hire:${serviceId}:${nonce}`})}))?.hire;
  const activation=(await json(`/v1/hires/${encodeURIComponent(hire?.hireId)}/activate`,{method:"POST",body:JSON.stringify({buyerAddress:buyer,idempotencyKey:`v025:activation:${serviceId}:${nonce}`})}))?.activation;
  if(activation?.state!=="ACTIVE"||activation.walletSigningAuthorityGranted||activation.financialExecutionAuthorityGranted)throw new Error(`${serviceId}: expected ACTIVE read-only commercial relationship with no financial authority.`);

  const checkout=(await json(`/v1/activations/${encodeURIComponent(activation.activationId)}/permission-checkouts`,{method:"POST",body:JSON.stringify({buyerAddress:buyer,idempotencyKey:`v025:checkout:${serviceId}:${nonce}`,approvalMode:"ASK_BEFORE_EXECUTION",validForMinutes:60,scope:spec.scope})}))?.checkout;
  if(checkout?.category!==spec.category||checkout?.state!=="BLOCKED")throw new Error(`${serviceId}: current reference service must produce a BLOCKED category-specific PermissionCheckout.`);
  if(checkout?.permissionProfileSnapshot?.executionMode!=="READ_ONLY")throw new Error(`${serviceId}: PermissionProfile snapshot must preserve READ_ONLY truth.`);
  const blockerCodes=new Set((checkout?.blockers??[]).map((item)=>item.code));
  for(const code of ["SERVICE_READ_ONLY","SERVICE_NOT_FINANCIALLY_READY",spec.required])if(!blockerCodes.has(code))throw new Error(`${serviceId}: expected deterministic blocker ${code}; received ${JSON.stringify([...blockerCodes])}.`);
  if(!checkout?.scopeHash||checkout?.permissionGrantId)throw new Error(`${serviceId}: checkout scope hash is missing or a grant was fabricated.`);

  const request=(await json(`/v1/permission-checkouts/${encodeURIComponent(checkout.checkoutId)}/confirm`,{method:"POST",body:JSON.stringify({buyerAddress:buyer})}))?.request;
  if(request?.state!=="BLOCKED"||request?.scopeHash!==checkout.scopeHash||request?.permissionGrantId)throw new Error(`${serviceId}: ScopedPermissionRequest must preserve the exact reviewed scope and remain BLOCKED without a grant.`);
  if(request?.providerSubmissionState==="READY_FOR_PROVIDER"||request?.providerSubmissionState==="RECONCILED")throw new Error(`${serviceId}: current read-only service must not become provider-ready merely because the buyer reviewed a scope.`);

  const fetched=(await json(`/v1/scoped-permission-requests/${encodeURIComponent(request.permissionRequestId)}`))?.request;
  if(fetched?.scopeHash!==checkout.scopeHash||fetched?.permissionRequestId!==request.permissionRequestId)throw new Error(`${serviceId}: persisted ScopedPermissionRequest did not round-trip immutably.`);
  console.log(`PASS ${serviceId}: read-only Activation → category Permission Checkout → immutable BLOCKED ScopedPermissionRequest; no PermissionGrant fabricated.`);
}

const state=(await json(`/v1/accounts/${encodeURIComponent(buyer)}/permission-state`))?.state;
if(!state||!Array.isArray(state.checkouts)||!Array.isArray(state.requests))throw new Error("Buyer permission state is missing persisted checkout/request collections.");
if(state.activeGrantIds?.length)console.warn(`WARN: buyer already has ${state.activeGrantIds.length} independently reconciled grant(s); v0.25 acceptance did not create them.`);
console.log("PASS: Spotriq v0.25 Permission Checkout + scoped authority parity contract passed for all four reference services without inventing financial authority.");
